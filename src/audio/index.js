
import { Howl } from 'howler';
import { Sound } from './sound';

/** keeps track of active audio files */
const AUDIO = { }
const MUSIC = [ ];
const SFX = [ ];

// default url to load sounds from
let baseUrl = '/sounds';

/** changes the sound effect state */
export function configureSFX(config) {

	// change enabled state
	if ('enabled' in config) {
		Sound.sfxEnabled = !!config.enabled;
		for (const sound of SFX)
			sound.enabled = enabled;
	}

	// change volume state
	if ('volume' in config) {
		Sound.sfxVolume = config.volume;
	}
}
	
/** changes the music state */
export function configureMusic(config) {
	// change enabled state
	if ('enabled' in config) {
		Sound.musicEnabled = !!config.enabled;
		for (const song of MUSIC)
			song.enabled = enabled;
	}

	// change volume state
	if ('volume' in config) {
		Sound.musicVolume = config.volume;
	}
}

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

// creates a new sound instance
export function create(type, key, sprite) {
	const sound = AUDIO[key];
	
	// no sound was found
	if (!sound) {
		console.warn(`Play request for ${key} failed: not found`);
		return;
	}

	// start the audio
	const id = sound.play(sprite);
	const instance = new Sound(type, sound, id, sprite);
	instance.stop();
	sound.seek(0, id);
	// instance.volume(0);

	// save the audio
	if (instance.isMusic) MUSIC.push(instance);
	else SFX.push(instance);

	return instance;
}