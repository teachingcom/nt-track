import Animation from './base';

import { getBoundsForRole, animate } from "nt-animator";
import {
	RACE_ENDING_ANIMATION_THRESHOLD,
	RACE_PLAYER_DISTANCE_MODIFIER,
	RACE_OFF_SCREEN_FINISH_DISTANCE,
	TRACK_STARTING_LINE_POSITION,
	ANIMATION_RATE_WHILE_RACING
} from "../config";
import layers from '../plugins/crowd/layers';

export default class RaceProgressAnimation extends Animation {

	constructor({ track, players, player, isQualifyingRace = false }) {
		super();

		this.track = track;
		this.isQualifyingRace = isQualifyingRace;
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
		const { track, tweens } = this;
		const { activePlayer } = track;
		const interpolator = tweens[player.id];

		// calculate a position relative to the player but
		// offset by the difference in progress
		const progress = player.progress / 100;
		const compareTo = activePlayer.progress / 100;
		const diff = (progress - compareTo) * RACE_PLAYER_DISTANCE_MODIFIER;

		// save the position
		player.raceProgressModifier = diff;
		player.preferredX = (activePlayer.preferredX || activePlayer.relativeX) + diff;

		// adjust this player tween
		interpolator.update(player.relativeX, player.preferredX);
	}

