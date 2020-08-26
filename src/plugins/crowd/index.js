import * as PIXI from 'pixi.js';
import { noop, choose, shuffle } from '../../utils';
import { CROWD_DEFAULT_SCALE,CROWD_ANIMATION_FRAME_COUNT, CROWD_ANIMATION_DURATION } from '../../config';
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

// collection of frame textures
const FRAMES = [ ];

// TODO: support depending on track type
/** initalizes a reusable crowd */
async function initializeCrowd(animator, controller, path, layer, data) {
	
	// frames have already been generated
	if (!!FRAMES.length) return;

	// preload possible animations
	const generated = generateAnimationFrames(animator.manifest.crowd);
	ANIMATORS = generated.animators;

	// create a offscreen renderer for the crowd
	const renderer = new PIXI.Renderer({ transparent: true });

	// generate all of the people for the crowd
	const crowd = new PIXI.Container();

	// create a few people
	for (let i = 0; i < 10; i++) {
		
		// create each person
		const member = await createCrowdMember(animator, controller, path, layer, data);
		crowd.addChild(member);

		// TODO: this is hardcoded, but should change
		// depending on the crowd type
		member.zIndex = i % 2 === 0 ? 1 : 0;
		member.x = 200 + (i * 120);
		member.y += 200 + (Math.sin(i) * 10);
	}

	// establish the rendering area
	crowd.sortChildren();
	const contain = crowd.getBounds();
	renderer.resize(0 | (contain.width * 1.2), contain.height);

	// async generation
	return new Promise((resolve, reject) => {
		const timePerStep = CROWD_ANIMATION_DURATION / CROWD_ANIMATION_FRAME_COUNT;
		let frameNumber = -1;
		function next() {

			// finished rendering
			if (frameNumber++ >= CROWD_ANIMATION_FRAME_COUNT)
				return resolve();
	
			// update the sequence
			for (const playback of ANIMATORS)
				playback.seek(frameNumber * timePerStep);
	
			// generate the frame
			renderer.render(crowd);
	
			// save the texture
			const frame = renderer.plugins.extract.canvas();
			const texture = PIXI.Texture.from(frame);
			FRAMES.push(texture);

			// Helpful if you want to see what was rasterized
			// document.body.appendChild(frame);
			// frame.className = 'debug';
	
			// queue up the next
			requestAnimationFrame(next);
		}

		// kick off the rendering process
		next();
	});

}

/** handles creating a small crowd */
export default async function createCrowd(animator, controller, path, layer, data) {

	// prepare the crowd for use
	await initializeCrowd(animator, controller, path, layer, data);

	// create the crowd
	const sprite = new PIXI.AnimatedSprite(FRAMES)
	sprite.animationSpeed = 0.2 + (Math.random() * 0.1);
	sprite.gotoAndPlay(0 | (Math.random() * sprite.totalFrames));
	sprite.scale.x = sprite.scale.y = CROWD_DEFAULT_SCALE;
	sprite.pivot.y = sprite.height;
	sprite.play();

	// randomize direction?
	// doesn't work great because when flipped, two identical people
	// are side by side
	// sprite.pivot.x = 0 | (sprite.width / 2);
	// sprite.scale.x *= Math.random() < 0.5 ? -1 : 1;

	// not all properties are supported
	const { props = { } } = data;
	if ('x' in props)
		sprite.x = animator.evaluateExpression(props.x);

	if ('y' in props)
		sprite.y = animator.evaluateExpression(props.y);

	return [{ displayObject: sprite, update: noop, dispose: noop }]

}

// generates a random crowd member
async function createCrowdMember(animator, controller, path, layer, data) {
	try {

		// legs are used to set the shadow position
		let legs;

		// get the source
		const spritesheet = await animator.getSpritesheet('crowd');
		const { layers } = animator.manifest.crowd;

		// create the container for the actor
		const container = new PIXI.Container();

		// random selections for type, animation, and palette
		const actor = choose(data.actor);
		const animation = choose(ANIMATORS);
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
			sprite.batch = 'crowd';

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
			container.batch = 'crowd';
			
			// pivot from the correct joint positions
			obj.pivot.x = sprite.width * 0.5;
			obj.pivot.y = sprite.height * meta.pivot;
			obj.scale.x *= meta.flipX ? -1 : 1;

			// attach this to the shared animator
			animation.register(layer.sprite, obj);
		}

		// add the shadow
		await attachShadow(animator, container, legs);

		// scale
		container.scale.x = (0.9 + (0.2 * Math.random()));
		container.scale.y = container.scale.x;

		// randomly flip
		container.scale.x *= Math.random() > 0.5 ? -1 : 1;
		
		return container;

	}
	catch (ex) {
		console.error('Failed to create crowd member');
		console.error(ex);
		return new PIXI.Container();
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
	sprite.batch = 'crowd';

	// add to the view
	target.addChildAt(sprite, 0);

}



// adds a shadow to a sprite
// seems not needed
async function attachShadow(animator, container, relativeTo) {
	const shadow = await animator.getSprite('crowd', 'shadow');
	container.addChildAt(shadow, 0);

	// position the shadow at the bottom
	shadow.pivot.y = shadow.height * 0.75;
	shadow.pivot.x = shadow.width * 0.5;
	shadow.y = relativeTo.y + relativeTo.height;
	shadow.x = relativeTo.x;
	shadow.scale.x = shadow.scale.y = (relativeTo.width / shadow.width) * 2;
	shadow.alpha = 0.75;
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