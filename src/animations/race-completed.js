import { noop } from "../utils";
import CarFinishLineAnimation from "./car-finish";


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
		const { player, finishedPlayers, allPlayers } = this;

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

	}

}