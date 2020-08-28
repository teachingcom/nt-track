import * as PIXI from 'pixi.js';
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

	
	// creates a new monitor
	constructor() {

		// activate the phase
		this.phaserFPS = new PhaserFPS();
		
		// captures PIXI fps reporting
		setInterval(() => {
			if (!this.active) return;
			
			// copy PIXI fps
			const fps = Math.round(PIXI.Ticker.shared.FPS);
			this.pixiCache.push(fps)

			// copy phaser FPS
			this.phaserCache.push(this.phaserFPS.actualFps);
		}, 1000);

	}

}