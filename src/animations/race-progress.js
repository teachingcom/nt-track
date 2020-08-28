import Animation from './base';

import { getBoundsForRole, animate } from "nt-animator";
import {
	RACE_ENDING_ANIMATION_THRESHOLD,
	RACE_PLAYER_DISTANCE_MODIFIER,
	RACE_OFF_SCREEN_FINISH_DISTANCE,
	TRACK_STARTING_LINE_POSITION,
	RACE_PROGRESS_TWEEN_TIMING
} from "../config";

export default class RaceProgressAnimation extends Animation {

	constructor({ track, player, isQualifyingRace = false }) {
		super();

		this.track = track;
		this.isQualifyingRace = isQualifyingRace;
	}

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
	animateOther = player => {
		const { track } = this;
		const { activePlayer } = track;

		// calculate a position relative to the player but
		// offset by the difference in progress
		const progress = player.progress / 100;
		const compareTo = activePlayer.progress / 100;
		const diff = (progress - compareTo) * RACE_PLAYER_DISTANCE_MODIFIER;

		// save the position
		player.raceProgressModifier = diff;
		player.preferredX = activePlayer.relativeX + diff;
	}

	/** animates the player */
	animatePlayer = player => {
		const { now, timestamps } = this;
		const percent = player.progress / 100;

		// nothing to update
		if (!timestamps[player.id]) {
			timestamps[player.id] = now;
			return;
		}
		
		// is allowed to animate
		if (percent > RACE_ENDING_ANIMATION_THRESHOLD) {
			this.isOutro = true;

			// calculate the position
			const width = this.getOffscreenScale(player);
			const base = 1 - RACE_ENDING_ANIMATION_THRESHOLD;
			const scaled = (percent - RACE_ENDING_ANIMATION_THRESHOLD) / base;
			const done = (1 - TRACK_STARTING_LINE_POSITION) * scaled;
			const offset = width * scaled;
			const at = TRACK_STARTING_LINE_POSITION + done + offset;
			player.preferredX = Math.max(TRACK_STARTING_LINE_POSITION, at);
		}
		
	}

	/** updates a player's currenpt target progress value */
	updatePlayer = player =>  {
		const { now, timestamps, lastUpdate, tweens, track, isQualifyingRace } = this;
		const { activePlayer } = track;

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

		// check if already updated
		if (lastUpdate[player.id] === player.lastUpdate) return;
		lastUpdate[player.id] = player.lastUpdate;

		// perform the update
		if (player.isPlayer) this.animatePlayer(player);
		else this.animateOther(player);
				
		// cannot animate yet
		if (isNaN(player.preferredX)) {

			// if this is the qualifying race
			if (isQualifyingRace)
				player.relativeX += 0.01;

			return;
		}

		// start the tween
		if (tweens[player.id])
			tweens[player.id].stop();
			
		// update timestamps
		const lastTimestamp = timestamps[player.id] || now;
		timestamps[player.id] = now;

		// start the new tween
		const diff = now - lastTimestamp;
		const duration = Math.min(Math.max(RACE_PROGRESS_TWEEN_TIMING, diff), RACE_PROGRESS_TWEEN_TIMING * 1.05);
		tweens[player.id] = animate({
			from: { x: player.relativeX },
			to: { x: player.preferredX },
			ease: 'linear',
			duration: 0 | (duration * 1.1),
			loop: false,
			update: props => player.relativeX = props.x
		});

	}
	
	// NOTE: this animation is depended on race progress so it's 
	// not updated using typical means
	/** activate the animation */
	update = () => {
		this.now = +new Date;
		const { track } = this;
		const { activePlayer, players } = track;

		// // if the active player isn't ready yet
		// // then don't fail - this shouldn't ever happen
		if (!activePlayer) return;

		// // always update the active player first
		this.updatePlayer(activePlayer);

		// update remaining players
		for (const player of players) {
			if (player.isPlayer) continue;
			this.updatePlayer(player);
		}

	}

	/** stops all tween animations */
	stop = () => {
		const { tweens } = this;
		for (const id in tweens)
			tweens[id].stop();
	}

}
