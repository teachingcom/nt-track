
import { keyframes, easing } from 'popmotion';
import { noop } from '../utils';
import Animation from './base';
import { NITRO_ACTIVATED_TRAIL_OPACITY } from '../config';

const DURATION = 2000;
const EASINGS = [ easing.easeOut, easing.linear, easing.bounceOut ]
const TIMINGS = [ 0, 0.115, 0.75, 1 ];

/** standard animation for a car performing a skip problem nitro */
export default class ActivateNitroAnimation extends Animation {

	constructor({ car, shadow, nitro, track, trail, nitroBlur }) {
		super();

		this.car = car;
		this.nitro = nitro;
		this.track = track;
		this.shadow = shadow;
		this.trail = trail;
		this.nitroBlur = nitroBlur;
	}

	/** handles activating the animation effect */
	play({ update = noop, complete = noop }) {
		const { car, trail, shadow, nitro, track } = this;
		const hasNitro = this.hasNitro = !!nitro;
		this.hasTrail = !!trail;

		// checking for special nitro rules
		const nitroEffectStartingAlpha = hasNitro && nitro.shouldFadeIn ? 0 : 1;
		const nitroEffectEndingAlpha = hasNitro && nitro.shouldFadeOut ? 0 : 1;

		// create all default property value
		const origin = {
			
			// car positions
			carOffsetX: 0,
			carOffsetY: 0,
			carSkewY: 0,
			carSkewX: 0,
			carRotation: 0,
			carScaleX: car.scale.x,
			carScaleY: car.scale.y,

			// beneath car shadow
			shadowScaleX: shadow.scale.x,
			shadowX: shadow.x,
			
			// trail opacity
			trailAlpha: 1,

			// nitro blur
			nitroBlurAlpha: 0,
			nitroBlurScaleX: 0,
			nitroBlurScaleY: 1,
			
			// the animated nitro
			// this is assigned further down where the keyframes are setup
			// nitroEffectAlpha: vvvvv
		};

		// save the destination values
		const destination = {

			// car positions
			// skewed at front to appear lifted
			carOffsetX: -15,
			carOffsetY: -5,
			carSkewY: -0.085,
			carSkewX: 0.05,
			carScaleX: origin.carScaleX - 0.01,
			carScaleY: origin.carScaleX + 0.02,
			carRotation: 0.05,

			// beneath car shadow
			// scaled backwards slightly
			shadowScaleX: origin.shadowScaleX - 0.01,
			shadowX: origin.shadowX - 5,
			
			// trail opacity
			// slightly faded
			trailAlpha: NITRO_ACTIVATED_TRAIL_OPACITY,

			// nitro blur
			// visible and stretched out
			nitroBlurAlpha: 0.4,
			nitroBlurScaleX: 1.1,
			nitroBlurScaleY: 1,
			
			// the animated nitro
			// full animation visibility
			nitroEffectAlpha: 1
		};


		// activate the nitro animation, if any
		if (hasNitro) {
			nitro.activate();
		}

		// activate the sequence
		const sequence = keyframes({
			duration: DURATION,
			times: TIMINGS,
			easings: EASINGS,
			values: [
				Object.assign({ }, origin, {
					nitroEffectAlpha: nitroEffectStartingAlpha,
				}),
				destination,
				Object.assign({ }, destination, {
					nitroBlurScaleX: destination.nitroBlurScaleX * 1.5,
					nitroBlurScaleY: 1,
					nitroBlurAlpha: 0.1,
				}),
				Object.assign({ }, origin, {
					nitroEffectAlpha: nitroEffectEndingAlpha
				}),
			]
		});

		// begin the animation sequence
		const playback = sequence.start({
			
			// render the animation
			update: props => {
				this.update(props);
				update(props);
			},

			// incase, if interested
			complete
		});

		// save the controllers
		this.sequence = sequence;
		this.playback = playback;
	}

	/** handles updating values per frame */
	update = props => {
		const { car, trail, hasTrail, shadow, nitro, hasNitro, nitroBlur } = this;
		
		// update the car
		car.x = props.carOffsetX;
		car.skew.y = props.carSkewY;
		car.skew.x = props.carSkewX;
		car.scale.x = props.carScaleX;
		car.scale.y = props.carScaleY;
		
		// update the shadow
		shadow.scale.x = props.shadowScaleX;
		shadow.x = props.shadowX;

		// update the trail, if any
		if (hasTrail) {
			trail.assign({ alpha: props.trailAlpha });
		}

		// update the nitro, if any
		if (hasNitro) {
			nitro.assign({ alpha: props.nitroEffectAlpha })
		}

		// update the default nitro streak
		nitroBlur.alpha = props.nitroBlurAlpha;
		nitroBlur.scale.x = props.nitroBlurScaleX;
		nitroBlur.scale.y = props.nitroBlurScaleY;
	}

	/** request to stop the animation early */
	stop()  {
		super.stop();

		// cancel nitros and sounds
		const { nitro, hasNitro } = this;
		if (hasNitro) {

			// TODO
			// nitro.deactivateNitro();
		}

		// stop the animation
		this.sequence.stop();
	}

}