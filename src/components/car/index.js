
// TODO: anti aliasing isn't great - consider creating
// multiple versions that are pre-scaled using canvas

import { PIXI, findDisplayObjectsOfRole, createPlaceholderImage } from 'nt-animator';
import { merge, isNumber, noop } from '../../utils';
import { createStaticCar } from './create-static-car';

// layers and positions
import { LAYER_CAR, LAYER_SHADOW, LAYER_NITRO_BLUR } from '../../views/track/layers';
import {
	CAR_SHADOW_OPACITY,
	CAR_SHAKE_DISTANCE,
	CAR_BODY_OFFSET_Y,
	CAR_SHADOW_OFFSET_Y,
	CAR_SHADOW_SCALE_ADJUST,
	STATIC_CAR_ROTATION_FIX,
	NITRO_BLUR_OFFSET_Y,
	CAR_DEFAULT_FRONT_BACK_OFFSET_X,
	NITRO_BLUR_DEFAULT_OFFSET_X,
	CAR_SHAKE_NITRO_BONUS,
	CAR_SHAKE_SHADOW_REDUCTION,
	CAR_404_STATIC_VERSION
} from '../../config';

// animations
import ActivateNitroAnimation from '../../animations/activate-nitro';
import generateTextures from './texture-generator';
import hueShift from './hue-shift';
import { getCarAnimations, getCarPlugin, getCarOverrides } from '../../car-mappings';

export default class Car extends PIXI.Container {

	state = {

		// extra offsets used when performing the
		// nitro animation to keep the car alignment
		// centered
		offset: { x: 0, y: 0 }
	}

	/** handles creating a new car */
	static async create(options) {
		const instance = new Car();
		
		// determine the type to create
		const { view } = options;
		const type = getCarAnimations(options.type);
		const path = `cars/${type}`;
		const config = view.animator.lookup(path);
		merge(instance, { options, view, path, config });
		
		// initialize the car
		await instance._initCar();
		await instance._initFilters();

		// return the created car
		
		return instance;
	}
	
	// creates the car instance
	async _initCar() {
		const { path, config, view, options } = this;
		const { type, baseHeight } = options;
		
		// deciding textures to render
		const includeNormalMap = view.options.includeNormalMaps;
		const includeShadow = true; // view.options.includeShadows;

		// car: the container for the car instance
		// height: the identified height of the sprite to use
		// imageSource: used to identify the actual image for a car
		const { car, height, imageSource, bounds } = config
			? await this._createEnhancedCar(path)
			: await this._createStaticCar(type);
			
		// scale the car to match the preferred height, which is
		// the height of the car relative to the base size of the
		// stage itself - The ResponsiveContainer will handle the rest
		const scaleBy = car.scale.x = car.scale.y = baseHeight / height;
		
		// get positions to attach things
		const positions = this._establishPositions(bounds, scaleBy);

		// shift everything to align to the front of the car
		const front = positions.front;
		this.pivot.x = front;
		for (const id in positions)
			positions[id] -= front;

		// save the car and positions
		this.positions = positions;
		this.car = car;
		this.bounds = bounds;

		// load any textures
		await this._initTextures();

		// add the car to the view
		this.addChild(car);

		// initialize plugins as required
		this.plugin = getCarPlugin(type);
		if (this.plugin) {
			this.plugin({
				animator: this.view.animator,
				car: this
			});
		}

	}

	// creates a car when the resource is missing
	_createMissingCar = async () => {
		
		// prevent accidental recursive calls
		// TODO: if this fails at loading the missing car
		// then potentially use the canvas to draw something
		if (this.isUsingMissingCar) {
			return this._createGeneratedCar();
		}
		
		// create the missing car instance
		this.options.hue = (0 | Math.random() * 36) * 10;
		
		// TODO: if the missing car needs to be animated, then
		// use the enhanced car loader
		// return this._createEnhancedCar(CAR_404_ENHANCED_VERSION);
		this.isUsingMissingCar = true;
		return this._createStaticCar(CAR_404_STATIC_VERSION);
	}

	// overrideable functions
	onFinishRace = noop
	onUpdate = noop

