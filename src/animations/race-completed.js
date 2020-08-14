import * as PIXI from 'pixi.js';
import * as audio from '../audio';
import Animation from './base';
import CarFinishLineAnimation from "./car-finish";

import { noop, isNumber } from "../utils";
import { tween, easing } from 'popmotion';
import { RACE_FINISH_FLASH_FADE_TIME, RACE_FINISH_CAR_STOPPING_TIME } from '../config';
import { VOLUME_FINISH_LINE_CROWD } from '../audio/volume';

export default class RaceCompletedAnimation extends Animation {

	constructor({ track, players}) {
		super();
		
		this.track = track;
		this.players = players;

		// play the finish sound
		const finish = audio.create('sfx', 'common', 'finish_crowd');
		finish.volume(VOLUME_FINISH_LINE_CROWD);
		finish.play();

		// start the flash effect
		this.activateFlash();

		// reset all car positions
		for (const p of players) {
			p.relativeX = -0.15;
			p.stopProgressAnimation();
		}

		// animate the immediate finishes, if any
		requestAnimationFrame(this.animateImmediateFinishes);
	}

	// adready animated cars
	onTrack = { }
	finishingPlaces = { }
	place = 0

	// shows the player animation
	addPlayer = (player, params) => {
		const { track, onTrack, finishingPlaces } = this;
		const { stage, activePlayer } = track;

		// add the player to the track - this shouldn't
		// happen more than once
		if (onTrack[player.id]) return;
		onTrack[player.id] = true;

		// animate the result
		const { isInstant = false, delay = 0, elapsed = 0, place = Number.MAX_SAFE_INTEGER } = params;
		finishingPlaces[player.id] = place;
		
		// TEMP: tracking place
		player.place = place;

		// did they beat the player
		const playerFinishPlace = finishingPlaces[activePlayer.id] || Number.MAX_SAFE_INTEGER;
		const finishedBeforePlayer = place < playerFinishPlace;
		
		// update the plauer and ending, if any
		player.car.onFinishRace({
			isRaceFinished: true,
			finishedBeforePlayer,
			place
		});	

		// create the animation
		const animate = new CarFinishLineAnimation({ player, track, place, stage });
		animate.play({ isInstant, delay, elapsed });
	}

	// get the current order of finished players
	getFinished = () => {
		const { players } = this;

		// get the current list of finished players
		const finished = [ ];
		for (const player of players)
			if (player.isFinished) 
				finished.push(player);

		// sort by quickest
		finished.sort((a, b) => a.completedAt - b.completedAt);

		return finished;
	}

	// starts the animation
	play({ update = noop, complete = noop }) {
		const { track } = this;
		const { activePlayer } = track;

		// the active player must be finished before this happens
		if (!activePlayer.completedAt) return;

		// animate any new cars
		this.animateRecentFinishes();
	}

	// calculate all player finishes that have been done for
	// an extended period of time - since we don't know the actual
	// player finish time, we just base this on an extend time since
	// their last update
	animateImmediateFinishes = () => {
		const now = +new Date;

		// get everyone that's marked as finished
		const finished = this.getFinished();
		for (const player of finished) {

			// never include the player character (shouldn't happen)
			if (player.isPlayer) continue;

			// compare the time
			const diff = now - player.lastUpdate;
			if (diff > RACE_FINISH_CAR_STOPPING_TIME) {
				const place = finished.indexOf(player);
				this.addPlayer(player, { isInstant: true, place })
			}
		}

	}

	// display the animation for the player to finish
	animateRecentFinishes = () => {
		const { track, onTrack } = this;

		// get all current finishes
		const finished = this.getFinished();

		// check for newly finished racers
		const recent = [ ];
		for (const player of finished) {
			if (onTrack[player.id]) continue;
			recent.push(player);
		}

		// if there are no recent finished, just skip
		if (!recent.length) return;

		// find the first finisher
		let firstTimestamp = Number.MAX_SAFE_INTEGER;
		let lastTimestamp = -Number.MAX_SAFE_INTEGER;
		for (const player of recent) {
			firstTimestamp = Math.min(firstTimestamp, player.completedAt);
			lastTimestamp = Math.max(lastTimestamp, player.completedAt);
		}
	
		// calculate the modifier to to use based on the diff
		// calculate the modifier to to use based on the diff
		const mod = getModifier(lastTimestamp - firstTimestamp);

		// queue up each animation
		console.log();
		console.log(`race ending interval with ${recent.length} players`);
		console.log(`firstTs: ${firstTimestamp} - lastTs: ${lastTimestamp}`);
		console.log(`diff: ${lastTimestamp - firstTimestamp} - mod: ${mod}`);
		for (const player of recent) {
			const diff = player.completedAt - firstTimestamp;
			const place = finished.indexOf(player) + 1;
			console.log(`${player.options.playerName} diff: ${diff} - delay: ${diff * mod} - place: ${place}`);
			this.addPlayer(player, { delay: diff * mod, place });
		}
	}

	// perform the flash animation
	activateFlash = () => {
		const { track } = this;

		// create the flash of white
		const flash = new PIXI.Sprite(PIXI.Texture.WHITE);

		// match the screen and place on the top
		flash.width = track.width;
		flash.height = track.height;
		flash.zIndex = Number.MAX_SAFE_INTEGER;

		// add it to the race
		track.view.addChild(flash);

		// fade the flash effect
		setTimeout(() => 
			tween({ 
				from: 1,
				to: 0,
				ease: easing.circIn,
				duration: RACE_FINISH_FLASH_FADE_TIME
			})
			.start({
				update: v => {

					// match the size in case the view changes
					flash.width = track.width;
					flash.height = track.height;

					// fade the effect
					flash.alpha = v;
				},
				// notify when the view is ready
				complete: () => this.hasFinishedFlashAnimation = true
			}), 250);

	}

}

function getModifier(diff) {
	return diff <= 15 ? 10
		: diff <= 50 ?  5
		: diff <= 100 ? 2
		: 1
}