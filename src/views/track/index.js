
import { PIXI } from 'nt-animator';
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
	TRACK_MAXIMUM_SPEED_BOOST_RATE,
	TRACK_MAXIMUM_SPEED_DRAG_RATE,
	TRACK_STARTING_LINE_POSITION
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
import CountdownAnimation from '../../animations/countdown';

/** creates a track view that supports multiple cars for racing */
export default class TrackView extends BaseView {

	constructor(...args) { 
		// do not anti-alias - this will be done using SSAA
		// PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST
		PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.LINEAR
		PIXI.settings.PRECISION_VERTEX = PIXI.PRECISION.LOW
		PIXI.settings.PRECISION_FRAGMENT = PIXI.PRECISION.LOW
		PIXI.settings.MIPMAP_TEXTURES = PIXI.MIPMAP_MODES.OFF
		PIXI.settings.ROUND_PIXELS = true

		super(...args)
	}

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
			scale: { height: scaling.BASE_HEIGHT },
			dynamicPerformanceCacheKey: 'track'
		}, options);
		
		// base class init
		await super.init(options);

		// start initializing 
		this.fps.activate();

		// identify loading tasks
		this.addTasks('load_track', 'load_assets', 'load_extras');

		// set default audio state
		audio.configureSFX({ enabled: !!options.sfx });
		audio.configureMusic({ enabled: !!options.music });	
		
		// tracking race position progress
		const { isQualifyingRace } = options;
		this.progress = options.manifest.progress;
		this.pendingPlayers = options.expectedPlayerCount;
		this.raceProgressAnimation = new RaceProgressAnimation({ track: this, isQualifyingRace });

		// attach the effects filter
		// this.stage.filters = [ this.colorFilter ];
	}

	// allow waiting for the track to finish loading
	_waitingForTrack = [ ]
	resolveWaitingTrackRequests() {
		this.isTrackReady = true;
		for (const resolve of this._waitingForTrack) {
			try {
				resolve(this.track);
			}
			catch (ex) {
				console.warn('Failed to resolve track request');
			}
		}
	}

	// gets the currently loaded track instance
	async getTrackInstance() {
		if (this.isTrackReady) {
			return this.track;
		}

		// queue the request
		return new Promise(resolve => {
			this._waitingForTrack.push(resolve);
		})
	}

	// when finishing preloading of assrets
	onLoadTrackAssets = () => {
		this.resolveTask('load_assets');
	}

	/** returns the FPS cache values */
	getFpsCache() {
		const { pixiCache, phaserCache } = this.fps.flush();
		return { fps: phaserCache, fps2: pixiCache };
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

	/** finds a player based on the lane number */
	getPlayerByLane = lane => {
		const id = this.lanes[lane]
		return this.getPlayerById(id);
		// const { players } = this;
		// for (const player of players)
		// 	if (player.options?.lane === lane)
		// 		return player;
	}

	lanes = [ ]

	// reserve a new lane
	reserveLane = (preferredLane, id) => {
		const MAX_LANES = 5;
		for (let lane = 0; lane < MAX_LANES; lane++) {
			if (!this.lanes[lane]) {
				this.lanes[lane] = id;
				return lane;
			}
		}
	}

	// opens a lane for use again
	releaseLane = id => {
		for (let i = 0; i < this.lanes.length; i++) {
			if (this.lanes[i] === id) {
				this.lanes[i] = undefined;
			}
		}
	}

	/** adds a new car to the track */
	addPlayer = async (data, isInstant) => {
		const { activePlayers, state, stage, isViewActive, animator } = this;

		const track = await this.getTrackInstance();
		const lighting = track?.manifest?.lighting;
		const playerOptions = { view: this, ...data, lighting };
		let { isPlayer, id, lane } = playerOptions;
		
		// get a lane to use
		playerOptions.lane = this.reserveLane(lane, id);
		
		// make sure this isn't a mistake
		if (activePlayers[data.id]) return;
		activePlayers[data.id] = true;
		
		// increase the expected players
		state.totalPlayers++;
		
		// create the player instance
		let player;
		try {
			player = await Player.create(playerOptions, this);
			player.track = this;

			// if this player failed to load, abandon the
			// attempt
			if (isPlayer && !player.hasRequiredAssets)
				throw new PlayerAssetError();
			
			// set the active player, if needed
			if (isPlayer) {
				this.activePlayerId = id;
				this.activePlayer = player;
				player.isPlayer = true;
			}

			// check for a plugin with special car rules
			const { car } = player;
			if (car.plugin?.extend)
				await car.plugin.extend({ animator, car, player, track: this });
			
			// with the player, include their namecard
			const { namecard } = player.layers;
			if (namecard) {

				// wrap the container with a responsive container
				const container = new PIXI.ResponsiveContainer();
				container.addChild(namecard);

				// add to the view
				stage.addChild(container);

				// match positions to the car
				container.zIndex = LAYER_NAMECARD;
				container.relativeY = player.relativeY;
				container.relativeX = 0;
				container.pivot.x = namecard.width * -0.5;
			}

			// if the screen isn't focused, then tween animations
			// won't play, so just make it instant
			if (!isViewActive || this.state.isStarted) 
				isInstant = true;

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
			console.log('failed to add player', ex)
			delete activePlayers[data.id];
			state.totalPlayers--;

			// if the player was created, try and remove it
			if (player) player.dispose();

			// if this is the player, then this was
			// a breaking exception
			if (isPlayer) throw ex;
		}
	}

	// tracking sections of loading process
	setLoadingStatus(type, status) {
		this.loadingStatus = { type, status };
	}

	// manually changes the scroll value
	setScroll = position => {
		this.track.setTrackPosition(position);
	}

	getStartingLinePosition() {
		return TRACK_STARTING_LINE_POSITION;
		
		// responsive track support
		// const { height, options } = this;
		
		// // get the height ratio against the target
		// // size that scaling is based on
		// let ratio = height / options.scale.height;
		// if (isNaN(ratio)) {
		// 	ratio = 1;
		// }

		// // calculate the correct position
		// return TRACK_STARTING_LINE_POSITION * ratio;
	}

	/** assigns the current track */
	setTrack = async options => {
		const { stage, animator } = this;
		const trackOptions = {
			view: this,
			onLoadTrackAssets: this.onLoadTrackAssets,
			...options
		};

		// try and load the track instance
		let track
		try {
			try {
				this.setLoadingStatus('init', 'creating track instance');
				// await waitWithTimeout(loading, TRACK_CREATION_TIMEOUT);
				track = this.track = await Track.create(trackOptions)
			}
			// failed to create the track in a timely fashion
			catch (ex) {
				console.log(ex)
				throw new Error(`Failed to create new track instance`);
			}
			
			// preload the countdown animation images
			try {
				this.setLoadingStatus('init', 'creating countdown');
				this.countdown = new CountdownAnimation({
					track: this,
					stage,
					animator,
					onBeginRace: this.onBeginRace
				});
				
				this.setLoadingStatus('init', 'initializing countdown');
				await this.countdown.init();
				this.resolveTask('load_extras');
			}
			// unable to load the countdown
			catch(ex) {
				// delete this.countdown;
				console.error(`Failed to load required files for countdown animation`, ex);
				throw new CountdownAssetError();
			}

			// verify the countdown loaded
			if (!this.countdown?.isReady) {
				this.setLoadingStatus('init', 'countdown was incomplete');
				console.error(`Countdown did not load successfully`);
				throw new CountdownAssetError();
			}

			// ambience is optional
			try {
				track.setAmbience('start');
			}
			catch (ex) {
				this.setLoadingStatus('init', 'track audio was not loaded');
				console.error(`Audio did not load successfully`);
			}

			// track is ready to go
			this.resolveTask('load_track');
		}
		// any failures
		catch (ex) {
			console.log(ex)
			throw new TrackCreationError();
		}

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

		// kick off animations
		if (options.raceInProgress) {
			this.state.speed = TRACK_MAXIMUM_SPEED
			this.startRace()
			this.track._cycleTrack(-4000)
		}

		// resolve waiting track requests
		this.resolveWaitingTrackRequests()
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

		// clear this players lane
		this.releaseLane(id);

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
				const dq = audio.create('sfx', 'disqualified');
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
		const err = audio.create('sfx', `error_${selected}`);

		// if there's not a sound, don't bother
		if (!err) {
			return;
		}

		// select the correct volume
		const volume = [
			VOLUME_ERROR_1,
			VOLUME_ERROR_2,
			VOLUME_ERROR_3,
			VOLUME_ERROR_4
		][ selected - 1 ] || VOLUME_ERROR_DEFAULT;

		// set the volume
		try {
			err.volume(volume);
			err.play();
		}
		catch (ex) {
			console.warn(`Unable to play audio: error_${selected}`, err);
		}
	}

	/** starts the game countdown */
	startCountdown = async () => {
		this.emit('race:countdown');

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

		// don't crash if the player wasn't found
		if (!player) return;
		
		// nothing to do
		if (player?.isFinished) return;

		// tracking values
		player.progressUpdateCount = (player.progressUpdateCount || 0) + 1;
		
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

		// change the ambience
		this.emit('race:start');
		this.track?.setAmbience('race');

		// toggle all start animations
		for (const player of this.players) {
			player.toggle.activate('moving')
		}

		// start movement
		state.animateTrackMovement = true;
		state.trackMovementAmount = TRACK_ACCELERATION_RATE;
		state.isStarted = true;
	}

	// performs the ending
	finalizeRace = () => {
		const { raceCompletedAnimation } = this;

		// if the completion animation hasn't started
		if (!raceCompletedAnimation)
			return this.finishRace();

		// finalize the result
		raceCompletedAnimation.play({ });
	}

	simulateFinish() { 
		this.state.isFinished = true;
		this.track.showFinishLine();
		const complete = new RaceCompletedAnimation({ track: this, players: this.players });	
		complete.play({ })
	}

	/** activates the finished race state */
	finishRace = () => {
		this.finalizePerformanceTracking();

		// the race has been marked as finished, show the completion
		// until the player is marked ready
		const { players, track, raceCompletedAnimation, state, options } = this;
		
		// already playing (this shouldn't happen)
		if (raceCompletedAnimation) return;
		
		// stop the track
		state.animateTrackMovement = false;
		state.speed = 0;
		state.shake = CAR_DEFAULT_SHAKE_LEVEL;
		state.isFinished = true;
		
		// update the track
		if (track) {
			// play the correct background noise
			const victory = players.length === 1;
			track.setAmbience(victory ? 'victory' : 'finish');

			// display the ending
			track.showFinishLine();
			
			// stop animating progress
			this.raceProgressAnimation.stop();
			
			// play the final animation
			this.raceCompletedAnimation = new RaceCompletedAnimation({ track: this, players });	
		}
	}

	lastUpdate = +new Date;

	// handle rendering the track in the requested state
	render(force) {

		// calculate the delta
		const now = Date.now();
		
		// increment the frame counter
		this.frame++;
		const {
			state,
			track,
			stage,
			raceProgressAnimation,
			raceCompletedAnimation
		} = this;

		state.delta = this.getDeltaTime(now);
		this.lastUpdate = now;
		
		// gather some data
		const { animateTrackMovement, trackMovementAmount } = state;
		const isRaceActive = state.isStarted && !state.isFinished;

		// speeding up the view
		state.speed = animateTrackMovement
			? Math.max(0, Math.min(TRACK_MAXIMUM_SPEED, state.speed + (trackMovementAmount * state.delta)))
			: 0;

		// set the base speed for variables
		this.animationVariables.base_speed = state.speed;

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

		// for animation helpers
		this.animationVariables.speed = state.speed / TRACK_MAXIMUM_SPEED

		// TODO: replace with new views
		// this is temporary check until
		// garage and preview modes are done
		if (track && isRaceActive) {
			track.updateScripts(state);
			track.update(state);
			raceProgressAnimation.update();
		}
		
		// race is finished
		if (raceCompletedAnimation) {
			raceCompletedAnimation.update();
		}
		
		// if throttling
		if (!this.shouldAnimateFrame && !force) return;

		// perform the draw
		super.render();
	}

	// save the FPS and performance score
	finalizePerformanceTracking = () => {
		const { actualFps } = this.fps.phaserFPS;

		// if for some reason the FPS is zero, do not replace
		// the score since it'll force the lowest settings
		if (actualFps <= 0) {
			return;
		}

		// save the final result
		if (this.performance) {
			this.performance.finalize();
		}
	}

	getDynamicPerformanceSummary() {
		if (!this.performance) {
			return { };
		}

		return {
			qualityStart: this.performance.initialLevel,
			qualityCached: this.performance.cachedLevel,
			qualitySummary: this.performance.getVariance(),
			qualityUpgradeCount: this.performance.upgrades,
			qualityDowngradeCount: this.performance.downgrades
		}
	}

}


function CountdownAssetError() { }
function TrackCreationError() { }
function AudioAssetError() { }
function PlayerAssetError() { }
