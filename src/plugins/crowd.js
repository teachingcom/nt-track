import * as PIXI from 'pixi.js';
import { noop, isArray } from '../utils';
import { keyframes, easing } from 'popmotion';

let ANIMATIONS;

const PALETTES = {
	
	skin: shuffle([ 0xf7d6a7, 0xeabd7a, 0xdba767, 0xc28340, 0x8d5524, 0x543416 ]),
	hair: shuffle([ 0xcc4824, 0xfcd009, 0xfefed6, 0xcda575, 0xfda0d1, 0xaca8fd, 0x96203f ]),
	colors: shuffle([ 0x7bc82b, 0x426d14, 0xff6830, 0x6e1813, 0xd3cc1c, 0xfe9fd2, 0xaf4ab2, 0x7675f9, 0x22777c])
	
}

// individual layer data for animations
const LAYERS = {
	armupl: {
		sprite: 'arm_up', 
		height: 100, 
		pivot: 0.75, 
		flipX: true, 
		attachment: 'hand' 
	},
	armupr: {
		sprite: 'arm_up', 
		height: 100, 
		pivot: 0.75, 
		attachment: 'hand' 
	},
	shoulderl: {
		sprite: 'shoulder', 
		height: 70, 
		pivot: 0.75, 
		flipX: true 
	},
	shoulderr: {
		sprite: 'shoulder', 
		height: 70, 
		pivot: 0.75 
	},
	torso: {
		sprite: 'torso', 
		height: 140, 
		pivot: 0.75 
	},
	head: {
		sprite: 'head', 
		height: 120, 
		pivot: 0.5, 
		attachment: 'hat' 
	},
	legs: {
		sprite: 'legs', 
		palette: PALETTES.skin,
		height: 165, 
		pivot: 0.333 
	},
}

export default async function createCrowd(animator, controller, path, layer, data) {

	// setup animations so this doesn't have to be done
	// multiple times
	if (!ANIMATIONS) {
		generateAnimationFrames(animator.manifest.crowd);
	}

	// get the animation to playback
	const playback = isArray(data.animation) ? sample(data.animation) : data.animation;
	const animation = ANIMATIONS[playback];

	// not a real animation
	if (!animation) {
		throw UnknownCrowdAnimationError();
	}

	// create the color palette
	const skin = PALETTES.skin.pop();
	const hat = PALETTES.hair.pop();
	const top = PALETTES.colors.pop();
	const bottom = PALETTES.colors.pop();
	
	// cycle
	PALETTES.skin.unshift(skin);
	PALETTES.hair.unshift(hat);
	PALETTES.colors.unshift(top);
	PALETTES.colors.unshift(bottom);

	const MAPPING = {
		shoulder: top,
		arm_up: top,
		torso: top,
		hand: skin,
		hat,
		head: skin,
		legs: bottom
	};

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
	container.scale.x = container.scale.y = 0.5;

	// create animations?
	// TODO: does not support animations, but would be easy to add

	// assemble each of the layers
	for (const layer of layers) {
		const meta = LAYERS[layer.sprite];

		// the object that will be attached
		let obj;

		// create the new sprite
		const sprite = obj = await animator.getSprite('crowd', `${data.actor}_${meta.sprite}`);

		// perform the tint
		sprite.tint = MAPPING[meta.sprite];
		
		// check for special attachments
		if (meta.attachment) {

			// get all possible attachments
			const attachments = getAttachments(spritesheet, data.actor, meta.attachment);
			
			// attach, if needed
			if (!!attachments.length) {

				// replace the container
				obj = new PIXI.Container();
				obj.addChild(sprite);
				
				// get the item to create
				const selected = sample(attachments);
				const attachment = await animator.getSprite('crowd', selected);
				obj.addChild(attachment);
				
				// apply colors
				attachment.tint = MAPPING[meta.attachment];
			}

		}

		// adjust the scale
		container.addChildAt(obj, 0);
		const scale = sprite.height / meta.height;
		
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
		const [ origin ] = frames;
		obj.rotation = origin.rotation;
		obj.x = origin.x * scale;
		obj.y = origin.y * scale;

		// create the animator - must have at least
		// two frames of animation
		if (frames.length > 1)
			keyframes({
				loop: Infinity,
				ease: easing.linear,
				duration,
				elapsed,
				values: frames
			})
			.start({
				update: createUpdater(obj, scale)
			});


	}

	// scale
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

			// tracking which animation is being read
			let at = 1;
			
			// create the timings for each animation
			for (const frame of layer.frames) {
				
				// still trying to find the first
				// frame of animation
				if (!keyframes) {
					if (!frame._off && at >= start) {
						
						// this is the default frame, get the props
						// if this is at the beginning, use the 
						// origin data
						const keyframe = at === 1 ? origin : frameToKeyframe(frame, origin);
						keyframes = [ keyframe ];
						continue;
					}
					// continue searching
					else {
						at += (frame.frames || 1);
						continue;
					}
				}

				// ran out of frames of animation
				if (frame._off) {
					break;
				}

				// save the captured frame
				const keyframe = frameToKeyframe(frame, origin);
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

