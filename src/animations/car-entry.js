import { noop } from "../utils";
import { TRACK_STARTING_LINE_POSITION } from "../config";
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
			duration: 3000,
			ease: easing.easeInOut,
			from: entryOrigin,
			to: entryDestination
		})
		.start({
			update: updateEntry,
			complete
		});

		// animate the player entry
		if (namecard)
			delay(2200)
				.start({
					complete: () => tween({
						duration: 1000,
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