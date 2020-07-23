import * as PIXI from 'pixi.js';
import { PIXI as AnimatorPIXI } from 'nt-animator';
import { merge } from '../../utils';
import * as audio from '../../audio';

// sizing, layers, positions
import * as scaling from './scaling';
import { TRACK_MAXIMUM_SPEED, TRACK_ACCELERATION_RATE, CAR_DEFAULT_SHAKE_LEVEL, INPUT_ERROR_SOUND_TIME_LIMIT, ANIMATION_RATE_WHILE_IDLE, ANIMATION_RATE_WHILE_RACING } from '../../config';
import { LAYER_NAMECARD, LAYER_TRACK_GROUND, LAYER_TRACK_OVERLAY } from './layers';

import { BaseView } from '../base';
import Player from './player';
import Track from '../../components/track';
import CarEntryAnimation from '../../animations/car-entry';
import RaceCompletedAnimation from '../../animations/race-completed';
import RaceProgressAnimation from '../../animations/race-progress';

/** creates a track view that supports multiple cars for racing */
export default class TrackView extends BaseView {

	// global effect filter
	filter = new PIXI.filters.ColorMatrixFilter()
	frame = 0

	// tracking players and their namecards
	players = [ ]
	namecards = [ ]

	// racers that are done
	finishedPlayers = [ ]

	// sound effects being used
	sfx = { }

	// tracking track display state
	state = {
		speed: 0,
		shake: CAR_DEFAULT_SHAKE_LEVEL,
		accelerate: false,
		totalPlayers: 0
	}

	// handle remaining setup
	init(options) {
		options = merge({
			animationRateWhenRacing: ANIMATION_RATE_WHILE_RACING,
			animationRateWhenIdle: ANIMATION_RATE_WHILE_IDLE,
			scale: { height: scaling.BASE_HEIGHT }
		}, options);

		// base class init
		super.init(options);

		// set default audio state
		audio.configureSFX({ enabled: !!options.sfx });
		audio.configureMusic({ enabled: !!options.music });

		// preload common sounds
		audio.register('common', options.manifest.sounds);

		// tracking race position progress
		this.progress = options.manifest.progress;
		this.pendingPlayers = options.expectedPlayerCount;
		this.animationRate = options.animationRateWhenIdle;
		this.raceProgressAnimation = new RaceProgressAnimation({ track: this });

		// attach the effects filter
		this.stage.filters = [ this.filter ];
	}

	/** get the viewport size */
	getViewport() {
		const { width, height } = this;
		return { width, height };
	}

	/** finds a specific player */
	getPlayerById = id => {
		for (const player of this.players)
			if (player.id === id)
				return player;
	}

	/** adds a new car to the track */
	addPlayer = async (data, isInstant) => {
		const { state, stage, sfx } = this;

		// increase the expected players
		state.totalPlayers++;

		// create the player instance
		const playerOptions = merge({ view: this }, data);
		const player = await Player.create(playerOptions);
		player.track = this;

		// check for a plugin with special car rules
		const { animator } = this;
		const { car } = player;
		if (car.plugin?.extend)
			await car.plugin.extend({ animator, car, player, track: this });

		// set the active player, if needed
		const { isPlayer, id } = playerOptions;
		if (isPlayer) {
			this.activePlayerId = id;
			this.activePlayer = player;
			player.isPlayer = true;
		}

		// activate their car entry sound effect
		const { enterSound = 'sport' } = data.car || { };
		const rev = audio.create('sfx', 'common', `entry_${enterSound}`);
		if (rev) {
			rev.loop(false);
			rev.play();
		}
		
		// with the player, include their namecard
		const { namecard } = player.layers;
		if (namecard) {

			// wrap the container with a responsive container
			const container = new AnimatorPIXI.ResponsiveContainer();
			container.addChild(namecard);

			// add to the view
			stage.addChild(container);

			// match positions to the car
			container.zIndex = LAYER_NAMECARD;
			container.relativeY = player.relativeY;
			container.relativeX = 0;
			container.pivot.x = (namecard.width * -0.5);
		}

		// animate onto the track
		const entry = new CarEntryAnimation({ player, namecard, track: this });
		entry.play({
			isInstant,
			complete: () => this.setPlayerReady(player)
		});
		
		// add to the view
		stage.addChild(player);
		stage.sortChildren();
	}

	// manually changes the scroll value
	setScroll = position => {
		this.track.setTrackPosition(position);
	}

	/** assigns the current track */
	setTrack = async options => {
		const { stage } = this;
		const trackOptions = merge({ view: this }, options);
		const track = this.track = await Track.create(trackOptions);

		// add the scroling ground
		stage.addChild(track.ground);
		track.ground.zIndex = LAYER_TRACK_GROUND;
		track.ground.relativeX = 0.5;

		// add the scrolling overlay
		stage.addChild(track.overlay);
		track.overlay.zIndex = LAYER_TRACK_OVERLAY;
		track.overlay.relativeX = 0.5;

		// sort the layers
		stage.sortChildren();
	}

