
import * as PIXI from 'pixi.js';
import { PIXI as AnimatorPIXI } from 'nt-animator';
import Car from '../../components/car';
import { BASE_HEIGHT, LANES, SCALED_CAR_HEIGHT, SCALED_LANE_HEIGHT, LANE_HEIGHT, SCALED_NAMECARD_HEIGHT } from './scaling';
import { merge } from '../../utils';
import { MAXIMUM_CAR_SHAKE } from '../../config';
import Trail from '../../components/trail';
import NameCard from '../../components/namecard';
import { LAYER_CAR, LAYER_SHADOW } from './layers';

export default class Player extends AnimatorPIXI.ResponsiveContainer {

	static INITIALIZING = 'init';
	static ENTRY = 'entry';

	// layers that comprise a player
	layers = { }

	/** the players car layer */
	get car() {
		return this.layers.car;
	}

	/** the players trail layer */
	get trail() {
		return this.layers.trail;
	}

	/** the players nitro layer */
	get nitro() {
		return this.layers.nitro;
	}

	/** the players name card layer */
	get card() {
		return this.layers.car;
	}

	/** handles creating a new player instance */
	static async create(options) {
		const instance = new Player();
		instance.options = options;
		instance.state = Player.INITIALIZING;
		instance.mods = options.mods || { };
		
		// initialize all layers
		const car = instance._initCar();
		const trail = instance._initTrail();
		const namecard = instance._initNameCard();
		// await _initNitro();

		// wait for the result
		const resolved = await Promise.all([ car, trail, namecard ]);
		await instance._assemble(...resolved);

		// put the player in the correct lane
		instance.state = Player.ENTRY;
		instance.relativeY = LANES[options.lane];
		instance.relativeX = 0;

		// temp
		instance.rate = Math.max(0.0005, Math.random() * 0.001);

		return instance;
	}

	// handles creating a new car
	async _initCar() {
		const { options } = this;
		const { view } = options;

		// request for the car
		return Car.create({
			view,
			baseHeight: SCALED_CAR_HEIGHT,
			type: options.type,
			hue: options.hue
		});
	}

	// handles creating a new car
	async _initTrail() {
		const { options, mods } = this;
		const { view } = options;

		// prepare to create loot items
		if (!mods.trail) return;
		
		// load a trail, if any
		return Trail.create({
			view,
			baseHeight: SCALED_CAR_HEIGHT,
			type: mods.trail
		});
	}

	// loading name cards
	async _initNameCard() {
		const { options, mods } = this;
		const { view } = options;

		// prepare to create loot items
		if (!mods.card) return;
		
		// load a trail, if any
		return NameCard.create({
			view,
			baseHeight: SCALED_NAMECARD_HEIGHT,
			type: mods.card,
			name: options.playerName,
			team: options.playerTeam,
		});
	}

	// handles assembling the player
	async _assemble(car, trail, namecard) {
		
		// attach the car instance
		this.addChild(car);
		this.layers.car = car;
		car.zIndex = LAYER_CAR;

		// verify there's a shadow
		if (car.shadow) {
			this.addChild(car.shadow);
			this.layers.shadow = car.shadow;
			car.shadow.zIndex = LAYER_SHADOW;
		}

		// include the trail, if any
		if (trail) {
			this.layers.trail = trail;
			trail.attachTo(this);
			
			// update the position of each
			trail.each(part => part.x -= this.car.width / 2);
		}

		// save the namecard
		if (namecard) {
			this.layers.namecard = namecard;
		}

		
		// canvas.width = car.width;
		// canvas.height = car.height;
		// shadowRenderer.render(this.car);
		// const canv = shadowRenderer.plugins.extract.pixels(this.car);
		// const pixels = canvas.dat
		// car.x = 0;
		// car.y = 0;

		// finalize order
		this.sortChildren();
	}
	
	// handles the car updating process
	update = (state) => {
		
		// cars can rattle slightly as speed increases
		// this.layers.car.y = ((MAXIMUM_CAR_SHAKE * state.speed) * Math.random()) - (MAXIMUM_CAR_SHAKE / 2);
		
		this.car.rattle(state.speed);
		this.relativeX = 0.5;
		// update x based on progress
		// this.relativeX += this.rate;

	}

}