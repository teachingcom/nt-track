import { BaseView } from "./base";
import { PIXI as AnimatorPIXI } from 'nt-animator';
import { merge, isArray } from "../utils";
import Player from "./track/player";
import * as audio from '../audio';

// baseline height value for responsive scaling
const PREFERRED_HEIGHT = 800;

// creates a general rendering view
export default class ComposerView extends BaseView {

	/** prepare the view */
	init = options => {
		options = merge(options, {
			scale: { height: PREFERRED_HEIGHT },
			includeShadows: true
		});

		// check for sound
		if (options.silent)
			audio.configureSFX({ enabled: false });

		super.init(options);
	}

	/** composes anything found at each node */
	compose = async data => {
		const { stage } = this;

		// create a container for the compositions
		const view = new AnimatorPIXI.ResponsiveContainer();
		view.relativeX = 0.5;
		view.relativeY = 0.5;
		stage.addChild(view);

		// ensure there's a car
		let [ car ] = data.cars;
		if (!car) {
			car = { hue: 0, type: 'missing', mods: { } };
			attachMod(data.nitros, car.mods);
			attachMod(data.trails, car.mods);
		};

		// create the player
		const options = merge({ view: this, baseHeight: PREFERRED_HEIGHT * 0.5 }, car);
		const player = await Player.create(options);
		stage.addChild(player);

		// middle of screen
		player.relativeY = 0.5;

		// align for values
		player.relativeX = car.mods.nitro ? 0.8
			: car.mods.trail ? 0.65
			: 0.5;

		// save the player preview
		this.player = player;
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

