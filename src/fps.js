import * as PIXI from 'pixi.js';

/** tracking FPS */
export default class FpsMonitor {

	// tracking FPS
	cache = []

	/** returns all cached FPS values */
	flush() {
		const { cache } = this;
		this.cache = [ ];
		console.log(cache);
		return cache;
	}

	// change the state
	activate = () => this.active = true;
	deactivate = () => this.active = false;
	
	// creates a new monitor
	constructor() {
		setInterval(() => {
			if (!this.active) return;
			const fps = Math.round(PIXI.Ticker.shared.FPS);
			this.cache.push(fps)
    }, 1000)
	}

}