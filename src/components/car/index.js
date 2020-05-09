
// TODO: anti aliasing isn't great - consider creating
// multiple versions that are pre-scaled using canvas

import * as PIXI from 'pixi.js';
import { loadImage } from 'nt-animator';
import { merge } from '../../utils';

export default class Car extends PIXI.Container {

	constructor(options) {
		super();
		this.options = options;
	}

	/** handles creating a new car */
	static async create(options) {
		const { view } = options;
		
		// create the car instance
		const instance = new Car(options);
		const path = `cars/${options.type}`;
		merge(instance, {
			path,
			config: view.animator.lookup(path),
			view: options.view,
			options: options
		});
		
		// initialize all car parts
		await instance._initCar();
		await instance._initTrail();
		
		// give back the instance
		return instance;
	}
	
	// creates the car instance
	async _initCar() {
		const { view, config, options, path } = this;

		// tracking the height to scale relative to
		let height;

		// the PIXI object for the car, either a simple
		// image or sprite, or advanced animations car
		let car;

		// used to identify where to get the
		// actual image for a car
		let imageSource;

		// if this isn't an enhanced car, use the default image
		if (!config) {
			car = await createStaticCar(view.options.staticUrl, options.type);
			height = car.height;
			imageSource = car;

			// static cars face the opposite direction
			car.rotation = Math.PI;

			// adjust the center point
			car.pivot.x = car.width / 2;
			car.pivot.y = car.height / 2;
		}
		// create the car instance
		else {
			car = await view.animator.create(path);
			const { base } = car.instances;

			// scale to the base layer
			height = base.displayObject.height;
			imageSource = base.displayObject;
		}
		
		// scale the car to match the preferred height, which is
		// the height of the car relative to the base size of the
		// stage itself - The ResponsiveContainer will handle the rest
		car.scale.x = car.scale.y = options.baseHeight / height;

		// apply the hue shift
		const matrix = this.matrix = new PIXI.filters.ColorMatrixFilter();
		car.filters = [ matrix ];
		matrix.hue(options.hue || 0);
		// const aa = this.aa = new PIXI.filters.FXAAFilter();

		// identify the base image to use
		// TODO: this isn't ideal
		while (imageSource && !imageSource.isSprite)
			imageSource = imageSource.children[0];
		
		// save the car instance
		this.car = car;

		// add the car to the view
		this.addChild(car);
	}

	// start creating loot
	async _initTrail() {
		const { view, config, options } = this;

		// check there's an existing trail
		const type = options.loot && options.loot.trail;
		if (!type) return;

		// load the animation
		const path = `trails/${type}`;
		const trail = await view.animator.create(path);
		if (!trail) {
			console.error(`Unable to create trail "${path}"`);
			return;
		}

		// HACK: need to come up with a consistent way of
		// doing scaling for assets
		const scale = 0.5;

		// trails are attached as detatched
		for (let i = trail.children.length; i-- > 0;) {
			const child = trail.children[i];

			// match to the car layer
			child.scale.x = child.scale.y = scale;

			// then scale the x/y positions to match
			// the new scale
			child.x *= scale;
			child.y *= scale;

			// lastly, move the effect to the back side
			// of the car
			child.x -= this.car.width * 0.5;

			// then add to the view
			this.addChild(child);
		}

		// console.log(trail);
		// this.addChild(trail);
		this.sortChildren();

	}

}

// handles loading a legacy car
async function createStaticCar(baseUrl, type) {
	const url = `${baseUrl}/${type}.png`;
	try {
		const img = await loadImage(url);
		const texture = PIXI.Texture.from(img);
		return PIXI.Sprite.from(texture);
	}
	// needs to use a fallback?
	catch (ex) {
		console.error(`Failed to load ${url}`);
		console.error(ex);
	}
}
