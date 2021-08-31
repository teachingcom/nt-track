import { PIXI } from 'nt-animator';
import { createSurface, interpolate } from '../utils';


let LEAF_1
let LEAF_2
let LEAF_3

export async function init(track, animator) {
	const width = 600;
	const height = 1000;

	LEAF_1 = await createLeaf('iVBORw0KGgoAAAANSUhEUgAAABkAAAAXCAMAAADJPRQhAAAADFBMVEXCXwnIZQnZeAz6nRBH53IJAAAABHRSTlMCVar95AmYiAAAAF9JREFUeNqV0kEOxCAMxdDY//53rmhHSANBar3Mi4AF9TJOc+3XNak1657vgpCRqxhzkl9AFZ2YaDaZcZQ4jbQkmLUhQHMa/T3y4W0+VSNFFfwJPrImxZQt9CTD3n2QC7v2AnVdiqWiAAAAAElFTkSuQmCC');
	LEAF_2 = await createLeaf('iVBORw0KGgoAAAANSUhEUgAAABkAAAAXCAMAAADJPRQhAAAADFBMVEXEhxjNlRzfsCH62ynxcoHCAAAABHRSTlMEdr7+TM65AgAAAF9JREFUeNqN0VEKgEAMA9Gd6f3vrK6wusSC+eyDEOj4Gbq7dlApzPuZAKGuGFI6JRbM85SL+JQqMWX5I+wijayNQEhxw6C6OqOrkZEior6EfdImuGQL3I12D30kcfzKAZY2AlF5aMSDAAAAAElFTkSuQmCC');
	LEAF_3 = await createLeaf('iVBORw0KGgoAAAANSUhEUgAAABkAAAAXCAMAAADJPRQhAAAADFBMVEXCTAnIUQnZYAz6fRB/mqLrAAAABHRSTlMCVar95AmYiAAAAF9JREFUeNqV0kEKwzAMBVHN/PvfubgphkYyJLPUE7YXrodxmuu8rkkbW995F4WsbBJzkl9AFZOYaJrsOErcRkYSzL0lwHAa8z3y4m1e1SBFFfwJXnJPii0t9CTLnn2QD73FAnYAzYazAAAAAElFTkSuQmCC');

	// generate some textures
	animator.addTexture('leaves_1', makeLeavesTexture(width, height));
	animator.addTexture('leaves_2', makeLeavesTexture(width, height));
	animator.addTexture('leaves_3', makeLeavesTexture(width, height));
	animator.addTexture('leaves_4', makeLeavesTexture(width, height));
}

function createLeaf(src) {
	return new Promise(resolve => {
		const img = document.createElement('img');
		img.src = `data:image/png;base64,${src}`;
		img.onload = () => resolve(img);
	})
}

function makeLeavesTexture(width, height) {


	const shadowSize = 30;
	const halfShadowSize = shadowSize / 2;
	const shadow = createSurface(shadowSize, shadowSize);
	shadow.ctx.fillStyle = shadow.ctx.createRadialGradient(halfShadowSize, halfShadowSize, 0, halfShadowSize, halfShadowSize, halfShadowSize);
	shadow.ctx.fillStyle.addColorStop(0, 'rgba(0,0,0,1)');
	shadow.ctx.fillStyle.addColorStop(1, 'rgba(0,0,0,0)');
	shadow.ctx.fillRect(0, 0, shadowSize, shadowSize);

	const leaves = createSurface(width, height);
	
	let x = 0;
	let y = 0;

	let prevX = -100;
	let prevY = -100;

	const images = [LEAF_1, LEAF_2, LEAF_3]
	const density = 0.6

	while (x < width) {
		x += Math.random() * width * density;
		y = 0;

		while (y < height) {
			y += Math.random() * height * density;

			// require a minimum distance
			console.log(Math.abs(Math.abs(x - prevX) + Math.abs(y - prevY)))
			if (Math.abs(Math.abs(x - prevX) + Math.abs(y - prevY)) < 50) {
				continue
			}


			const scale = (Math.random() * 0.5) + 0.5
			leaves.ctx.translate(x, y);

			const offset = 2 + (Math.random() * 10)
			leaves.ctx.globalAlpha = 0.1 + ((1 - (offset / 12)) * 0.1)
			leaves.ctx.scale(scale, scale);
			leaves.ctx.drawImage(shadow.el, (offset / scale) + -halfShadowSize, -halfShadowSize)
			leaves.ctx.globalAlpha = 1
			
			leaves.ctx.rotate(Math.random() * (Math.PI * 2));
			
			const image = images[(0 | x + y) % 3];
			leaves.ctx.drawImage(image, 0, 0);

			leaves.ctx.setTransform(1, 0, 0, 1, 0, 0);
			// leaves.ctx.fillRect(x, y, 4, 4);

			prevX = x;
			prevY = y;
		}

	}

	document.body.appendChild(leaves.el)

	return new PIXI.Texture.from(leaves.el);

	// // 
	// rain.ctx.strokeStyle = "white";
	// rain.ctx.translate(rain.width / 2, rain.height / 2);

	// const hw = width / 2;
	// const hh = height / 2;
	// const max = Math.max(hw, hh);

	// let i = 0;
	// let x;
	// let y;
	// while (i < Math.PI * 2) {
	// 	i += Math.random() * 0.1;

	// 	// get the starting point
	// 	const sx = Math.max(-hw, Math.min(hw, Math.cos(i) * width));
	// 	const sy = Math.max(-hh, Math.min(hh, Math.sin(i) * height));

	// 	// require a valid distance
	// 	if (isNaN(x) || Math.abs(x - sx) + Math.abs(y - sy) < 4) {
	// 		x = sx;
	// 		y = sy;
	// 		continue;
	// 	}

	// 	x = sx;
	// 	y = sy;

	// 	// get the center point
	// 	const mx = sx * 0.66;
	// 	const my = sy * 0.66;

	// 	// get the starting point
	// 	const bt = Math.random() * 0.4;
	// 	const et = bt + Math.random() * 0.6;
	// 	const bx = interpolate(sx, mx, bt);
	// 	const by = interpolate(sy, my, bt);
	// 	const ex = interpolate(sx, mx, et);
	// 	const ey = interpolate(sy, my, et);

	// 	rain.ctx.beginPath();
	// 	rain.ctx.globalAlpha = Math.random() * 0.8 + 0.2;
	// 	rain.ctx.moveTo(bx, by);
	// 	rain.ctx.lineTo(ex, ey);
	// 	rain.ctx.stroke();
	// }

	
}
