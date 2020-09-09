import * as PIXI from 'pixi.js';

import { PIXI as AnimatorPIXI } from 'nt-animator';
import { merge } from '../../utils';
import * as audio from '../../audio';

import { BaseView } from '../base';
import Player from './player';
import Track from '../../components/track';

// sizing, layers, positions
import * as scaling from './scaling';
import {
	TRACK_MAXIMUM_SPEED,
	TRACK_ACCELERATION_RATE,
	CAR_DEFAULT_SHAKE_LEVEL,
	ANIMATION_RATE_STARTING_LINE,
	ANIMATION_RATE_FINISH_LINE,
	ANIMATION_RATE_WHILE_RACING,
	TRACK_MAXIMUM_SPEED_BOOST_RATE,
	TRACK_MAXIMUM_SPEED_DRAG_RATE
} from '../../config';

import {
	LAYER_NAMECARD,
	LAYER_TRACK_GROUND,
	LAYER_TRACK_OVERLAY
} from './layers';

import {
	VOLUME_DISQUALIFY,
	VOLUME_ERROR_1,
	VOLUME_ERROR_2,
	VOLUME_ERROR_3,
	VOLUME_ERROR_4,
	VOLUME_ERROR_DEFAULT
} from '../../audio/volume';

// animations
import CarEntryAnimation from '../../animations/car-entry';
import RaceCompletedAnimation from '../../animations/race-completed';
import RaceProgressAnimation from '../../animations/race-progress';
import FpsMonitor from '../../fps';
import CountdownAnimation from '../../animations/countdown';
import createConfetti from '../../plugins/confetti';
// import RainEffect from '../../plugins/effects/rain';

/** creates a track view that supports multiple cars for racing */
export default class TrackView extends BaseView {

	// tracking FPS changes
	fps = new FpsMonitor()

	// global effect filter
	colorFilter = new PIXI.filters.ColorMatrixFilter()
	frame = 0

	// tracking players and their namecards
	activePlayers = { }
	players = [ ]
	namecards = [ ]

	// sound effects being used
	sfx = { }

	// tracking track display state
	state = {
		speed: 0,
		shake: CAR_DEFAULT_SHAKE_LEVEL,
		animateTrackMovement: false,
		trackMovementAmount: 0,
		activeTypingSpeedModifier: 0,
		typingSpeedModifier: 0,
		typingSpeedModifierShift: 0,
		totalPlayers: 0
	}

	// handle remaining setup
	async init(options) {
		options = merge({
			animationRateWhenStartLine: ANIMATION_RATE_STARTING_LINE,
			animationRateWhenFinishLine: ANIMATION_RATE_FINISH_LINE,
			animationRateWhenRacing: ANIMATION_RATE_WHILE_RACING,
			scale: { height: scaling.BASE_HEIGHT }
		}, options);
		
		// base class init
		await super.init(options);

		// identify loading tasks
		// this.addTasks('load_track', 'load_extras', 'load_audio', 'load_player');
		this.addTasks('load_track', 'load_extras', 'load_audio');
		
		// set default audio state
		audio.configureSFX({ enabled: !!options.sfx });
		audio.configureMusic({ enabled: !!options.music });	
		
		// preload common sounds
		try {
			await audio.register('common', options.manifest.sounds);
			this.resolveTask('load_audio');
		}
		// unable to load sounds
		catch (ex) {
			console.warn('failed to load audio');
			throw new MissingAssetException();
		}
		
		// preload the countdown animation images
		try {
			const { animator, stage } = this;
			this.countdown = new CountdownAnimation({ track: this, stage, animator });
			await this.countdown.init();
			this.resolveTask('load_extras');
		}
		// unable to load the countdown
		catch(ex) {
			console.warn('failed to load countdown');
		}

		// tracking race position progress
		this.progress = options.manifest.progress;
		this.pendingPlayers = options.expectedPlayerCount;
		this.animationRate = options.animationRateWhenStartLine;
		this.raceProgressAnimation = new RaceProgressAnimation({ track: this });

		// attach the effects filter
		this.stage.filters = [ this.colorFilter ];

		// after initialized, start tracking
		this.fps.activate();
	}

	/** changes internal configurations */
	setConfig = options => {

		// ignores resource loading errors
		if ('ignoreResourceLoadingErrors' in options) {
			this.animator.ignoreImageLoadErrors = this.ignoreImageLoadErrors = !!options.ignoreResourceLoadingErrors;
		}

	}

