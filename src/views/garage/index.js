import Car from "../../components/car";
import { animate, getBoundsForRole, PIXI } from 'nt-animator';
import { BaseView } from '../base';
import { isNumber, wait } from '../../utils';
import createActivityIndicator from '../../components/activity';

const DEFAULT_MAX_HEIGHT = 250;
const EFFECTS_PADDING_SCALING = 0.7;
const TRANSITION_TIME = 350;

export default class GarageView extends BaseView {

	loader = createActivityIndicator({ size: 120, opacity: 0.5, thickness: 10 });
	
	async init(options) {

		// initialize the view
		await super.init({
			scale: { DEFAULT_MAX_HEIGHT },
			useDynamicPerformance: false,
			forceCanvas: true,
			...options
		});

		// center the loader in the view
		this.loader.relativeX = this.loader.relativeY = 0.5;
		this.stage.addChild(this.loader);

		// automatically render
		this.startAutoRender();
	}

	// shows an animated car entrance
	get useDrivingEffect() {
		return this.options.useDrivingEffect !== false;
	}

	// checks if a car has been assigned
	get hasActiveCar() {
		return !!this.car;
	}

	// updates the view
	updateCar = async (config) => {
		const previous = this.config;
		this.config = config;

		// change the car
		if (previous?.type !== config.type) {
			this.setCar(this.config);
		}
		
		// repaint the view
		else if (previous?.hue !== config.hue) {
			this.repaintCar(config);
		}
	}

	// repaints a car
	repaintCar = async (config) => {
		const { hasActiveCar } = this;

		// already has a car
		if (hasActiveCar) {
			fadeIn(this.loader);
			await fadeOut(this.car);
		}

		// show the new paint
		this.car = await this.createCar(config);
		this.stage.addChild(this.car);
		fadeIn(this.car);
		fadeOut(this.loader, true);
	}
	
	// shows a different car
	setCar = async (config) => {
		const { hasActiveCar, useDrivingEffect } = this;
		this.active = config;

		// drive awai
		if (hasActiveCar) {
			let exitAction = useDrivingEffect ? driveOut : fadeOut;
			exitAction(this.car);
		}

		// create the new car, but put it off screen
		await wait(100);
		fadeIn(this.loader);
		const car = await this.createCar(config);
		
		// check if this is still the active car
		if (config !== this.active) {
			return;
		}

		// set the new car
		let remove = this.car;
		this.car = car;
		
		// choose the animation
		let entryAction
		if (hasActiveCar) {
			entryAction = driveIn
		} else {
			entryAction = fadeIn
			car.relativeX = 0.5
		}
		
		// display the car
		this.stage.addChild(car);
		fadeOut(this.loader, true);
		entryAction(car);

		// if for some reason, the old car is
		// still lingering, remove it
		await wait(TRANSITION_TIME);
		if (remove.parent) { 
			removeFromStage(remove);
		}

	}

	// creates a new car instance
	createCar = async config => {
		const view = this;
		const { tweaks = { } } = this.options;

		// create the new car
		const container = new PIXI.ResponsiveContainer();
		const car = await Car.create({
			view, 
			...config,
			baseHeight: DEFAULT_MAX_HEIGHT,

			// lighting is flipped because the container
			// is rotated in the view
			lighting: { x: -3, y: -5, alpha: 0.33, ...tweaks.lighting }
		});
		
		// finds the bounds for a car - if nothing was
		// found then it's most likely a simple car. 
		// use the sprite height of the car
		const bounds = getBoundsForRole(car, 'base') || car;

		// calculate scale - include some extra
		// padding to make sure effects (if any) are visible
		const display = this.getDisplaySize();
		const target = display.height;
		const scale = (target / bounds.height) * EFFECTS_PADDING_SCALING;

		// setup the car
		container.addChild(car);
		car.pivot.x = 0.5;
		car.pivot.y = 0.5;
		car.scale.x = scale;
		car.scale.y = scale;
		
		// setup the container
		container.relativeX = 0.5;
		container.relativeY = 0.5;
		container.rotation = Math.PI;

		// car shadow fixes
		if (isNumber(tweaks.rotation)) {
			container.rotation += (Math.PI * 2) * tweaks.rotation;
		}

		return container;
	}

}

function removeFromStage(car) {
	if (car.parent) {
		car.parent.removeChild(car);
	}
}

function driveOut(car) {
	// cancel animations
	if (car.__transition) {
		car.__transition.stop();
	}

	return new Promise(resolve => {
		animate({
			duration: TRANSITION_TIME,
			ease: 'linear',
			from: { x: car.relativeX, alpha: car.alpha },
			to: { x: car.relativeX - 1, alpha: 0 },
			loop: false,
			update: props => {
				car.alpha = props.alpha;
				car.relativeX = props.x;
			},
			complete: () => {
				removeFromStage(car)
				resolve();
			},
		});
	});
}

function driveIn(car) {
	car.relativeX = -1.5;
	car.__transition = animate({
		duration: TRANSITION_TIME,
		ease: 'linear',
		from: { x: 1.5 },
		to: { x: 0.5 },
		loop: false,
		update: props => car.relativeX = props.x
	});
}

function fadeOut(target, skipRemove) {
	// cancel animations
	if (target.__transition) {
		target.__transition.stop();
	}

	// request the animation
	return new Promise(resolve => {
		animate({
			duration: TRANSITION_TIME,
			ease: 'linear',
			from: { alpha: target.alpha },
			to: { alpha: 0 },
			loop: false,
			update: props => target.alpha = props.alpha,
			complete: () => {
				if (!skipRemove) { 
					removeFromStage(target);
				}
				setTimeout(resolve, 100);
			},
		});
	});
}

function fadeIn(target) {
	target.alpha = 0;
	target.__transition = animate({
		duration: TRANSITION_TIME,
		ease: 'linear',
		from: { alpha: 0 },
		to: { alpha: 1 },
		loop: false,
		update: props => target.alpha = props.alpha
	});
}

