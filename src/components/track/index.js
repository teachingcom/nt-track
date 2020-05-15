import * as PIXI from 'pixi.js';
import { PIXI as AnimatorPIXI, getBoundsForRole } from 'nt-animator';
import Random from '../../rng';
import { TRACK_HEIGHT, BASE_HEIGHT, TRACK_TOP } from '../../views/track/scaling';
import Treadmill from '../treadmill';
import { MAXIMUM_TRACK_SCROLL_SPEED } from '../../config';
import { isArray, isNumber } from '../../utils';
import Segment from './segment';

// total number of road slices to create
// consider making this calculated as needed
// meaning, add more tiles if the view expands
const TOTAL_ROAD_SEGMENTS = 30;


// creates a default track
export default class Track {

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
		
		// setup each part
		await instance._createRoad();
		await instance._createStartingLine();
		// await instance._createFinishLine();
		// await instance._createForeground();
		// await instance._createBackground();

		// set the y position
		const y = TRACK_TOP + (TRACK_HEIGHT / 2);
		instance.overlay.relativeY = y;
		instance.ground.relativeY = y;

		// sort all layers
		// instance.addChild(instance.container);
		// instance.container.sortChildren();

		// can render
		instance.ready = true;
		return instance;
	}

	// tracking named layers
	layers = { }

	// each individual part of the ground and overlay
	segments = [ ]

	// overlay and road segments
	overlay = new AnimatorPIXI.ResponsiveContainer()
	ground = new AnimatorPIXI.ResponsiveContainer()

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
		const { view, rng, segments, manifest, path, overlay, ground } = this;
		const { repeating, order } = manifest.track;
		const total = repeating.length;

		// should this randomize the slices -- if a sequence is selected
		// then this won't work
		const randomize = /random(ize)?/i.test(order);
		const sequence = isArray(order) ? order : null;

		// TODO: determine the total number of road segments
		// a little better rather than a hard coded number
		// this could probably be dynamic depending on the view size
		for (let i = 0; i < TOTAL_ROAD_SEGMENTS; i++) {
			const previous = segments[i - 1];

			// select the correct sequence
			const template = randomize ? rng.select(repeating)
				// has a planned sequence
				: sequence ? repeating[sequence[i % sequence.length]]
				// just goes in sequential order
				: repeating[i % total];

			// compose the slice and add to the
			// scrolling overlay/bottom containers
			const comp = await view.animator.compose(template, path, manifest);
			const segment = new Segment(comp);
			segments.push(segment);

			// for repeating road, offset so that
			// the layers are against the left side
			segment.top.pivot.x = segment.bounds.left;
			segment.bottom.pivot.x = segment.bounds.left;

			// add to the correct containers
			overlay.addChild(segment.top);
			ground.addChild(segment.bottom);

			// if there's a previous road, stack up next to it
			if (previous) {
				const previousBounds = previous.bottom.getBounds();
				segment.setX(previousBounds.right);
			}

		}

		// set the starting position of each segment which will be
		// stitched to the next segment, but also offset by half
		// of the total width so that the road extends the
		// entire screen
		const offsetX = 0 | (ground.width / -2);
		for (const segment of segments) {
			segment.addX(offsetX);
		}
	}

	// creates the finish block
	async _createStartingLine() {
		const { view, overlay, ground, rng, layers, manifest, path } = this;
		const { start } = manifest.track;

		// add the starting line
		const comp = await view.animator.compose({ compose: start }, path, manifest);
		const segment = this.startingLine = new Segment(comp);

		// add the overlay section
		overlay.addChild(segment.top);
		ground.addChild(segment.bottom);

		// fit the starting block to the middle of the screen
		this._fitTo(segment, 0);
	}

	async _createFinishLine() {

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

	// positional update 
	update = (state) => {
		const { layers, view, segments } = this;

		const diff = state.speed * -MAXIMUM_TRACK_SCROLL_SPEED;
		this._updateRepeating(diff);
		

		// if (this.foreground) {
		// 	this.foreground.y = BASE_HEIGHT / 2;
		// }

		

		// // scroll the road
		// layers.track.update({
		// 	diff,
		// 	horizontalWrap: view.width * -0.5
		// });

		// // TODO: need to come up with a unified way of doing this
		// layers.start.x += diff * layers.start.scale.x;

	}

	_updateRepeating(diff) {
		const { view, segments, startingLine } = this;
		const leftEdge = view.width * -0.5;

		// move the starting and ending lines
		if (startingLine) {
			startingLine.addX(diff);

			// check if time to remove the starting line
			const bounds = startingLine.getBounds();
			if (bounds.right < (leftEdge * 2)) {
				startingLine.dispose();
				this.startingLine = undefined;
			}
		}

		// find a segment to move and then
		// the furthest one back to move
		// it aligned to
		let min;
		let max;

		// shift the segments
		for (const segment of segments) {
			min = (!min || segment.bottom.x < min.bottom.x) ? segment : min;
			max = (!max || segment.bottom.x > max.bottom.x) ? segment : max;
			segment.addX(diff);
		}

		// wrap at the edge of the screen *plus* double the size of the container
		// for the most part, this isn't required but it does help eliminate
		// the segments from wrapping too early when the view is super small
		// but also super tall - this is an edge case
		// NOTE: the screen should never be at the size being mentioned, but
		// it's worth fixing
		const wrapAt = leftEdge - (min.bounds.width * 2);
		if (min.bottom.x < wrapAt) {
			min.setX(max.bottom.x + (max.bounds.width * max.scale));
		}
	}

	// tries to fit a starting/finish block into the view
	_fitTo(block, position) {

		// TODO: if the road is a defined sequence, then we should
		// move all rows so they're sorted by their sequence again
		// this can probably be done by sorting positions first and
		// then copying the final values and setting again

		const { segments } = this;
		const total = segments.length;
		const fit = block.getBounds();

		// start searching for the "split" of the treadmill (the position to insert at)
		for (let i = 0; i < total; i++) {
			const segment = segments[i];
			const bounds = segment.getBounds();

			// found the "split" location
			if (bounds.left > position) {

				// shift the prior layer backwards
				let shiftBack;
				for (let j = i; j-- > 0;) {
					const target = segments[j];

					// if not set, figure out the amount to shift the layer by
					if (isNaN(shiftBack)) {
						const bounds = target.getBounds();
						shiftBack = (bounds.right - position) + (position - fit.left);
					}

					// move backwards
					target.addX(-shiftBack);
				}

				// shift later layers forward
				let shiftForward;
				for (let j = i; j < total; j++) {
					const target = segments[j];

					// if not set, figure out the amount to shift the layer by
					if (isNaN(shiftForward)) {
						const bounds = target.getBounds();
						shiftForward = (position - bounds.left) + (fit.right - position);
					}

					// move backwards
					target.addX(shiftForward);
				}
				
				// no need to continue searching
				break;
			}
		
		}

	}

}