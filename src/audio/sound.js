
/** allows managing a sound */
export class Sound {

	static sfxEnabled = true;
	static sfxVolume = 1;

	static musicEnabled = true;
	static musicVolume = 0.5;

	/** keeping track of the last time a sound was played */
	static timestamps = { }

	constructor(type, source, key, id, sprite) {
		this.type = type;
		this.source = source;
		this.id = id;
		this.sprite = sprite;
		this.key = `${type}::${key}:${sprite || 'default'}`;

		// check the default state
		this.isMusic = type === 'music';
		this.isSfx = !this.isMusic;
		this._enabled = this.isMusic ? Sound.musicEnabled : Sound.sfxEnabled;
	}

	/** checks the last time this sound instance was played */
	get lastInstancePlay() {
		const { key } = this;
		return Sound.timestamps[key] || 0;
	}

	/** tests if the sound is playing */
	get isPlaying() {
		const { id } = this;
		this.source.playing(id);
	}

	/** checks if able to be played */
	get enabled() {
		return this._enabled;
	}

	set enabled(enabled) {
		const { isSfx, isMusic } = this;
		this._enabled = enabled;

		// stop playing
		if (!enabled && isSfx) {
			this.stop();
		}
		// disabling music
		else if (!enabled && isMusic) {
			this.fade(Sound.musicVolume, 0, 1000);
		}
		// enabling music to play
		else if (enabled && isMusic) {
			this.play();
			this.fade(0, Sound.musicVolume, 1000);
		}
	}

	// // event handling -- not sure if needed
	// on(event, action) {
	// 	const { id } = this;
	// 	this.source.on(level, id);
	// }

	// // event handling -- not sure if needed
	// off(event, action) {
	// 	const { id } = this;
	// 	this.source.off(level, id);
	// }

	/** set the volume */
	volume = (level) => {
		const { id } = this;
		this.source.volume(level, id);
	}
	
	/** set the rate */
	rate = (playbackRate) => {
		const { id } = this;
		this.source.rate(playbackRate, id);
	}
	
	/** set the rate */
	loop = (shouldLoop) => {
		const { id } = this;
		this.source.loop(shouldLoop, id);
	}
	
	/** set the rate */
	fade = (from, to, duration) => {
		const { id } = this;
		this.source.fade(from, to, duration, id);
	}
	
	/** stop the audio */
	stop = () => {
		const { id } = this;
		this.source.stop(id);
	}
	
	/** pause the audio */
	pause = () => {
		const { id } = this;
		this.source.pause(id);
	}
	
	/** play the audio */
	play = () => {
		const { key, enabled, id } = this;
		Sound.timestamps[key] = +new Date;

		// TODO: this might have different behaviors
		// when it's music
		if (!enabled) return;

		this.source.seek(0, id);
		this.source.play(id);
	}
	
	/** pause the audio */
	mute = (shouldMute) => {
		const { id } = this;
		this.source.mute(shouldMute, id);
	}

}