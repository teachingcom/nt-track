import { PIXI, getBoundsForRole, findDisplayObjectsOfRole } from 'nt-animator';
import Random from '../../rng';
import { TRACK_HEIGHT, TRACK_TOP } from '../../views/track/scaling';
import { TRACK_MAXIMUM_TRAVEL_DISTANCE, TRACK_MAXIMUM_SCROLL_SPEED } from '../../config';
import { isArray, isNumber } from '../../utils';
import Segment from './segment';
import createCrowd, { SELECTED_CROWD_URL } from '../../plugins/crowd';
import AmbientAudio from '../../audio/ambient';
import AssetPreloader from './preload';
import { loadScript, parseScriptArgs } from '../../scripts';

import RainEffect from '../../effects/rain';
import LeavesEffect from '../../effects/leaves';
import { createFakeSound } from '../../audio';

// total number of road slices to create
// consider making this calculated as needed
// meaning, add more tiles if the view expands
// const TOTAL_ROAD_SEGMENTS = 2;

// creates a default track
export default class Track {

	/** creates a new track instance */
	static async create(options) {
		const { view, seed } = options;
		let activity;
		
		// create the new track
		const instance = new Track();
		try {
			instance.options = options;
			instance.view = view;
			instance.container = new PIXI.Container();
			
			// include special plugins
			activity = 'adding crowd';
			view.setLoadingStatus('init', 'installing plugins');
			view.animator.install('crowd', createCrowd);
			
			// assign the seed, if needed
			activity = 'init rng';
			view.setLoadingStatus('init', 'creating random number generator');
			view.animator.rng.activate(seed);
			instance.rng = new Random(seed);
			
			// align to the center
			instance.relativeX = 0.5;
			
			// idenitfy the track to render
			activity = 'selecting track';
			view.setLoadingStatus('init', 'selecting track');
			instance._selectTrack();
			
			// preload external files
			activity = 'preloading resources';
			view.setLoadingStatus('assets', 'preloading resources');
			await instance._preloadResources();
			
			// setup each part
			activity = 'assembling repeating road';
			view.setLoadingStatus('init', 'creating road');
			await instance._createRoad();
			
			activity = 'assembling starting line';
			view.setLoadingStatus('init', 'creating starting line');
			// await instance._createStartingLine();
			
			// todo? create when needed?
			activity = 'assembling finish line';
			view.setLoadingStatus('init', 'creating finish line');
			// await instance._createFinishLine();
			
			// create spectator watermark
			activity = 'assembling spectator mode';
			view.setLoadingStatus('init', 'creating spectator mode');
			// await instance._createSpectatorWatermark(options);
			
			// apply scripts, if any
			activity = 'loading doodad scripts';
			await instance.applyScripts();
			
			// ambience is nice, but not worth stalling over
			activity = 'loading ambient sound';
			view.setLoadingStatus('init', 'creating ambient sound');
			instance._createAmbience();

			// other extras
			await instance._createEffect();
			// await instance._createForeground();
			// await instance._createBackground();
			
			// set the y position
			activity = 'aligning track';
			view.setLoadingStatus('init', 'aligning track');
			const y = TRACK_TOP + (TRACK_HEIGHT / 2);
			instance.overlay.relativeY = y;
			instance.ground.relativeY = y;

			// can render
			instance.ready = true;
		}
		catch (ex) {
			console.error('Error in track component:', activity, ex);
			throw new Error(activity)
		}

		return instance;
	}

	// scripted objects
	scripts = [ ]

	// track scrolling position
	trackPosition = 0

	// tracking named layers
	layers = { }

	// each individual part of the ground and overlay
	segments = [ ]

	// overlay and road segments
	overlay = new PIXI.ResponsiveContainer()
	ground = new PIXI.ResponsiveContainer()

	// handles selecting a track to use, either
	// defined or random
	_selectTrack()  {
		const { view, rng, options } = this;
		let { trackId, variantId } = options;
		
		// find all available tracks
		const tracks = view.animator.lookup('tracks');
		
		// try and load the track and variant - if
		// missing, use a random track
		let zone = tracks[trackId];
		if (!zone) {
			const ids = Object.keys(tracks);
			trackId = rng.select(ids);
			zone = tracks[trackId];
		}
		
		// select the variation of the track
		let manifest = zone[variantId];
		if (!manifest) {
			const ids = Object.keys(zone);
			variantId = rng.select(ids);
			manifest = zone[variantId];
		}
	
		// save the working path
		this.trackId = trackId;
		this.variantId = variantId;
		this.path = `tracks/${trackId}/${variantId}`;
		this.zone = zone;
		this.manifest = manifest;
	}

