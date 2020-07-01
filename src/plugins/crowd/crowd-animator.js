import { keyframes, easing } from 'popmotion';

// handles creating a shared animator for crowd keyframe animations
export default class CrowdAnimator {

	// creates a new crowd animator
	constructor(animations, type, duration) {
		const layers = animations[type];
		const elapsed = 0 | (duration * Math.random());

		// create a keyframe animator for each
		// of the animations for this type
		for (const id in layers) {
			this.layers[id] = layers[id];

			// create a new reference for parts
			const parts = [ ];
			this.refs[id] = parts;

			// get the frames, if any
			const { frames } = layers[id];

			// create the animator
			if (frames?.length > 1)
				this.animators[id] = keyframes({
					loop: Infinity,
					ease: easing.linear,
					duration,
					elapsed,
					values: frames
				})
				// start the animation
				.start({
					update: v => {
						for (let i = parts.length; i-- > 0;)
							updatePart(parts[i], v);
					}
				});
		}


	}

	// references to all shared pixi objects
	refs = { }

	// references to all layers to animate
	layers = { }

	// individual keyframe animators
	animators = { }

	// removes, if existing
	unregister(key, obj) {
		const parts = this.refs[key];
		const index = parts?.indexOf(obj);
		if (index >= 0) parts.splice(index, 1);
	}

	// registers a layer to receive updates
	register(key, obj) {

		// set starting position
		const { isFlipped, frames } = this.layers[key];
		const [ origin ] = frames;
		obj.rotation = origin.rotation;
		obj.x = origin.x;
		obj.y = origin.y;

		if (isFlipped)
			obj.scale.x *= -1;

		// check for an animator
		const parts = this.refs[key];
		if (parts) parts.push(obj);
	}

}

// shared update function
function updatePart(layer, v) {
	layer.rotation = v.rotation;
	layer.x = v.x;
	layer.y = v.y;
}