import * as audio from '../audio';
import { VOLUME_AMBIENT_AUDIO } from './volume';

// creates looping ambient noise
export default class AmbientAudio {

	constructor(options) {
		const { order, sounds, source } = options;

		this.options = options;
		this.order = order;
		
		// set the starting point
		this.index = 0;
		
		// create each audio clip
		this.sounds = [ ];
		for (const key of sounds) {
			const sound = audio.create('sfx', source, key);
			sound.volume(VOLUME_AMBIENT_AUDIO);
			this.sounds.push(sound);
		}
	}

	/** activates ambient audio */
	start = () => {
		this.next();
	}

	/** stops all ambient noise */
	stop = () => {
		this.isStopped = true;

		// disable all sounds
		for (const sound of this.sounds)
			sound.fadeOut(1000);
	}

	// plays the next sequence in ambient audio
	next = () => {
		if (this.isStopped) return;

		// start fading the active sound
		if (this.index > 0) {
			const at = this.index % this.sounds.length;
			const current = this.sounds[at];

			// fade out the current sound
			current.source.fade(VOLUME_AMBIENT_AUDIO, 0, 2000, current.id);
		}

		// increment to the next sound
		// TODO: support for random orders?
		const next = ++this.index % this.sounds.length;
		const sound = this.sounds[next];

		// fade in the next
		sound.source.seek(0, sound.id);
		sound.source.play(sound.id);
		sound.source.fade(0, VOLUME_AMBIENT_AUDIO, 2000, sound.id);

		// active the next section
		setTimeout(this.next, 7000);
	}

}