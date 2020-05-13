
import { PIXI as AnimatorPIXI } from 'nt-animator';
import { merge } from '../../utils';


export default class NameCard extends AnimatorPIXI.ResponsiveContainer {

	/** handles creating a new namecard */
	static async create(options) {
		const instance = new NameCard();
		
		// determine the type to create
		const { type, view } = options;
		const path = `namecards/${type}`;
		const config = view.animator.lookup(path);
		merge(instance, { options, view, path, config });
		
		// initialize all namecard parts
		await instance._initNameCard();

		// return the created namecard
		return instance;
	}
	

	// creates the namecard instance
	async _initNameCard() {
		const { path, view, options } = this;
		const { baseHeight } = options;

		// load the instance
		const namecard = await view.animator.create(path);

		// scale correctly
		namecard.scale.x = namecard.scale.y = baseHeight / namecard.height;
		
		// save the namecard instance
		this.namecard = namecard;

		// add the namecard to the view
		this.addChild(namecard);
	}

}