	/** sets a player as ready to go */
	setPlayerReady = player => {
		const { players, state } = this;
		const { totalPlayers } = state;

		// add the player to the list
		players.push(player);
		
		// game is ready to play
		// TODO: this might change depending on how players are loaded
		if (players.length === totalPlayers) {
			this.emit('ready');
		}
	}

	/** performs the disqualified effect */
	disqualifyPlayer = () => {
		const dq = audio.create('sfx', 'common', 'disqualified');
		dq.play();
	}

	/** happens after an input error */
	playerError = () => {

		// don't play too many error sounds
		const now = +new Date;
		if (now < this.lastErrorSound || 0) return;
		this.lastErrorSound = now + INPUT_ERROR_SOUND_TIME_LIMIT;

		// play the sound
		const selected = Math.ceil(Math.random() * 4);
		const err = audio.create('sfx', 'common', `error_${selected}`);
		err.play();
	}

	/** starts the game countdown */
	startCountdown = () => {
		
		// stop the entry sound effect
		const { sfx } = this;
		if (sfx.entry) {
			setTimeout(() => sfx.entry.fade(1, 0, 2000), 1500);
		}

		// prepare sounds
		const mark = audio.create('sfx', 'common', 'countdown_mark');
		const set = audio.create('sfx', 'common', 'countdown_set');
		const go = audio.create('sfx', 'common', 'countdown_go');

		// accelerate -- kinda loud
		const acceleration = audio.create('sfx', 'common', 'acceleration');
		acceleration.volume(0.15);
		
		// play the countdown
		setTimeout(mark.play, 2000);
		setTimeout(set.play, 3000);
		setTimeout(() => {
			
			// sounds
			go.play();
			acceleration.play();

			// notify the race has begun
			this.emit('start');
		}, 4000);
	}

	// set the music state
	configureSFX = audio.configureSFX
	configureMusic = audio.configureMusic

	/** changes the progress for a player */
	setProgress = (id, progress) => {
		const player = this.getPlayerById(id);
		player.progress = progress;
		player.isFinished = progress >= 0;

		// finish the race for this player
		// if progress is done
		if (player.progress >= 100)
			this.finishRace(player);
	}

	/** handles activating the nitro effect for a player */
	activateNitro = id => {
		const player = this.getPlayerById(id);
		if (player) {
			player.car.activateNitro();
		}
	}

	// begins the race
	startRace = () => {
		const { options } = this;
		this.state.accelerate = true;
		this.state.isStarted = true;
		this.animationRate = options.animationRateWhenRacing;
	}

	/** activates the finished race state */
	finishRace = ({ id } = { }) => {
		const { track, state, players, activePlayer, finishedPlayers, options } = this;

		// already added to finish
		if (!!~finishedPlayers.indexOf(id)) return;
		finishedPlayers.push(id);
		
		// find the player
		const player = this.getPlayerById(id);

		// if the animation has already begun, add them
		// to the animation
		if (this.raceCompletedAnimation) {
			this.raceCompletedAnimation.addPlayer(player);
			return;
		}

		// if this is not the active player, then there's
		// nothing left to do -- just continue to let them
		// animate off the track
		if (!player.isPlayer) return;

		// stop the track
		state.accelerate = false;
		state.speed = 0;
		state.shake = CAR_DEFAULT_SHAKE_LEVEL;
		state.isFinished = true;
		track.showFinishLine();

		// return to idle animation speed
		this.animationRate = options.animationRateWhenIdle;

		// stop animating progress
		this.raceProgressAnimation.stop();

		// play the final animation
		this.raceCompletedAnimation = new RaceCompletedAnimation({
			track,
			player,
			activePlayer,
			allPlayers: players,
			finishedPlayers
		});

		// start the animation - does this need
		// to be delayed?
		this.raceCompletedAnimation.play({ });
	}

	// handle rendering the track in the requested state
	render = () => {

		// increment the frame counter
		this.frame++;

		// gather some data
		const { state, frame, animationRate } = this;
		const { shake, accelerate } = state;

		// speeding up the view
		state.speed = accelerate
			? Math.min(TRACK_MAXIMUM_SPEED, state.speed + TRACK_ACCELERATION_RATE)
			: 0;
		
		// update the amount cars should shake
		const { speed } = state;
		state.shake = Math.max(shake, speed);

		// TODO: replace with new views
		// this is temporary check until
		// garage and preview modes are done
		this.track.update(state);
		if (state.isStarted && !state.isFinished)
			this.raceProgressAnimation.update();

		// if throttling
		if (frame % animationRate !== 0) return;

		// redraw		
		super.render();
	}

}