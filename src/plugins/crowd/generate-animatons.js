import CrowdAnimator from './crowd-animator';

// This file converts animations into an easier to use
// data format for the game. This entire process should be removed
// in favor of a better animation system later

const DEG_TO_RAD = Math.PI / 180;

// handles parsing animation data in advance to avoid
// doing it for each instance created
export default function generateAnimationFrames({ animations, layers }) {

	// create the animation map
	const data = { };
	const list = [ ];

	// capture the animation sequence
	// TODO: again, all of this is a hack
	const animationNames = [ ];
	const sequence = { };
	let sequencePosition = 0;
	for (const id in animations) animationNames[animations[id][0]] = id;
	for (const name of animationNames)
		if (name) sequence[name] = ++sequencePosition;

	// parse each animation set
	for (const id in animations) {
		list.push(id);

		// track this assembled animation
		const animation = data[id] = { };

		// build out the keyframe animator
		for (const layer of layers) {
			const origin = originToKeyframe(layer.origin);

			// container for the keyframes
			let keyframes;

			// TEMP
			const count = sequence[id];
			
			// create the timings for each animation
			for (const frame of layer.frames) {

				// find the first frame
				if (frame._off === false) count--;
				if (count > 0) continue;
		
				// still trying to find the first
				// frame of animation
				if (!keyframes) {
						
					// this is the default frame, get the props
					// if this is at the beginning, use the 
					// origin data
					const keyframe = frameToKeyframe(frame, origin);
					keyframes = [ keyframe ];
					continue;
				}

				// ran out of frames of animation
				if (!!frame._off) {
					break;
				}

				// save the captured frame
				const keyframe = frameToKeyframe(frame, keyframes[0]);
				keyframes.push(keyframe);
			}

			const isFlipped = !!origin.isFlipped;
			animation[layer.sprite] = { isFlipped, frames: keyframes };
		}

	}

	// create shared animators for each animation type
	const animators = [ ];
	for (const type of list) {

		// calculate the animation time
		const [start, end] = animations[type];
		const time = (end - start) * 100;

		// create three animators at varying times
		for (let i = -1; i < 1; i++) {
			const duration = time + (time * (i * 0.5));
			const animator = new CrowdAnimator(data, type, duration);
			animators.push(animator);
		}
	}

	return { animationData: data, animationList: list, animators };

}


// convert transform data to a keyframe
const originToKeyframe = origin => ({
	rotation: ((origin[4] || 0) + (origin[5] || 0)) * DEG_TO_RAD,
	x: origin[0],
	y: origin[1]
});



// convert frame data to a keyframe
const frameToKeyframe = (frame, origin) => {
	origin.isFlipped = !!(origin.isFlipped || !isNaN(frame.alpha) && frame.alpha);
	delete frame.alpha;
	return {
		rotation: isNaN(frame.rotation) ? origin.rotation : frame.rotation * DEG_TO_RAD,
		x: isNaN(frame.x) ? origin.x : frame.x,
		y: isNaN(frame.y) ? origin.y : frame.y
	}
};