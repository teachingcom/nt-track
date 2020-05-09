import * as PIXI from 'pixi.js';

export default class Treadmill extends PIXI.Container {

	static async create(options) {
		const instance = new Treadmill();

		// TODO: this is limited to only the x-axis for now
		const { totalSegments, onCreateSegment, fitToHeight } = options;
		const { segments } = instance;

		// create each segment
		let maxHeight = 0;
		for (let i = 0; i < totalSegments; i++) {
			const tile = await onCreateSegment(i);

			const base = tile.instances.base.displayObject;

			// set the initial position (offset to left side of screen)
			tile.x = ((i % totalSegments) - (totalSegments / 2)) * base.width;

			// all road slices should be the same, but just
			// make sure to use the tallest one
			maxHeight = Math.max(maxHeight, base.height);

			// track the road segments
			segments.push(tile);
			instance.addChild(tile);
		}

		// then scale the road to match the expected height of the track
		instance.scale.x = instance.scale.y = fitToHeight / maxHeight;
		return instance;
	}

	segments = [ ]

	/** handles shifting a reel in a direction */
	update(options) {
		const { diff, horizontalWrap } = options;
		const { segments } = this;
		
		// only min max need to move
		let min;
		let max;

		// shift the segments
		for (const segment of segments) {
			min = (!min || segment.x < min.x) ? segment : min;
			max = (!max || segment.x > max.x) ? segment : max;
			segment.x += diff;
		}

		// if a road tile leaves the screen on the left, shift
		// it back to the far right. it's actually possible that

		// TODO: improve resize scenario
		// if a screen is resized too quickly, some missing tiles
		// can be visible for a moment
		const width = min.instances.base.displayObject.width;
		const location = min.getBounds();
		if (location.x < horizontalWrap) {
			min.x = max.x + width;
		}

	}

}