	// handles preloading track assets
	async _preloadResources() {
		const { view, options, trackId, manifest } = this
		const { animator } = view
		const { onLoadTrackAssets } = options

		// check for audio files
		const sfx = manifest.sfx || trackId
		
		// try to load external resources
		const preloader = new AssetPreloader(this)
		try {
			// create a list of resources to preload
			const trackAssetsUrl = this.path;
			await preloader.preload([
				// preselected crowd image
				{ type: 'image', src: SELECTED_CROWD_URL },
	
				// unique track images
				{ type: 'spritesheet', src: trackAssetsUrl },
				
				// include other image files
				{ type: 'spritesheet', src: 'extras/countdown', ignoreFailures: true },

				// other random images
				{ type: 'spritesheet', src: 'particles', ignoreFailures: true },
				{ type: 'spritesheet', src: 'images', ignoreFailures: true },
	
				// common audio
				{ type: 'audio', src: 'common', sprites: animator.manifest.sounds, ignoreFailures: true },
				{ type: 'audio', src: sfx, key: trackId, sprites: animator.manifest.sounds, ignoreFailures: true }
			])

			// assets have loaded
			onLoadTrackAssets()
		}
		// failed to load
		catch (ex) {
			view.setLoadingStatus('assets', preloader.status)
			console.error(`failed to preload track resources`)
			throw ex;
		}
	}

	// creates ambient audio
	async _createAmbience() {
		const { ambience } = this.manifest;
		if (!ambience) return;

		// create the ambient noise
		try {
			this.ambience = { };

			// create each possible racing ambience
			for (const type of ['pre', 'racing', 'victory', 'defeat', 'default']) {
				const sounds = ambience[type];
				if (isArray(sounds)) {
					this.ambience[type] = new AmbientAudio({ ...ambience, sounds });
				}
			}
		}
		// notify of this failure
		// probably not reason enough to fail
		catch (ex) {
			console.error(ex);
			console.error(`failed to create ambient audio`);
		}
	}

	segmentCache = [ ]
	segmentCounts = { }

	async _createSegment(id, placeholder) {
		const { view, manifest, path, overlay, ground, segmentCache: cache, segmentCounts: counts } = this;
		const { repeating, order } = manifest.track;
		const total = repeating.length;

		const template = repeating[id]
		console.log(template)
		const comp = await view.animator.compose(template, path, manifest);
		const segment = new Segment(this, comp);

		// create the entry for this segment
		if (!cache[id]) {
			cache[id] = []
		}

		// add to the cache
		cache[id].push(segment)

		// save the bounds for now
		segment.bounds = segment.bottom.getBounds();

		// add to the view
		overlay.addChild(segment.top);
		ground.addChild(segment.bottom);

		// align to the left edge
		segment.top.pivot.x = segment.bounds.left;
		segment.bottom.pivot.x = segment.bounds.left;
		
		// hidden to start
		segment.top.visible = false
		segment.bottom.visible = false

		return segment
	}