	// if this happens then we're seriously struggling to get
	// a car image - at this point use a backup
	_createGeneratedCar = () => {
		const car = new PIXI.Container();
		const height = 250;
		const width = 500;
		const placeholder = createPlaceholderImage({ width, height });
		const texture = PIXI.Texture.from(placeholder);
		const sprite = new PIXI.Sprite(texture);
		
		// this is all very temporary
		sprite.pivot.x = 0 | ((width / 2) / sprite.scale.x);
		sprite.pivot.y = 0 | ((height / 2) / sprite.scale.y);
		car.addChild(sprite);

		// give back required data
		return {
			car,
			imageSource: sprite,
			height,
			bounds: sprite.getBounds()
		};
	}

	// creates a car from a static resource
	_createStaticCar = async type => {
		const { view } = this;
		const { getCarUrl } = view.options;
		const car = new PIXI.Container();

		// check for mods (rotation, flipping, etc)
		const overrides = getCarOverrides(type);
		
		// get the sprite to render
		let sprite;
		const url = getCarUrl(type);
		try {
			sprite = await createStaticCar(url);

			// if this failed to load
			if (!sprite) {
				return this._createMissingCar();
			}
		}
		// if this failed to find the image
		catch (ex) {
			console.error(`Failed to load ${url}`);
			return this._createMissingCar();
		}
		
		const height = sprite.height;
		const imageSource = sprite;

		// place this car into a container
		car.addChild(sprite);

		// static cars face the opposite direction
		sprite.rotation = STATIC_CAR_ROTATION_FIX;
		
		// adjust as required
		if (overrides) {
			sprite.rotation += overrides.rotation || 0;
			sprite.scale.x *= overrides.flipX ? -1 : 1;
			sprite.scale.y *= overrides.flipY ? -1 : 1;
		}

		// adjust the center point
		sprite.pivot.x = sprite.width / 2;
		sprite.pivot.y = sprite.height / 2;

		const bounds = sprite.getBounds();
		return { car, imageSource, bounds, height };
	}


	// creates a car that has enhanced effects
	_createEnhancedCar = async path => {
		const { view, config } = this;
		this.isUsingMissingCar

		// try and load a new car asset
		let car;
		try {
			car = await view.animator.create(path);
			if (!car) {
				car = await this._createMissingCar();
			}
		}
		catch (ex) {
			console.error(`Failed to create ${path}`);
			car = await view.animator.create(path);
		}

		// find the base layer for the car - if there's
		// more than one, just use the first one and
		// warn that it can't be done
		// NOTE: it is possible to use multiple base layers, but the
		// texture rendering step expects a single object or container
		// it's possible to make that process accept multiple, but at
		// the moment, it doesn't seem needed
		let bounds;
		const layers = findDisplayObjectsOfRole(car, 'base');

		// bounds were defined in advance - special scenarios
		if (isNumber(config.height)) {
			bounds = { height: config.height };
		}
		// detect the bounds
		else {
			if (layers.length > 1) {
				console.warn(`Cars should only have one 'base' role layer. Using first detected base`);
			}
			else if (layers.length === 0) {
				console.warn(`Cars should at least one 'base' role layer. Using entire composition`);
			}

		}
		
		// get the base to use -- without a base
		// then just use the entire car
		const base = layers[0] || car;
		bounds = bounds || base.getBounds();

		// save the size and layer to use
		const height = bounds.height;
		const imageSource = base;

		return { car, height, bounds, imageSource };
	}


	// setup visual filters
	async _initFilters() {
		const { options, car } = this;
		const { hue = 0 } = options;

		// no shifting was required
		if (!hue) return;

		// recolor as needed
		try {
			await hueShift(car, hue);
		}
		catch (ex) {
			console.warn('failed', ex);
		}
	}


	// handles generating dynamic textures
	async _initTextures() {
		const { car, view } = this;

		// create textures for this vehicle
		const nitroBlur = await view.animator.getSprite('images', 'nitro_blur');

		// nitro blurs should be put into another container
		// since they will be scaled and animated
		if (nitroBlur) {
			const nitroBlurContainer = new PIXI.Container();
			this.nitroBlur = nitroBlurContainer;
			this.nitroBlur.alpha = 0;
			
			// add to the container
			nitroBlurContainer.addChild(nitroBlur);

			// align
			nitroBlur.blendMode = PIXI.BLEND_MODES.ADD;
			nitroBlur.pivot.x = nitroBlur.width * 0.66;
			nitroBlur.pivot.y = nitroBlur.height * 0.6;

			// scale
			const ratio = car.height / nitroBlur.height;
			nitroBlur.height = car.height * 0.85;
			nitroBlur.width *= ratio;
		}
	}

