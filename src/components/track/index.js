import * as PIXI from 'pixi.js';
import { PIXI as AnimatorPIXI } from 'nt-animator';
import Random from '../../rng';
import { TRACK_HEIGHT, BASE_HEIGHT, TRACK_TOP } from '../../views/track/scaling';
import Treadmill from '../treadmill';
import { MAXIMUM_TRACK_SCROLL_SPEED } from '../../config';
import { isArray, isNumber } from '../../utils';

// const shadowGenerator = createContext();



// total number of road slices to create
// consider making this calculated as needed
// meaning, add more tiles if the view expands
const TOTAL_ROAD_SEGMENTS = 30;

// creates a default track
export default class Track extends AnimatorPIXI.ResponsiveContainer {

	/** creates a new track instance */
	static async create(options) {
		const { view, seed } = options;

		// create the new track
		const instance = new Track();
		instance.options = options;
		instance.view = view;
		instance.container = new PIXI.Container();

		// assign the seed, if needed
		instance.rng = new Random(seed);

		// align to the center
		instance.relativeX = 0.5;

		// idenitfy the track to render
		instance._selectTrack();
		// await instance._resolveTileCategories();
		await instance._createRoad();
		await instance._createForeground();
		await instance._createBackground();

		// sort all layers
		instance.addChild(instance.container);
		instance.container.sortChildren();

		// can render
		instance.ready = true;
		return instance;
	}

	// handles selecting a track to use, either
	// defined or random
	_selectTrack()  {
		const { view, rng, options } = this;
		let { trackId, variantId } = options;

		// find all available tracks
		const tracks = view.animator.lookup('tracks');
		
		// try and load the track and variant - if
		// missing, use a random track
		this.zone = tracks[trackId];
		if (!this.zone) {
			const ids = Object.keys(tracks);
			trackId = rng.select(ids);
			this.zone = tracks[trackId];
		}
		
		// select the variation of the track
		this.manifest = this.zone[variantId];
		if (!this.manifest) {
			const ids = Object.keys(this.zone);
			variantId = rng.select(ids);
			this.manifest = this.zone[variantId];
		}
	
		// save the working path
		this.path = `tracks/${trackId}/${variantId}`;
	}

	// creates the road tiles
	async _createRoad() {
		const { view, rng, layers, manifest } = this;
		const { segments, order } = manifest.track;
		const total = segments.length;

		// should this randomize the slices -- if a sequence is selected
		// then this won't work
		const randomize = /random(ize)?/i.test(order);
		const sequence = isArray(order) ? order : null;

		// create the looping road
		layers.track = await Treadmill.create({
			totalSegments: TOTAL_ROAD_SEGMENTS,
			fitToHeight: BASE_HEIGHT * TRACK_HEIGHT,

			// handle generating each road segment
			onCreateSegment: async i => {

				// select the correct sequence
				const template = randomize ? rng.select(segments)
					// has a planned sequence
					: sequence ? segments[sequence[i % sequence.length]]
					// just goes in sequential order
					: segments[i % total];

				// compose the slice
				return view.animator.compose(template, this.path);
			}
		});

		// track content is center aligned, so use the track top
		// plus half of the percentage of the height
		this.relativeY = TRACK_TOP + (TRACK_HEIGHT / 2);
		// console.log(layers.track.segments[0].instances.base);
		// this.scale.x = this.scale.y = layers.track.segments[0].instances.base.displayObject.height / (BASE_HEIGHT * TRACK_HEIGHT);
		// console.log(this.scale.x);

		// include in the rendering
		this.container.addChild(layers.track);
	}

	// creates a background, if needed
	async _createBackground() {
		const { view, manifest } = this;
		const { background } = manifest;

		// check if present
		if (!background) return;

		// check for a background color
		if (isNumber(background.color))
			view.renderer.backgroundColor = background.color;

		// check for a composition
		if (isArray(background.compose)) {
			this.background = await view.animator.compose(background, this.path);
			this.background.zIndex = -1;
			this.container.addChild(this.background);
		}
	}

	// creates a background, if needed
	async _createForeground() {
		const { view, manifest } = this;
		const { foreground } = manifest;

		// check if present
		if (!foreground) return;

		// check for a composition
		if (isArray(foreground.compose)) {
			const layer = await view.animator.compose(foreground, this.path);

			// create a a separate view - this will
			// be placed over the cars layer
			this.foreground = new AnimatorPIXI.ResponsiveContainer();
			this.foreground.addChild(layer);
			this.foreground.relativeX = 0.5;
			this.foreground.relativeY = this.relativeY;
		}
	}


	// tracking named layers
	layers = { }

	// tracking repeating view segments
	segments = { }

	// positional update 
	update = (state) => {
		const { layers, view } = this;

		// if (this.foreground) {
		// 	this.foreground.y = BASE_HEIGHT / 2;
		// }

		// scroll the road
		layers.track.update({
			diff: state.speed * -MAXIMUM_TRACK_SCROLL_SPEED,
			horizontalWrap: -view.width * 2
		});

	}

}