
// TODO: anti aliasing isn't great - consider creating
// multiple versions that are pre-scaled using canvas

import * as PIXI from 'pixi.js';
import { findDisplayObjectsOfRole } from 'nt-animator';
import { merge } from '../../utils';
import generateTextures from './texture-generator';
import { tween, easing } from 'popmotion';

import { CAR_SHADOW_OPACITY, CAR_MAXIMUM_SHAKE, CAR_BODY_OFFSET_Y, CAR_SHADOW_OFFSET_Y } from '../../config';
import { LAYER_CAR, LAYER_SHADOW, LAYER_NITRO_BLUR } from '../../views/track/layers';
import { createStaticCar } from './create-static-car';


export default class Car extends PIXI.Container {

	/** handles creating a new car */
	static async create(options) {
		const instance = new Car();
		
		// determine the type to create
		const { type, view } = options;
		const path = `cars/${type}`;
		const config = view.animator.lookup(path);
		merge(instance, { options, view, path, config });
		
		// initialize the car
		await instance._initCar();
		instance._initFilters();

		// return the created car
		return instance;
	}
	

	// creates the car instance
	async _initCar() {
		const { path, config, view, options } = this;
		const { type, baseHeight } = options;
		const { staticUrl } = view.options;

		// deciding textures to render
		const includeNormalMap = view.options.includeNormalMaps;
		let includeShadow = view.options.includeShadows;

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
				console.warn(`Cars should only have one 'base' role layer. Using first detected base`);
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

		// save the car instance
		this.car = car;

		// load any textures
		this._initTextures(imageSource, includeShadow, includeNormalMap);

		// add the car to the view
		this.addChild(car);
	}

	// setup visual filters
	_initFilters = () => {
		const { options } = this;
		const { hue = 0 } = options;

		// create a color matrix
		const color = this.matrix = new PIXI.filters.ColorMatrixFilter();
		color.hue(hue);

		// setup anti-aliasing (this doesn't seem to work well)
		const aa = this.aa = new PIXI.filters.FXAAFilter();
		
		// apply filters
		this.car.filters = [ aa, color ];
	}

	// handles generating dynamic textures
	_initTextures(imageSource, includeShadow, includeNormalMap) {
		const { options, car } = this;
		const { hue = 0, hasNitro = false } = options;
		const scale = car.scale.x;

		// create textures for this vehicle
		const { normalMap, nitroBlur, shadow } = generateTextures(imageSource, {
			includeNormalMap,
			includeShadow,
			includeNitroBlur: hasNitro,
			nitroBlurHue: hue
		});

		// apply each, if possible
		if (shadow) {
			this.shadow = shadow;
			shadow.blendMode = PIXI.BLEND_MODES.MULTIPLY;
			
			// align to the center
			shadow.pivot.x = shadow.width / 2;
			shadow.pivot.y = shadow.height / 2;
			shadow.alpha = CAR_SHADOW_OPACITY;
			
			// match the car scale
			shadow.scale.x = shadow.scale.y = scale;
		}

		// nitro blurs should be put into another container
		// since they will be scaled and animated
		if (nitroBlur) {
			const nitroBlurContainer = new PIXI.Container();
			this.nitroBlur = nitroBlurContainer;
			this.nitroBlur.alpha = 0;
			
			// add to the container
			nitroBlurContainer.addChild(nitroBlur);

			// adjust
			nitroBlur.blendMode = PIXI.BLEND_MODES.ADD;
			nitroBlur.pivot.x = nitroBlur.width / 2;
			nitroBlur.pivot.y = nitroBlur.height / 2;

			// match the car scale
			nitroBlur.scale.x = nitroBlur.scale.y = scale;
		}
		
		// the normal map, if any
		this.normalMap = normalMap;
	}

	/** attaches a car to a container */
	attachTo(view) {
		const { scale } = view;
		const { car, shadow, nitroBlur } = this;
		
		// include the car
		view.addChild(this);
		this.zIndex = LAYER_CAR;
		car.y = CAR_BODY_OFFSET_Y;
		
		// include the shadow
		if (shadow) {
			view.addChild(shadow);

			// position just beneat the car a bit
			shadow.zIndex = LAYER_SHADOW;
			shadow.y = CAR_SHADOW_OFFSET_Y * scale.y;
		}
		
		// if this has a nitro blurring effect
		if (nitroBlur) {
			view.addChild(nitroBlur);
			nitroBlur.zIndex = LAYER_NITRO_BLUR;

			// position near the back of the car so
			// that when in "nitro" mode, the effect
			// is lined up correctly
			nitroBlur.y = CAR_BODY_OFFSET_Y - 10;
			nitroBlur.x = (this.car.width * 0.75);
			nitroBlur.pivot.x = nitroBlur.width / 2;
		}
		
		// nitroBlur.scale.x = 1.5
		// nitroBlur.pivot.x = nitroBlur.width / -2;
		// nitroBlur.rotation = 1;
	}

	offset = { x: 0, y: 0 }

	/** handles activating the car nitros */
	activateNitro = () => {
		const { car, nitro } = this;
		const { x, y, scaleX = car.scale.x, scaleY = car.scale.y } = car;
		car.pivot.x = 0;

		const update = props => {
			car.x = props.x;
			this.offset.y = props.y;
			car.skew.y = props.skewY;
			car.skew.x = props.skewX;
			car.scale.x = props.scaleX;
			car.scale.y = props.scaleY;

			nitro.assign({ alpha: props.alpha })

			this.nitroBlur.alpha = props.alpha;
			this.nitroBlur.scale.x = props.blur;
		}

		const origin = { skewY: 0, skewX: 0, rotation: 0, scaleX, scaleY, x, y: 0, alpha: 0, blur: 0.4 };
		const destination = { skewY: -0.085, skewX: 0.05, scaleX: scaleX - 0.01, scaleY: scaleY + 0.02, rotation: 0.05, x: -15, y: -5, blur: 1.3, alpha: 2 };

		this.isNitro = true;
		const outtro = () => {
			this.isNitro = false;
			tween({
				duration: 700,
				ease: easing.bounceOut,
				from: Object.assign({ }, destination),
				to: Object.assign({ }, origin),
			})
			.start({ update });
		}

		tween({ 
			duration: 250,
			from: Object.assign({ }, origin),
			to: Object.assign({ }, destination)
		})
		.start({
			update,
			complete: () => setTimeout(outtro, 2500)
		})
		

		// const neutral = { { x: 0, y } }
		// const boost = { { x: 0, y } }
		// tween(props, {

		// })

	}
	
	/** rattles a car by the amount provided */
	rattle(amount) {
		let shake = ((CAR_MAXIMUM_SHAKE * amount) * Math.random()) - (CAR_MAXIMUM_SHAKE / 2);

		if (this.isNitro) {
			shake *= 2.125;
		}

		this.car.y = CAR_BODY_OFFSET_Y + this.offset.y + shake;
		this.shadow.y = CAR_SHADOW_OFFSET_Y + (shake * 0.33);
		// this.nitroBlur.y = (CAR_BODY_OFFSET_Y + 10 + this.offset.y + (shake * 2));

		// this.car.pivot.x = 0;
		// this.car.skew.y = -0.1;
		// this.car.skew.x = 0.1;
		// this.car.rotation = 0.05;
		// this.car.x = -15;
		// this.car.y = -10;
		// this.car.scale.x = 0.4;
	}

}
