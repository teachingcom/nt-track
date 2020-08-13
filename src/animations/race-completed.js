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

		// if the active player is already on the track, then
		// the animation has started and we just need to add
		// the new player
		if (this.onTrack[activePlayer.id]) {
			this.animateLateFinishes();
		} 
		else {
			this.animatePlayerFinish();
		}
		
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
	animatePlayerFinish = () => {
		const { track, onTrack } = this;
		const { activePlayer } = track;

		// get all current finishes
		const finished = this.getFinished();

		// tracking all animations to apply
		const animations = [ ];
		
		// since this is the active player, we need to figure out
		// some timing data first
		let fastest = 0;
		for (const player of finished) {
			const place = finished.indexOf(player) + 1;

			// skip the player or people that are on the track
			if (player.isPlayer || onTrack[player.id]) continue;

			// calculate the diff
			let diff = player.completedAt - activePlayer.completedAt;

			// they're ahead, but only by a bit
			if (diff < 0) {
				
				// adjust based on the modifier
				diff *= getModifier(-diff);

				// save the animation
				animations.push({ delay: -diff, player, place });
				fastest = Math.max(-diff, place, fastest);
			}
			// they finished after the player on the same cycle
			// I'm not sure if this can actually happen
			else {
				animations.push({ late: diff, player, place });
			}
		}

		// add the player animation delayed by the fastest finish
		// at the starting line now
		const place = finished.indexOf(activePlayer) + 1;
		this.addPlayer(activePlayer, { delay: fastest, place });

		// not play back other animations but reduce their delays
		// by the fastest finish so that they are delayed by an
		// amount relative to when the player will animate in
		for (const animation of animations) {

			// adjust delays based on fastest time
			if (!animation.isInstant) {

				// adjust the delay based on the player position
				animation.delay = animation.late ? animation.late + fastest
					: Math.max(0, fastest - (animation.delay || 0));
				
				// if there's a problem, just make sure the animation
				// still plays
				if (isNaN(animation.delay))
					animation.delay = animation.player.completedAt % 1000;
			}

			// add the animation
			this.addPlayer(animation.player, animation);
		}
	}

	// playback animations that happen after the player finishes
	animateLateFinishes = () => {
		const { onTrack } = this;

		// get the current state for the finishline
		const finished = this.getFinished();

		// animate each new arriving player
		for (const player of finished) {

			// make sure not already added
			if (onTrack[player.id]) continue;

			// check against the previous racer
			const index = finished.indexOf(player);
			const place = index + 1;
			
			// add a slight delay based on the
			// the finish - since this should show up
			// at intervals, their rounded time should be
			// good enough to stagger close races
			const delay = place * 250;
			this.addPlayer(player, { place, delay })
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