	/** returns the scaling for the car */
	getRelativeSize() {
		const { width, height } = this.car.getBounds();
		const { x, y } = this.car.scale;
		return { width: width * x, height: height * y };
	}

	/** changes the x position of the car */
	setX = x =>  {
		const { shadow } = this;
		this.x = x;
		if (shadow) {
			shadow.x = x;
		}
	}

	/** changes the y position of the car */
	setY = y =>  {
		const { shadow, nitroBlur, state, scale, hasNitro } = this;
		
		// default y positions
		this.y = CAR_BODY_OFFSET_Y + y;
		if (shadow) {
			shadow.y = (CAR_SHADOW_OFFSET_Y * scale.y) + (y * CAR_SHAKE_SHADOW_REDUCTION);
		}

		// nitro blur shifting
		if (hasNitro) {
			nitroBlur.y = (CAR_BODY_OFFSET_Y + NITRO_BLUR_OFFSET_Y) + (y * 1.5);
		}
	}

	moveShadow = (x, y) => {
		const shadows = findDisplayObjectsOfRole(this, 'shadow');
		for (const shadow of shadows) {
			shadow.x *= x;
			shadow.y *= y;
		}
	}

	/** attaches a car to a container */
	attachTo(view) {
		const { shadow, positions, nitroBlur } = this;
		
		// include the car
		view.addChild(this);
		this.zIndex = LAYER_CAR;
		
		// include the shadow
		if (shadow) {
			view.addChild(shadow);

			// position just beneat the car a bit
			shadow.zIndex = LAYER_SHADOW;
		}
		
		// if this has a nitro blurring effect
		if (nitroBlur) {
			view.addChild(nitroBlur);
			nitroBlur.zIndex = LAYER_NITRO_BLUR;

			// position near the back of the car so
			// that when in "nitro" mode, the effect
			// is lined up correctly
			nitroBlur.x = positions.nitroBlurX;
			nitroBlur.pivot.x = nitroBlur.width / 2;
		}

		// reset the position
		this.setY(0);
	}

	// identifies positions on a car
	_establishPositions = (bounds, scale) => {
		const { config } = this;

		// assign a value if is a number
		const assignIf = (source, target) => {
			if (isNumber(source)) positions[target] = source;
		};
		
		// get the default set
		const positions = {
			back: bounds.width * scale * -CAR_DEFAULT_FRONT_BACK_OFFSET_X,
			front: bounds.width * scale * CAR_DEFAULT_FRONT_BACK_OFFSET_X,
			nitroBlurX: bounds.width * scale * NITRO_BLUR_DEFAULT_OFFSET_X,
		};

		// reuse a few values
		positions.nitroX = positions.back;

		// check for customizations
		if (!!config?.positions) {
			assignIf(config.positions.back, 'back');
			assignIf(config.positions.back, 'nitroX');
			assignIf(config.positions.nitroX, 'nitroX');
			assignIf(config.positions.front, 'front');
			assignIf(config.positions.nitroBlurX, 'nitroBlurX');
		}

		return positions;
	}

	/** associates mods with a specific car */
	attachMods({ trail, nitro }) {
		this.trail = trail;
		this.nitro = nitro;
		this.hasTrail = !!trail;
		this.hasNitro = !!nitro;
	}

	/** handles activating the car nitros */
	activateNitro = () => {
		const { car, nitro, trail, shadow, nitroBlur, state } = this;

		// no nitro to activate
		if (!nitro) return;

		// perform the animation
		const { offset } = state;
		this.nitroAnimation = new ActivateNitroAnimation({
			car, nitro, trail, shadow, nitroBlur
		});

		// start the animation
		state.isNitro = true;
		this.nitroAnimation.play({
			complete: () => state.isNitro = false
		});
	}
	
	/** rattles a car by the amount provided */
	rattle(amount) {
		const { state } = this;
		const { isNitro } = state;

		// calculate the default amount to shake the car around
		let shake = ((CAR_SHAKE_DISTANCE * Math.random()) - (CAR_SHAKE_DISTANCE / 2)) * amount;
		if (isNitro) {
			shake *= CAR_SHAKE_NITRO_BONUS;
		}

		// update the y position
		this.setY(shake);
	}

}


