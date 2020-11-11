import Car from "../../components/car";
import { animate, getBoundsForRole, PIXI } from 'nt-animator';
import { BaseView } from "../base";

const DEFAULT_MAX_HEIGHT = 250;
const EFFECTS_PADDING_SCALING = 0.7;
const TRANSITION_TIME = 350;

export default class GarageView extends BaseView {

	async init(options) {

		// initialize the view
		await super.init({
			scale: { DEFAULT_MAX_HEIGHT },
			useDynamicPerformance: false,
			forceCanvas: true,
			...options
		});

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
			await fadeOut(this.car);
		}

		// show the new paint
		this.car = await this.createCar(config);
		this.stage.addChild(this.car);
		fadeIn(this.car);
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
		const car = await this.createCar(config);

		// check if this is still the active car
		if (config !== this.active) {
			return;
		}

		// set the new car
		this.car = car;
		
		// choose the animation
		let entryAction = hasActiveCar ? driveIn : fadeIn;
		if (!useDrivingEffect) {
			entryAction = fadeIn;
		}
		
		// display the car
		this.stage.addChild(car);
		entryAction(car);
	}

	// creates a new car instance
	createCar = async config => {
		const view = this;
		const { type, hue } = config;

		// create the new car
		const container = new PIXI.ResponsiveContainer();
		const car = await Car.create({
			view, 
			type,
			hue,
			baseHeight: DEFAULT_MAX_HEIGHT
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
		car.moveShadow(0, -1);

		return container;
	}

}

function removeCar(car) {
	if (car.parent) {
		car.parent.removeChild(car);
	}
}

function driveOut(car) {
	// cancel animations
	if (car.animation) {
		car.animation.stop();
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
				removeCar(car)
				resolve();
			},
		});
	});
}

function driveIn(car) {
	car.relativeX = -1.5;
	car.animation = animate({
		duration: TRANSITION_TIME,
		ease: 'linear',
		from: { x: 1.5 },
		to: { x: 0.5 },
		loop: false,
		update: props => car.relativeX = props.x
	});
}

function fadeOut(car) {
	// cancel animations
	if (car.animation) {
		car.animation.stop();
	}

	// request the animation
	return new Promise(resolve => {
		animate({
			duration: TRANSITION_TIME,
			ease: 'linear',
			from: { alpha: car.alpha },
			to: { alpha: 0 },
			loop: false,
			update: props => car.alpha = props.alpha,
			complete: () => {
				removeCar(car);
				setTimeout(resolve, 100);
			},
		});
	});
}

function fadeIn(car) {
	car.alpha = 0;
	car.relativeX = 0.5;
	car.animation = animate({
		duration: TRANSITION_TIME,
		ease: 'linear',
		from: { alpha: 0 },
		to: { alpha: 1 },
		loop: false,
		update: props => car.alpha = props.alpha
	});
}