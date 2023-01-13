// TODO: refactor this file after introducing SSAA

import { merge } from '../../utils';
import { PIXI, getBoundsForRole, animate } from 'nt-animator';
import { VOLUME_FANFARE } from '../../audio/volume';
import * as audio from '../../audio';

// preferred font for fanfares
const TARGET_NAMECARD_WIDTH = 650
const DEFAULT_FANFARE_DURATION = 4000

// trailing fanfare for a player
export default class Fanfare extends PIXI.Container {

	/** handles creating a new fanfare */
	static async create(options) {
		const instance = new Fanfare();
		instance.visible = false;
		
		// determine the type to create
		const { type, view } = options;

		// try and load
		let path = `fanfare/${type}`
		let config = view.animator.lookup(path)
		
		// maybe needs to load
		if (!config) {
			await view.animator.importManifest(path)
			config = view.animator.lookup(path)
		}

		// if missing, use the default
		if (!config) {
			return null
		}

		// if still missing then there's not
		// a name card that can be used
		if (!config) return

		// save the properties
		merge(instance, { options, view, path, config })

		// attempt to add a fanfare
		try {			
			// create a container for all parts
			instance.container = new PIXI.Container();
			instance.addChild(instance.container);

			// initialize all fanfare parts
			await instance._initFanfare();
			await instance._initSound();
		}
		// failed to render the card and could
		// potentially be a future issue - logthis
		catch (ex) {
			console.error(ex);
			this.failedToLoadFanfare = true;
			return null;
		}

		// return the created fanfare
		// instance.pivot.x = -instance.nudgeX
		return instance;
	}
	
	// creates the fanfare instance
	async _initFanfare() {
		const { path, view, options, config, container } = this;
		const { baseHeight } = options;

		// create the instance
		console.log('to create', path, baseHeight)
		const fanfare = this.fanfare = await view.animator.create(path);

		// scale correctly
		// this.bounds = getBoundsForRole(fanfare, 'base');
		// if (config.height) this.bounds.height = config.height;
		// if (config.width) this.bounds.width = config.width;
		
		// save scaling values
		// const scale = baseHeight / this.bounds.height
		// container.scale.x = container.scale.y = scale;

		// // calculate nudging values used to position this layer correctly
		// const { nudgeX = 0, nudgeY = 0 } = config
		// const bounding = fanfare.getBounds()
		// this.nudgeX = (((bounding.width - TARGET_NAMECARD_WIDTH) * -0.5) + nudgeX) * scale
		// this.nudgeY = nudgeY * scale

		// this.bounds.height = 300
		// this.bounds.width = 500
		container.scale.x = container.scale.y = config.scale || 1

		// add to the view
		container.addChild(fanfare);
	}


	// loads the sound for this car
	async _initSound() {
		const { options, config } = this;
		console.log(options, config, this)
		const { sfx } = config;
		const { type } = options;

		// if this uses a standard library sound
		// load the sound, if any
		const key = `fanfare/${type}`;
		await audio.register(key);

		// save the sound effect
		const sound = audio.create('sfx', key);

		// let sound;
		// if (sfx) {
		// 	sound = audio.create('sfx', sfx)
		// }
		// // use sound name convention
		// else {
		// 	// load the sound, if any
		// 	const key = `fanfare/${type}`;
		// 	await audio.register(key);
	
		// 	// save the sound effect
		// 	sound = audio.create('sfx', key);
		// }

		// no sound was found?
		if (!sound) return;
	
		// prepare the sound
		this.sound = sound;
		sound.loop(false);
		sound.volume(VOLUME_FANFARE);
		sound.volume(1);
	}

	/** activates the sound for this */
	activate = () => {
		const { sound, instance, config } = this;

		// show particle emitters
		this.setVisibility(true);
		this.fanfare.controller.activateEmitters();

		// check for a sound to play
		if (sound) {
			sound.volume(VOLUME_FANFARE);
			sound.play();
		}

		console.log(config)

		setTimeout(() => {
			// animate the player entry
			animate({
				from: { a: 1 },
				to: { a: 0 },
				ease: 'easeOutQuad',
				duration: 250,
				loop: false,
				update: props => this.alpha = props.a,
				complete: () => {
					this.destroy()
				}
			});
		}, config.duration || DEFAULT_FANFARE_DURATION)
	}

	/** changes the visibility for a fanfare */
	setVisibility = visible => this.visible = visible;

	/** changes the position and makes the fanfare visible */
	setPosition = x => {
		this.x = 0 | x;
		// this.y = 0 | this.y;
	}

}
