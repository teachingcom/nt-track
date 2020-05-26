
import { Howl } from 'howler';
import { resolve } from 'nt-animator';
import { Sound } from './sound';

/** keeps track of active audio files */
const AUDIO = { }

let baseUrl = '/sounds';

/** changes the root url to load audio from */
export function setBaseUrl(url) {
	baseUrl = url;
}

/** includes a sound to be played */
export async function register(key, options) {
	return new Promise((resolve, reject) => {
		
		// handle finalizing the sound
		const onLoaded = () => {
			
			// register separate sprites
			// if (options.sprites) { }
			
			// TODO: just saving single sounds for now
			AUDIO[key] = sound;
			resolve();
		};
		
		// load the sound
		const src = `${baseUrl}/${key}.mp3`;
		const sound = new Howl({
			src,
			format: ['mp3'],
			preload: true,
			autoplay: false,
			onloaderror: reject,
			onload: onLoaded
		});
	})
}

/** starts playing a sound */
export function create(key, sprite) {
	const sound = AUDIO[key];

	// no sound was found
	if (!sound) {
		console.warn(`Play request for ${key} failed: not found`);
		return;
	}

	// start the audio
	const id = sound.play(sprite);
	const instance = new Sound(sound, id, sprite);
	instance.stop();
	sound.seek(0, id);
	// instance.volume(0);
	return instance;
}