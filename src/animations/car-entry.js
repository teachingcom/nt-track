import { noop } from "../utils";
import { TRACK_STARTING_LINE_POSITION, RACE_START_CAR_ENTRY_TIME, RACE_START_NAMECARD_DELAY_TIME, RACE_START_NAMECARD_ENTRY_TIME } from "../config";
import { tween, easing, delay } from "popmotion";


export default class CarEntryAnimation {

	constructor({ player, namecard, track }) {
		this.player = player;
		this.track = track;
		this.namecard = namecard;
	}

	play = ({ isInstant = false, update = noop, complete = noop }) => {
		const { player, namecard } = this;
		
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
		
		// offscreen starting position
		const namecardOrigin = {
			namecardX: namecard?.x - namecard?.width,
			namecardAlpha: 0
		};
		
		// starting line position
		const namecardDestination = {
			namecardX: namecard?.x,
			namecardAlpha: 1
		};

		// update the player position
		const updateNamecard = props => {
			namecard.x = props.namecardX;
			namecard.alpha = props.namecardAlpha;
		};

		// apply positions immediately
		if (isInstant) {
			updateEntry(entryDestination);
			if (namecard) updateNamecard(namecardDestination);
			if (complete) complete();
			return;
		}

		// starting positions
		player.relativeX = entryOrigin.playerX;
		if (namecard) {
			updateNamecard(namecardOrigin);
		}

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

		// animate the player entry
		if (namecard)
			delay(RACE_START_NAMECARD_DELAY_TIME)
				.start({
					complete: () => tween({
						duration: RACE_START_NAMECARD_ENTRY_TIME,
						ease: easing.backOut,
						from: namecardOrigin,
						to: namecardDestination
					})
					.start({
						update: updateNamecard
					})
				});

	}

}