import { Howler } from 'howler';

/** allows managing a sound */
export class Sound {

	/** checks if sound can be played at all */
	static get isAudioContextAvailable() {
		try {
			return Howler.ctx.state === 'running';
		}
		catch (ex) {
			return false;
		}
	}

	static sfxEnabled = true;
	static sfxVolume = 1;

	static musicEnabled = true;
	static musicVolume = 0.5;

	/** keeping track of the last time a sound was played */
	static timestamps = { }

	// keeping track of playcounts
	static playCounts = { }

	constructor(type, source, id, sprite) {
		this.type = type;
		this.source = source;
		this.id = id;
		this.sprite = sprite;
		this.key = `${type}::${sprite || 'default'}`;

		// check the default state
		this.isMusic = type === 'music';
		this.isSfx = !this.isMusic;
	}

	/** checks the last time this sound instance was played */
	get lastInstancePlay() {
		const { key } = this;
		return Sound.timestamps[key] || 0;
	}

	/** sets the last time this sound instance was played */
	set lastInstancePlay(value) {
		const { key } = this;
		Sound.timestamps[key] = value;
	}

	/** checks the number of times this sound has been played */
	get playCount() {
		const { key } = this;
		return Sound.playCounts[key] || 0;
	}

	/** sets the number of times this sound has been played */
	set playCount(value) {
		const { key } = this;
		Sound.playCounts[key] = value;
	}

	/** tests if the sound is playing */
	get isPlaying() {
		const { id } = this;
		this.source.playing(id);
	}

	/** gets the volume level assigned to this audio */
	get preferredVolumeLevel() {
		return isNaN(this._preferredVolumeLevel) ? 0.5 : this._preferredVolumeLevel;
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
		this._preferredVolumeLevel = level;
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
	
	/** set the rate */
	fadeOut = (duration) => {
		this.fade(this._preferredVolumeLevel, 0, duration);
	}
	
	/** set the rate */
	fadeIn = (duration) => {
		this.fade(0, this._preferredVolumeLevel, duration);
	}

	reset = () => {
		const { id } = this;
		this.source.seek(0, id);
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
		try {

			// if there's no audio context, don't bother
			if (!Sound.isAudioContextAvailable) return;

			// do not crash for failed sounds
			// play the sound
			const { id } = this;
			this.lastInstancePlay = +new Date;
			this.source.volume(this._preferredVolumeLevel, id);
			this.source.seek(0, id);
			this.source.play(id);

			// increment the play count
			this.playCount++;
		}
		catch (ex) {
			const { key } = this;
			console.log('ex', ex)
			console.warn(`Failed to play sound ${key}`);
		}

	}
	
	/** pause the audio */
	mute = (shouldMute) => {
		const { id } = this;
		this.source.mute(shouldMute, id);
	}

}