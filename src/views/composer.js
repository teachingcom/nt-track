import { BaseView } from "./base";
import { PIXI as AnimatorPIXI } from 'nt-animator';
import { merge, isArray } from "../utils";

// individual components
import Car from '../components/car';
import Trail from '../components/trail';
import NameCard from '../components/namecard';

// baseline height value for responsive scaling
const PREFERRED_HEIGHT = 800;

// creates a general rendering view
export default class ComposerView extends BaseView {

	/** prepare the view */
	init = options => {
		options = merge({ scale: { height: PREFERRED_HEIGHT } }, options);
		super.init(options);
	}

	/** composes anything found at each node */
	compose = async data => {
		
		// create a container for the compositions
		const container = new AnimatorPIXI.ResponsiveContainer();
		container.relativeX = 0.5;
		container.relativeY = 0.5;
		this.stage.addChild(container);

		// start adding each
		for (const config of data.cars) {
			const car = await addComponent(this, PREFERRED_HEIGHT * 0.25, Car, config);
			container.addChild(car);

			// if there's a trail, we probabaly want to see
			// it attached to the car
			if (config.mods.trail) {

				// nudge the car forward
				car.x += car.width * 0.6;

				// create the trail
				const trail = await addComponent(this, PREFERRED_HEIGHT * 0.25, Trail, { type: config.mods.trail });
				for (const child of trail.parts) {
					container.addChild(child);
					child.x = car.x - (car.width / 2);
				}

			}
			
			// render namecards separately
			if (config.mods.card) {
				data.namecards.push(`namecards/${config.mods.card}`);
			}
		}

		// include each namecard
		for (const path of data.namecards) {
			const type = path.substr('namecards/'.length);
			const name = 'Nitro Racer';
			const team = 'NITRO';
			const card = await addComponent(this, PREFERRED_HEIGHT * 0.25, NameCard, { type, name, team });
			container.addChild(card);
		}

		// organize as needed
		container.sortChildren();

	}
	
}

// adds a component to the view
async function addComponent(view, baseHeight, Component, options) {
	options = merge({ view, baseHeight }, options);
	return await Component.create(options);
}