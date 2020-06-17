import * as PIXI from 'pixi.js';
import { PIXI as AnimatorPIXI } from 'nt-animator';
import Random from '../../rng';
import { TRACK_HEIGHT, TRACK_TOP } from '../../views/track/scaling';
import { TRACK_MAXIMUM_SCROLL_SPEED } from '../../config';
import { isArray, isNumber, noop } from '../../utils';
import Segment from './segment';
import createCrowd from '../../plugins/crowd';

// total number of road slices to create
// consider making this calculated as needed
// meaning, add more tiles if the view expands
const TOTAL_ROAD_SEGMENTS = 20;

// creates a default track
export default class Track {

	/** creates a new track instance */
	static async create(options) {
		const { view, seed } = options;

		// custom crowd type
		view.animator.install('crowd', createCrowd);

		// create the new track
		const instance = new Track();
		instance.options = options;
		instance.view = view;
		instance.container = new PIXI.Container();

		// assign the seed, if needed
		view.animator.rng.activate(seed);
		instance.rng = new Random(seed);

		// align to the center
		instance.relativeX = 0.5;
		
		// idenitfy the track to render
		instance._selectTrack();
		
		// setup each part
		await instance._createRoad();
		await instance._createStartingLine();
		await instance._createFinishLine();
		// await instance._createForeground();
		// await instance._createBackground();

		// set the y position
		const y = TRACK_TOP + (TRACK_HEIGHT / 2);
		instance.overlay.relativeY = y;
		instance.ground.relativeY = y;

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
		const zone = tracks[trackId];
		if (!zone) {
			const ids = Object.keys(tracks);
			trackId = rng.select(ids);
			zone = tracks[trackId];
		}
		
		// select the variation of the track
		const manifest = zone[variantId];
		if (!manifest) {
			const ids = Object.keys(zone);
			variantId = rng.select(ids);
			manifest = zone[variantId];
		}
	
		// save the working path
		this.path = `tracks/${trackId}/${variantId}`;
		this.zone = zone;
		this.manifest = manifest;
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

			// save the bounds
			segment.bounds = segment.bottom.getBounds();
		}

		// set the default positions for each tile
		this._resetTrackSegements();
	}

	// creates the finish block
	async _createStartingLine() {
		const { view, overlay, ground, manifest, path } = this;
		const { start } = manifest.track;

		// if missing
		if (!start) {
			console.warn(`No starting block defined for ${path}`);
			return;
		}

		// add the starting line
		const comp = await view.animator.compose({ compose: start }, path, manifest);
		const segment = this.startingLine = new Segment(comp);

		// add the overlay section
		overlay.addChild(segment.top);
		ground.addChild(segment.bottom);

		// fit the starting block to the middle of the screen
		this._fitBlockToTrackPosition(segment, 0);

		// TODO: calculate this value
		this._cycleTrack(-200)
	}

	// creates the finlish line
	async _createFinishLine() {
		const { view, manifest, path } = this;
		const { finish } = manifest.track;

		// if missing
		if (!finish) {
			console.warn(`No finishing block defined for ${path}`);
			return;
		}

		// add the finishing line
		const comp = await view.animator.compose({ compose: finish }, path, manifest);
		const segment = this.finishLine = new Segment(comp);
		segment.visible = false;
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
	update = state => {
		const distance = state.speed * -TRACK_MAXIMUM_SCROLL_SPEED;
		this._cycleTrack(distance);
	}

	/** activates the finish line view */
	showFinishLine = () => {
		const { finishLine, overlay, ground, view } = this;
		const { width } = view;
		
		// just in case (in testing)
		this.removeStartingLine();

		// reset all
		this._resetTrackSegements();

		// add the overlay section
		overlay.addChild(finishLine.top);
		ground.addChild(finishLine.bottom);
		finishLine.visible = true;

		// shift backwards
		const bounds = finishLine.getBounds();
		const distance = (width - bounds.width) * -0.5
		this._cycleTrack(distance);
	}

	/** removes the starting line block */
	removeStartingLine = () => {
		const { startingLine } = this;
		if (!startingLine) return;
		startingLine.dispose();
		this.startingLine = undefined;
	}

	// reset the starting positions for the repeating tiles
	_resetTrackSegements = () => {
		const { segments } = this;

		// return to original positions
		for (const segment of segments) {
			segment.setX(0);
		}

		// stitch each 
		let width = 0;
		for (let i = 0; i < segments.length; i++) {
			const segment = segments[i];
			const previous = segments[i - 1];

			// if there's a previous road, stack up next to it
			if (previous) {
				width += Math.floor(previous.bounds.width) - 1;
			}

			// set to the current position
			segment.setX(width);
		}

		// this.totalWidth = width * segments[0].bottom.scale.x;
		// set the starting position of each segment which will be
		// stitched to the next segment, but also offset by half
		// of the total width so that the road extends the
		// entire screen
		const offsetX = width * -0.5;
		for (const segment of segments) {
			segment.addX(offsetX);
		}
	}

	// changes the location of the repeating track
	_cycleTrack(diff) {
		const { segments, startingLine, finishLine } = this;

		// keep track of segments that need
		// to also be shifted
		let reset;
		let max;

		// check for off screen
		// TODO: make this better
		const offscreen = -window.innerWidth * 2;

		// update each segment
		diff = Math.floor(diff);
		for (const segment of segments) {

			// apply the diff
			segment.addX(diff);

			// if this has gone off screen, it's time
			// to reset it -- maximum one per frame
			if (segment.bottom.x + segment.bounds.width < offscreen) {
				if (!reset || segment.bottom.x < reset.bottom.x)
					reset = segment;
			}

			// if this is the farthest segment
			if (!max || segment.bottom.x > max.bottom.x) {
				max = segment;
			}
		}

		// if this tile needs to return to the
		// beginning of the loop
		if (reset && max) {
			const shift = Math.floor(max.bottom.x + max.bounds.width) - 1;
			reset.setX(shift)
		}

		// move the starting and ending lines
		if (startingLine) {
			startingLine.addX(diff);

			// check if time to remove the starting line
			if (startingLine.bottom.x < offscreen) {
				this.removeStartingLine();
			}
		}

		// check for the finish line block
		if (finishLine && finishLine.visible) {
			finishLine.addX(diff);
		}

	}

	// tries to fit a block into the view
	_fitBlockToTrackPosition(block, position) {

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