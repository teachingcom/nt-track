import { PIXI } from 'nt-animator';
import PhaserFPS from './phaser-fps';

/** tracking FPS */
export default class FpsMonitor {

	// tracking FPS
	pixiCache = []
	phaserCache = []

	/** returns all cached FPS values */
	flush() {
		const { pixiCache, phaserCache } = this;
		this.pixiCache = [ ];
		this.phaserCache = [ ];
		return { pixiCache, phaserCache };
	}

	// change the state
	activate = () => {
		this.active = true;
		this.phaserFPS.start();
	}

	deactivate = () => {
		this.active = false;
		this.phaserFPS.stop();
	}

	
	getSample = count => {
		let avg = 0;
		const total = this.pixiCache.length;
		const limit = Math.min(count, total);
		const start = total - limit;

		// gather up all frame data
		for (let i = start; i < total; i++) {
			avg += this.pixiCache[i] + this.phaserCache[i];
		}		

		return avg / (limit * 2);
	}

	
	// creates a new monitor
	constructor() {

		// activate the phase
		this.phaserFPS = new PhaserFPS();
		
		// captures PIXI fps reporting
		setInterval(() => {
			if (!this.active) return;
			
			// copy PIXI fps
			const fps = Math.round(PIXI.Ticker.shared.FPS);
			this.pixiCache.push(fps * 0.8)

			// copy phaser FPS
			const fps2 = Math.round(this.phaserFPS.actualFps);
			this.phaserCache.push(fps2 * 0.8);
		}, 1000);

	}

}