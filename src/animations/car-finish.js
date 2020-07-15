import { noop } from "../utils";
import * as audio from '../audio';
import { tween, easing, delay } from 'popmotion';
import { TRACK_CENTER } from "../views/track/scaling";

export default class CarFinishLineAnimation {

	constructor({ isActivePlayer, player, track, place }) {
		this.player = player;
		this.track = track;
		this.place = place;
		this.isActivePlayer = isActivePlayer;
	}

	play({ isInstant = false, update = noop, complete = noop }) {
		const { player, place, isActivePlayer, track } = this;
		const { car, trail } = player;
		const { shadow } = car;

		// sound effect for the current player
		if (isActivePlayer) {

			// start the audio finish audio
			const crowd = audio.create('sfx', 'common', 'finish_crowd');
			crowd.play();

			// queue up the stop sound
			const stop = audio.create('sfx', 'common', 'car_stopping');
			setTimeout(() => stop.play(), 500);
		}

		
		// create params
		const placementOffset = place * 0.1;

		// the starting point for the animatin
		// TODO: look at shortening the animation and
		// starting closer to the line
		const entryOrigin = {
			playerX: -0.25 - placementOffset
		};

		// the stopping point
		// TODO: look at a tigher fit when lanes are staggered
		const entryDestination = {
			playerX: 0.975
		};
		
		// handle updating the entry animation
		const updateEntryProps = props => {
			player.relativeX = props.playerX;
		};

		// set the new starting positions
		player.relativeX = entryOrigin.playerX;

		// if this shouldn't be animated, for example
		// the player isn't finishing in first place
		if (isInstant) {
			updateEntryProps(entryDestination);
			if (complete) complete();
			return;
		}

		// set starting positions
		updateEntryProps(entryOrigin);

		// start the entry animation
		tween({
			duration: 1500,
			// duration: 3000,
			// ease: easing.cubicBezier(.27,1.31,.25,.72),
			ease: easing.easeOut,
			from: entryOrigin,
			to: entryDestination
		})
		.start({ update: updateEntryProps });

	}

}