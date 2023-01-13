
import { findDisplayObjectsOfRole, PIXI, removeDisplayObject, ToggleHelper } from 'nt-animator';

import { LANES, SCALED_CAR_HEIGHT, SCALED_NAMECARD_HEIGHT } from './scaling';
import { NITRO_SCALE, NITRO_OFFSET_Y, TRAIL_SCALE, NAMECARD_TETHER_DISTANCE } from '../../config';

import Car from '../../components/car';
import Trail from '../../components/trail';
import NameCard from '../../components/namecard';
import Nitro from '../../components/nitro';
import Fanfare from '../../components/fanfare';

// debugging helper
const DEBUG_PLAYER_PROGRESS = false;

export default class Player extends PIXI.ResponsiveContainer {

	// keeping track of game state
	state = { }

	// layers that comprise a player
	layers = { }

	// toggle states
	toggle = new ToggleHelper()

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

	/** the players name card layer */
	get fanfare() {
		return this.layers.fanfare;
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
	static async create(options, track) {
		const instance = new Player();
		instance.options = options;
		instance.isPlayerRoot = true;
		instance.mods = options.mods || { };

		// initialize all layers
		const car = instance._initCar();
		const trail = instance._initTrail();
		const nitro = instance._initNitro();
		const namecard = instance._initNameCard();
		const fanfare = instance._initFanfare();

		// wait for the result
		const resolved = await Promise.all([ car, trail, nitro, namecard, fanfare ]);
		await instance._assemble(...resolved);

		// after the instance is created, find all toggles
		instance._assignToggles()

		// used for individual variables
		instance.animationVariables = instance
		instance.animationVariables.movement = 0

		// put the player in the correct lane
		instance.relativeY = LANES[options.lane];
		instance.relativeX = 0;
		instance.zIndex = options.lane;

		if (isNaN(instance.relativeY)) {
			console.log('had a NaN for Y')
			debugger
		}

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
			...options,

			// check for nitro effects
			hasNitro: !!mods.nitro
		});
	}

	// handles creating a trail
	async _initTrail() {
		const { options, mods } = this;
		const { view, tweaks } = options;

		// make sure this car has a trail
		if (tweaks?.noTrail) return;

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

	// handles creating a nitro trail
	async _initFanfare() {
		const { options, mods } = this;
		const { view } = options;

		console.log(mods)

		// no fanfare was equiped
		if (!mods.fanfare) return;
		
		// load a fanfare, if any
		return Fanfare.create({
			view,
			baseHeight: SCALED_CAR_HEIGHT,
			type: mods.fanfare
		});
	}

	// loading name cards
	async _initNameCard() {
		const { options, mods } = this;
		const { view } = options;
		const { playerName, playerTeam, teamColor, isGold, isFriend, playerRank } = options;
		let { card = 'default' } = mods;

		// prevent player namecards
		// TODO: this may change if we support custom namecards
		if (options.spectator && card === 'player') {
			card = isGold ? 'gold' : 'default';
		}
		
		// load a trail, if any
		return NameCard.create({
			view,
			baseHeight: SCALED_NAMECARD_HEIGHT,
			type: card,
			isAnimated: mods.isNamecardAnimated,
			name: playerName,
			team: playerTeam,
			color: teamColor,
			isGold,
			isFriend,
			playerRank,
		});
	}
 
	// handles assembling the player
	async _assemble(car, trail, nitro, namecard, fanfare) {
		const { layers, scale } = this;

		// include the car and it's shadow
		layers.fanfare = fanfare;
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

			// add to the player view
			this.addChild(trail);

			// find a layer to use
			Trail.setLayer(trail, car);

			trail.x = car.positions.back;
			trail.scale.x = trail.scale.y = scale.x * TRAIL_SCALE;
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

		// save the namecard
		if (fanfare) {
			layers.fanfare = fanfare;

			// hide the fanfare when it is first loaded
			// since it will show up in the top left corner
			// until it's been positioned
			// fanfare.setVisibility(false);
		}

		// finalize order
		this.sortChildren();
	}

	// maps all toggles for this player, if any
	_assignToggles() { 
		const objs = findDisplayObjectsOfRole(this, 'with-toggles')
		
		// for each of the objects, save their toggle
		for (const obj of objs) {
			const toggles = obj.config?.toggles
			if (toggles) {
				for (const state in toggles) {
					this.toggle.add(state, obj, toggles[state])
				}
			}
		}
	}

	async repaintCar (hue) {
		await this.car.repaintCar(hue)
	}

	// cancels animating progress
	stopProgressAnimation = () => {
		if (!this._progress) return;
		this._progress.stop();
		this._progress = undefined;
	}

	/** handle removing all resources */
	dispose = () => {
		const { car, namecard, shadow, trail, fanfare } = this;
		const removals = [
			{ type: 'car', source: car, action: removeDisplayObject },
			{ type: 'namecard', source: namecard, action: removeDisplayObject },
			{ type: 'shadow', source: shadow, action: removeDisplayObject },
			{ type: 'trail', source: trail, action: removeDisplayObject },
			{ type: 'fanfare', source: fanfare, action: removeDisplayObject },
			{ type: 'player', source: this, action: removeDisplayObject }
		]

		// perform the removal for each category
		for (const remove of removals) { 
			try {
				if (remove.source) {
					remove.action(remove.source)
				}
			}
			catch (ex) {
				console.error(`Failed to remove ${remove.type}`);
				console.error(ex)
			}
		}
	}

	/** handles updating the car */
	updateTransform(...args) {
		
		// return 1
		const movement = Math.abs((this.movementX || 0) - this.relativeX)
		this.movementX = this.relativeX;
		this.movement = Math.min(2, Math.max(movement * 100, this.track.animationVariables.base_speed, 0));
		
		// tracking progress
		if (DEBUG_PLAYER_PROGRESS) {
			const screenX = 0 | ((this.screenPercentX || 0) * 100);
			const percentProgress = 0 | (this.serverProgress || 0);
			const place = this.place ? `
end : ${this.place}` : '';
			this.debug.text = `up  : ${this.progressUpdateCount || 0}
srv : ${percentProgress}%
rx  : ${this.relativeX.toFixed(4)}
x   : ${screenX}%${place}`;
		}
		
		// perform updates
		const { car, track, namecard, trail, nitro } = this;
		car.onUpdate({ car, track, namecard, trail, nitro, player: this });
		
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

