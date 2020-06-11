import * as PIXI from 'pixi.js';
import { noop, isArray, isNumber } from '../utils';
import { keyframes, easing } from 'popmotion';
import { CROWD_DEFAULT_SCALE } from '../config';

let ANIMATIONS;

const PALETTES = {
	
	skin: shuffle([ 0xf7d6a7, 0xeabd7a, 0xdba767, 0xc28340, 0x8d5524, 0x543416 ]),
	hair: shuffle([ 0xcc4824, 0xfcd009, 0xfefed6, 0xcda575, 0xfda0d1, 0xaca8fd, 0x96203f ]),
	colors: shuffle([ 0x7bc82b, 0x426d14, 0xff4400, 0x99ff00, 0xff6830, 0x6e1813, 0xd3cc1c, 0xfe9fd2, 0xaf4ab2, 0x7675f9, 0x22777c])
	
}

// individual layer data for animations
const LAYERS = {
	arm_up_l: {
		sprite: 'arm_up', 
		pivot: 0.75, 
		flipX: true, 
		attachment: 'hand' 
	},
	arm_up_r: {
		sprite: 'arm_up', 
		pivot: 0.75, 
		attachment: 'hand' 
	},
	arm_down_l: {
		sprite: 'arm_down', 
		pivot: 0.75, 
		flipX: true, 
		attachment: 'hand' 
	},
	arm_down_r: {
		sprite: 'arm_down', 
		pivot: 0.75, 
		attachment: 'hand' 
	},
	shoulder_l: {
		sprite: 'shoulder', 
		pivot: 0.75, 
		flipX: true 
	},
	shoulder_r: {
		sprite: 'shoulder', 
		pivot: 0.75 
	},
	torso: {
		sprite: 'torso', 
		pivot: 0.75 
	},
	head: {
		sprite: 'head', 
		pivot: 0.66, 
		attachment: 'hat' 
	},
	legs: {
		sprite: 'legs',
		pivot: 0.15
	},
}

export default async function createCrowd(animator, controller, path, layer, data) {

	// setup animations so this doesn't have to be done
	// multiple times
	if (!ANIMATIONS) {
		generateAnimationFrames(animator.manifest.crowd);
	}

	// get the animation to playback
	const playback = choose(data.animation);
	const actor = choose(data.actor);
	const animation = ANIMATIONS[playback];

	// not a real animation
	if (!animation) {
		throw UnknownCrowdAnimationError();
	}

	// create the color palette
	let baseColor = PALETTES.skin.pop();
	let accentColor = PALETTES.hair.pop();
	let altColor = PALETTES.colors.pop();
	let secondaryColor = PALETTES.colors.pop();

	// cycle
	PALETTES.skin.unshift(baseColor);
	PALETTES.hair.unshift(accentColor);
	PALETTES.colors.unshift(altColor);
	PALETTES.colors.unshift(secondaryColor);

	// select the color to use
	if (isNumber(data.color)) {
		baseColor = altColor = secondaryColor = accentColor = data.color;
	}
	else if (data.color) {
		baseColor = choose('base' in data.color ? data.color.base : baseColor);
		altColor = choose('top' in data.color ? data.color.top : altColor);
		secondaryColor = choose('bottom' in data.color ? data.color.bottom : secondaryColor);
		accentColor = choose('accent' in data.color ? data.color.base : accentColor);
	}
	else if (data.color === false) {
		baseColor = altColor = secondaryColor = accentColor = 0xffffff;
	}

	// const colors = colorsForActor();
	const colorsForActor = {
		hat: accentColor,
		torso: altColor,
		shoulder_r: altColor,
		shoulder_l: altColor,
	};

	// legs are used to set the
	// shadow position
	let legs;

	// get the source
	const spritesheet = await animator.getSpritesheet('crowd');

	// randomize the animation some
	const duration = 0 | (400 + (Math.random() * 1200));
	const elapsed = 0 | (duration * Math.random());

	// find the layers to render
	const { layers } = animator.manifest.crowd;

	// create the container for the actor
	const container = new PIXI.Container();
	Object.assign(container, data.props);

	// create animations?
	// TODO: does not support animations, but would be easy to add

	// assemble each of the layers
	for (const layer of layers) {
		const meta = LAYERS[layer.sprite];

		// the object that will be attached
		let obj;

		// create the new sprite
		const spriteId = `${actor}_${meta.sprite}`;
		const sprite = obj = await animator.getSprite('crowd', spriteId);

		// set the tint
		if (layer.sprite in colorsForActor) {
			sprite.tint = colorsForActor[layer.sprite];
		}

		// save the legs, if needed
		if (layer.sprite === 'legs') {
			legs = sprite;
		}
		
		// check for special attachments
		if (meta.attachment) {

			// get all possible attachments
			const attachments = getAttachments(spritesheet, actor, meta.attachment);
			
			// attach, if needed
			if (!!attachments.length) {

				// replace the container
				obj = new PIXI.Container();
				obj.addChild(sprite);
				
				// get the item to create
				const selected = sample(attachments);
				const attachment = await animator.getSprite('crowd', selected);
				obj.addChild(attachment);

				// check for extras
				const key = selected.substr(actor.length).replace(/[^a-z]/g, '');
				if (key in colorsForActor) {
					attachment.tint = colorsForActor[key];
				}

				attachment.pivot.x = (attachment.width - sprite.width) / 2;
				attachment.pivot.y = (attachment.height - sprite.height) / 2;
			}

		}

		// adjust the scale
		container.addChildAt(obj, 0);
		// const scale = sprite.height / meta.height;
		
		// pivot from the correct joint positions
		obj.pivot.x = sprite.width * 0.5;
		obj.pivot.y = sprite.height * meta.pivot;

		// inverted obj
		if (meta.flipX) {
			obj.scale.x *= -1;
		}

		// key animation data
		const frames = animation[layer.sprite];

		// set the starting position
		if (frames) {

			// set starting position
			const [ origin ] = frames;
			obj.rotation = origin.rotation;
			obj.x = origin.x;
			obj.y = origin.y;

			// create the animator - must have at least
			// two frames of animation
			if (frames?.length > 1)
				keyframes({
					loop: Infinity,
					ease: easing.linear,
					duration,
					elapsed,
					values: frames
				})
				.start({
					update: createUpdater(obj, 1)
				});

		}

	}

	// add the shadow
	const shadow = await animator.getSprite('crowd', 'shadow');
	container.addChildAt(shadow, 0);

	// position the shadow at the bottom
	shadow.pivot.y = shadow.height * 0.75;
	shadow.pivot.x = shadow.width * 0.5;
	shadow.y = legs.y + legs.height;
	shadow.x = legs.x;
	shadow.scale.x = shadow.scale.y = (legs.width / shadow.width) * 2;

	// scale
	container.scale.x = CROWD_DEFAULT_SCALE;
	container.scale.x *= (0.9 + (0.2 * Math.random()));
	container.scale.y = container.scale.x;
	
	// assign the main container positions
	// Object.assign(container, data.props);
	return { displayObject: container, update: noop }

}


