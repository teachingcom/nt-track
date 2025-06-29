import { animate, createContext, PIXI } from 'nt-animator';
import { BaseView } from '../base';
import { isNumber, wait } from '../../utils';
import createActivityIndicator from '../../components/activity';
import Car from "../../components/car";
import Trail from "../../components/trail";
import Doodad from "../../components/doodad";
import Nitro from "../../components/nitro";

const DEFAULT_MAX_HEIGHT = 250;
const TRANSITION_TIME = 350;
const TARGET_X_WITHOUT_TRAIL = 0.5
const TARGET_X_WITH_TRAIL = TARGET_X_WITHOUT_TRAIL + 0.075

export default class GarageView extends BaseView {

	preferredFocusX = 0.5
	focusX = 0.5

	loader = createActivityIndicator({ size: 120, opacity: 0.5, thickness: 10 });
	
	async init(options) {

		// initialize the view
		await super.init({
			scale: { DEFAULT_MAX_HEIGHT },
			useDynamicPerformance: false,
			forceCanvas: !options.useWebGL,
			...options
		});

		// center the loader in the view
		this.loader.relativeX = this.loader.relativeY = 0.5;
		this.stage.addChild(this.loader);

		// special mode for inspecting cars
		this.isInspectMode = options.mode === 'inspect'
		if (this.isInspectMode) {
			this.setupInspectionMode(options)
		}

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

	setupInspectionMode = (options) => {
		const { container } = options

		// create the trail backdrop, if needed
		const display = this.getDisplaySize();
		const backdrop = createBackdrop(display);
		this.view.addChild(backdrop);

		// align the backdrop to the middle and place in the back
		backdrop.y = display.height / 2;
		backdrop.zIndex = -1
		this.view.sortChildren()

		// when not moused over, try and focus the
		// view on the normal center
		container.addEventListener('mouseleave', () => {
			this.preferredFocusX = 0.5
		});
		
		container.addEventListener('mousemove', event => this.setFocus(event.layerX));
		container.addEventListener('touchmove', event => this.setFocus(container.offsetWidth - event.layerX));
	}

	// refocuses the view to the point provided
	setFocus = x => {
		const { container } = this.options

		// if this car doesn't have a trail, then there's
		// no reason to adjust the view
		if (!this.car?.hasTrail) {
			this.preferredFocusX = 0.5
			return
		}

		// Focus on the hovered portion of the screen. Don't use
		// exactly 50% since the front is not as important
		// be able to look at
		const width = container.offsetWidth * 1.2
		const percent = 1 - ((x / (width / 2)) - 0.4)
		this.preferredFocusX = 1 - ((percent * width) * 0.3)
	}

	// updates the view
	updateCar = async (config) => {
		const previous = this.config;
		this.config = config;

		// check for reasons to reload the car
		if (previous?.type !== config.type || previous?.trail !== config.trail) {
			this.setCar(this.config);
		}
		
		// repaint the view
		else if (previous?.hue !== config.hue) {
			await this.repaintCar(config);
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

			// set starting position
			car.relativeX = car.hasTrail
				? TARGET_X_WITH_TRAIL
				: TARGET_X_WITHOUT_TRAIL
		}
		
		// display the car
		this.stage.addChild(car);
		fadeOut(this.loader, true);
		entryAction(car);

		// if for some reason, the old car is
		// still lingering, remove it
		await wait(TRANSITION_TIME);
		if (remove?.parent) { 
			removeFromStage(remove);
		}

	}

	// creates a new car instance
	createCar = async config => {
		const view = this;
		const tweaks = { ...(this.options.tweaks || { }), ...(config.tweaks || { }) };

		// create the new car
		const player = new PIXI.Container()
		const container = new PIXI.ResponsiveContainer();
		const car = await Car.create({
			view, 
			...config,
			baseHeight: DEFAULT_MAX_HEIGHT,
			tweaks,

			// lighting is flipped because the container
			// is rotated in the view
			lighting: { x: -3, y: 5, alpha: 0.33, ...tweaks.lighting }
		});
		
		// finds the bounds for a car - if nothing was
		// found then it's most likely a simple car. 
		// use the sprite height of the car
		// const bounds = getBoundsForRole(car, 'base') || car;

		// calculate scale - include some extra
		// padding to make sure effects (if any) are visible
		const display = this.getDisplaySize();
		// const target = display.height;
		const scale =  1.25 // (target / bounds.height) * EFFECTS_PADDING_SCALING;

		// setup the car
		car.pivot.x = 0.5;
		car.pivot.y = 0.5;
		car.scale.x = scale;
		car.scale.y = scale;

		// check for a bonus scale modifier
		const configScale = !isNaN(config.scale) ? config.scale : 1
		
		// shared scaling
		player.scale.x *= configScale;
		player.scale.y *= configScale;
		player.addChild(car);

		// include the trail, if any
		if (config.trail) {
			const trail = await Trail.create({
				view,
				...config,
				baseHeight: DEFAULT_MAX_HEIGHT,
				type: config.trail
			})

			// add to the view
			player.addChild(trail);
			trail.scale.x = trail.scale.y = isNumber(tweaks.trailScale) ? tweaks.trailScale : scale
			trail.x = car.positions.back * (car.pivot.x * (scale / configScale));
			Trail.setLayer(trail, car);
		
			player.sortChildren();

			// mark so it knows to make
			// additional room for the trail
			container.hasTrail = true
		}

		// animate the perk, if any
		if (config.perk && config.perkLevel) {
			const perk = await Doodad.create({
				view,
				...config,
				baseHeight: DEFAULT_MAX_HEIGHT,
				type: config.perk,
				level: config.perkLevel
			})


			// slightly larger on this view
			perk.scale.x = perk.scale.y = 1.3

			player.addChild(perk)
			Doodad.setLayer(perk, car)
		}

		// animate the nitro, if any
		if (config.nitro) {
			const { nitro } = Nitro.createCycler({
				view,
				...config,
				baseHeight: DEFAULT_MAX_HEIGHT,
				type: config.nitro
			}, car, {
				delay: 5000,
				scale: 1.5
			})

			nitro.x += 275 + (tweaks?.offsetX ?? 0)

		}

		// set the inner container
		player.x = config.offsetX || 0;
		player.y = config.offsetY || 0;
		
		// setup the container
		container.addChild(player);
		container.relativeY = 0.5;
		container.relativeX = 0.5;

		// car shadow fixes
		if (isNumber(tweaks.rotation)) {
			container.rotation += (Math.PI * 2) * tweaks.rotation;
		}

		if (isNumber(tweaks.offsetX)) {
			container.x += tweaks.offsetX
		}

		if (isNumber(tweaks.offsetY)) {
			container.y += tweaks.offsetY
		}

		if (isNumber(tweaks.viewScale)) {
			const inner = new PIXI.Container()
			inner.scale.x *= tweaks.viewScale
			inner.scale.y *= tweaks.viewScale

			// move all children
			for (const child of container.children) {
				inner.addChild(child)
			}

			container.addChild(inner)
		}

		return container;
	}

	// align the stage as required
	render(...args) {
		if (this.isInspectMode) {
			this.stage.pivot.x += (this.preferredFocusX - this.stage.pivot.x) * 0.1
		}

		super.render(...args);
	}

}

function removeFromStage(target) {
	if (target.parent) {
		target.parent.removeChild(target);
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
			to: { x: car.relativeX + 1, alpha: 0 },
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
	car.relativeX = 1.5;
	const x = car.hasTrail ? TARGET_X_WITH_TRAIL : TARGET_X_WITHOUT_TRAIL

	car.__transition = animate({
		duration: TRANSITION_TIME,
		ease: 'linear',
		from: { x: -1.5 },
		to: { x },
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

function createBackdrop(display) {
	const { width, height } = display

	// create the rendering area
	const backdrop = createContext()
	backdrop.resize(width, height)

	// add some bonus contrast
	const gradient = backdrop.ctx.createLinearGradient(0, 0, 0, height);
	gradient.addColorStop(0, 'rgba(0,0,0,0)')
	gradient.addColorStop(0.5, 'rgba(0,0,0,0.3)')
	gradient.addColorStop(1, 'rgba(0,0,0,0)')
	backdrop.ctx.fillStyle = gradient
	backdrop.ctx.fillRect(0, 0, width, height)

	// create the PIXi object
	const texture = PIXI.Texture.from(backdrop.canvas)
	const sprite = new PIXI.Sprite(texture)
	sprite.anchor.x = 0.5
	sprite.anchor.y = 0.5
	sprite.width *= 2

	return sprite
}