	// creates the road tiles
	async _createRoad() {
		const { view, rng, segments, manifest, path, overlay, ground, segmentCache: cache, segmentCounts: counts } = this;
		const { repeating, order } = manifest.track;
		const total = repeating.length;

		// should this randomize the slices -- if a sequence is selected
		// then this won't work
		const randomize = /random(ize)?/i.test(order);
		const sequence = isArray(order) ? order : null;
		

		// create the segment
		async function createSegment(id) {
			
		}

		// create each segment
		for (const id of sequence) {
			const previous = segments[segments.length - 1]

			// always create the first segment of a type
			let bounded = cache[id]?.[0]
			if (!bounded) {
				bounded = await this._createSegment(id)
				// bounded = await this._createSegment(id)
				// bounded = await this._createSegment(id)
			}
			
			// // there's two in a row
			// if (cache[id]?.length === 1 && previous?.id === id) {
			// 	counts[id] = 2
			// 	await createSegment(id)
			// }

			// // there's two in a row
			// if (cache[id]?.length === 2 && previous?.id === id) {
			// 	counts[id] = 3
			// 	await createSegment(id)
			// }

			// add to the view
			segments.push({
				x: (previous?.x + previous?.width) || 0,
				width: bounded.bounds.width,
				// width: bounded.boundedWidth,
				id
			})
		}

		// console.log('has', counts)
		


		// // create each segment twice, but don't add it right away
		// for (let i = 0; i < repeating.length; i++) {

		// 	// ignore unused segments
		// 	if (!sequence?.includes(i)) {
		// 		continue
		// 	}

			

		// }

		

		console.log('is using', segments, cache)


		// set the default positions for each tile
		this._updateSegmentPositions();
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
		const segment = this.startingLine = new Segment(this, comp);

		// add the overlay section
		overlay.addChild(segment.top);
		ground.addChild(segment.bottom);

		// TODO: calculate this value
		this._cycleTrack(-1500);
		
		// fit the starting block to the middle of the screen
		this._fitBlockToTrackPosition(segment, 0);

		// distance to move back
		const shiftBy = (view.width / 2) - (view.width * this.view.getStartingLinePosition());

		this._cycleToSegmentLine(segment, shiftBy);
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
		this.finishLine = new Segment(this, comp);
	}

	async _createSpectatorWatermark(options) {
		if (!options.spectator) {
			return
		}

		const { view } = this;
		
		// request the assets
		const [watermarkAsset, followAsset] = await Promise.all([
			view.animator.create('extras/spectator_watermark'),
			view.animator.create('extras/spectator_follow')
		])

		// make containers
		const watermark = new PIXI.ResponsiveContainer();
		watermark.addChild(watermarkAsset);
		
		// const follow = new PIXI.ResponsiveContainer();
		// follow.addChild(followAsset);
		
		// load the spectator assets
		this.spectator = { watermark, follow: followAsset };
	}