// exceptions
function UnknownCrowdAnimationError() { }


// convert frame data to a keyframe
const frameToKeyframe = (frame, origin) => ({
	rotation: isNaN(frame.rotation) ? origin.rotation : frame.rotation * PIXI.DEG_TO_RAD,
	x: isNaN(frame.x) ? origin.x : frame.x,
	y: isNaN(frame.y) ? origin.y : frame.y
});


// convert transform data to a keyframe
const originToKeyframe = origin => ({
	rotation: ((origin[4] || 0) + (origin[5] || 0)) * PIXI.DEG_TO_RAD,
	x: origin[0],
	y: origin[1]
});

// finds attachments for a part
function getAttachments(spritesheet, prefix, type) {
	const head = `${prefix}_${type}`;
	const attachments = [ ];
	for (const id in spritesheet) {
		if (id.substr(0, head.length) === head) {
			attachments.push(id);
		}
	}

	return attachments;
}


// handles parsing animation data in advance to avoid
// doing it for each instance created
function generateAnimationFrames({ animations, layers }) {

	// create the animation map
	ANIMATIONS = { };

	// parse each animation set
	for (const id in animations) {
		const [ start ] = animations[id];

		// track this assembled animation
		const animation = ANIMATIONS[id] = { };

		// build out the keyframe animator
		for (const layer of layers) {
			const origin = originToKeyframe(layer.origin);

			// container for the keyframes
			let keyframes;

			// TEMP
			let count = 0;
			if (id === 'cheer') count = 1;
			else if (id === 'wave') count = 2;
			else if (id === 'jump') count = 3;
			
			// create the timings for each animation
			for (const frame of layer.frames) {

				// find the first frame
				if (frame._off === false) count--;
				if (count > 0) continue;
		
				// still trying to find the first
				// frame of animation
				if (!keyframes) {
						
					// this is the default frame, get the props
					// if this is at the beginning, use the 
					// origin data
					const keyframe = frameToKeyframe(frame, origin);
					keyframes = [ keyframe ];
					continue;
				}

				// ran out of frames of animation
				if (!!frame._off) {
					break;
				}

				// save the captured frame
				const keyframe = frameToKeyframe(frame, keyframes[0]);
				keyframes.push(keyframe);
			}

			animation[layer.sprite] = keyframes;
		}

	}

}


// creates a common animation update function
const createUpdater = (layer, scale = 1) => (v) => {
	layer.rotation = v.rotation;
	layer.x = v.x * scale;
	layer.y = v.y * scale;
};

const sample = (collection) => {
	return collection[Math.floor(Math.random() * collection.length)];
}

function shuffle(collection) {
	const shuffled = [ ];
	for (let i = collection.length; i-- > 0;) {
		const index = Math.floor(Math.random() * collection.length);
		shuffled.push(collection.splice(index, 1));
	}

	return shuffled;
}

function choose(source) {
	return isArray(source) ? sample(source) : source;
}