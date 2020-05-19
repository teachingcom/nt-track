import { PIXI as AnimatorPIXI } from 'nt-animator';
import { merge } from '../../utils';

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
		this.parts = nitro.children.slice();
		this.addChild(nitro);
	}

	/** is a valid Nitro instance */
	get isValid() {
		return this.parts && this.parts.length > 0;
	}

}