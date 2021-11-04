
import { Howl, Howler } from 'howler'
import { Sound } from './sound'

/** keeps track of active audio files */
const AUDIO = { }
const MUSIC = []
const SFX = []

// default url to load sounds from
let baseUrl = '/sounds'

// mute by default
Sound.volume = 0
Sound.sfxEnabled = false
Sound.musicEnabled = false

// try to disable sound by default
try { 
  Howler.volume(0);
}
catch (ex) { }

// incase of failed audio attempts
// just use a fake object to prevent crashes
const FAKE_SOUND = {
  volume: () => 1,
  rate: () => 0,
  loop: () => 0,
  fade: () => 0,
  fadeOut: () => 0,
  fadeIn: () => 0,
  reset: () => 0,
  stop: () => 0,
  pause: () => 0,
  play: () => 0
};

/** changes the sound effect state */
export function configureSFX (config) {
  // change enabled state
  if ('enabled' in config) {
    cancelFade()

    // set the new config
    const enabled = !!config.enabled
    if (enabled) {
      Sound.enabled = true
      fadeIn(5000)
    }
    else {
      Sound.enabled = false
      Howler.volume(0)
    }
  }
}

// unused
export function configureMusic (config) {
}

/** changes the root url to load audio from */
export function setBaseUrl (url) {
  baseUrl = url
}

// fake sound to prevent game errors
export function createFakeSound() {
  return { ...FAKE_SOUND }
}

/** includes a sound to be played */
export async function register (src, sprites, key = src) {
  return new Promise((resolve, reject) => {
    sprites = sprites[key]

    // handle sound loading errors
    const onFailed = () => {
      console.error(`Failed to load sound: ${key}`)
      reject(new MissingSoundException())
    }

    // handle finalizing the sound
    const onLoaded = () => {

      for (const id in sprites) {
        AUDIO[id] = sound
      }

      resolve(true)
    }

    // load the sound
    let src = `${baseUrl}/${key}.mp3`.replace(/\/+/g, '/')

    // check for a version
    if (sprites.version) {
      src += `?${sprites.version}`
    }

    // load the audio
    const sound = new Howl({
      src,
      sprite: sprites,
      format: ['mp3', 'ogg', 'm4a', 'ac3'],
      volume: 0,
      preload: true,
      autoplay: false,
      onloaderror: onFailed,
      onload: onLoaded
    })
  })
}

// causes the global volume to fade in
export function fadeIn(time) {
  fadeVolume(time, 1, 1)
}

// causes the global volume to fade out
export function fadeOut(time) {
  fadeVolume(time, -1, 0)
}

// handles activating a volume fade
let fadeInterval;
function fadeVolume(time, dir, stopAt) {
  const rate = (1 / (time / 100)) * dir

  // clear a previous one, just in case
  cancelFade()

  // perform the interval
  fadeInterval = setInterval(() => {
    setVolume(Sound.volume + rate);

    // stop if finished
    if (Sound.volume === stopAt) {
      cancelFade()
    }
  }, 100)
}

function cancelFade() {
  clearInterval(fadeInterval)
}

// replaces the global volume level
export function setVolume(amount) {
  Sound.volume = Math.min(Math.max(0, amount), 1)
  Howler.volume(Sound.volume);
}

// creates a new sound instance
export function create (type, sprite) {
  const sound = AUDIO[sprite]

  // no sound was found
  if (!sound) {
    console.warn(`Play request for ${sprite} failed: not found`)
    return FAKE_SOUND;
  }

  // start the audio
  const id = sound.play(sprite)

  // creates a new sound instance
  const instance = new Sound(type, sound, id, sprite)
  instance.stop()
  instance.reset()

  // save the audio
  if (instance.isMusic) MUSIC.push(instance)
  else SFX.push(instance)

  return instance
}

// exceptions
function MissingSoundException () { }
