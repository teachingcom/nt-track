import * as PIXI from 'pixi.js';
import { Animator, EventEmitter, PIXI as AnimatorPIXI, createContext } from 'nt-animator';

/** creates a track instance */
export class BaseView extends EventEmitter {

	/** handles initial setup of the rendering area */
	init(options) {
		const { target, scale } = options;

		// save some options
		this.options = options;
		this.scale = options.scale;
		this.target = options.target;

		// get the container the rendering surface is in
		this.parent = options.container || options.target.parentNode;

		// create the animation creator
		const { baseUrl, seed, manifest } = options;
		this.animator = new Animator(manifest, { baseUrl, seed });

		// data used for the animator
		this.data = options.data;

		// create a PIXI renderer for the provided canvas
		this.renderer = new PIXI.Renderer({
			resolution: 1,
			antialias: false,
			view: target,
			backgroundColor: options.backgroundColor || 0x282d3f
		});

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

	/** renders the current state of the view */
	render() {
		const { renderer, view } = this;
		renderer.render(view);
	}

	/** resizes to match the container element */
	resize = () => {
		const { parent, target: surface, view, renderer } = this;

		// get the updated bounds
		const bounds = parent.getBoundingClientRect();
		const width = bounds.right - bounds.left;
		const height = bounds.bottom - bounds.top;
		
		// resize the view
		this.width = surface.width = width;
		this.height = surface.height = height;
		this.cx = width / 2;
		this.cy = height / 2;
		
		// update the responsive view size
		view.resize(width, height);

		// notify of the resize
		const { cx, cy } = this;
		this.emit('resize', { width, height, cx, cy });

		// perform a render
		renderer.render(view);
	}

}
