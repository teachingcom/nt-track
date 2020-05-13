import * as PIXI from 'pixi.js';
import { Animator, PIXI as AnimatorPIXI } from 'nt-animator';

/** creates a track instance */
export class BaseView {

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
		const { baseUrl, manifest } = options;
		this.animator = new Animator(manifest, { baseUrl });

		// data used for the animator
		this.data = options.data;

		// create a PIXI renderer for the provided canvas
		this.renderer = new PIXI.Renderer({
			resolution: 1,
			antialias: true,
			view: target,
			backgroundColor: options.backgroundColor || 0x282d3f
		});

		// idenitfy which scaled edges to use
		const axes = { };
		if (scale.height) axes.height = scale.height;
		if (scale.width) axes.width = scale.width;

		// setup the scaled stage
		this.stage = new AnimatorPIXI.ResponsiveStage(axes);

		// match the size
		this.resize();
	}

	/** renders the current state of the view */
	render() {
		const { renderer, stage } = this;
		renderer.render(stage);
	}

	/** resizes to match the container element */
	resize = () => {
		const { parent, target: surface, stage, renderer } = this;

		// get the updated bounds
		const bounds = parent.getBoundingClientRect();
		const width = bounds.right - bounds.left;
		const height = bounds.bottom - bounds.top;

		// resize the view
		this.width = surface.width = width;
		this.height = surface.height = height;
		this.cx = width / 2;
		this.cy = height / 2;

		// update the responsive stage size
		stage.resize(width, height);
		renderer.render(stage);
	}

}
