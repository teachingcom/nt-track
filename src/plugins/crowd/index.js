import * as PIXI from 'pixi.js';
import { noop, choose, shuffle, appendFunc } from '../../utils';
import { CROWD_DEFAULT_SCALE } from '../../config';
import generateAnimationFrames from './generate-animatons';
import * as palettes from './palettes';
import LAYERS from './layers';

// shared crowd animators
let ANIMATORS;

// cached list of sprites in a crowd spritesheet
const SPRITES = { };

// shuffled palette colors mapped to properties
const PALETTES = {
	hair: shuffle(palettes.HAIR_COLORS),
	hat: shuffle(palettes.HAT_COLORS),
	skin: shuffle(palettes.SKIN_TONES),
	primary: shuffle(palettes.PRIMARY_COLORS),
	secondary: shuffle(palettes.SECONDARY_COLORS)
}


export default async function createCrowd(animator, controller, path, layer, data) {
	try {
		let dispose = noop;
			
		// setup animations so this doesn't have to be done
		// multiple times
		if (!ANIMATORS) {
			const generated = generateAnimationFrames(animator.manifest.crowd);
			ANIMATORS = generated.animators;
		}

		// legs are used to set the shadow position
		let legs;

		// get the source
		const spritesheet = await animator.getSpritesheet('crowd');
		const { layers } = animator.manifest.crowd;

		// create the container for the actor
		const container = new PIXI.Container();
		
		// random selections for type, animation, and palette
		const actor = choose(data.actor);
		const playback = choose(ANIMATORS);
		const palette = getNextPalette();

		// not all properties are supported
		const { props = { } } = data;
		if ('x' in props)
			container.x = animator.evaluateExpression(props.x);

		if ('y' in props)
			container.y = animator.evaluateExpression(props.y);
		
		// create animations?
		// TODO: does not support animations, but would be easy to add

		// assemble each of the layers
		const character = { };
		for (const layer of layers) {
			const meta = LAYERS[layer.sprite];

			// the object that will be attached
			let obj;

			// create the new sprite
			const key = selectRandomSprite(spritesheet, `${actor}_${meta.sprite}`);
			if (!key) {
				console.error(`Sprite ${layer.sprite} does not exist for actor ${actor}`);
				throw new MissingCrowdSprite();
			}

			// create the sprite
			const sprite = obj = await animator.getSprite('crowd', key);
			sprite.tint = palette[layer.sprite];

			// save the legs since it'll be used for
			// placement of the shadow later
			if (layer.sprite === 'legs') legs = sprite;
			
			// check for special attachments
			if (meta.attachments) {

				// for containers with attachments, create a new
				// container to place items into
				const target = new PIXI.Container();

				// try and attach each one
				// for (const attachment of meta.attachments) {
				for (let i = 0; i < meta.attachments.length; i++) {
					await attachExtra(animator, sprite, spritesheet, target, actor, meta.attachments[i], palette);
				}

				// if this successfully added some attachments, move
				// the original element inside
				if (target.children.length > 0) {
					target.addChildAt(sprite, 0);
					obj = target;
				}
			}

			// adjust the scale
			container.addChildAt(obj, 0);
			
			// pivot from the correct joint positions
			obj.pivot.x = sprite.width * 0.5;
			obj.pivot.y = sprite.height * meta.pivot;
			obj.scale.x *= meta.flipX ? -1 : 1;

			// attach this to the shared animator
			playback.register(layer.sprite, obj);

			// create a cleanup function
			dispose = appendFunc(dispose, () => playback.unregister(layer.sprite, obj));
		}

		// add the shadow
		await attachShadow(animator, container, legs);

		// scale
		container.scale.x = CROWD_DEFAULT_SCALE;
		container.scale.x *= (0.9 + (0.2 * Math.random()));
		container.scale.y = container.scale.x;

		// randomly flip
		container.scale.x *= Math.random() > 0.5 ? -1 : 1;
		
		// assign the main container positions
		return { displayObject: container, update: noop, dispose };

	}
	catch (ex) {
		console.error('Failed to create crowd member');
		console.error(ex);
		return { displayObject: new PIXI.Container(), update: noop, dispose: noop };
	}

}


// includes a random attachment
async function attachExtra(animator, relativeTo, spritesheet, target, actor, attachment, palette) {
	const { offsetY, type, chance } = attachment;
	
	// check for the chance to include this
	if (Math.random() > chance) return;

	// select a random sprite
	const prefix = `${actor}_attachment_${type}`;
	const key = selectRandomSprite(spritesheet, prefix);
	
	// if nothing, then just cancel
	if (!key) return;
	
	// load the sprite
	const sprite = await animator.getSprite('crowd', key);

	// check for palette info
	const category = key.substr(prefix.length).replace(/[^a-z]/gi, '');
	if (category in palette) {
		sprite.tint = palette[category];
	}

	// apply alignment
	sprite.pivot.x = sprite.width / 2;
	sprite.x = relativeTo.width / 2;
	sprite.y += offsetY || 0;

	// add to the view
	target.addChildAt(sprite, 0);

}



// adds a shadow to a sprite
async function attachShadow(animator, container, relativeTo) {
	// const shadow = await animator.getSprite('crowd', 'shadow');
	// container.addChildAt(shadow, 0);

	// // position the shadow at the bottom
	// shadow.pivot.y = shadow.height * 0.75;
	// shadow.pivot.x = shadow.width * 0.5;
	// shadow.y = relativeTo.y + relativeTo.height;
	// shadow.x = relativeTo.x;
	// shadow.scale.x = shadow.scale.y = (relativeTo.width / shadow.width) * 2;
	// shadow.alpha = 0.75;
}


// finds attachments for a part
function selectRandomSprite(spritesheet, prefix, type) {
	
	// check for attachments for this combination
	let options = SPRITES[prefix];
	if (!options) {

		// get all allowed options
		options = [ ]
		for (const id in spritesheet) {
			if (id.substr(0, prefix.length) === prefix)
				options.push(id);
		}

		// save for later
		SPRITES[prefix] = options;
	}

	// make a random selection
	return choose(options);
}



// selects a new palette to use
function getNextPalette() {
	const hair = PALETTES.hair.pop();
	const hat = PALETTES.hat.pop();
	const skin = PALETTES.skin.pop();
	const primary = PALETTES.primary.pop();
	const secondary = PALETTES.secondary.pop();

	// cycle
	PALETTES.hair.unshift(hair);
	PALETTES.hat.unshift(hat);
	PALETTES.skin.unshift(skin);
	PALETTES.primary.unshift(primary);
	PALETTES.secondary.unshift(secondary);

	// check for shortsleve shirts
	const shortSleve = Math.random() < 0.5;

	// determine each value
	return {
		head: skin,
		hair,
		hat,
		hand_l: skin,
		hand_r: skin,
		arm_l: shortSleve ? skin : primary,
		arm_r: shortSleve ? skin : primary,
		shoulder_r: primary,
		shoulder_l: primary,
		torso: primary,
		legs: secondary,
	};
}


// exceptions
function MissingCrowdSprite() { }
function UnknownCrowdAnimationError() { }