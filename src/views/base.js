import * as debug from '../debug';

import * as PIXI from 'pixi.js';
import { Animator, EventEmitter, PIXI as AnimatorPIXI } from 'nt-animator';
import { noop } from '../utils';

/** creates a track instance */
export class BaseView extends EventEmitter {

	/** handles initial setup of the rendering area */
	async init(options) {
		const { target, scale } = options;

		// save some options
		this.options = options;
		this.scale = options.scale;
		this.target = options.target;
		this.ssaa = options.ssaa !== false;

		// get the container the rendering surface is in
		this.parent = options.container || options.target.parentNode;

		// create the animation creator
		const { baseUrl, seed, manifest } = options;
		this.animator = new Animator(manifest, { baseUrl, seed });

		// data used for the animator
		this.data = options.data;

		// create a PIXI renderer for the provided canvas
		// and hide the launch message
		this.renderer = new PIXI.Renderer({
			antialias: false, // doesn't appear to improve anything
			legacy: true,
			view: target,
			preserveDrawingBuffer: true,
			backgroundColor: options.backgroundColor || 0x282d3f
		});

		// no interactions
		PIXI.Ticker.shared.stop();
		this.renderer.plugins.interaction.destroy();

		// idenitfy which scaled edges to use
		const axes = { };
		if (scale.height) axes.height = scale.height;
		if (scale.width) axes.width = scale.width;

		// setup the scaled stage
		this.view = new AnimatorPIXI.ResponsiveStage(axes);
		this.stage = new PIXI.Container();
		this.view.addChild(this.stage);
		
		// match the size
		this.resize();
	}
	
	/** keeping track of progress */
	activeTasks = [ ]
	totalTasks = 0
	loadingProgress = 0

	timing = { 
		elapsed: 0,
		current: 0
	}

	getDeltaTime = relativeTo => {
		
		
		const now = +new Date;
		const elapsedMS = now - relativeTo;

		// cap the milliseconds elapsed used for deltaTime
		// if (elapsedMS > this._maxElapsedMS) {
		// 		elapsedMS = this._maxElapsedMS;
		// }

		// elapsedMS *= this.speed;

		// If not enough time has passed, exit the function.
		// Get ready for next frame by setting _lastFrame, but based on _minElapsedMS
		// adjustment to ensure a relatively stable interval.
		// if (this._minElapsedMS) {
		// 		const delta = currentTime - this._lastFrame | 0;
		// 		if (delta < this._minElapsedMS) {
		// 				return;
		// 		}
		// 		this._lastFrame = currentTime - (delta % this._minElapsedMS);
		// }

		// this.deltaMS = elapsedMS;
		return elapsedMS * PIXI.settings.TARGET_FPMS;
	}

	/** includes a new task */
	addTasks(...tasks) {
		const { activeTasks } = this;
		activeTasks.push(...tasks);
		this.totalTasks += tasks.length;
	}

	/** resolves an item and moves progress forward */
	resolveTask(name) {
		const { activeTasks, totalTasks, options } = this;
		const { onLoadProgress = noop } = options;
		for (let i = activeTasks.length; i-- > 0;)
			if (activeTasks[i] === name)
				activeTasks.splice(i, 1);

		// update the progress
		this.loadingProgress = 1 - (activeTasks.length / totalTasks);
		onLoadProgress(this.loadingProgress);
	}


	/** renders the current state of the view */
	render() {
		const { renderer, view } = this;
		return renderer.render(view);
	}

	/** resizes to match the container element */
	resize = () => {
		const { parent, target: surface, view } = this;
		const ssaa = true;

		// get the updated bounds
		const bounds = parent.getBoundingClientRect();
		const preferred = bounds.width;
		const upscale = 2;

		// scale as required
		const width = (bounds.right - bounds.left) * (ssaa ? upscale : 1);
		const height = (bounds.bottom - bounds.top) * (ssaa ? upscale : 1);
		const scale = ssaa ? (preferred / width) : 1;

		// update the sizing
		view.resize(width, height);
		
		// resize the view
		this.width = surface.width = width;
		this.height = surface.height = height;
		this.cx = width / 2;
		this.cy = height / 2;
		
		// update the DOM element
		this.renderer.view.style.width = `${width * scale}px`;
		this.renderer.view.style.height = `${height * scale}px`;

		// notify of the resize
		const { cx, cy } = this;
		this.emit('resize', { width, height, cx, cy });

		// perform a render
		this.render();
	}

}
