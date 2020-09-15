
import { PIXI, getBoundsForRole } from 'nt-animator';

export default class Treadmill extends PIXI.Container {

	static async create(options) {
		const instance = new Treadmill();

		// TODO: this is limited to only the x-axis for now
		const { totalSegments, onCreateSegment, fitToHeight } = options;
		const { segments } = instance;

		// create each segment
		let maxHeight = 0;
		let totalWidth = 0;
		for (let i = 0; i < totalSegments; i++) {
			const tile = await onCreateSegment(i);
			tile.bounds = getBoundsForRole(tile, 'base');

			// set the initial position
			// TODO: ideally we position in their correct locations as we go, but
			// it's possible that the bounds of one group to the next are different
			// so for now just do this in two passes
			tile.x = i * tile.bounds.width;
			totalWidth += tile.bounds.width;

			// all road slices should be the same, but just
			// make sure to use the tallest one
			maxHeight = Math.max(maxHeight, tile.bounds.height);

			// track the road segments
			segments.push(tile);
			instance.addChild(tile);
		}

		// shift all tiles backwards to center the view
		for (let i = 0; i < totalSegments; i++) {
			segments[i].x -= totalWidth / 2;
		}

		// then scale the road to match the expected height of the track
		instance.scale.x = instance.scale.y = fitToHeight / maxHeight;
		return instance;
	}

	// collection of all segments
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

		// wrap at the edge of the screen *plus* double the size of the container
		// for the most part, this isn't required but it does help eliminate
		// the segments from wrapping too early when the view is super small
		// but also super tall - this is an edge case
		// NOTE: the screen should never be at the size being mentioned, but
		// it's worth fixing
		const position = min.getBounds();
		const wrapAt = horizontalWrap - (min.bounds.width * 2);
		if (position.x < wrapAt) {
			min.x = max.x + min.bounds.width;
		}

	}

	/** creates a gap in the road segment matching the bounds
	 * provided. This is used to display the start/finish segments
	 */
	fitTo(block, position) {

		// TODO: if the road is a defined sequence, then we should
		// move all rows so they're sorted by their sequence again
		// this can probably be done by sorting positions first and
		// then copying the final values and setting again

		const { segments } = this;
		const total = segments.length;

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
						shiftBack = target.bounds.right - block.bounds.left;
					}

					// move backwards
					target.x -= shiftBack;
				}

				// shift later layers forward
				let shiftForward;
				for (let j = i; j < total; j++) {
					const target = segments[j];

					// if not set, figure out the amount to shift the layer by
					// TODO: verify this works in more scenarios
					if (isNaN(shiftForward)) {
						shiftForward = (block.bounds.right - target.bounds.left) - target.bounds.width;
					}

					// move backwards
					target.x += shiftForward;
				}
				
				// no need to continue searching
				break;
			}
		
		}

	}

}