	/** returns the FPS cache values */
	getFpsCache() {
		const { pixiCache, phaserCache } = this.fps.flush();
		return { fps: pixiCache, fps2: phaserCache };
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
		const { activePlayers, state, stage } = this;
		const playerOptions = merge({ view: this }, data);
		const { isPlayer, id } = playerOptions;

		// make sure this isn't a mistake
		if (activePlayers[data.id]) return;
		activePlayers[data.id] = true;

		// manage resource loading depending
		// on if this is the actual player or not
		// for others, just load placeholders if
		// there is a problem
		this.setConfig({ 
			ignoreImageLoadErrors: !isPlayer
		});
		
		// increase the expected players
		state.totalPlayers++;
		
		// create the player instance
		let player;
		try {
			player = await Player.create(playerOptions);
			player.track = this;
			
			// set the active player, if needed
			if (isPlayer) {
				this.activePlayerId = id;
				this.activePlayer = player;
				player.isPlayer = true;
			}

			// check for a plugin with special car rules
			const { animator } = this;
			const { car } = player;
			if (car.plugin?.extend)
				await car.plugin.extend({ animator, car, player, track: this });
			
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
				container.pivot.x = namecard.width * -0.5;
			}

			// animate onto the track
			const { enterSound = 'sport' } = data.car || { };
			const entry = new CarEntryAnimation({ player, namecard, enterSound, track: this });
			entry.play({
				isInstant,
				complete: () => this.setPlayerReady(player)
			});
			
			// add to the view
			stage.addChild(player);
			stage.sortChildren();

			// if this the current player then mark
			// the track as ready to show
			if (data.isPlayer) {
				state.playerHasEntered = true;
			}

		}
		// in the event the player failed to load
		catch (ex) {
			delete activePlayers[data.id];
			state.totalPlayers--;

			// if the player was created, try and remove it
			if (player) {
				player.dispose();
			}
		}
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
		this.resolveTask('load_track');

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

	/** removes a player */
	removePlayer = id => {
		const { activePlayers, players, state } = this;
		const player = this.getPlayerById(id);
		const index = players.indexOf(player);

		// if the player wasn't found then there's nothing to do
		if (!~index) return;

		// remove the entry
		players.splice(index, 1);
		delete activePlayers[id];

		// remove from total players
		state.totalPlayers--;

		// hide then remove
		player.dispose();
	}

	/** performs the disqualified effect */
	disqualifyPlayer = id => {
		const { state } = this;

		// get the player
		const player = this.getPlayerById(id);
		if (player && !player.isDisqualified) {
			player.isDisqualified = true;

			// play the sound
			if (player.isPlayer) {
				const dq = audio.create('sfx', 'common', 'disqualified');
				dq.volume(VOLUME_DISQUALIFY)
				dq.play();

				// tell the track to slow down and stop
				state.typingSpeedModifier = 0;
				state.trackMovementAmount = -TRACK_ACCELERATION_RATE;
			}
		}
	}

	/** happens after an input error */
	playerError = () => {
		const selected = Math.ceil(Math.random() * 4);
		const err = audio.create('sfx', 'common', `error_${selected}`);

		// select the correct volume
		const volume = [
			VOLUME_ERROR_1,
			VOLUME_ERROR_2,
			VOLUME_ERROR_3,
			VOLUME_ERROR_4
		][ selected - 1 ] || VOLUME_ERROR_DEFAULT;

		// set the volume
		err.volume(volume);
		err.play();
	}

	/** starts the game countdown */
	startCountdown = async () => {
		if (this.countdown)
			this.countdown.start();
	}

	// set the music state
	configureSFX = audio.configureSFX
	configureMusic = audio.configureMusic

