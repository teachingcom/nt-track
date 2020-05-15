import * as PIXI from 'pixi.js';
import { merge } from '../../utils';

export default class Trail extends PIXI.Container {

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
		const trail = await view.animator.create(path);
		if (!trail) {
			console.error(`Unable to create trail "${path}"`);
			return;
		}

		// save the trail instance
		this.parts = trail.children.slice();
		this.addChild(trail);
	}

	/** is a valid Trail instance */
	get isValid() {
		return this.parts && this.parts.length > 0;
	}

	/** applies a value to each part */
	assign(apply) {
		this.each(part => merge(part, apply));
	}

	/** applies a value to each part */
	each(action) {
		for (const part of this.parts)
			action(part);
	}

	/** attaches each child layer to the target container */
	attachTo(target) {
		const { parts } = this;

		// HACK: need to come up with a consistent way of
		// doing scaling for assets
		const scale = 0.5;

		// trails are attached as detatched
		for (let i = parts.length; i-- > 0;) {
			const child = parts[i];

			// match to the car layer
			child.scale.x = child.scale.y = scale;

			// then scale the x/y positions to match
			// the new scale
			child.x *= scale;
			child.y *= scale;

			// // lastly, move the effect to the back side
			// // of the car
			// child.x -= this.car.width * 0.5;

			// then add to the view
			target.addChild(child);
		}

		// console.log(trail);
		// this.addChild(trail);
		target.sortChildren();
	}

}