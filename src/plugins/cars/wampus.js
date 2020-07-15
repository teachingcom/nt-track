import { findDisplayObjectsOfRole } from 'nt-animator';
import * as audio from '../../audio';

/** additional wampus behavior */
export async function extend({ animator, player, car, track }) {
	const laughSound = audio.create('sfx', 'common', 'wampus');
	
	// find parts
	const [ head ] = findDisplayObjectsOfRole(car, 'head');
	const [ head_winner ] = findDisplayObjectsOfRole(car, 'head_winner');
	const [ head_loser ] = findDisplayObjectsOfRole(car, 'head_loser');
	const [ laugh ] = findDisplayObjectsOfRole(car, 'laugh');
	const [ panic1, panic2 ] = findDisplayObjectsOfRole(car, 'panic');

	// hidden by default
	if (laugh) laugh.visible = false;
	if (head_winner) head_winner.visible = false;
	if (head_loser) head_loser.visible = false;
	if (panic1) panic1.visible = false;
	if (panic2) panic2.visible = false;

	// if missing layers then the effect can't play
	if (!(panic1 && panic2 && laugh)) {
		return;
	}

	// keep track if this is the winner or not
	let isWinner = false;

	// get the head animation
	// TODO: I don't like that this has knowledge about
	// the inner workings of nt-animator - consider 
	// making a utility function in nt-animator for this
	const animation = head.children[0] && head.children[0].animation;
	setTimeout(laughSound.play, 1000);

	// handle raceplace
	car.onFinishRace = place => {
		isWinner = place === 0;

		// turn off the animation
		head.rotation = 0;
		if (animation) animation.stop();

		// update the winning animation
		if (isWinner) {
			laugh.visible = true;
			head.visible = false;
			head_winner.visible = true;
		}
		// show the crying animation
		else {
			head.visible = false;
			head_loser.visible = true;
			panic1.visible = true;
			panic2.visible = true;
		}
	};

	// handle race progress
	car.onUpdate = () => {
		const { isFinished } = track.state;

		// align the laugh animation to the top
		if (isFinished && isWinner && laugh) {
			laugh.rotation = -(player.rotation * 0.9);
			laugh.emitter.spawnPos.y = player.rotation * 140;
			laugh.emitter.spawnPos.x = player.rotation * 40;
		}
		// check if someone is ahead
		else if (!isFinished) {
			const { progress } = player.state;

			// check if behind
			let behind = 0;
			for (const other of track.players) {
				if (other.state.progress > progress && other.x > player.x) {
					behind = Math.max(other.x - player.x);
					break;
				}
			}

			// check if falling beind
			const scale = behind / track.view.width;
			const isBehind = progress > 50 && scale > 0.15;
			panic1.visible = panic2.visible = isBehind;

		}

	};

}
