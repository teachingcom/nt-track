
import { PIXI as AnimatorPIXI } from 'nt-animator';
import { tween, easing } from 'popmotion';

import { LANES, SCALED_CAR_HEIGHT, SCALED_NAMECARD_HEIGHT } from './scaling';
import { NITRO_SCALE, NITRO_OFFSET_Y, TRAIL_SCALE } from '../../config';

import Car from '../../components/car';
import Trail from '../../components/trail';
import NameCard from '../../components/namecard';
import Nitro from '../../components/nitro';

export default class Player extends AnimatorPIXI.ResponsiveContainer {

	state = {

		// values used to track the start and activity
		// of a skip nitro animation
		nitroBonus: 0,
		nitroBonusOffset: 0
	}

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
		instance.mods = options.mods || { };
		
		// initialize all layers
		const car = instance._initCar();
		const trail = instance._initTrail();
		const nitro = instance._initNitro();
		const namecard = instance._initNameCard();

		// wait for the result
		const resolved = await Promise.all([ car, trail, nitro, namecard ]);
		await instance._assemble(...resolved);

		// put the player in the correct lane
		instance.relativeY = LANES[options.lane];
		instance.relativeX = 0;

		// make sure there's a player ID
		instance.id = options.id || `player_${+new Date}`;

		return instance;
	}

	// handles creating a new car
	async _initCar() {
		const { options, mods } = this;
		const { view } = options;

		// request for the car
		return Car.create({
			view,
			baseHeight: SCALED_CAR_HEIGHT,
			type: options.type,
			hue: options.hue,

			// check for nitro effects
			hasNitro: !!mods.nitro
		});
	}

	// handles creating a trail
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

	// handles creating a nitro trail
	async _initNitro() {
		const { options, mods } = this;
		const { view } = options;

		// no nitro was equiped
		if (!mods.nitro) return;
		
		// load a nitro, if any
		return Nitro.create({
			view,
			baseHeight: SCALED_CAR_HEIGHT,
			type: mods.nitro
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
	async _assemble(car, trail, nitro, namecard) {
		const { layers } = this;

		// include the car and it's shadow
		layers.car = car;
		layers.shadow = car.shadow;
		car.attachTo(this);

		// include extra components
		car.attachMods({ trail, nitro });
		
		// include the trail, if any
		if (trail) {
			layers.trail = trail;

			// TODO: trail scaling is hardcoded - we should
			// calculate this value
			trail.attachTo(this, TRAIL_SCALE);
			
			// update the position of each
			trail.each(part => part.x = car.positions.back);
		}
		
		// include the nitro, if any
		if (nitro) {

			// add this layer
			layers.nitro = nitro;
			nitro.attachTo(this, NITRO_SCALE);

			// give the car a reference to the nitro
			nitro.alpha = 0;
			nitro.scale.x = nitro.scale.y = 0.3;
			car.nitro = nitro;

			// update the position of each
			nitro.each(part => {
				part.alpha = 0;
				part.x = car.positions.back;
				part.y += NITRO_OFFSET_Y;
			});
		}

		// save the namecard
		if (namecard) {
			layers.namecard = namecard;
		}

		// finalize order
		this.sortChildren();
	}

	// cancels animating progress
	stopProgressAnimation = () => {
		if (!this._progress) return;
		this._progress.stop();
		this._progress = undefined;
	}

	/** start the animation */
	setProgress = progress => {
		const { relativeX, state } = this;
		this.stopProgressAnimation();

		// calculate the duration using the distance
		const duration = 1500;

		// perform the transition
		this._progress = tween({
			duration,
			ease: easing.linear,
			from: { x: relativeX - state.nitroBonusOffset },
			to: { x: progress }
		})
		.start({
			update: props => {
				this.relativeX = props.x + state.nitroBonusOffset
			}
		});

	}
	
	// handles the car updating process
	update = ({ shake }) => {
		const { state, car } = this;
		const { isNitro } = car.state;

		// check if the nitro is in effect
		const nitroActive = isNitro || state.nitroBonus > 0 && state.nitroBonus < 2;

		// update the car
		car.rattle(shake);

		// update the nitro values
		if (nitroActive) {
			state.nitroBonus = Math.min(2, state.nitroBonus + 0.01);
			state.nitroBonusOffset = (Math.sin((Math.PI / 2) * state.nitroBonus)) * 0.1;
		}
		else {
			state.nitroBonus = 0;
			state.nitroBonusOffset = 0;
		}

	}

}