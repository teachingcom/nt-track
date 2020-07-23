import { tween, easing } from 'popmotion';
import { getBoundsForRole } from "nt-animator";
import {
	RACE_ENDING_ANIMATION_THRESHOLD,
	RACE_PLAYER_DISTANCE_MODIFIER,
	RACE_OFF_SCREEN_FINISH_DISTANCE,
	TRACK_STARTING_LINE_POSITION,
	RACE_AUTO_PROGRESS_DISTANCE
} from "../config";


export default class RaceProgressAnimation extends Animation {

	constructor({ track, player, isQualifyingRace = false }) {
		super();

		this.track = track;
	}

	// extra x value for slight continued car movement
	autoProgress = 0

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

	animateOther = player => {
		const { track } = this;
		const { activePlayer } = track;

		// calculate a position relative to the player but
		// offset by the difference in progress
		const percent = player.progress / 100;
		let diff = percent - (activePlayer.progress / 100)
		diff *= RACE_PLAYER_DISTANCE_MODIFIER;

		// save the position
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

			// set the origin for the exit animation
			if (!player.exitAnimationOrigin) {
				player.exitAnimationOrigin = player.relativeX;
				this.isOutro = true;
			}

			const width = this.getOffscreenScale(player);
			const remaining = (percent - player.exitAnimationOrigin) * (1 / (1 - player.exitAnimationOrigin));

			// save the preferred location for the car	
			player.preferredX =
				// the defaul starting edge
				TRACK_STARTING_LINE_POSITION +

				// plus a percentage of the remaining
				((1 - TRACK_STARTING_LINE_POSITION) * remaining) +

				// and a percentage of the bonus room off the edge of
				// the entire track
				(width * percent);

		}
		
	}

	/** updates a player's current target progress value */
	updatePlayer = player =>  {
		const { now, timestamps, lastUpdate, tweens } = this;

		// check if already updated
		if (lastUpdate[player.id] === player.progress) return;
		lastUpdate[player.id] = player.progress;

		// perform the update
		if (player.isPlayer) this.animatePlayer(player);
		else this.animateOther(player);
				
		// cannot animate yet
		if (isNaN(player.preferredX)) return;
		
		// start the tween
		if (tweens[player.id])
			tweens[player.id].stop();
		
		// update timestamps
		const lastTimestamp = timestamps[player.id] || now;
		timestamps[player.id] = now;

		// calculate the current position
		const nitroBonus = this.getNitroBonus(player);
		const startAt = player.relativeX - nitroBonus;
		
		// start the new tween
		const duration = Math.max(2000, now - lastTimestamp)
		tweens[player.id] = tween({
			ease: easing.linear,
			from: startAt,
			to: player.preferredX,
			duration
		})
		.start({
			update: v => {
				const nitroBonus = this.getNitroBonus(player);
				player.relativeX = v + nitroBonus;
			}
		})
		
	}

	/** gets the active nitro bonus for a car */
	getNitroBonus = player => {
		// TODO: refactor this - it's not a very nice way
		// to access this value
		return Math.sin(((player.car?.car?.nitroOffsetX || 0) * Math.PI)) * 0.05;
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

		// if this hasn't started the ending animation, add a 
		// small amount to the main car so it continues to move
		if (!this.isOutro) {

			// keep track of actual positioning
			this.autoProgressOrigin = this.autoProgressOrigin || activePlayer.relativeX;
			this.autoProgress += RACE_AUTO_PROGRESS_DISTANCE;

			// get a nitro bonus, if any
			const nitroBonus = this.getNitroBonus(activePlayer);

			// update the position
			activePlayer.relativeX = Math.min(
				this.autoProgressOrigin + this.autoProgress + nitroBonus,
				RACE_ENDING_ANIMATION_THRESHOLD);
		}

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

function setPosition(player, v) {
	player.relativeX = v
};
