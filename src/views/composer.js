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
		options = merge(options, {
			scale: { height: PREFERRED_HEIGHT },
			includeShadows: true
		});

		super.init(options);
	}

	/** composes anything found at each node */
	compose = async data => {
		const { stage } = this;

		// create a container for the compositions
		const view = new AnimatorPIXI.ResponsiveContainer();
		view.relativeX = 0.5;
		view.relativeY = 0.5;
		stage.addChild(view);

		// start adding each
		let activeCar;
		for (const config of data.cars) {
			const car = await addComponent(this, PREFERRED_HEIGHT * 0.25, Car, config);

			// save the in case theres a nitro
			activeCar = car;

			// add to the view
			car.attachTo(view);

			// gather up each part used
			const { trail, card, nitro } = config.mods || { };
			if (trail)
				data.trails.push(`trails/${trail}`);

			if (card)
				data.namecards.push(`namecards/${card}`);

			if (nitro)
				data.nitros.push(`nitros/${nitro}`);
		}

		// include each namecard
		for (const path of data.trails) {
			
			// nudge the car forward
			if (activeCar) {
				activeCar.setX(activeCar.width * 0.6);
			}

			// create the trail
			const type = path.substr('trails/'.length);
			const trail = await addComponent(this, PREFERRED_HEIGHT * 0.25, Trail, { type });
			trail.each(part => {
				view.addChild(part);
				trails.push(trail);

				// move to the back of the car
				if (activeCar)
					part.x = activeCar.x + activeCar.positions.back;
				else
					part.x = window.innerWidth * 0.25;
			});
		}

		// include each namecard
		for (const path of data.namecards) {
			const type = path.substr('namecards/'.length);
			const name = 'Nitro Racer';
			const team = 'NITRO';
			
			const card = await addComponent(this, PREFERRED_HEIGHT * 0.25, NameCard, { type, name, team });
			view.addChild(card);
		}

		// include each namecard
		for (const path of data.nitros) {
			const nitro = await this.animator.create(path);

			// add each child
			for (let i = nitro.children.length; i-- > 0;) {
				const child = nitro.children[i];
				view.addChild(child);
				
				// make the nitros easier to see
				if (activeCar) {
					activeCar.setX(window.innerWidth * 0.4);
					child.x = activeCar.x + activeCar.positions.back;
				}
				// just shift forward
				else child.x += window.innerWidth;
			}

		}

		// organize as needed
		view.sortChildren();

	}
	
}

// adds a component to the view
async function addComponent(view, baseHeight, Component, options) {
	options = merge({ view, baseHeight }, options);
	return await Component.create(options);
}