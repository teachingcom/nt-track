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

		// load the sound, if any
		const key = `nitros/${type}`;
		await audio.register(key);

		// save the sound effect
		const sound = this.sound = audio.create('sfx', key);
		sound.volume(1);
		sound.loop(false);
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
		const { sound, instance } = this;
		sound.play();

		// show particle emitters
		instance.controller.activateEmitters();
	}

	/** is a valid Nitro instance */
	get isValid() {
		return !!(this.parts?.length > 0);
	}

}