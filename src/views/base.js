
import { isViewActive, onViewActiveStateChanged } from '../utils/view';
import { Animator, EventEmitter, PIXI } from 'nt-animator';
import { noop } from '../utils';
import { DEFAULT_PERFORMANCE_MONITORING_DELAY, PERFORMANCE_LEVEL } from '../config';

// dynamic management of performance
import FpsMonitor from '../fps';
import DynamicPerformanceController from '../perf';

/** creates a track instance */
export class BaseView extends EventEmitter {

	/** handles initial setup of the rendering area */
	async init(options) {
		const { scale, forceCanvas } = options;
		// const { scale } = options;
		// const forceCanvas = true;
		window.VIEW = this

		// monitor visibility changes
		this.isViewActive = isViewActive();
		onViewActiveStateChanged(this.onViewActiveStateChanged);

		// save some options
		this.options = options;
		this.scale = options.scale;
		this.ssaa = options.ssaa !== false;

		// get the container the rendering surface is in
		this.parent = options.container;

		// create the animation creator
		const { baseUrl, seed, manifest } = options;
		this.animator = new Animator(manifest, {
			animationUpdateFrequency: 1,
			emitterUpdateFrequency: 1,
			baseUrl,
			seed
		});

		// data used for the animator
		this.data = options.data;

		// create the renderer config
		const DEFAULT_BACKGROUND_COLOR = 0x282d3f;
		const transparent = !!options.transparent;
		const hasBackgroundColor = 'backgroundColor' in options;
		const clearBeforeRender = transparent || hasBackgroundColor;
		const backgroundColor = hasBackgroundColor ? options.backgroundColor : DEFAULT_BACKGROUND_COLOR;

		this.config = {
			// antialias: false, // doesn't appear to improve anything
			legacy: true,
			preserveDrawingBuffer: true,
			smoothProperty: 'none',
			transparent,
			clearBeforeRender,
			backgroundColor
		};

		// start with a canvas renderer
		createCanvasRenderer(this);
		let renderer = this.canvasRenderer;

		// create WebGL, if supported
		if (!forceCanvas && PIXI.utils.isWebGLSupported()) {
			try {
				createWebGLRenderer(this);
				
				// if it was successful, we want to monitor for
				// any webGL context errors
				const { gl } = this.webGLRenderer.renderer;
				gl.canvas.addEventListener('webglcontextlost', this.onWebGLContextLost);
				// gl.canvas.addEventListener('webglcontextrestored', this.onWebGLContextRestored);

				// debugging failures
				// setTimeout(() => this.webGLRenderer.renderer.gl.getExtension('WEBGL_lose_context').loseContext(), 10000);
				
				// replace the renderer
				renderer = this.webGLRenderer;
			}
			catch (ex) {
				renderer = this.canvasRenderer;
			}
		}

		// no common timer
		PIXI.Ticker.shared.stop();

		// idenitfy which scaled edges to use
		const axes = { };
		if (scale.height) axes.height = scale.height;
		if (scale.width) axes.width = scale.width;

		// setup the scaled stage
		this.view = new PIXI.ResponsiveStage(axes);
		this.stage = new PIXI.Container();
		this.view.addChild(this.stage);
		
		// set the correct renderer
		this.setRenderer(renderer);

		// tracking FPS
		this.fps = new FpsMonitor();

		// allow for rendering to be adjusted dynamically
		if (options.useDynamicPerformance !== false) {
			this.performance = new DynamicPerformanceController({
				key: options.dynamicPerformanceCacheKey || 'animation',
				view: this,
				onPerformanceChanged: this.onPerformanceChanged,
				delay: options.dynamicPerformanceMonitoringDelay || DEFAULT_PERFORMANCE_MONITORING_DELAY,
				fps: this.fps,
			});
		}
	}

	/** keeping track of progress */
	activeTasks = [ ]
	totalTasks = 0
	loadingProgress = 0
	animationRate = 1
	ssaaScalingLevel = 2

	timing = { 
		elapsed: 0,
		current: 0
	}

	// checks if this frame should perform rendering
	get shouldAnimateFrame() {
		return !this.paused && !!this.isViewActive && (this.frame % this.animationRate === 0);
	}
	
