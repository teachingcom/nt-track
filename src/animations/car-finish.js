import Animation from "./base";

import { noop } from "../utils";
import * as audio from '../audio';
import { tween, easing } from 'popmotion';
import { RACE_FINISH_CAR_STOPPING_TIME, RACE_SOUND_TIRE_SCREECH_MAX_INTERVAL } from "../config";
import { VOLUME_FINISH_LINE_STOP } from "../audio/volume";

export default class CarFinishLineAnimation extends Animation {

	constructor({ isActivePlayer, player, track, place }) {
		super();
		
		this.player = player;
		this.track = track;
		this.place = place;
		this.isActivePlayer = isActivePlayer;
	}

	play({ isInstant = false, delay = 0, elapsed = 0, update = noop, complete = noop }) {
		const { player } = this;

		// if this animation has already been activated, then
		// don't do it again
		// TODO: there was a scenario where the finish line
		// animation played twice - This is to prevent it from happening
		// but that bug should be tracked down
		if (player.hasShownFinishLineAnimation) return;
		player.hasShownFinishLineAnimation = true;

		// check for instant animations
		if (elapsed > RACE_FINISH_CAR_STOPPING_TIME)
			isInstant = true;

		// if this car is entering
		if (!isInstant) {
			const stop = audio.create('sfx', 'common', 'car_stopping');

			// make sure this hasn't played too recently to avoid
			// 5 car screeching noises all at once
			setTimeout(() => {
				const now = +new Date;
				const nextAllowedPlay = stop.lastInstancePlay + RACE_SOUND_TIRE_SCREECH_MAX_INTERVAL;
				if (nextAllowedPlay > now) return;
				
				// play the sound effect, if possible
				stop.volume(VOLUME_FINISH_LINE_STOP);
				stop.play();
			}, 500);

		}

		// starting and ending points
		const entryOrigin = { playerX: -0.15 };
		const entryDestination = { playerX: 0.975 };
		
		// handle updating the entry animation
		const updateEntryProps = props => {
			player.relativeX = props.playerX;
			player.visible = true;
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
		setTimeout(() => {
			tween({
				duration: RACE_FINISH_CAR_STOPPING_TIME,
				elapsed: Math.min(elapsed, RACE_FINISH_CAR_STOPPING_TIME),
				ease: easing.circOut,
				from: entryOrigin,
				to: entryDestination
			})
			.start({ update: updateEntryProps });
		}, delay);

	}

}