	/** animates the player */
	updateActivePlayer = player => {
		const { now, timestamps, tweens, isQualifyingRace, qualifyingX } = this;
		const percent = player.progress / 100;
		const interpolator = tweens[player.id];

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
			player.preferredX = Math.max(player.relativeX, TRACK_STARTING_LINE_POSITION, at);

			// set the new target
			interpolator.update(player.relativeX, player.preferredX);
		}
		
	}

	/** updates a player's currenpt target progress value */
	updatePlayer = player =>  {
		const { now, lastUpdate, timestamps, tweens, track, isOutro, isQualifyingRace } = this;
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
			player.relativeX = Math.min(player.relativeX + 0.0005, RACE_ENDING_ANIMATION_THRESHOLD);
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
				
		// cannot animate yet
		if (isNaN(player.preferredX)) {
			return;
		}

		// update timestamps
		timestamps[player.id] = now;
	}
	
	// NOTE: this animation is depended on race progress so it's 
	// not updated using typical means
	/** activate the animation */
	update = () => {

		// stopped animating
		if (this.isStopped) return;

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


// /**
//  * Desc.
//  * @author Ash Blue
//  * @link http://blueashes.com
//  * @todo Include instructions to replace Date.now() with your game loop's time
//  * time to make things more accurate
//  * @todo Can the tween methods not be prototypes so they're static?
//  */
// const Tween = (function () {
// 	const exp = { };
// 	/**
// 	 * Supports easing for the following commands you can demo at
// 	 * http://ashblue.github.com/canvas-tween-demo/ 'linear', 'quadIn', 'quadOut',
// 	 * 'quadInOut', 'cubeIn', 'cubeOut', 'cubeInOut', 'quartIn', 'quartOut', 'quartInOut',
// 	 * 'quintIn', 'quintOut', 'quintInOut', 'sineIn', 'sineOut', 'sineInOut', 'expoIn',
// 	 * 'expoOut', 'expoInOut', 'circIn', 'circOut', 'circInOut'. Adopted from
// 	 * http://gizma.com/easing/
// 	 * @link http://ashblue.github.com/canvas-tween-demo/
// 	 */
// 	var _easingLibrary = {
// 			/**
// 			 * @param {number} t Current time in millseconds
// 			 * @param {number} b Start value
// 			 * @param {number} c Distance traveled relative to the start value
// 			 * @param {number} d Duration in milliseconds
// 			 */
// 			linear: function (t, b, c, d) {
// 					return c * t / d + b;
// 			},

// 			quadIn: function (t, b, c, d) {
// 					t /= d;
// 					return c * t * t + b;
// 			},

// 			quadOut: function (t, b, c, d) {
// 					t /= d;
// 					return -c * t * (t - 2) + b;
// 			},

// 			quadInOut: function (t, b, c, d) {
// 					t /= d / 2;
// 					if (t < 1) {
// 							return c / 2 * t * t + b;
// 					}
// 					t--;
// 					return -c / 2 * (t * (t - 2) - 1) + b;
// 			},

// 			cubeIn: function (t, b, c, d) {
// 					t /= d;
// 					return c*t*t*t + b;
// 			},

// 			cubeOut: function (t, b, c, d) {
// 					t /= d;
// 					t--;
// 					return c*(t*t*t + 1) + b;
// 			},

// 			cubeInOut: function (t, b, c, d) {
// 					t /= d/2;
// 					if (t < 1) {
// 							return c / 2 * t * t * t + b;
// 					}
// 					t -= 2;
// 					return c/2*(t*t*t + 2) + b;
// 			},

// 			quartIn: function (t, b, c, d) {
// 					t /= d;
// 					return c * t * t * t * t + b;
// 			},

// 			quartOut: function (t, b, c, d) {
// 					t /= d;
// 					t--;
// 					return -c * (t * t * t * t - 1) + b;
// 			},

// 			quartInOut: function (t, b, c, d) {
// 					t /= d/2;
// 					if (t < 1) {
// 							return c / 2 * t * t * t * t + b;
// 					}
// 					t -= 2;
// 					return -c / 2 * (t * t * t * t - 2) + b;
// 			},

// 			quintIn: function (t, b, c, d) {
// 					t /= d;
// 					return c * t * t * t * t * t + b;
// 			},

// 			quintOut: function (t, b, c, d) {
// 					t /= d;
// 					t--;
// 					return c * (t * t * t * t * t + 1) + b;
// 			},

// 			quintInOut: function (t, b, c, d) {
// 					t /= d / 2;
// 					if (t < 1) {
// 							return c / 2 * t * t * t * t * t + b;
// 					}
// 					t -= 2;
// 					return c / 2 * (t * t * t * t * t + 2) + b;
// 			},

// 			sineIn: function (t, b, c, d) {
// 					return -c * Math.cos(t / d * (Math.PI / 2)) + c + b;
// 			},

// 			sineOut: function (t, b, c, d) {
// 					return c * Math.sin(t / d * (Math.PI / 2)) + b;
// 			},

// 			sineInOut: function (t, b, c, d) {
// 					return -c / 2 * (Math.cos(Math.PI * t / d) - 1) + b;
// 			},

// 			expoIn: function (t, b, c, d) {
// 					return c * Math.pow(2, 10 * (t / d - 1)) + b;
// 			},

// 			expoOut: function (t, b, c, d) {
// 					return c * (-Math.pow(2, -10 * t/d) + 1) + b;
// 			},

// 			expoInOut: function (t, b, c, d) {
// 					t /= d / 2;
// 					if (t < 1) {
// 							return c / 2 * Math.pow(2, 10 * (t - 1)) + b;
// 					}
// 					t--;
// 					return c / 2 * (-Math.pow(2, -10 * t) + 2) + b;
// 			},

// 			circIn: function (t, b, c, d) {
// 					t /= d;
// 					return -c * (Math.sqrt(1 - t * t) - 1) + b;
// 			},

// 			circOut: function (t, b, c, d) {
// 					t /= d;
// 					t--;
// 					return c * Math.sqrt(1 - t * t) + b;
// 			},

// 			circInOut: function (t, b, c, d) {
// 					t /= d / 2;
// 					if (t < 1) {
// 							return -c/2 * (Math.sqrt(1 - t*t) - 1) + b;
// 					}
// 					t -= 2;
// 					return c / 2 * (Math.sqrt(1 - t * t) + 1) + b;
// 			}
// 	};

// 	var _private = {
// 			/**
// 			 * Rounds the passed number to two decimal places. Prevents large float
// 			 * numbers from being multiplied
// 			 * @param {number} num Number you want to round
// 			 * @returns {number} Rounded number
// 			 */
// 			round: function (num) {
// 				return num;
// 					return Math.round(num * 10000) / 10000;
// 			}
// 	};

// 	/**
// 	 * Constructor for the tween
// 	 * @param {number} startValue What value does the tween start at
// 	 * @param {number} distance How far does the tween's value advance from the startValue?
// 	 * @param {number} duration Amount of time in milliseconds the tween runs for
// 	 * @param {string} animationType What easing function should be used from the easing library?
// 	 * See _easingLibrary for a list of potential easing equations.
// 	 * @param {string} loop Can be left blank, set to loop, or repeat. Loop repeats repeats the animation
// 	 * in reverse every time. Repeat will run the original tween from the beginning
// 	 * @returns {self}
// 	 */
// 	exp.Tween = function (startValue, distance, duration, animationType, loop) {
// 			this.startTime = Date.now();
// 			this.startValue = startValue;
// 			this.distance = distance;
// 			this.duration = duration;
// 			this.animationType = animationType;
// 			this.loop = loop;

// 			return this;
// 	};

// 	/**
// 	 * Get the current value of the tween
// 	 * @returns {number} Current value of the tween
// 	 */
// 	exp.Tween.prototype.getValue = function () {
// 			// Run normally
// 			if (!this.expired()) {
// 					var total = _easingLibrary[this.animationType](Date.now() - this.startTime, this.startValue, this.distance, this.duration);

// 			// Ended and no repeat is present
// 			} else if (!this.loop) {
// 					var total = this.startValue + this.distance;

// 			// Calculate time passed and restart repeat
// 			} else if (this.loop === 'repeat') {
// 					this.startTime = Date.now();
// 					var total = _easingLibrary[this.animationType](Date.now() - this.startTime, this.startValue, this.distance, this.duration);

// 			// Run a looped repeat in reverse
// 			} else {
// 					this.startValue = this.startValue + this.distance;
// 					this.distance = -this.distance;
// 					this.startTime = Date.now();
// 					var total = _easingLibrary[this.animationType](Date.now() - this.startTime, this.startValue, this.distance, this.duration);
// 			}

// 			return _private.round(total);
// 	};

// 	/**
// 	 * Retrieves the start time relative to the time passed from the previous start time
// 	 * @returns {number} Start time of the tween relative to time passed
// 	 */
// 	exp.Tween.prototype.getStartTime = function () {
// 			return Date.now() - this.startTime - this.duration + Date.now();
// 	};

// 	/**
// 	 * Has the tween expired yet?
// 	 * @returns {boolean} True if the tween has expired
// 	 */
// 	exp.Tween.prototype.expired = function () {
// 			return this.startTime + this.duration < Date.now();
// 	};

// 	/**
// 	 * Set the tween's properties for the beginning value, distance, duration, and animation type
// 	 * @param {number} startValue What value does the tween start at
// 	 * @param {number} distance How far does the tween's value advance from the startValue?
// 	 * @param {number} duration Amount of time in milliseconds the tween runs for
// 	 * @param {string} animationType What easing function should be used from the easing library?
// 	 * @param {string} loop Can be left blank, set to loop, or repeat. Loop repeats repeats the animation
// 	 * in reverse every time. Repeat will run the original tween from the beginning
// 	 * @returns {self}
// 	 */
// 	exp.Tween.prototype.set = function (startValue, distance, duration, animationType, loop) {
// 			this.startValue = typeof startValue === 'number' ? startValue : this.startValue;
// 			this.distance = typeof distance === 'number' ? distance : this.distance;
// 			this.duration = typeof duration === 'number' ? duration : this.duration;
// 			this.animationType = animationType || this.animationType;
// 			this.loop = loop || this.loop;

// 			return this;
// 	};

// 	/**
// 	 * Resets the tween and runs it relative to the current time
// 	 * @returns {self}
// 	 */
// 	exp.Tween.prototype.reset = function () {
// 			this.startTime = Date.now();

// 			return this;
// 	};

// 	return exp.Tween;
// }());