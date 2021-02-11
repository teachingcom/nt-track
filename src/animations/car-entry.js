import * as audio from '../audio';
import Animation from './base';

import { noop } from "../utils";
import { TRACK_STARTING_LINE_POSITION, RACE_START_CAR_ENTRY_TIME, RACE_ENTRY_SOUND_REPEAT_TIME_LIMIT } from "../config";
import { VOLUME_CAR_ENTRY } from '../audio/volume';
import { animate } from 'nt-animator';
import { onViewActiveStateChanged } from '../utils/view';

export default class CarEntryAnimation extends Animation {

	constructor({ player, enterSound, namecard, track }) {
		super();
		
		this.player = player;
		this.track = track;
		this.namecard = namecard;
		this.enterSound = enterSound;
	}

	play = ({ isInstant = false, update = noop, complete = noop }) => {
		const { player, enterSound } = this;
		
		// offscreen starting position
		const entryOrigin = {
			playerX: -0.1
		};
		
		// starting line position
		const entryDestination = {
			playerX: TRACK_STARTING_LINE_POSITION
		};

		// keep track if focus is lost
		const disposeViewStateWatcher = onViewActiveStateChanged(active => {
			if (!active) player.relativeX = entryDestination.playerX;
		});

		// update the player position
		const updateEntry = props => {
			player.relativeX = Math.max(player.relativeX, props.playerX);
		};

		// apply positions immediately
		if (isInstant) {
			updateEntry(entryDestination);
			if (complete) complete();
			return;
		}

		// starting positions
		player.relativeX = entryOrigin.playerX;
		
		// animate the player entry
		animate({
			from: entryOrigin,
			to: entryDestination,
			ease: 'easeOutQuad',
			duration: RACE_START_CAR_ENTRY_TIME,
			loop: false,
			update: props => updateEntry(props),
			complete: () => {
				disposeViewStateWatcher();
				complete();
			}
		});

		
		// play the entry sound, if possible
		// don't play duplicate sounds too close together
		try {

			let goldEntry
			if (player.options?.isGold) {
				goldEntry = audio.create('sfx', 'common', 'gold_enter');
				goldEntry.volume(VOLUME_CAR_ENTRY)
				goldEntry.loop(false);
			}
			
			const now = +new Date;
			const canPlayTimestamp = rev.lastInstancePlay + RACE_ENTRY_SOUND_REPEAT_TIME_LIMIT;
			
			if (goldEntry) {
				goldEntry.play();
			}

			// try and play
			if (rev && now > canPlayTimestamp) {
				rev.volume(VOLUME_CAR_ENTRY)
				rev.loop(false);
				rev.play();

			}
		}
		catch (ex) {
			console.warn('unable to play entry sound')
		}

	}

}