	/** changes the progress for a player */
	setProgress = (id, { progress, finished, typed, typingSpeedModifier, completed }) => {
		const { state, raceCompletedAnimation } = this;
		const player = this.getPlayerById(id);

		// tracking values
		player.progressUpdateCount = (player.progressUpdateCount || 0) + 1;
		
		// don't crash if the player wasn't found
		if (!player) return;
		
		// nothing to do
		if (player.isFinished) return;
		
		// update the player
		const hasCompletedTimestamp = !!completed;
		player.progress = progress;
		player.completedAt = completed;
		player.isFinished = finished;
		player.totalTyped = typed;
		player.lastUpdate = +new Date;

		// save the server progress
		if (!finished) {
			player.serverProgress = progress;
		}

		// cause the track to scroll faster if the player
		// is typing quickly or slowly
		if (player.isPlayer) {
			const rate = (typingSpeedModifier > 0) ? TRACK_MAXIMUM_SPEED_BOOST_RATE : TRACK_MAXIMUM_SPEED_DRAG_RATE;
			state.typingSpeedModifier = typingSpeedModifier * rate;
			state.typingSpeedModifierShift = (state.typingSpeedModifier - (state.activeTypingSpeedModifier || 0)) * 0.01;
		}

		// this was the end of the race
		if (player.isPlayer && hasCompletedTimestamp) {
			setTimeout(this.finalizeRace);
		}
		// this player finished and the track is currently
		// playing the ending animation
		else if (!player.isPlayer && raceCompletedAnimation && hasCompletedTimestamp) {
			setTimeout(() => raceCompletedAnimation.play({ }));
		}
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
		const { options, state, countdown } = this;

		// finalize the go
		if (countdown)
			countdown.finish();

		// start movement
		state.animateTrackMovement = true;
		state.trackMovementAmount = TRACK_ACCELERATION_RATE;
		state.isStarted = true;
		
		// improve performance while racing
		this.animationRate = options.animationRateWhenRacing;
	}

	// performs the ending
	finalizeRace = () => {
		const { raceCompletedAnimation } = this;

		// if the completion animation hasn't started
		if (!raceCompletedAnimation)
			this.finishRace();

		// finalize the result
		raceCompletedAnimation.play({ });
	}

	/** activates the finished race state */
	finishRace = () => {

		// the race has been marked as finished, show the completion
		// until the player is marked ready
		const { players, track, raceCompletedAnimation, state, options } = this;
		
		// already playing (this shouldn't happen)
		if (raceCompletedAnimation) return;

		// stop background noises
		if (track.ambience)
			track.ambience.stop();

		// stop the track
		state.animateTrackMovement = false;
		state.speed = 0;
		state.shake = CAR_DEFAULT_SHAKE_LEVEL;
		state.isFinished = true;
		track.showFinishLine();

		// return to idle animation speed
		this.animationRate = options.animationRateWhenFinishLine;

		// stop animating progress
		this.raceProgressAnimation.stop();

		// play the final animation
		this.raceCompletedAnimation = new RaceCompletedAnimation({ track: this, players });	
	}

	lastUpdate = +new Date;

	// handle rendering the track in the requested state
	render(force) {

		// increment the frame counter
		this.frame++;
		const { state, stage, frame, animationRate } = this;

		// if throttling
		if (!force && frame % animationRate !== 0) return;

		// calculate the delta
		state.delta = this.getDeltaTime(this.lastUpdate);
		this.lastUpdate = +new Date;
		
		// gather some data
		const { animateTrackMovement, trackMovementAmount } = state;
		const isRaceActive = state.isStarted && !state.isFinished;

		// speeding up the view
		state.speed = animateTrackMovement
			? Math.max(0, Math.min(TRACK_MAXIMUM_SPEED, state.speed + (trackMovementAmount * state.delta)))
			: 0;

		// increase the track movement by the speed bonus
		// allows up to an extra 75% of the normal speed
		if (isRaceActive) {
			const { typingSpeedModifier = 0 } = state;

			// shift to the new size
			state.activeTypingSpeedModifier += state.typingSpeedModifierShift;
			if (state.typingSpeedModifierShift > 0)
				state.activeTypingSpeedModifier = Math.min(state.activeTypingSpeedModifier, typingSpeedModifier);
			else if (state.typingSpeedModifierShift < 0)
				state.activeTypingSpeedModifier = Math.max(state.activeTypingSpeedModifier, typingSpeedModifier);
			else state.activeTypingSpeedModifier = 0;

			// set the racing speed with modifiers
			state.speed = Math.max(state.speed, state.speed + (state.activeTypingSpeedModifier * state.delta));
		}

		// TODO: replace with new views
		// this is temporary check until
		// garage and preview modes are done
		if (this.track && isRaceActive) {
			this.track.update(state);
			this.raceProgressAnimation.update();
		}

		// redraw		
		super.render();
	}

}


function MissingAssetException() { }