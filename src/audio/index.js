
import { Howl, Howler } from 'howler'
import { Sound } from './sound'

/** keeps track of active audio files */
const AUDIO = { }
const MUSIC = []
const SFX = []

// default url to load sounds from
let baseUrl = '/sounds'

// mute by default
Sound.sfxEnabled = false
Sound.musicEnabled = false

/** changes the sound effect state */
export function configureSFX (config) {
  // change enabled state
  if ('enabled' in config) {
    const enabled = !!config.enabled
    Howler.volume(enabled ? 1 : 0)
  }
}

// unused
export function configureMusic (config) {
}

/** changes the root url to load audio from */
export function setBaseUrl (url) {
  baseUrl = url
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

// creates a new sound instance
export function create (type, sprite) {
  const sound = AUDIO[sprite]

  // no sound was found
  if (!sound) {
    console.warn(`Play request for ${sprite} failed: not found`)
    return
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

window.AUDIO = {
	create,
	audio: AUDIO,
	sfx: SFX,
	music: MUSIC
}

// exceptions
function MissingSoundException () { }
