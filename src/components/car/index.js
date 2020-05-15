
// TODO: anti aliasing isn't great - consider creating
// multiple versions that are pre-scaled using canvas


import * as PIXI from 'pixi.js';
import { loadImage, getBoundsForRole, findDisplayObjectsOfRole } from 'nt-animator';
import { merge } from '../../utils';
import generateTextures from './texture-generator';
import { CAR_SHADOW_OPACITY, CAR_MAXIMUM_SHAKE, CAR_BODY_OFFSET_Y, CAR_SHADOW_OFFSET_Y } from '../../config';


export default class Car extends PIXI.Container {

	/** handles creating a new car */
	static async create(options) {
		const instance = new Car();
		
		// determine the type to create
		const { type, view } = options;
		const path = `cars/${type}`;
		const config = view.animator.lookup(path);
		merge(instance, { options, view, path, config });
		
		// initialize all car parts
		await instance._initCar();

		// return the created car
		return instance;
	}
	

	// creates the car instance
	async _initCar() {
		const { path, config, view, options } = this;
		const { type, hue = 0, baseHeight } = options;
		const { staticUrl } = view.options;

		// deciding textures to render
		const includeNormalMap = false; // TODO: depends on view options
		let includeShadow = false; //TODO: depends on view options

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
			car = await createStaticCar(staticUrl, type);
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

			// find the base layer for the car - if there's
			// more than one, just use the first one and
			// warn that it can't be done
			// NOTE: it is possible to use multiple base layers, but the
			// texture rendering step expects a single object or container
			// it's possible to make that process accept multiple, but at
			// the moment, it doesn't seem like a good use of time
			const layers = findDisplayObjectsOfRole(car, 'base');
			if (layers.length > 1) {
				console.warn(`Cars can only have one 'base' role layer. Using first detected base`);
			}

			// get the base to use -- without a base
			// then just use the entire car
			const base = layers[0] || this;
			const bounds = base.getBounds();

			// save the size and layer to use
			height = bounds.height;
			imageSource = base;

			// scale to the base layer
			includeShadow = true;
		}
		
		// scale the car to match the preferred height, which is
		// the height of the car relative to the base size of the
		// stage itself - The ResponsiveContainer will handle the rest
		car.scale.x = car.scale.y = baseHeight / height;

		// apply the hue shift
		const matrix = this.matrix = new PIXI.filters.ColorMatrixFilter();
		// const aa = this.aa = new PIXI.filters.FXAAFilter();
		car.filters = [ matrix ];
		matrix.hue(hue);
		
		// save the car instance
		this.car = car;

		// load any textures
		this._initTextures(imageSource, includeShadow, includeNormalMap);

		// add the car to the view
		this.addChild(car);
	}

	// handles generating dynamic textures
	_initTextures(imageSource, includeShadow, includeNormalMap) {

		// create textures for this vehicle
		const { normalMap, shadow } = generateTextures(imageSource, {
			includeNormalMap,
			includeShadow
		});

		// apply each, if possible
		if (shadow) {
			this.shadow = PIXI.Sprite.from(shadow);
			this.shadow.blendMode = PIXI.BLEND_MODES.MULTIPLY;
			
			// align to the center
			this.shadow.pivot.x = this.shadow.width / 2;
			this.shadow.pivot.y = this.shadow.height / 2;
			this.shadow.alpha = CAR_SHADOW_OPACITY;
			
			// match the car scale
			this.shadow.scale.x = this.shadow.scale.y = this.car.scale.x;
		}
		
		// the normal map, if any
		if (normalMap) {
			this.normalTexture = PIXI.Texture.from(normalMap);
		}

	}
	
	/** rattles a car by the amount provided */
	rattle(amount) {
		const shake = ((CAR_MAXIMUM_SHAKE * amount) * Math.random()) - (CAR_MAXIMUM_SHAKE / 2);
		this.car.y = CAR_BODY_OFFSET_Y + shake;
		this.shadow.y = CAR_SHADOW_OFFSET_Y + (shake * 0.33);
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
