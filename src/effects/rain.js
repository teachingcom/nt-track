import { PIXI } from 'nt-animator';
import { createSurface, interpolate } from '../utils';

const MAX_RAIN_SHIFT_DISTANCE = -800;
const width = 800;
const height = 400;

export default class RainEffect {

	constructor(track, container, animator) {
		this.track = track;
		this.container = container;
		this.animator = animator;
	}

	async init() {
		const { animator, track } = this;
		track.on('race:start', this.increaseRainSpeed);
		track.on('race:finish', this.revertRainSpeed);
		
		// generate some textures
		animator.addTexture('rain_1', makeRainTexture(width, height));
		animator.addTexture('rain_2', makeRainTexture(width, height));
		animator.addTexture('rain_3', makeRainTexture(width, height));
		animator.addTexture('rain_4', makeRainTexture(width, height));
	}

	async setup() { }

	// shift the rain over like it's moving faster
	increaseRainSpeed = () => {
		const { effect } = this.container;
		
		// save the original position;
		effect.__originalX = effect.x;

		// offset a little since the effect should most
		// likey be at 0
		effect.x -= 1;

		// shift it over while racing
		function transition() {
			effect.x *= 1.025;
			
			// limit to max
			if (effect.x > MAX_RAIN_SHIFT_DISTANCE) {
				return requestAnimationFrame(transition);
			}
			
			effect.x = MAX_RAIN_SHIFT_DISTANCE;
		}

		requestAnimationFrame(transition);
	}

	// move back to center
	revertRainSpeed = () => {
		const { effect } = this.container;
		effect.x = effect.__originalX;
	}

}


// function makeLightningTexture(width, height) {
// 	const lightning = createSurface(width, height);
// 	lightning.ctx.fillStyle = 'white';
// 	lightning.ctx.fillRect(0, 0, width, height);
// 	return new PIXI.Texture.from(lightning.el);
// }

function makeRainTexture(width, height, start = 0, stop = Math.PI * 2) {
	const rain = createSurface(width, height);

	rain.ctx.strokeStyle = "white";
	rain.ctx.translate(rain.width / 2, rain.height / 2);

	const hw = width / 2;
	const hh = height / 2;
	// const max = Math.max(hw, hh);

	rain.ctx.fillRect(0, 0, width, height);

	let i = start;
	let x;
	let y;
	while (i < stop) {
		i += Math.random() * 0.1;

		// get the starting point
		const sx = Math.max(-hw, Math.min(hw, Math.cos(i) * width));
		const sy = Math.max(-hh, Math.min(hh, Math.sin(i) * height));

		// require a valid distance
		if (isNaN(x) || Math.abs(x - sx) + Math.abs(y - sy) < 4) {
			x = sx;
			y = sy;
			continue;
		}

		x = sx;
		y = sy;

		// get the center point
		const mx = sx * 0.66;
		const my = sy * 0.66;

		// get the starting point
		const bt = Math.random() * 0.49;
		const et = bt + Math.random() * 0.2;
		const bx = interpolate(sx, mx, bt);
		const by = interpolate(sy, my, bt);
		const ex = interpolate(sx, mx, et);
		const ey = interpolate(sy, my, et);

		rain.ctx.beginPath();
		rain.ctx.globalAlpha = Math.random() * 0.8 + 0.2;
		rain.ctx.moveTo(bx, by);
		rain.ctx.lineTo(ex, ey);
		rain.ctx.stroke();
	}

	return new PIXI.Texture.from(rain.el);
}