	// creates a background, if needed
	async _createEffect() {
		const { view, manifest, path } = this;
		const { effect } = manifest;

		// check if present
		if (!effect) return;

		// check for any scripts that need to run
		// TODO: maybe add more support, but for now this is fine)
		const Handler = effect.script === 'rain' ? RainEffect
			: effect.script === 'leaves' ? LeavesEffect
			: null;

		const handler = Handler ? new Handler(view, this, view.animator) : null;

		// initialization
		if (handler) {
			await handler.init(view, this, view.animator);
		}

		// check for a composition
		if (isArray(effect.compose)) {
			this.effect = await view.animator.compose(effect, path, manifest);
			this.effect.zIndex = effect.z || 0;
			this.applyEffect();
		}

		// setup
		if (handler) {
			await handler.setup(view, this, view.animator);
		}

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
			this.foreground = new PIXI.ResponsiveContainer();
			this.foreground.addChild(layer);
			this.foreground.relativeX = 0.5;
			this.foreground.relativeY = this.relativeY;
		}
	}

	// TODO: optimize this, if possible
	async applyScripts() {
		for (const container of [this.overlay, this.ground /*, this.foreground, this.background */]) {
			const objs = findDisplayObjectsOfRole(container, 'script');
			for (const obj of objs) {
				const [ name, args ] = parseScriptArgs(obj.config?.script);
				const handler = await loadScript(name, args, obj, this.view, this.view.animator)
				if (handler) {
					this.scripts.push(handler);
				}
			}
		}
	}

	applyEffect = () => {
		if (!this.effect) {
			return;
		}

		if (this.effect.zIndex < 0) { 
			this.ground.addChild(this.effect);
		}
		else {
			this.overlay.addChild(this.effect);
		}
	}

	stopAmbience = () => this.ambience?.current?.stop()

	// changes the playing ambience
	setAmbience = (type, options = { }) => {
		const { ambience } = this;
		if (!ambience) {
			ambience.current = createFakeSound();
			return;
		}

		// get the current audio
		const playing = ambience.current || createFakeSound();
		
		// start the next audio
		if (type === 'start') {
			ambience.current = ambience.pre || ambience.default;
		}
		// currently racing
		else if (type === 'race') {
			ambience.current = ambience.active || ambience.racing || ambience.default;
		}
		// currently racing
		else if (type === 'victory') {
			ambience.current = ambience.victory || ambience.default;
		}
		// currently racing
		else if (type === 'finish') {
			ambience.current = ambience.defeat || ambience.finish || ambience.default;
		}

		// ensure there's an object
		if (!ambience.current) {
			ambience.current = createFakeSound();
		}

		// start the new audio
		if (playing !== ambience.current) {
			playing?.stop();
			ambience.current?.start();
		}
	}

	// handles updating scripted components, if any
	updateScripts = (state, event) => {
		for (const script of this.scripts) {
			script.update(state);
		}
	}

	// positional update 
	update = state => {

		// cap the maximum scroll speed
		const distance = Math.max(
			(state.speed * -TRACK_MAXIMUM_SCROLL_SPEED),
			-TRACK_MAXIMUM_TRAVEL_DISTANCE
		);

		this._cycleTrack(distance);
	}

	/** activates the finish line view */
	showFinishLine = () => {
		const { finishLine, overlay, ground, view } = this;

		// move the effect over, if needed
		if (this.effect) {
			this.effect.parent.removeChild(this.effect);
		}
		
		// just in case (in testing)
		this.removeStartingLine();

		// reset all
		this._updateSegmentPositions();
		
		// TODO: calculate this value
		this._cycleTrack(-2500);
		
		// fit the starting block to the middle of the screen
		this._fitBlockToTrackPosition(finishLine, 0);
		
		// shift to the start of the area
		this._cycleToSegmentLine(null, view.width * 0.5);

		// add the overlay section
		// remove everything
		overlay.removeChildren();
		ground.removeChildren();
		overlay.addChild(finishLine.top);
		ground.addChild(finishLine.bottom);

		// restore the effects, if any
		this.applyEffect();

		// show the finish
		finishLine.visible = true;
	}

	/** removes the starting line block */
	removeStartingLine = () => {
		const { startingLine } = this;
		if (!startingLine) return;

		// clean up
		startingLine.visible = false;
		// startingLine.dispose();
		this.startingLine = undefined;
	}

	// cycles the track to align the segments "line" role to a
	// preferred position
	_cycleToSegmentLine = (segment, distance) => {
		const { view } = this;
		
		// HACKY: this needs to determine the distance of the segment left
		// edge in relationship to a preferred percentage of the screen width
		// so it requires calculating against the scaled value of the stage
		// consider a better approach
		let shift = distance / view.view.scaleX;

		// also align to the line
		if (segment) {
			const line = getBoundsForRole(segment.bottom, 'line');
			if (line) shift += line.left;
		}

		// cycle to align to the preferred position
		this._cycleTrack(-shift);
	}


	// assigns the track scroll value
	// used in development
	setTrackPosition(value) {
		const diff = value - this.trackPosition;
		this._cycleTrack(diff);
	}

	get offscreen() {
		return (this.view.width / this.view.view.scaleX) * -0.5
	}


	// reset the starting positions for the repeating tiles
	_updateSegmentPositions = async () => {
		const { segments, segmentCache: cache, offscreen } = this;
		const right = offscreen * -1.25

		const counts = { }

		const { length: totalSegments } = segments
		for (let i = 0; i < totalSegments; i++) {
			let segment = segments[i]
			
			// no need to draw
			if (segment.x > right) {
				continue;
			}


			const index = counts[segment.id] || 0
			let block = cache[segment.id][index]

			if (!block) {
				block = await this._createSegment(segment.id)
				// block = cache[segment.id][index]
			}

			if (!block) {
				continue
			}

			// if (!segment) {
			// 	// segment = await createSegment(segment)
			// }

			// if (counts[segment.id] >= this.segmentCounts[segment.id]) {
			// 	continue
			// }

			// if (used[segment.id]) {
			// 	continue
			// }

			
			// const part = this.segmentCache[segment.id][counts[segment.id] || 0]

			block.bottom.x = segment.x
			block.top.x = segment.x
			// block.bottom.y = (segment.id || 0) * 100

			block.bottom.visible = true
			block.top.visible = true
			

			// crease 
			counts[segment.id] = index + 1
		}

		// // return to original positions
		// for (const segment of segments) {
		// 	segment.setX(0);
		// }

		// // stitch each 
		// let width = 0;
		// for (let i = 0; i < segments.length; i++) {
		// 	const segment = segments[i];
		// 	const previous = segments[i - 1];

		// 	// if there's a previous road, stack up next to it
		// 	if (previous) {
		// 		width += Math.floor(previous.bounds.width) - 1;
		// 	}

		// 	// set to the current position
		// 	segment.setX(width);
		// }

		// // set the starting position of each segment which will be
		// // stitched to the next segment, but also offset by half
		// // of the total width so that the road extends the
		// // entire screen
		// const offsetX = width * -0.5;
		// for (const segment of segments) {
		// 	segment.addX(offsetX);
		// 	segment.cull();
		// }
	}

	// changes the location of the repeating track
	_cycleTrack(diff) {
		const { segments, segmentCache: cache, offscreen } = this
		const { length: totalSegments } = segments
		
		// cycle all road segments
		let shift = 0
		for (let i = 0; i < totalSegments; i++) {
			const segment = segments[i];
			segment.x += diff;

			// seems to have gone off screen. It's time to 
			// shift all used blocks
			if ((segment.x + segment.width) < offscreen) {
				shift++;
			}
		}

		// it appears that this needs to cycle over
		for (let i = shift; i-- > 0;) {

			// move this segment to the end
			const adjust = segments[0]
			const last = segments[totalSegments - 1]
			adjust.x = last.x + last.width
			
			// cycle the position of the segment and
			// all rendered blocks in this area
			shiftArray(cache[adjust.id]);
			shiftArray(segments);
		}

		// update the displayed positions
		this._updateSegmentPositions();

		// const { segments, startingLine, finishLine } = this;
		// this.trackPosition += diff;

		// // keep track of segments that need
		// // to also be shifted
		// let reset;
		// let max;

		// // check for off screen
		// const offscreen = (this.view.width / this.view.view.scaleX) * -0.5;

		// // update each segment
		// diff = Math.floor(diff);
		// for (const segment of segments) {

		// 	// apply the diff
		// 	segment.addX(diff);

		// 	// if this has gone off screen, it's time
		// 	// to reset it -- maximum one per frame
		// 	const right = segment.bottom.x + segment.bounds.width;
		// 	if (right < offscreen) {
		// 		if (!reset || segment.bottom.x < reset.bottom.x)
		// 			reset = segment;
		// 	}

		// 	// if this is the farthest segment
		// 	if (!max || segment.bottom.x > max.bottom.x) {
		// 		max = segment;
		// 	}

		// 	// manage visibility
		// 	segment.visible = segment.bottom.x < -offscreen;
		// }

		// // if this tile needs to return to the
		// // beginning of the loop
		// if (reset && max) {
		// 	const shift = Math.floor(max.bottom.x + max.bounds.width) - 1;
		// 	reset.setX(shift);
		// 	reset.visible = false;
		// }

		// // move the starting and ending lines
		// if (startingLine) {
		// 	startingLine.addX(diff);

		// 	// check if time to remove the starting line
		// 	if ((startingLine.bottom.x + startingLine.bounds.width) < offscreen) {
		// 		this.removeStartingLine();
		// 	}
		// }

		// // check for the finish line block
		// if (finishLine && finishLine.visible) {
		// 	finishLine.addX(diff);
		// }

	}

	// tries to fit a block into the view
	_fitBlockToTrackPosition(block, position) {
		const { segments } = this;

		// TODO: if the road is a defined sequence, then we should
		// move all rows so they're sorted by their sequence again
		// this can probably be done by sorting positions first and
		// then copying the final values and setting again

		// make sure to sort before starting since it's
		// possible for the array to not match the
		// visual sequence
		segments.sort(byRightEdge);
		
		// get the inserted block into place
		const bounds = getBoundsForRole(block.bottom, 'base');
		const width = bounds.width;
		block.setX(0);

		// start checking each segment
		const { length: total } = segments;
		for (let i = 0; i < total; i++) {
			const segment = segments[i];

			// if this is past the insertion point, then
			// it's time to divide the segments
			const edge = getRightEdge(segment);
			if (edge > position) {

				// calculate the amount to move by
				const shiftBy = position - edge;

				// nudge left layers back
				for (let j = (i + 1); j--> 0;) {
					segments[j].addX(shiftBy);
				}
				
				// for remaining segments, move them to the right
				for (let j = (i + 1); j < total; j++) {
					segments[j].addX(shiftBy);
					segments[j].addX(width);
				}

				// all finished
				return;
			}

		}

	}

}

// helpers
const getRightEdge = t => t.bottom.x + t.bounds.width;
const byRightEdge = (a, b) => getRightEdge(a) - getRightEdge(b);


const shiftArray = arr => arr.push(arr.shift())