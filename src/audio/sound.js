
/** allows managing a sound */
export class Sound {

	constructor(source, id, sprite) {
		this.source = source;
		this.id = id;
		this.sprite = sprite;
	}

	/** tests if the sound is playing */
	get isPlaying() {
		const { id } = this;
		this.source.playing(id);
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
	volume(level) {
		const { id } = this;
		this.source.volume(level, id);
	}
	
	/** set the rate */
	rate(playbackRate) {
		const { id } = this;
		this.source.rate(playbackRate, id);
	}
	
	/** set the rate */
	loop(shouldLoop) {
		const { id } = this;
		this.source.loop(shouldLoop, id);
	}
	
	/** set the rate */
	fade(from, to, duration) {
		const { id } = this;
		this.source.fade(from, to, duration, id);
	}
	
	/** stop the audio */
	stop() {
		const { id } = this;
		this.source.stop(id);
	}
	
	/** pause the audio */
	pause() {
		const { id } = this;
		this.source.pause(id);
	}
	
	/** play the audio */
	play() {
		const { id } = this;
		this.source.seek(0, id);
		this.source.play(id);
	}
	
	/** pause the audio */
	mute(shouldMute) {
		const { id } = this;
		this.source.mute(shouldMute, id);
	}

}