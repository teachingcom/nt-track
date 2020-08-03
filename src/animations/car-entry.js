import * as audio from '../audio';
import { noop } from "../utils";
import { tween, easing, delay } from "popmotion";
import { TRACK_STARTING_LINE_POSITION, RACE_START_CAR_ENTRY_TIME, RACE_START_NAMECARD_DELAY_TIME, RACE_START_NAMECARD_ENTRY_TIME, RACE_ENTRY_SOUND_REPEAT_TIME_LIMIT } from "../config";
import { VOLUME_CAR_ENTRY } from '../audio/volume';


export default class CarEntryAnimation {

	constructor({ player, enterSound, namecard, track }) {
		this.player = player;
		this.track = track;
		this.namecard = namecard;

		// load the sound
		this.rev = audio.create('sfx', 'common', `entry_${enterSound}`);
	}

	play = ({ isInstant = false, update = noop, complete = noop }) => {
		const { player, rev } = this;
		
		// offscreen starting position
		const entryOrigin = {
			playerX: -0.1
		};
		
		// starting line position
		const entryDestination = {
			playerX: TRACK_STARTING_LINE_POSITION
		};

		// update the player position
		const updateEntry = props => {
			player.relativeX = props.playerX;
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
		tween({
			duration: RACE_START_CAR_ENTRY_TIME,
			ease: easing.cubicBezier(0.43, 1.15, 0.91, 1),
			from: entryOrigin,
			to: entryDestination
		})
		.start({
			update: updateEntry,
			complete
		});

		// play the entry sound, if possible
		const canPlayTimestamp = rev.lastInstancePlay + RACE_ENTRY_SOUND_REPEAT_TIME_LIMIT;
			
		// don't play duplicate sounds too close together
		const now = +new Date;
		if (rev && now > canPlayTimestamp) {
			rev.volume(VOLUME_CAR_ENTRY)
			rev.loop(false);
			rev.play();
		}

	}

}