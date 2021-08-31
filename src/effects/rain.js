import { PIXI } from 'nt-animator';
import { createSurface, interpolate } from '../utils';

export async function init(track, animator) {
	const width = 800;
	const height = 400;

	// generate some textures
	animator.addTexture('rain_1', makeRainTexture(width, height));
	animator.addTexture('rain_2', makeRainTexture(width, height));
	animator.addTexture('rain_3', makeRainTexture(width, height));
	animator.addTexture('rain_4', makeRainTexture(width, height));
	animator.addTexture('lightning', makeLightningTexture(width, height));
}

function makeLightningTexture(width, height) {
	const lightning = createSurface(width, height);
	lightning.ctx.fillStyle = 'white';
	lightning.ctx.fillRect(0, 0, width, height);
	return new PIXI.Texture.from(lightning.el);
}

function makeRainTexture(width, height) {
	const rain = createSurface(width, height);

	// 
	rain.ctx.strokeStyle = "white";
	rain.ctx.translate(rain.width / 2, rain.height / 2);

	const hw = width / 2;
	const hh = height / 2;
	const max = Math.max(hw, hh);

	let i = 0;
	let x;
	let y;
	while (i < Math.PI * 2) {
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
		const bt = Math.random() * 0.4;
		const et = bt + Math.random() * 0.6;
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
