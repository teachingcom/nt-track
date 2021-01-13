import { BaseView } from "./base";
import { PIXI } from 'nt-animator';
import { merge } from "../utils";
import Player from "./track/player";
import * as audio from '../audio';

// baseline height value for responsive scaling
const PREFERRED_HEIGHT = 800;

// creates a general rendering view
export default class ComposerView extends BaseView {

	/** prepare the view */
	init = options => {
		// check for sound
		audio.configureSFX({ enabled: !!options.silent });

		super.init({ ...options,
			scale: { height: PREFERRED_HEIGHT },
			backgroundColor: 0x222835,
			includeShadows: true,
			autoRender: true
		});
	}

	/** composes anything found at each node */
	compose = async data => {
		const { stage } = this;

		// create a container for the compositions
		const view = new PIXI.ResponsiveContainer();
		view.relativeX = 0.5;
		view.relativeY = 0.5;
		stage.addChild(view);

		// // check for cars first
		// for (const car of data.cars || []) {
		// 	const instance = await Car.create({
		// 		view: this,
		// 		...car
		// 	})

		// 	view.addChild(instance);
		// }


		// if there are comps, render those alone
		if (data.comps.length) this.renderComps(data, view);
		else this.renderScene(data, view);
	}

	// plays a sound effect
	sounds = [ ];
	playSfx = async (type, source, sprite) => {
		const { options } = this;
		await audio.register(source, source === 'common' ? options.manifest.sounds : null);
		const sound = audio.create(type, source, sprite);
		this.sounds.push(sound);
	}

	// renders general compositions
	renderComps = async (data, view) => {
		const { animator } = this;
		for (const path of data.comps) {

			// this is a sound effect request
			// doesn't happen often
			if (path.substr(0, 4) === 'sfx/') {
				const args = path.split(/\/+/g);
				await this.playSfx(...args);
				continue;
			}

			// creates a comp
			const comp = await animator.create(path);
			view.addChild(comp);
		}

		// play sounds, if any
		for (const sound of this.sounds) {
			sound.enabled = true;
			sound.play();
		}
	}

	// renders game scenes like cars and tracks
	renderScene = async (data, view) => {

		// ensure there's a car
		let [ car ] = data.cars;
		if (!car) {
			car = { hue: 0, type: 'missing', mods: { } };
			attachMod(data.nitros, car.mods);
			attachMod(data.trails, car.mods);
		};

		// create the player
		const options = { view: this, baseHeight: PREFERRED_HEIGHT * 0.5, ...car };
		const player = await Player.create(options);
		view.addChild(player);

		// middle of screen
		player.relativeY = 0.5;

		// align for values
		player.relativeX = car.mods.nitro ? 0.8
			: car.mods.trail ? 0.65
			: 0.5;

		// save the player preview
		this.player = player;

		console.log(player);
	}

	activateNitro() {
		if (this.player) {
			this.player.car.activateNitro();
		}

	}
	
}

// creates a mod from a path
function attachMod(source, mods) {
	const [ path ] = source;
	if (!path) return;

	// get the parts
	const [key, value] = path.split(/\//);
	mods[key.substr(0, key.length - 1)] = value;
}

// // adds a component to the view
// async function addComponent(view, baseHeight, Component, options) {
// 	options = merge({ view, baseHeight }, options);
// 	return await Component.create(options);
// }

