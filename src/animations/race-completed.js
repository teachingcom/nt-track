import { PIXI } from 'nt-animator';
import * as audio from '../audio';
import Animation from './base';
import CarFinishLineAnimation from "./car-finish";

import { noop } from "../utils";
import { RACE_FINISH_FLASH_FADE_TIME, RACE_FINISH_CAR_STOPPING_TIME } from '../config';
import { VOLUME_FINISH_LINE_CROWD } from '../audio/volume';
import { animate, Animator } from 'nt-animator';
import createConfetti from '../plugins/confetti';

export default class RaceCompletedAnimation extends Animation {

 	constructor({ track, players }) {
		super();
		
		this.track = track;
		this.players = players;

		// play the finish sound
		const finish = audio.create('sfx', 'finish_crowd');
		finish.volume(VOLUME_FINISH_LINE_CROWD);
		finish.play();

		// start the flash effect
		this.activateFlash();

		// notify the race is over
		track.emit('race:finish');

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
		const playerFinishPlace = finishingPlaces[activePlayer?.id] || Number.MAX_SAFE_INTEGER;
		const finishedBeforePlayer = place < playerFinishPlace;
		
		// update the plauer and ending, if any
		const { namecard, trail, nitro } = player;
		player.car.onFinishRace({
			isRaceFinished: true,
			finishedBeforePlayer,
			place,
			track,
			namecard,
			trail,
			nitro
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

		// if we know there's an active player and they haven't completed
		// yet, keep waiting - They need to cross the finish line
		if (activePlayer && !activePlayer.completedAt) {
			return;
		}
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
			// check if they're already finished (this shouldn't happen either)
			if (player.isPlayer || this.onTrack[player.id]) {
				continue;
			}

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
		const mod = getModifier(lastTimestamp - firstTimestamp);

		// queue up each animation
		for (const player of recent) {
			const diff = Math.min(player.completedAt - firstTimestamp, 2000);
			const place = finished.indexOf(player) + 1;
			
			// calculate the delay
			let delay = diff * mod;

			// if the time is greater than a second, reduce the time
			// a bit to avoid the player crossing the line after
			// the results have been posted - this will be a guaranteed
			// 1 second + 25% of the time over a second they would have
			// finished, which should ensure they finish after faster, but
			// before the stats appear
			if (delay > 1000)
				delay = 1000 + ((delay - 1000) * 0.25);

			// add to the ending
			this.addPlayer(player, { delay, place });
		}
	}

	// refresh confetti 
	update = () => {
		const { confetti } = this;
		if (confetti) confetti.update();
	}

	// perform the flash animation
	activateFlash = async () => {
		const { track } = this;
		const { animator } = track;
		
		// add some confetti
		try {
			this.confetti = await createConfetti(animator, track);
			if (this.confetti && this.confetti.sprite)
				track.view.addChild(this.confetti.sprite);
		}
		// never crash for this
		catch (ex) {
			console.error('failed to create confetti');
			console.error(ex);
		}
		
		// create the flash of white
		const flash = new PIXI.Sprite(PIXI.Texture.WHITE);

		// match the screen and place on the top
		flash.width = track.width;
		flash.height = track.height;
		flash.zIndex = Number.MAX_SAFE_INTEGER;
		
		// add it to the race
		track.view.addChild(flash);

		// fade in the flash
		animate({
			delay: 250,
			from: { alpha: 1 },
			to: { alpha: 0 },
			ease: 'easeInCirc',
			duration: RACE_FINISH_FLASH_FADE_TIME,
			loop: false,
			complete: () => this.hasFinishedFlashAnimation = true,
			update: props => {
				
				// match the size in case the view changes
				flash.width = track.width;
				flash.height = track.height;

				// fade the effect
				flash.alpha = props.alpha;
			}
		});

	}

}

function getModifier(diff) {
	return diff <= 15 ? 10
		: diff <= 50 ?  5
		: diff <= 100 ? 2
		: 1
}