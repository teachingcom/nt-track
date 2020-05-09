
// import * as PIXI from 'pixi.js';
import { PIXI as AnimatorPIXI } from 'nt-animator';
import Car from '../../components/car';
import { BASE_HEIGHT, CAR_HEIGHT, LANES } from './scaling';
import { merge } from '../../utils';
import { MAXIMUM_CAR_SHAKE } from '../../config';

export default class Player extends AnimatorPIXI.ResponsiveContainer {

	static INITIALIZING = 'init';
	static ENTRY = 'entry';

	// layers that comprise a player
	layers = { }

	/** handles creating a new player instance */
	static async create(options) {
		const instance = new Player();
		instance.options = options;
		instance.state = Player.INITIALIZING;
		
		// initialize all layers
		await instance._initCar();
		// await _initCar();
		// await _initTrail();
		// await _initNameCard();
		// await _initNitro();

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
		const { layers } = this;

		// create the car
		const options = merge({ baseHeight: CAR_HEIGHT * BASE_HEIGHT }, this.options);
		const car = layers.car = await Car.create(options);

		// save the car instance
		this.addChild(car);
	}

	// handles the car updating process
	update = (state) => {

		// cars can rattle slightly as speed increases
		this.layers.car.y = ((MAXIMUM_CAR_SHAKE * state.speed) * Math.random()) - (MAXIMUM_CAR_SHAKE / 2);

		// update x based on progress
		this.relativeX += this.rate;

	}

}