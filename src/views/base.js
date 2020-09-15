import * as debug from '../debug';

import { Animator, EventEmitter, PIXI } from 'nt-animator';
import { noop } from '../utils';
import { SSAA_SCALING_AMOUNT, TRACK_FORCE_CANVAS } from '../config';

/** creates a track instance */
export class BaseView extends EventEmitter {

	/** handles initial setup of the rendering area */
	async init(options) {
		const { target, scale } = options;

		// monitor visibility changes
		document.addEventListener('visibilitychange', this.setWindowVisibilityState);
		this.setWindowVisibilityState();

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

		// create the renderer config
		const config = {
			antialias: false, // doesn't appear to improve anything
			legacy: true,
			view: target,
			preserveDrawingBuffer: true,
			clearBeforeRender: false,
			smoothProperty: 'none',
			backgroundColor: options.backgroundColor || 0x282d3f
		};

		// create a PIXI renderer for the provided canvas
		if (!!TRACK_FORCE_CANVAS) {
			createCanvasRenderer(this, config);
		}
		// try to create WebGL
		else {
			try {
				createWebGLRenderer(this, config);
			}
			// try and fallback to canvas
			catch (ex) {
				createCanvasRenderer(this, config);
			}
		}

		// no interactions
		PIXI.Ticker.shared.stop();
		this.renderer.plugins.interaction.destroy();

		// idenitfy which scaled edges to use
		const axes = { };
		if (scale.height) axes.height = scale.height;
		if (scale.width) axes.width = scale.width;

		// setup the scaled stage
		this.view = new PIXI.ResponsiveStage(axes);
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

	/** calculates preferred times */
	// TODO: make sure this is correct on 
	getDeltaTime = relativeTo => {
		const now = +new Date;
		const elapsedMS = now - relativeTo;
		return elapsedMS * PIXI.settings.TARGET_FPMS;
	}

	/** includes a new task */
	addTasks(...tasks) {
		const { activeTasks } = this;
		activeTasks.push(...tasks);
		this.totalTasks += tasks.length;
	}

	/** check if this task is still pending */
	waitingForTask(task) {
		return !!~this.activeTasks.indexOf(task);
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

	// handles changes for the window visibility
	setWindowVisibilityState = () => {
		this.isViewActive = document.visibilityState !== 'hidden';
	}

	/** renders the current state of the view */
	render() {
		if (!this.isViewActive) return;
		const { renderer, view } = this;
		renderer.render(view);
		// const fast = new FastRenderer(this.renderer);
		// fast.render(view);
	}

	/** resizes to match the container element */
	resize = () => {
		const { parent, target: surface, view } = this;
		const ssaa = true;

		// get the updated bounds
		const bounds = parent.getBoundingClientRect();
		const preferred = bounds.width;
		const upscale = SSAA_SCALING_AMOUNT;

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

// create a webgl based renderer
function createWebGLRenderer(instance, config) {
	instance.renderer = new PIXI.Renderer(config);
	instance.isUsingWebGL = true;
}

// create an basic canvas renderer
function createCanvasRenderer(instance, config) {
	instance.renderer = new PIXI.CanvasRenderer(config);
	instance.isUsingCanvas = true;
}



// experimental rendering process
// class FastRenderer {

// 	constructor(renderer) {
// 		this.renderer = renderer;
// 	}

// 	// performs rendering
// 	render(view, renderTexture, clear, transform, skipUpdateTransform) {
// 		const { renderer } = this;

// 		// presetup for rendering based on original 
// 		// can be handy to know!
// 		renderer.renderingToScreen = !renderTexture;
// 		renderer.runners.prerender.emit();
// 		renderer.emit('prerender');

// 		// apply a transform at a GPU level
// 		renderer.projection.transform = transform;

// 		// no point rendering if our context has been blown up!
// 		if (renderer.context.isLost) return;

// 		// perform rendering
// 		if (!renderTexture)
// 			renderer._lastObjectRendered = view;

// 		// update the scene
// 		if (!skipUpdateTransform) {
// 				// update the scene graph
// 				const cacheParent = view.parent;
// 				view.parent = renderer._tempDisplayObjectParent;
// 				view.updateTransform();
// 				view.parent = cacheParent;
// 				// displayObject.hitArea = //TODO add a temp hit area
// 		}

// 		// prepare to render
// 		renderer.renderTexture.bind(renderTexture);
// 		renderer.batch.currentRenderer.start();

// 		// perform clearing, if needed
// 		if (clear !== undefined ? clear : renderer.clearBeforeRender)
// 			renderer.renderTexture.clear();

// 		// perform the render
// 		// target.render(renderer);
// 		this._renderScene(view);

// 		// apply transform..
// 		renderer.batch.currentRenderer.flush();

// 		// texture updates
// 		if (renderTexture)
// 			renderTexture.baseTexture.update();

// 		//
// 		renderer.runners.postrender.emit();
		
// 		// reset transform after render
// 		renderer.projection.transform = null;

// 		renderer.emit('postrender');

// 	}

	
// 	// renders the scene in a flat attempt
// 	_renderScene(view) {
// 		const { renderer } = this;
		
// 		let stack = [ view ];
// 		let depth = 0;
// 		let indexes = [ 0 ];
// 		while (true) {
// 			const index = indexes[depth]++;
// 			const item = stack[depth].children[index];

// 			// if there's no more
// 			if (!item) {
				
// 				// if this was a container
// 				const prev = stack[depth].children[index - 1];
// 				if (prev.children && prev.children.length)
// 					renderer.batch.flush();

// 				if (--depth < 0) break;
// 				continue;
// 			}

// 			// skip
// 			// if not visible or the alpha is 0 then no need to render this
// 			if (!item.visible || !item.renderable)
// 			{
// 					continue;
// 			}

// 			// // do a quick check to see if this element has a mask or a filter.
// 			if (item._mask || (item.filters && item.filters.length))
// 			{
// 					// item.renderAdvanced(renderer);
// 					this._renderAdvanced(item, renderer);
// 			}
// 			else {
// 				this._renderBasic(item, renderer);
// 			}
				
// 			// renderBasic(item, renderer);

// 			// insert children, if any
// 			if (item.children && item.children.length) {
// 				stack[++depth] = item;
// 				indexes[depth] = 0;
// 			}

// 		}

// 	}

// 	// performs basic rendering functionality
// 	_renderBasic(target, renderer) {
// 		target._render(renderer);
// 	}

// 	// performs advanced rendering for filters
// 	_renderAdvanced(target, renderer) {

// 		renderer.batch.flush();
// 		const filters = target.filters;
// 		const mask = target._mask;

// 		// // push filter first as we need to ensure the stencil buffer is correct for any masking
// 		// if (filters)
// 		// {
// 		// 		if (!target._enabledFilters)
// 		// 		{
// 		// 				target._enabledFilters = [];
// 		// 		}

// 		// 		target._enabledFilters.length = 0;

// 		// 		for (let i = 0; i < filters.length; i++)
// 		// 		{
// 		// 				if (filters[i].enabled)
// 		// 				{
// 		// 						target._enabledFilters.push(filters[i]);
// 		// 				}
// 		// 		}

// 		// 		if (target._enabledFilters.length)
// 		// 		{
// 		// 				renderer.filter.push(target, target._enabledFilters);
// 		// 		}
// 		// }

// 		// if (mask)
// 		// {
// 		// 		renderer.mask.push(target, target._mask);
// 		// }

// 		// add target object to the batch, only rendered if it has a texture.
// 		target._render(renderer);

// 		// // now loop through the children and make sure they get rendered
// 		// for (let i = 0, j = target.children.length; i < j; i++)
// 		// {
// 		// 		target.children[i].render(renderer);
// 		// }

// 		// renderer.batch.flush();

// 		// if (mask)
// 		// {
// 		// 		renderer.mask.pop(target);
// 		// }

// 		// if (filters && target._enabledFilters && target._enabledFilters.length)
// 		// {
// 		// 		renderer.filter.pop();
// 		// }

// 	}

// }

