import { PIXI, removeDisplayObject } from 'nt-animator';
import { isNumber, merge } from '../../utils';
import * as audio from '../../audio';
import { VOLUME_NITRO } from '../../audio/volume';
import { NITRO_OFFSET_Y, NITRO_SCALE } from '../../config';
import { LAYER_NITRO } from '../../views/track/layers';

export default class Nitro extends PIXI.Container {

	static createCycler(options, car, { interval = 5000, scale = 1, immediate, onActivate } = { }) {
		const container = new PIXI.Container()
		car.addChild(container)

		// set position
		Nitro.setLayer(container, car)
		Nitro.alignToCar(container, car, 1)
		car.sortChildren()

		let nitro

		// handle cycling nitro animations
		async function animate() {
			if (nitro) {
				nitro.dispose()
			}

			// create the new nitro
			nitro = await Nitro.create(options)
			
			// add to the view
			container.addChild(nitro)
			car.nitro = nitro

			
			// set the scaling
			nitro.scale.x = nitro.scale.y = scale
			
			// activate
			nitro.sound = null
			car.activateNitro()
			onActivate?.()
		}

		// play on an inverval
		const animationInterval = setInterval(animate, interval)

		if (immediate) {
			animate();
		}

		// give back a clear function
		const dispose = () => {
			clearInterval(animationInterval)
			nitro?.dispose()
		}

		return {
			dispose,
			nitro: container
		}
	}

	static setLayer(nitro, target = { zIndex: 0 }) {
		if (nitro?.config?.layer) {
		  if (nitro.isOverCar) {
				nitro.zIndex = target.zIndex + 1;
		  }
		  else if (isNumber(nitro.config.layer)) {
				nitro.zIndex = nitro.config.layer;
		  }
		}
		else {
		  nitro.zIndex = LAYER_NITRO;
		}
	}

	static alignToCar(nitro, car, scale = 1) {
		nitro.scale.x = nitro.scale.y = scale;
		nitro.x = car.positions.back;
	}

	/** handles creating the new nitro instance */
	static async create(options) {
		const { type, view } = options;
		
		let path = `nitros/${type ?? 'nitro_default'}`;
		let config = view.animator.lookup(path);

		// not loaded, check to import this
		if (!config) {
			await view.animator.importManifest(path)
			config = view.animator.lookup(path)
		}

		// fall back to default
		if (!config) {
			config = view.animator.lookup('nitros/nitro_default');
		}

		// if this doesn't exist, don't try and create
		if (!config) {
			console.error(`Failed to find nitro effect: ${path}`);
			return;
		}
		
		// determine the type to create
		const instance = new Nitro();
		merge(instance, { options, view, path, config });
		
		// initialize all car parts
		await instance._initNitro();

		// load the nitro sound - there's no reason
		// to wait for this since it can't be used
		// until after the race starts
		instance._applyConfig();

		// require nitro sounds to be included
		if (options.useAudio) {
			instance._initSound();
		}

		// if this didn't load for some reason
		if (!instance.isValid) return;

		// check for visibility
		if (instance.shouldFadeIn) {
			instance.alpha = 0
		}
		
		// give back the instance
		return instance;
	}

	// start creating loot
	async _initNitro() {
		const { view, options } = this;
		const { type } = options;

		// load the animation
		const path = `nitros/${type}`;
		const nitro = await view.animator.create(path);
		if (!nitro) {
			console.error(`Unable to create nitro "${path}"`);
			return;
		}

		// save the nitro instance
		this.instance = nitro;
		// this.parts = nitro.children.slice();
		this.addChild(nitro);
	}

	// loads the sound for this car
	async _initSound() {
		try { 

			const { options, config } = this;
			const { sfx = 'nitro' } = config;
			const { type } = options;
			
			// if this uses a standard library sound
			// let sound;
			// if (sfx) {
			let sound = audio.create('sfx', sfx)
			// }
			// use sound name convention
			// else {
				// 	// load the sound, if any
				// 	// NOTE: we can support custom sounds per nitro if we decide to do that
				// 	// const key = `nitros/${type}`;
				// 	const key = `nitros/nitro_default`;
				// 	await audio.register(key);
				
				// 	// save the sound effect
				// 	sound = audio.create('sfx', key);
				// }
				
				// no sound was found?
				if (!sound) return;
				
				// prepare the sound
				this.sound = sound;
				sound.loop(false);
			}
			catch (ex) {
				// not an issue
			}
	}

	// apply special config values
	_applyConfig = () => {
		const { config } = this;

		// save fading configuration values
		const alwaysFade = config.fade !== false;
		this.shouldFadeIn = alwaysFade || /in/i.test(config.fade); 
		this.shouldFadeOut = alwaysFade || /out/i.test(config.fade); 
	}

	/** activates the sound for this */
	activate = () => {
		const { sound, instance, config } = this;

		// check for a sound to play
		if (sound) {
			sound.volume(VOLUME_NITRO);
			sound.play();
		}

		// in case this isn't visible by default
		if (this.shouldFadeIn) {
			this.alpha = 0.01
			this.fadeDirection = 'in'
		}
		else {
			this.alpha = 1
		}

		// show particle emitters
		instance.controller.activateEmitters();

		// when animating, make sure to fade out, if needed
		if (this.shouldFadeOut) {
			clearTimeout(this.__animateNitro)
			this.__animateNitro = setTimeout(() => {
				this.fadeDirection = 'out'
			}, config.duration ?? 1500)
		}
	}

	updateTransform() {
		super.updateTransform()

		if (this.fadeDirection === 'out') {
			this.alpha *= 0.915
		}
		else if (this.fadeDirection === 'in') {
			this.alpha = Math.min(1, this.alpha + 0.025)
		}
	}

	reset = (positionX, offsetY = NITRO_OFFSET_Y) => {
		// this.alpha = 0;
		// this.each(part => {
		// 	part.alpha = 0;
		// 	part.x = positionX;
		// 	part.y += offsetY;
		// });
	}

	// performs normal attachments to put a nitro
	// connected to a car - since this can also be
	// something like car bumper (in the shop), not
	// all car functions are available
	attachToCar({ car, trail }, scaleBy = 1) {
		this.visible = true
		this.alpha = 0

			// prepare the nitro
		this.reset(((car.positions?.back || 0) * 0.5) * scaleBy)
		// this.attachTo(car, scaleBy)

			// update layering
		car.sortChildren()

		// fix mods, as needed
		car.attachMods?.({ nitro: this, trail: trail || car.trail })
		car.nitro = this
	}

	/** is a valid Nitro instance */
	get isValid() {
		return true
		// return !!(this.children?.length > 0);
	}

	dispose = () => {
		this.instance.controller.stopEmitters();
		removeDisplayObject(this)
	}

}