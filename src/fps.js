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

	getSample = () => {
		// simulate poor framerates
		// const diminish = 0.6 + (0.3 * Math.random());
		// return this.phaserFPS.actualFps * diminish;
		return this.phaserFPS.actualFps;
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
			this.pixiCache.push(fps);

			// copy phaser FPS
			const fps2 = Math.round(this.phaserFPS.actualFps);
			this.phaserCache.push(fps2);
		}, 1000);

	}

}