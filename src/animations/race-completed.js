import * as PIXI from 'pixi.js';

import { noop } from "../utils";
import CarFinishLineAnimation from "./car-finish";
import { tween, easing } from 'popmotion';

export default class RaceCompletedAnimation {

	constructor({ track, activePlayerId, player, allPlayers, finishedPlayers }) {
		this.track = track;
		this.player = player;
		this.allPlayers = allPlayers;
		this.finishedPlayers = finishedPlayers;
		this.activePlayerId = activePlayerId;
	}

	// shows the player animation
	addPlayer = (player, place, isInstant) => {
		const { track, activePlayerId } = this;
		const { stage } = track;
		const isActivePlayer = player.id === activePlayerId;

		// create the animation
		const animate = new CarFinishLineAnimation({ player, track, isActivePlayer, place, stage });
		animate.play({ isInstant });
	}

	// starts the animation
	play({ update = noop, complete = noop }) {
		const { player, finishedPlayers, allPlayers, track } = this;

		// hide namecards
		for (const p of allPlayers) {
			if (p.layers.namecard) {
				p.layers.namecard.visible = false;
				p.relativeX = -5;
			}
		}

		// place finished cars into the view
		for (let place = 0; place < finishedPlayers.length; place++) {
			const finished = finishedPlayers[place];
			const isAlreadyHere = player.id !== finished.id;
			this.addPlayer(finished, place, isAlreadyHere);
		}

		// create the flash effect
		const { view } = track.view;
		const flash = new PIXI.Sprite(PIXI.Texture.WHITE);
		view.addChild(flash);
		
		// match the screen and place on the top
		flash.width = view.width;
		flash.height = view.height;
		flash.zIndex = Number.MAX_SAFE_INTEGER;

		// fade the flash effect
		tween({ 
			from: 1,
			to: 0,
			ease: easing.circIn,
			duration: 1000
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