import * as PIXI from 'pixi.js';
import * as audio from '../audio';
import Animation from './base';
import CarFinishLineAnimation from "./car-finish";

import { noop } from "../utils";
import { tween, easing } from 'popmotion';
import { RACE_FINISH_FLASH_FADE_TIME, RACE_FINISH_CAR_STOPPING_TIME } from '../config';
import { VOLUME_FINISH_LINE_CROWD } from '../audio/volume';

export default class RaceCompletedAnimation extends Animation {

	constructor({ track, activePlayerId, player, allPlayers, finishedPlayers }) {
		super();
		
		this.track = track;
		this.allPlayers = allPlayers;
		this.finishedPlayers = finishedPlayers;
		this.activePlayerId = activePlayerId;

		// play the finish sound
		const finish = audio.create('sfx', 'common', 'finish_crowd');
		finish.volume(VOLUME_FINISH_LINE_CROWD);
		finish.play();

		// start the flash effect
		this.activateFlash();

		// reset all car positions
		for (const p of allPlayers) {
			p.relativeX = -0.15;
			p.stopProgressAnimation();
		}
	}

	// adready animated cars
	onTrack = { };

	/** finds the winner for the race */
	getWinner = () => {
		const { track } = this;
		const { players } = track;

		// check each finished timestamp
		let winner;
		for (let i = 0; i < players.length; i++) {
			const player = players[i];
			const ts = player.completedAt || Number.MAX_SAFE_INTEGER;
			const compare = (winner && winner.completedAt) || Number.MAX_SAFE_INTEGER;
			if (ts < compare) winner = player;
		}

		return winner;
	}

	// shows the player animation
	addPlayer = (player, isInstant) => {
		const { track, activePlayerId, finishedPlayers } = this;
		const { stage, players, activePlayer } = track;
		
		// add to the track
		if (this.onTrack[player.id]) return;
		this.onTrack[player.id] = true;
		
		// racing params
		let delay = 0;
		const elapsed = 0;
		const place = 0;
		
		// determine who won
		const winner = this.getWinner();
		const isActivePlayer = player.id === activePlayerId;

		// set positions
		if (!isInstant && !!winner) {
			const diff = (player.completedAt - winner.completedAt);
			const modifier = getModifier(diff);
			delay = diff * modifier;

			// if this is an excessive delay, just round it down
			if (!isActivePlayer && delay > RACE_FINISH_CAR_STOPPING_TIME)
				delay %= RACE_FINISH_CAR_STOPPING_TIME;
		}

		// animate the result
		const animate = new CarFinishLineAnimation({ player, track, isActivePlayer, place, stage });
		animate.play({ isInstant, delay, elapsed });
	}

	// starts the animation
	play({ update = noop, complete = noop }) {
		const { allPlayers, finishedPlayers, track } = this;
		const { activePlayer } = track;

		// start by putting the players on the ending line
		for (let player of allPlayers) {
			const isFinished = !!~finishedPlayers.indexOf(player.id);
			
			// if finished, add to the view
			if (isFinished)
				this.addPlayer(player);

			// otherwise, move off screen
			else {
				player.relativeX = -1; // place offscreen
				player.visible = false;
			}
		}

		// mark this animation as active
		this.raceCompletedAt = activePlayer.completedAt;
	}

	// perform the flash animation
	activateFlash = () => {
		const { track } = this;

		// create the flash of white
		const flash = new PIXI.Sprite(PIXI.Texture.WHITE);

		// match the screen and place on the top
		flash.width = track.width;
		flash.height = track.height;
		flash.zIndex = Number.MAX_SAFE_INTEGER;

		// add it to the race
		track.view.addChild(flash);

		// fade the flash effect
		setTimeout(() => 
			tween({ 
				from: 1,
				to: 0,
				ease: easing.circIn,
				duration: RACE_FINISH_FLASH_FADE_TIME
			})
			.start({
				update: v => {

					// match the size in case the view changes
					flash.width = track.width;
					flash.height = track.height;

					// fade the effect
					flash.alpha = v;
				},
				// notify when the view is ready
				complete: () => this.hasFinishedFlashAnimation = true
			}), 250);

	}

}

function getModifier(diff) {
	return diff <= 15 ? 10
		: diff <= 50 ?  5
		: diff <= 100 ? 2
		: 1
}