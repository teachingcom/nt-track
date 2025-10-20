import { animate } from 'nt-animator';

// handles creating a shared animator for crowd keyframe animations
export default class CrowdAnimator {

	// creates a new crowd animator
	constructor(animations, type, duration) {
		const layers = animations[type];

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
				this.animators[id] = animate({
					loop: true,
					ease: 'linear',
					duration: 1000,
					values: frames,
					autoplay: false,
				});
		}

	}

	// move to a point
	seek = step => {
		for (const id in this.animators) {

			// move to the correct point
			this.animators[id].animation.seek(step);

			// update each part
			const parts = this.refs[id];
			for (let i = parts.length; i-- > 0;)
				// HACK: this is a very unfortunate way to access this data
				updatePart(parts[i], this.animators[id].animation.animatables[0].target);
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
	register(key, obj, animate) {

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