	setRenderer = target => {
		const { parent } = this;
		this.renderer = target.renderer;

		// remove all children
		for (const child of parent.children)
			parent.removeChild(child);

		// update the current use
		this.isUsingWebGL = target.isWebGL;
		this.isUsingCanvas = target.isCanvas;

		// perform sizing first since the
		// canvas itself might be larger than
		// the target area
		this.resize();

		// add the view 
		this.parent.appendChild(target.view);
	}

	// handle pausing the render
	pause = () => this.paused = true
	resume = () => this.paused = false

	// check for performance updates
	onPerformanceChanged = perf => {
		this.animator.options.animationUpdateFrequency = perf.animationAnimationUpdateFrequency;
		this.animator.options.emitterUpdateFrequency = perf.animationParticleUpdateFrequency;
		this.animationRate = perf.renderingInterval;
		
		// perform a dynamic resize
		if (perf.ssaaScalingAmount !== this.ssaaScalingLevel) {
			this.ssaaScalingLevel = perf.ssaaScalingAmount;
			this.resize();
		}
	}

	// update state info
	onViewActiveStateChanged = active => this.isViewActive = active

	// bail on webGL
	onWebGLContextLost = () => {
		this.webGLContextLost = true;
		this.setRenderer(this.canvasRenderer);
	}

	// restore webGL
	onWebGLContextRestored = () => {
		createWebGLRenderer(this);
		this.resize();
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

	/** returns the used rendering level */
	getQuality = () => PERFORMANCE_LEVEL

	/** renders the current state of the view */
	_render = () => this.render();
	render() {

		// auto rendering
		if (this.autoRender) {
			this.autoRender = requestAnimationFrame(this._render);
		}

		// start the rendering
		const { renderer, view } = this;
		renderer.render(view);
		// const fast = new FastRenderer(this.renderer);
		// fast.render(view);
	}
	
	// turn on auto rendering
	startAutoRender = () => {
		this.autoRender = requestAnimationFrame(this._render);
	}

	// turn off auto rendering
	stopAutoRender = () => {
		cancelAnimationFrame(this.autoRender);
		delete this.autoRender;
	}

	getDisplaySize() {
		return { width: this.width, height: this.height };
	}

	/** resizes to match the container element */
	resize = () => {
		const { parent, view, renderer } = this;
		const { view: surface } = renderer;
		const ssaa = true;
		
		// get the updated bounds
		const upscale = this.ssaaScalingLevel;
		const containerWidth = parent.clientWidth;
		const containerHeight = parent.clientHeight;

		// get the scaled size
		const width = Math.floor(containerWidth * (ssaa ? upscale : 1));
		const height = Math.floor(containerHeight * (ssaa ? upscale : 1));

		// update the sizing
		view.resize(width, height);
		
		// resize the view
		this.width = surface.width = width;
		this.height = surface.height = height;
		this.cx = width / 2;
		this.cy = height / 2;
		
		// update the DOM element
		this.renderer.view.style.width = `${containerWidth}px`;
		this.renderer.view.style.height = `${containerHeight}px`;

		// notify of the resize
		const { cx, cy } = this;
		this.emit('resize', { width, height, cx, cy });

		// perform a render
		this.render();
	}

}

// create a webgl based renderer
function createWebGLRenderer(instance) {
	const { config } = instance;

	// create the renderer
	const renderer = new PIXI.Renderer(config);
	
	// set sizing to zero so it does not
	// conflict with getting the size of
	// the container
	renderer.view.width = renderer.view.height = 1;
	renderer.view.setAttribute('mode', 'webgl');

	// setup the renderer
	renderer.plugins.interaction.destroy();
	instance.webGLRenderer = {
		isWebGL: true,
		renderer,
		view: renderer.view
	};
}

// create an basic canvas renderer
function createCanvasRenderer(instance) {
	const { config } = instance;

	// create the renderer
	const renderer = new PIXI.CanvasRenderer(config);
	
	// set sizing to zero so it does not
	// conflict with getting the size of
	// the container
	renderer.view.width = renderer.view.height = 1;
	renderer.view.setAttribute('mode', 'canvas');

	// setup the renderer
	renderer.plugins.interaction.destroy();
	instance.canvasRenderer = {
		isCanvas: true,
		renderer,
		view: renderer.view
	};
}
