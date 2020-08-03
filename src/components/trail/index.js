import * as PIXI from 'pixi.js';
import { PIXI as AnimatorPIXI } from 'nt-animator';
import { merge, isNumber } from '../../utils';

export default class Trail extends AnimatorPIXI.DetatchedContainer {

	/** handles creating the new trail instance */
	static async create(options) {
		const { type, view } = options;
		const path = `trails/${type}`;
		const config = view.animator.lookup(path);

		// if this doesn't exist, don't try and create
		if (!config) return;
		
		// determine the type to create
		const instance = new Trail();
		merge(instance, { options, view, path, config });
		
		// initialize all car parts
		await instance._initTrail();

		// if this didn't load for some reason
		if (!instance.isValid) return;
		
		// give back the instance
		return instance;
	}

	// start creating loot
	async _initTrail() {
		const { view, options } = this;
		const { type } = options;

		// load the animation
		const path = `trails/${type}`;
		const trail = this.trail = await view.animator.create(path);
		if (!trail) {
			console.error(`Unable to create trail "${path}"`);
			return;
		}

		// save the config
		const config = this.config = await view.animator.lookup(path);

		// use a color filter, if any
		if (isNumber(config.hue)) {
			const color = this.colorFilter = new PIXI.filters.ColorMatrixFilter();
			color.hue(config.hue || 0);
			
			// create a color matrix
			for (const child of trail.children) {
				child.filters = [ color ];
			}
		}

		// save the trail instance
		this.parts = trail.children.slice();
		this.addChild(trail);
	}

	/** is a valid Trail instance */
	get isValid() {
		return this.parts && this.parts.length > 0;
	}

	/** deactivates the trail */
	stop() {
		this.trail.controller.stopEmitters();
	}

}