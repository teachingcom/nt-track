import * as PIXI from 'pixi.js';

import { noop } from "../utils";
import CarFinishLineAnimation from "./car-finish";
import { tween, easing } from 'popmotion';
import { RACE_FINISH_FLASH_FADE_TIME } from '../config';

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
	addPlayer = (player, isInstant) => {
		const { track, finishedPlayers, activePlayerId } = this;
		const { stage } = track;
		const isActivePlayer = player.id === activePlayerId;

		// create the animation
		const place = finishedPlayers.indexOf(player.id) + 1;

		// restore the car view, if needed
		player.visible = true;

		// create the animation
		const animate = new CarFinishLineAnimation({ player, track, isActivePlayer, place, stage });
		animate.play({ isInstant });
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
				this.addPlayer(player, !player.isPlayer);
			}
			// otherwise, move off screen
			else {
				player.relativeX = -5;
				player.visible = false;
			}

		}

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
			}
		});

	}

}