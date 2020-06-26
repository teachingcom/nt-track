import * as PIXI from 'pixi.js';
import { noop, isArray, isNumber } from '../utils';
import { keyframes, easing } from 'popmotion';
import { CROWD_DEFAULT_SCALE } from '../config';

let ANIMATIONS;
let ANIMATIONS_LIST;

const HAIR_COLORS = [ 
	0xf6f2ef,
	0xcda575,
	0x96203f,
	0xcc4824,
	0xfefed6,
	0x402d2c,
	0x563353,
	0xa84a35,
	0xb68960,
	0x625673,
	0xe05638,
	0x985a59
];

const PRIMARY_COLORS = [
	0x15e1ff,
	0xff88ce,
	0xa9eb4c,
	0xfe7f1d,
	0xef515c,
	0x9dcbb8,
	0x9e5aa1,
	0xf23a46,
	0xbbd5d0,
	0xf5a9c7,
	0x2585ff,
	0xffc65e,
	0xffd258,
]

const SECONDARY_COLORS = [
	0x563253,
	0x625673,
	0x423d41,
	0x0c3f96,
	0x640034,
	0x683552,
	0x876443,
	0xad1f3c,
	0x3e7253,
	0x5f8283,
	0x582744
];

const ALT_COLORS = [

];

const PALETTES = {
	hair: shuffle(HAIR_COLORS),
	primary: shuffle(PRIMARY_COLORS),
	secondary: shuffle(SECONDARY_COLORS),
	alt: shuffle(ALT_COLORS),
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
	try {
			

		// setup animations so this doesn't have to be done
		// multiple times
		if (!ANIMATIONS) {
			generateAnimationFrames(animator.manifest.crowd);
		}

		const actor = choose(data.actor);

		// get the animation to playback
		let playback = choose(data.animation);
		if (!playback) {
			playback = sample(ANIMATIONS_LIST);
		}
		
		// make sure it's a real animation
		const animation = ANIMATIONS[playback];
		if (!animation) {
			throw UnknownCrowdAnimationError();
		}

		// create the color palette
		let hairColor = PALETTES.hair.pop();
		let primaryColor = PALETTES.primary.pop();
		let secondaryColor = PALETTES.secondary.pop();
		let altColor = PALETTES.alt.pop();

		// cycle
		PALETTES.hair.unshift(hairColor);
		PALETTES.primary.unshift(primaryColor);
		PALETTES.secondary.unshift(secondaryColor);
		PALETTES.alt.unshift(altColor);

		// const colors = colorsForActor();
		const colorsForActor = {
			hat: hairColor,
			torso: primaryColor,
			shoulder_r: primaryColor,
			shoulder_l: primaryColor,
			legs: secondaryColor,
		};

		// legs are used to set the
		// shadow position
		let legs;

		// get the source
		const spritesheet = await animator.getSpritesheet('crowd');
		const { layers, animations } = animator.manifest.crowd;

		// randomize the animation some
		const [ start, end ] = animations[playback];
		const length = (end - start) * 50;
		const base = length * 0.8;
		const duration = 0 | (base + (Math.random() * base));
		const elapsed = 0 | (duration * Math.random());

		// use animation length

		// find the layers to render

		// create the container for the actor
		const container = new PIXI.Container();

		// not all properties are supported
		const { props = { } } = data;
		if ('x' in props)
			container.x = animator.evaluateExpression(props.x);

		if ('y' in props)
			container.y = animator.evaluateExpression(props.y);
		
		// create animations?
		// TODO: does not support animations, but would be easy to add

		// assemble each of the layers
		for (const layer of layers) {
			const meta = LAYERS[layer.sprite];

			// the object that will be attached
			let obj;

			// create the new sprite
			const selected = selectRandomSpriteOfType(spritesheet, actor, meta.sprite);
			if (!selected) {
				console.error(`Sprite ${layer.sprite} does not exist for actor ${actor}`);
				throw new MissingCrowdSprite();
			}

			const sprite = obj = await animator.getSprite('crowd', selected.id);

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
				
				// check for an extra attachment
				const extra = selectRandomSpriteOfType(spritesheet, actor, meta.attachment);
				if (!!extra) {

					// replace the container
					obj = new PIXI.Container();
					obj.addChild(sprite);
					
					// get the item to create
					const attachment = await animator.getSprite('crowd', extra.id);
					obj.addChild(attachment);

					// check for extras
					if (extra.key in colorsForActor) {
						attachment.tint = colorsForActor[extra.key];
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
			const { isFlipped, frames } = animation[layer.sprite];

			// set the starting position
			if (frames) {

				// set starting position
				const [ origin ] = frames;
				obj.rotation = origin.rotation;
				obj.x = origin.x;
				obj.y = origin.y;

				// check if flipping
				if (isFlipped)
					obj.scale.x *= -1;

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
		return { displayObject: container, update: noop };

	}
	catch (ex) {
		return { displayObject: new PIXI.Container(), update: noop };
	}

}


// exceptions
function UnknownCrowdAnimationError() { }


// convert frame data to a keyframe
const frameToKeyframe = (frame, origin) => {
	origin.isFlipped = !!(origin.isFlipped || !isNaN(frame.alpha) && frame.alpha);
	delete frame.alpha;
	return {
		rotation: isNaN(frame.rotation) ? origin.rotation : frame.rotation * PIXI.DEG_TO_RAD,
		x: isNaN(frame.x) ? origin.x : frame.x,
		y: isNaN(frame.y) ? origin.y : frame.y
	}
};


// convert transform data to a keyframe
const originToKeyframe = origin => ({
	rotation: ((origin[4] || 0) + (origin[5] || 0)) * PIXI.DEG_TO_RAD,
	x: origin[0],
	y: origin[1]
});

const SPRITES = { };

// finds attachments for a part
function selectRandomSpriteOfType(spritesheet, prefix, type) {
	const name = `${prefix}_${type}`;
	let source = SPRITES[name];

	// cache the list
	if (!source) {
		const ids = [ ];
		for (const id in spritesheet) {
			if (id.substr(0, name.length) === name) {
				ids.push(id);
			}
		}

		// save they key and ids
		let [ key = '' ] = ids;
		key = key.substr(prefix.length).replace(/[^a-z]/g, '');
		source = SPRITES[name] = { ids, key };
	}

	// if nothing is found
	if (!source.key)
		return null;

	// get all possible attachments
	const { ids, key } = source;
	const id = sample(ids);
	return { id, key };
}


// handles parsing animation data in advance to avoid
// doing it for each instance created
function generateAnimationFrames({ animations, layers }) {

	// create the animation map
	ANIMATIONS = { };
	ANIMATIONS_LIST = [ ];

	// capture the animation sequence
	// TODO: again, all of this is a hack
	const animationNames = [ ];
	const sequence = { };
	let sequencePosition = 0;
	for (const id in animations) animationNames[animations[id][0]] = id;
	for (const name of animationNames)
		if (name) sequence[name] = ++sequencePosition;

	// parse each animation set
	for (const id in animations) {
		ANIMATIONS_LIST.push(id);

		// track this assembled animation
		const animation = ANIMATIONS[id] = { };

		// build out the keyframe animator
		for (const layer of layers) {
			const origin = originToKeyframe(layer.origin);

			// container for the keyframes
			let keyframes;

			// TEMP
			const count = sequence[id];
			
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

			const isFlipped = !!origin.isFlipped;
			animation[layer.sprite] = { isFlipped, frames: keyframes };
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

function MissingCrowdSprite() { }