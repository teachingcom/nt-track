import { BaseView } from "./base";
import { PIXI as AnimatorPIXI } from 'nt-animator';
import { merge, isArray } from "../utils";

export default class ComposerView extends BaseView {

	/** prepare the view */
	init = options => {
		options = merge({ scale: { height: 800 } }, options);
		super.init(options);
	}

	/** composes anything found at each node */
	compose = async data => {
		const comps = data.trim().split(/\n/g);

		// compose each and add it to the view
		const pending = [ ];
		for (let comp of comps) {

			// remove special flags
			comp = comp.split(/ +/g)[0];

			// request the compose
			const compose = this.animator.create(comp);
			pending.push(compose);
		}

		// wait for everything to load
		const compositions = await Promise.all(pending);
		for (const comp of compositions) {

			// add the item to the view
			const container = new AnimatorPIXI.ResponsiveContainer();
			container.addChild(comp);
			this.stage.addChild(container);

			// align
			container.relativeX = 0.5;
			container.relativeY = 0.5;

		}
		
	}
	
}