import * as PIXI from 'pixi.js';
import { PIXI as AnimatorPIXI } from 'nt-animator';
import { merge } from '../../utils';
import * as audio from '../../audio';

// sizing, layers, positions
import * as scaling from './scaling';
import { TRACK_NAMECARD_EDGE_PADDING, TRACK_MAXIMUM_SPEED, TRACK_ACCELERATION_RATE, CAR_DEFAULT_SHAKE_LEVEL } from '../../config';
import { LAYER_NAMECARD, LAYER_TRACK_GROUND, LAYER_TRACK_OVERLAY } from './layers';

import { BaseView } from '../base';
import Player from './player';
import Track from '../../components/track';
import CarEntryAnimation from '../../animations/car-entry';
import RaceCompletedAnimation from '../../animations/race-completed';

/** creates a track view that supports multiple cars for racing */
export default class TrackView extends BaseView {

	// global effect filter
	filter = new PIXI.filters.ColorMatrixFilter()

	// tracking players and their namecards
	players = [ ]
	namecards = [ ]

	// racers that are done
	finishedPlayers = [ ]

	// tracking track display state
	state = {
		speed: 0,
		shake: CAR_DEFAULT_SHAKE_LEVEL,
		accelerate: false,
		totalPlayers: 0
	}

	// handle remaining setup
	init(options) {
		options = merge({ scale: { height: scaling.BASE_HEIGHT }}, options);
		super.init(options);

		// set default audio state
		audio.configureSFX({ enabled: !!options.sfx });
		audio.configureMusic({ enabled: !!options.music });

		// tracking race position progress
		this.progress = options.manifest.progress;
		this.pendingPlayers = options.expectedPlayerCount;

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
		const { state, stage } = this;

		// increase the expected players
		state.totalPlayers++;

		// create the player instance
		const playerOptions = merge({ view: this }, data);
		const player = await Player.create(playerOptions);
		player.track = this;

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
			container.pivot.x = (namecard.width * -0.5) - TRACK_NAMECARD_EDGE_PADDING;
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

	/** starts the game countdown */
	startCountdown = () => {
		setTimeout(() => console.log('ready'), 1000);
		setTimeout(() => console.log('set'), 2000);
		setTimeout(() => {
			console.log('go!')
			this.emit('start');
		}, 3000);
	}

	// set the music state
	configureSFX = audio.configureSFX
	configureMusic = audio.configureMusic

	/** changes the progress for a player */
	setProgress = (id, progress) => {
		const { state, options } = this;
		const { activePlayerId } = options;
		const { isFinished } = state;
		const player = this.getPlayerById(id);
		
		// nothing to do
		if (player.isFinished) {
			return;
		}

		// if the progress is 100 then this is a winner
		if (progress >= 100) {
			player.isFinished = true;
			this.finishRace(player);

			// if this activates the ending animation
			// then it can stop now
			if (player.id === activePlayerId) {
				return;
			}
		}

		// the race is done so there's nothing to animate
		if (isFinished) return;

		// set the completion value
		player.setProgress(progress);
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
		this.state.accelerate = true;
	}

	/** activates the finished race state */
	finishRace = player => {
		const { track, state, options, players, finishedPlayers } = this;
		const { activePlayerId } = options;

		// save the finish
		const place = finishedPlayers.length;
		finishedPlayers.push(player);

		// if currently playing the finish animation, add the player
		if (this.raceCompletedAnimation) {
			this.raceCompletedAnimation.addPlayer(player, place);
			return;
		}

		// nothing to do if an existing player
		if (player.id !== activePlayerId) {
			return;
		}

		// switch to the finishline view
		track.showFinishLine();
		
		// stop the track
		state.accelerate = false;
		state.speed = 0;
		state.shake = CAR_DEFAULT_SHAKE_LEVEL;
		state.isFinished = true;

		// deactivate all current tweens
		for (const p of players) {
			p.stopProgressAnimation();
		}

		// play the final animation
		this.raceCompletedAnimation = new RaceCompletedAnimation({
			track,
			player,
			activePlayerId,
			allPlayers: players,
			finishedPlayers
		});

		// start the animation
		this.raceCompletedAnimation.play({
			
		});

	}

	// handle rendering the track in the requested state
	render = () => {
		const { state } = this;
		const { isFinished } = state;

		// if the race is active, update the game
		if (!isFinished) {

			// calculate calues
			const { speed, shake, accelerate } = state;
			if (accelerate) {
				state.speed = Math.min(TRACK_MAXIMUM_SPEED, speed + TRACK_ACCELERATION_RATE);
			}
			
			// update the amount cars should shake
			state.shake = Math.max(shake, speed);
			
			// update each player
			for (const player of this.players) {
				player.update(state);
			}

			// TODO: replace with new views
			// this is temporary check until
			// garage and preview modes are done
			this.track.update(state);
		}

		
		// redraw
		super.render();
	}

}