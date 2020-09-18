
import { PIXI, removeDisplayObject } from 'nt-animator';

import { LANES, SCALED_CAR_HEIGHT, SCALED_NAMECARD_HEIGHT } from './scaling';
import { NITRO_SCALE, NITRO_OFFSET_Y, TRAIL_SCALE, NAMECARD_TETHER_DISTANCE } from '../../config';

import Car from '../../components/car';
import Trail from '../../components/trail';
import NameCard from '../../components/namecard';
import Nitro from '../../components/nitro';

// debugging helper
const DEBUG_PLAYER_PROGRESS = false;

export default class Player extends PIXI.ResponsiveContainer {

	// keeping track of game state
	state = { }

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
	get namecard() {
		return this.layers.namecard;
	}

	/** the players car shadow */
	get shadow() {
		return this.layers.shadow;
	}

	/** checks for minimal assets to play the game */
	get hasRequiredAssets() {
		return !this.car?.isUsingMissingCar && !!this.namecard;
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
		instance.zIndex = options.lane;

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
		const { playerName, playerTeam, teamColor, isGold, isFriend, isTop3 } = options;
		
		// load a trail, if any
		return NameCard.create({
			view,
			baseHeight: SCALED_NAMECARD_HEIGHT,
			type: mods.card || 'default',
			name: playerName,
			team: playerTeam,
			color: teamColor,
			isGold,
			isFriend,
			isTop3,
		});
	}
 
	// handles assembling the player
	async _assemble(car, trail, nitro, namecard) {
		const { layers, scale } = this;

		// include the car and it's shadow
		layers.car = car;
		layers.shadow = car.shadow;
		car.attachTo(this);

		// include extra components
		car.attachMods({ trail, nitro });

		// create debugging text
		if (DEBUG_PLAYER_PROGRESS) {
			this.debug = new PIXI.Text('', { fontFamily: 'monospace', fill: 0xffffff, fontSize: 22, fontWeight: 'bold', align: 'left' });
			car.addChild(this.debug);
			this.debug.x = -330;
			this.debug.y = -50;
		}
		
		// include the trail, if any
		if (trail) {
			layers.trail = trail;

			// TODO: trail scaling is hardcoded - we should
			// calculate this value
			trail.attachTo(this, scale.x * TRAIL_SCALE);
			
			// update the position of each
			trail.each(part => part.x = car.positions.back);
		}
		
		// include the nitro, if any
		if (nitro) {

			// add this layer
			layers.nitro = nitro;
			nitro.attachTo(this, scale.x * NITRO_SCALE);

			// give the car a reference to the nitro
			nitro.alpha = 0;
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

			// hide the namecard when it is first loaded
			// since it will show up in the top left corner
			// until it's been positioned
			namecard.setPosition(-1000);
			namecard.setVisibility(true);
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

	/** handle removing all resources */
	dispose = () => {
		const { car, namecard, shadow, trail } = this;

		// remove emitters, animations, and objects
		let phase;
		try {
			phase = 'removing car';
			removeDisplayObject(car);

			phase = 'removing namecard';
			removeDisplayObject(namecard);
			
			phase = 'removing shadow';
			removeDisplayObject(shadow);

			phase = 'removing trail';
			if (trail)
				trail.each(part => removeDisplayObject(part));
		}
		// do not crash for this
		catch (ex) {
			console.warn(`Failed at disposing player object: Error while ${phase}`);
		}
	}

	/** handles updating the car */
	updateTransform(...args) {

		// tracking progress
		if (DEBUG_PLAYER_PROGRESS) {
			const screenX = 0 | ((this.screenPercentX || 0) * 100);
			const percentProgress = 0 | (this.serverProgress || 0);
			const place = this.place ? `
end : ${this.place}` : '';
			this.debug.text = `up  : ${this.progressUpdateCount || 0}
srv : ${percentProgress}%
x   : ${screenX}%${place}`;
		}
		
		// perform updates
		const { car, track, namecard } = this;
		car.onUpdate(...args);
		
		// tether namecards
		if (namecard && track) {
			const width = track.view.width / track.view.scaleX;
			const tether = NAMECARD_TETHER_DISTANCE / width;
			
			// HACK: namecard.js hides the card until the first
			// tile is is updated, then made visible - this is
			// due to a bug where newly added assets appear in
			// the top left corner - Fix this later
			const x = (this.relativeX - tether) * width;
			namecard.setPosition(x);
		}

		// perform the normal render
		super.updateTransform(...args);
	}


}

