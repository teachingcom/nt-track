import * as PIXI from 'pixi.js';
import * as audio from '../audio';

import { noop } from "../utils";
import CarFinishLineAnimation from "./car-finish";
import { tween, easing } from 'popmotion';
import { RACE_FINISH_FLASH_FADE_TIME, RACE_FINISH_CAR_STOPPING_TIME } from '../config';
import { VOLUME_FINISH_LINE_CROWD } from '../audio/volume';

export default class RaceCompletedAnimation {

	constructor({ track, activePlayerId, player, allPlayers, finishedPlayers }) {
		this.track = track;
		this.player = player;
		this.allPlayers = allPlayers;
		this.finishedPlayers = finishedPlayers;
		this.activePlayerId = activePlayerId;
		
		// create the flash of white
		const flash = new PIXI.Sprite(PIXI.Texture.WHITE);
		this.flash = flash;
		
		// match the screen and place on the top
		flash.width = track.width;
		flash.height = track.height;
		flash.zIndex = Number.MAX_SAFE_INTEGER;

		// add it to the race
		track.view.addChild(flash);

		// reset all car positions
		for (const p of allPlayers) {
			p.car.relativeX = -0.15;

			// also has a namecard
			if (p.namecard) {
				p.namecard.relativeX = -0.15;
			}
		}
	}

	// shows the player animation
	addPlayer = player => {
		const { track, finishedPlayers, activePlayerId, raceCompletedAt } = this;
		const { stage, activePlayer } = track;
		const isActivePlayer = player.id === activePlayerId;
		
		// create the animation
		const index = finishedPlayers.indexOf(player.id);
		const place = index + 1;

		// params
		let isInstant;
		let delay = 0;
		let elapsed = 0;
		
		// for non-players, determine how they're animated
		// into the view
		if (!player.isPlayer) {

			// calculate the time difference
			const diff = player.completedAt - activePlayer.completedAt;

			// finished behind player
			if (diff > 0) {
				delay = diff * (
					diff <= 15 ? 10
					: diff <= 50 ?  5
					: diff <= 100 ? 2
					: 1
				);

				// don't let the delay happen if the
				// final moments of the race has already finished
				// if the finish line animation has been played, then there's no
				// reason to delay late car animations
				const now = +new Date;
				const skipAnimationDelay = !isNaN(raceCompletedAt) && now > (raceCompletedAt + RACE_FINISH_CAR_STOPPING_TIME);
				if (skipAnimationDelay) delay = 0;
			}
			// finished ahead of player
			else elapsed = -diff * 0.5;
		}

		// create the animation
		const animate = new CarFinishLineAnimation({ player, track, isActivePlayer, place, stage });
		animate.play({ isInstant, delay, elapsed });
	}

	// starts the animation
	play({ update = noop, complete = noop }) {
		const { allPlayers, finishedPlayers, track, flash } = this;
		const { activePlayer } = track;

		// start by putting the players on the ending line
		for (let player of allPlayers) {
			const isFinished = !!~finishedPlayers.indexOf(player.id);
			
			// if finished, add to the view
			if (isFinished)
				this.addPlayer(player);

			// otherwise, move off screen
			else {
				player.relativeX = -5; // negative 5 is way off to the side
				player.visible = false;
			}
		}
		
		// play the finish sound
		const finish = audio.create('sfx', 'common', 'finish_crowd');
		finish.volume(VOLUME_FINISH_LINE_CROWD);
		finish.play();

		// mark this animation as active
		this.raceCompletedAt = activePlayer.completedAt;

		// fade the flash effect
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
		});

	}

}