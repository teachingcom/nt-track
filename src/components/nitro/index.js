import { PIXI as AnimatorPIXI } from 'nt-animator';
import { merge } from '../../utils';
import * as audio from '../../audio';

export default class Nitro extends AnimatorPIXI.DetatchedContainer {

	/** handles creating the new nitro instance */
	static async create(options) {
		const { type, view } = options;
		const path = `nitros/${type}`;
		const config = view.animator.lookup(path);

		// if this doesn't exist, don't try and create
		if (!config) return;
		
		// determine the type to create
		const instance = new Nitro();
		merge(instance, { options, view, path, config });
		
		// initialize all car parts
		await instance._initNitro();

		// load the nitro sound - there's no reason
		// to wait for this since it can't be used
		// until after the race starts
		instance._initSound();
		instance._applyConfig();

		// if this didn't load for some reason
		if (!instance.isValid) return;
		
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
		this.parts = nitro.children.slice();
		this.addChild(nitro);
	}

	// loads the sound for this car
	async _initSound() {
		const { options } = this;
		const { type } = options;

		const key = `nitros/${type}`;
		await audio.register(key);
		this.sound = audio.create(key);
	}

	// apply special config values
	_applyConfig = () => {
		const { config } = this;

		// save fading configuration values
		const alwaysFade = config.fade !== false;
		this.shouldFadeIn = alwaysFade || /in/i.test(config.fade); 
		this.shouldFadeOut = alwaysFade || /out/i.test(config.fade); 
		console.log('fading', this.shouldFadeIn, this.shouldFadeOut);
	}

	/** activates the sound for this */
	activate = () => {
		this.sound.volume(1);
		this.sound.loop(false);
		this.sound.play();

		this.instance.controller.activateEmitters();
	}

	/** is a valid Nitro instance */
	get isValid() {
		return this.parts && this.parts.length > 0;
	}

}