
// TODO: support different timings - this timing is based
// on using the default ambient crowd noises

export default class AmbientAudio {

	constructor(sounds) {
		this.sounds = sounds;
		this.index = 0;
	}

	/** activates ambient audio */
	start = () => {
		this.next();
	}

	/** stops all ambient noise */
	stop = () => {
		for (const sound of this.sounds)
			sound.fadeOut(1000);
	}

	// plays the next sequence in ambient audio
	next = () => {
		// TODO: I have no idea why this is happening but this
		// works until the race starts then breaks - one of the
		// two will play -- figure out later
		this.sounds[0].loop(true);
		this.sounds[0].play();

		// // start fading the active sound
		// if (this.index > 0) {
		// 	this.sounds[this.index % this.sounds.length].fadeOut(2000);
		// 	console.log('fade out');
		// }

		// // increment to the next sound
		// // TODO: support for random orders?
		// const sound = this.sounds[++this.index % this.sounds.length];

		// // reset this segment and fade in
		// sound.reset();
		// sound.play();
		// sound.fadeIn(3000);
		// console.log('fade in', this.index, sound.preferredVolumeLevel);

		// // active the next section
		// setTimeout(this.next, 7000);
	}

}