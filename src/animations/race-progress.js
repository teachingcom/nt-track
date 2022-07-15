import Animation from './base';

import { getBoundsForRole, animate } from "nt-animator";
import {
	RACE_ENDING_ANIMATION_STANDARD_THRESHOLD,
	RACE_ENDING_ANIMATION_QUALIFYING_THRESHOLD,
	RACE_PLAYER_DISTANCE_MODIFIER,
	RACE_OFF_SCREEN_FINISH_DISTANCE,
	TRACK_STARTING_LINE_POSITION,
} from "../config";

const INTRO_OFFSET_DURATION = 10000

export default class RaceProgressAnimation extends Animation {

	constructor({ track, players, player, isQualifyingRace = false }) {
		super();

		this.track = track;
		this.isQualifyingRace = isQualifyingRace;
		this.beginOutroThreshold = isQualifyingRace
			? RACE_ENDING_ANIMATION_QUALIFYING_THRESHOLD
			: RACE_ENDING_ANIMATION_STANDARD_THRESHOLD;
	}

	// bonus distance for qualifying races
	qualifyingX = 0

	// cached sizes for cars
	fitTo = { }

	// active animation tweens
	tweens = { }

	// tracking update timestamps
	timestamps = { }

	// prior progress values
	lastUpdate = { }

	// determines a the required percentage amount of movement
	// required to move the screen acceptably off-screen
	getOffscreenScale = player => {
		const { track, fitTo } = this;

		// calculate the size of the car relative to the track and
		// add that to the required progress to finish the race
		// cache this so the sizing doesn't change over time
		let size = fitTo[player.id];
		if (!size) {
			const bounds = getBoundsForRole(player.car.car, 'base');
			const width = bounds ? bounds.width : player.car.car.width;
			fitTo[player.id] = size = width * RACE_OFF_SCREEN_FINISH_DISTANCE;
		}

		return size / track.view.width;
	}

	/** animates everyone except for the current player */
	updateOther = player => {
		const { track, tweens, isQualifyingRace } = this;
		const { activePlayer } = track;
		const interpolator = tweens[player.id];

		// other racers on a qualifying race should look like they're
		// trying to keep up, but just can't close the gap
		if (isQualifyingRace) {
			player.preferredX = activePlayer.relativeX - (0.015 + Math.random() * 0.185)
		}
		// calculate a position relative to the player but
		// offset by the difference in progress
		else {
			const progress = player.progress / 100;
			const compareTo = activePlayer.progress / 100;
			const diff = (progress - compareTo) * RACE_PLAYER_DISTANCE_MODIFIER;
	
			// save the position
			player.raceProgressModifier = diff;
			player.preferredX = (activePlayer.preferredX || activePlayer.relativeX) + diff;
		}

		// adjust this player tween
		interpolator.update(player.relativeX, player.preferredX);
	}

	/** animates the player */
	updateActivePlayer = player => {
		const { now, timestamps, tweens, beginOutroThreshold } = this;
		const percent = player.progress / 100;
		const interpolator = tweens[player.id];

		// nothing to update
		if (!timestamps[player.id]) {
			timestamps[player.id] = now;
			return;
		}
		
		// is allowed to animate
		if (percent > beginOutroThreshold) {
			this.isOutro = true;

			// calculate the position
			const width = this.getOffscreenScale(player);
			const base = 1 - beginOutroThreshold;
			const scaled = (percent - beginOutroThreshold) / base;
			const done = (1 - TRACK_STARTING_LINE_POSITION) * scaled;
			const offset = width * scaled;
			const at = TRACK_STARTING_LINE_POSITION + done + offset;
			player.preferredX = Math.max(player.relativeX, TRACK_STARTING_LINE_POSITION, at);

			// set the new target
			interpolator.update(player.relativeX, player.preferredX);
		}
		
	}

	/** updates a player's currenpt target progress value */
	updatePlayer = player =>  {
		const { now, lastUpdate, timestamps, tweens, track, isOutro, isQualifyingRace, beginOutroThreshold } = this;
		const { activePlayer } = track;

		// make sure they have an interpolator
		let interpolator = tweens[player.id];
		if (!interpolator)
			interpolator = tweens[player.id] = new ProgressInterpolator(player.relativeX);

		// if the player is done, then they shouldn't
		// do anything more than go further off the screen (hide)
		if (player.isFinished) {
			player.relativeX += 0.01;
			return;
		}

		// if disqualified, just start falling off the track
		if (player.isDisqualified && !activePlayer.isDisqualified) {
			player.relativeX -= 0.01;
			return;
		}

		// if qualifying, show a slow movement forward
		if (isQualifyingRace && !isOutro) {

			if (player.isPlayer) {
				player.relativeX = Math.max(player.relativeX, Math.min(player.relativeX + 0.0005, beginOutroThreshold));
			}
			else {
				player.relativeX = interpolator.getProgress();	
			}

		}
		// all other times, interpolate position
		else {
			player.relativeX = interpolator.getProgress();
		}

		// check if already updated
		if (lastUpdate[player.id] === player.lastUpdate) return;
		lastUpdate[player.id] = player.lastUpdate;

		// perform the update
		if (player.isPlayer) this.updateActivePlayer(player);
		else this.updateOther(player);
				
		// // cannot animate yet
		// if (isNaN(player.preferredX)) {
		// 	return;
		// }

		// update timestamps
		timestamps[player.id] = now;
	}
	
	// NOTE: this animation is dependent on race progress so it's 
	// not updated using typical means
	/** activate the animation */
	update = () => {

		// stopped animating
		if (this.isStopped) return;

		this.now = +new Date;
		const { track } = this;
		const { activePlayer, players } = track;

		// if the active player isn't ready yet
		// then don't fail - this shouldn't ever happen
		if (!activePlayer) return;

		// always update the active player first
		const progress = activePlayer.relativeX;
		this.updatePlayer(activePlayer);

		// revert, if needed
		if (isNaN(activePlayer.relativeX)) {
			activePlayer.relativeX = progress;
		}

		// update remaining players
		for (const player of players) {
			if (player.isPlayer) continue;
			const before = player.relativeX;
			this.updatePlayer(player);

			// in case of an error, just revert to the
			// prior value
			if (isNaN(player.relativeX)) {
				console.log('is correcting number');
				player.relativeX = before;
			}
		}

	}

	/** stops all tween animations */
	stop = () => {
		this.isStopped = true;
	}

}


class ProgressInterpolator {

	constructor(starting) {
		this.current = this.target = starting;
		this.timestamp = 0;
	}

	update(current, target) {
		this.current = current;
		this.target = target;
		this.timestamp = +new Date;
	}

	getProgress() {
		const { current, target, timestamp } = this;
		const now = +new Date;
		const diff = (now - timestamp) / 1100;
		return current + ((target - current) * diff);
	}

}
