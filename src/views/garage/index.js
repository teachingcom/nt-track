import Car from "../../components/car";
import { animate, PIXI } from 'nt-animator';
import { BaseView } from "../base";

export default class GarageView extends BaseView {

	async init(options) {
		await super.init({
			...options,
			scale: { height: 250 }
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
		const { type, hue } = config;
		const view = this;

		// create the new car
		const container = new PIXI.ResponsiveContainer();
		const car = await Car.create({
			view, 
			type,
			hue,
			baseHeight: 200,
		});
		
		// setup the car
		const scale = 300 / car.width;
		container.addChild(car);
		car.pivot.x = 0.5;
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
			duration: 500,
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
		duration: 500,
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
			duration: 500,
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
		duration: 500,
		ease: 'linear',
		from: { alpha: 0 },
		to: { alpha: 1 },
		loop: false,
		update: props => car.alpha = props.alpha
	});
}