
import { isViewActive, onViewActiveStateChanged } from '../utils/view';
import { Animator, EventEmitter, PIXI, findDisplayObjectsOfRole } from 'nt-animator';
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

		// webgl has a problem where render attempts that
		// take place when the page is unloading may cause
		// the area to go black. if possible, capture the
		// window unloading and disable rendering attempts
		if (window) {
			window.addEventListener('beforeunload', this.onWindowUnload)
		}

		// save some options
		this.options = options;
		this.scale = 1 // options.scale;
		this.ssaa = false // options.ssaa !== false;

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
			// TODO: how can we improve visuals
			// antialias: false, 
			// resolution: window.devicePixelRatio,
			// autoDensity: true,
			antialias: false, // doesn't appear to change anything
			smoothProperty: 'none', // doesn't appear to change anything
			preserveDrawingBuffer: options.preserveBuffer,
			transparent,
			clearBeforeRender,
			backgroundColor
		};

		// start with a canvas renderer
		createCanvasRenderer(this, options.cacheId);
		let renderer = this.canvasRenderer;

		window.RENDERER = this

		// helper
		window.addEventListener('unload', this.freeze);
		window.addEventListener('beforeunload', this.tempFreeze);

		// create WebGL, if supported
		if (!forceCanvas && PIXI.utils.isWebGLSupported()) {
			try {
				createWebGLRenderer(this, options.cacheId);
				
				// if it was successful, we want to monitor for
				// any webGL context errors
				const { gl } = this.webGLRenderer.renderer;
				gl.canvas.addEventListener('webglcontextlost', this.onWebGLContextLost);
				
				// debugging failures
				// gl.canvas.addEventListener('webglcontextrestored', this.onWebGLContextRestored);
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

		const calculateCursor = (x, y) => {
			const hw = window.innerWidth / 2
			const hh = window.innerWidth / 2
			this.animationVariables.current_pointer_x = Math.floor(x)
			this.animationVariables.current_pointer_y = Math.floor(y)
			this.animationVariables.normalized_pointer_x = x / window.innerWidth
			this.animationVariables.normalized_pointer_y = y / window.innerHeight
			this.animationVariables.center_normalized_pointer_x = (x - hw) / hw
			this.animationVariables.center_normalized_pointer_y = (y - hh) / hh
		};

		// for naming clarity
		// this is accessed by the animation engine
		// to make animations that are relative
		// to the game view
		this.animationVariables = this.view

		// for some special effects
		window.addEventListener('mousemove', (event) => calculateCursor(event.pageX, event.pageY))
		calculateCursor(window.innerWidth / 2, window.innerHeight / 2)
		
		// set the correct renderer
		this.setRenderer(renderer);

		// monitor visibility changes
		this.isViewActive = isViewActive();
		onViewActiveStateChanged(this.onViewActiveStateChanged);

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

	makeWebGLCompatible(obj, action = layer => layer.visible = false) {
		if (this.isUsingWebGL) {
			return
		}
		
		findDisplayObjectsOfRole(obj, 'requiresWebGL')
			.forEach(action)
	}

	// temporarily freezes rendering - used in response to the
	// before unload event to prevent the flash of the WebGL view
	// when leaving the page
	tempFreeze = () => {
		this.pause();
		setTimeout(() => this.resume(), 1000);
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

	dispose() {
		// when single use, kill everything
		if (!this.options.cacheId) {
			this.view.destroy({ children: true, texture: false, baseTexture: false })
		}

		this.freeze()
	}

	// prevents any more rendering attempts
	freeze = () => {
		this.stopAutoRender();
		this.render = noop;
	}

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
	onWindowUnload = () => {
		cancelAnimationFrame(this._nextFrame);
		this.render = () => { }
	}

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
	previousTime = Date.now()
	preferredFps = 1000 / 60
	maxRenderingSpeed = this.preferredFps * 0.9
	getDeltaTime = (asOf) => {
		const diff = asOf - this.previousTime;
		this.previousTime = asOf;
		return diff / this.preferredFps;
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
	_autoRender = () => {
		cancelAnimationFrame(this._nextFrame);
		this.render();
		this._nextFrame = requestAnimationFrame(this._autoRender);
	}

	// performs rendering
	render() {
		if (this.paused) {
			return;
		}

		const { renderer, view } = this;
		renderer.render(view);
	}
	
	// turn on auto rendering
	startAutoRender = () => this._autoRender()

	// turn off auto rendering
	stopAutoRender = () => cancelAnimationFrame(this._nextFrame)

	getDisplaySize() {
		return { width: this.width, height: this.height };
	}

	// second function to make clear what's happening when
	// used outside of the track repo
	syncToContainer = () => {
		this.resize();
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

let context;
let canvas;

// create a webgl based renderer
function createWebGLRenderer(instance, cacheId) {
	const { config } = instance;

	let renderer = cache[cacheId]?.gl

	// wasn't one cached
	if (!renderer) {
		// create the renderer
		renderer = new PIXI.Renderer({
			...config,
			view: canvas,
			context
		});

		if (cacheId) {
			cache[cacheId] = { ...cache[cacheId], gl: renderer }
		}
	}
	
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

let cache = { }

// create an basic canvas renderer
function createCanvasRenderer(instance, cacheId) {
	const { config } = instance;

	// check for a cached renderer
	let renderer = cache[cacheId]?.canvas

	// without a renderer, create it now
	if (!renderer) {
		renderer = new PIXI.CanvasRenderer(config);

		// if caching, do it now
		if (cacheId) {
			cache[cacheId] = { canvas: renderer }
		}
	}
	
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
