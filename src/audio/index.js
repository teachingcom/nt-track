
import { Howl, Howler } from 'howler';
import { Sound } from './sound';

/** keeps track of active audio files */
const AUDIO = { }
const MUSIC = [ ];
const SFX = [ ];

// default url to load sounds from
let baseUrl = '/sounds';

// mute by default
Sound.sfxEnabled = false;
Sound.musicEnabled = false;

/** changes the sound effect state */
export function configureSFX(config) {
	console.log('new config');

	// change enabled state
	if ('enabled' in config) {
		const enabled = Sound.sfxEnabled = !!config.enabled;
		for (const sound of SFX) {
			sound.enabled = enabled;

			// stop, if needed
			if (!enabled) sound.stop();
		}
	}

	// change volume state
	if ('volume' in config) {
		Sound.sfxVolume = config.volume;
	}
}
	
/** changes the music state */
export function configureMusic(config) {
	// // change enabled state
	// if ('enabled' in config) {
	// 	const enabled = Sound.musicEnabled = !!config.enabled;
	// 	for (const song of MUSIC) {
	// 		song.enabled = enabled;

	// 		// activate or deactivate
	// 		if (!enabled) song.stop();
	// 		else song.play();
	// 	}
	// }

	// // change volume state
	// if ('volume' in config) {
	// 	Sound.musicVolume = config.volume;
	// }
}

/** changes the root url to load audio from */
export function setBaseUrl(url) {
	baseUrl = url;
}

/** includes a sound to be played */
export async function register(key, sprites) {
	return new Promise((resolve, reject) => {

		// handle sound loading errors
		const onFailed = () => {
			console.error(`Failed to load sound: ${key}`);
			reject(new MissingSoundException());
		};
		
		// handle finalizing the sound
		const onLoaded = () => {
			AUDIO[key] = sound;
			resolve();
		};
		
		// load the sound
		const src = `${baseUrl}/${key}.mp3`.replace(/\/+/g, '/');
		const sound = new Howl({
			src,
			sprite: sprites,
			format: ['mp3'],
			volume: 0,
			preload: true,
			autoplay: false,
			onloaderror: onFailed,
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
	
	// creates a new sound instance
	const instance = new Sound(type, sound, key, id, sprite);
	instance.stop();
	instance.reset();

	// save the audio
	if (instance.isMusic) MUSIC.push(instance);
	else SFX.push(instance);

	return instance;
}

// exceptions
function MissingSoundException() { }