import * as PIXI from 'pixi.js';
import * as audio from '../audio';

import { noop } from "../utils";
import CarFinishLineAnimation from "./car-finish";
import { tween, easing } from 'popmotion';
import { RACE_FINISH_FLASH_FADE_TIME } from '../config';
import { VOLUME_FINISH_LINE_CROWD } from '../audio/volume';

export default class RaceCompletedAnimation {

	constructor({ track, activePlayerId, player, allPlayers, finishedPlayers }) {
		this.track = track;
		this.player = player;
		this.allPlayers = allPlayers;
		this.finishedPlayers = finishedPlayers;
		this.activePlayerId = activePlayerId;
		
		// create the flash of white
		const { view } = track.view;
		const flash = new PIXI.Sprite(PIXI.Texture.WHITE);
		this.flash = flash;
		
		// match the screen and place on the top
		flash.width = view.width;
		flash.height = view.height;
		flash.zIndex = Number.MAX_SAFE_INTEGER;

		// add it to the race
		view.addChild(flash);

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
		const { track, finishedPlayers, activePlayerId } = this;
		const { stage } = track;
		const isActivePlayer = player.id === activePlayerId;

		// create the animation
		const index = finishedPlayers.indexOf(player.id);
		const place = index + 1;
		const prior = finishedPlayers[index - 1];

		// first place 
		let delay = 0;
		let isInstant = false;

		// check for the best time to compare against
		if (place === 1) {
			this.firstCompletedTimestamp = player.completedAt;
			isInstant = true;
		}
		// for all other players
		else {

			// calculate the time difference
			const diff = player.completedAt - prior.completedAt;
			const delayModifier =
				diff <= 15 ? 10
				: diff <= 50 ?  5
				: diff <= 100 ? 2
				: 1;

			// create the TS delay
			delay = diff * delayModifier;
		}

		// restore the car view, if needed
		player.visible = true;

		// create the animation
		const animate = new CarFinishLineAnimation({ player, track, isActivePlayer, place, stage });
		animate.play({ isInstant, delay });
	}

	// starts the animation
	play({ update = noop, complete = noop }) {
		const { allPlayers, finishedPlayers, track, flash } = this;
		const { view } = track;

		// start by putting the players on the ending line
		// TODO: this need to have some timestamp logic
		for (let player of allPlayers) {
			const isFinished = !!~finishedPlayers.indexOf(player.id);

			// finished players, move to the finish line
			if (player.isPlayer || isFinished) {
				this.addPlayer(player);
			}
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
				flash.width = view.width;
				flash.height = view.height;

				// fade the effect
				flash.alpha = v;
			},
			// notify when the view is ready
			complete: () => this.hasFinishedFlashAnimation = true
		});

	}

}