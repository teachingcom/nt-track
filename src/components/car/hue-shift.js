import { PIXI } from 'nt-animator';
import { createWorker, getSprites } from "../../utils";


/** performs a hue shift on a car */
export default async function hueShift(car, hue) {

	// make sure there's a hue
	if (!hue) return;
	
	// find all sprites
	const sprites = getSprites(car);
	if (!sprites.length) return;
	
	// find the base texture
	let { texture } = sprites[0];
	let safety = 10;
	while (texture.baseTexture && --safety > 0)
		texture = texture.baseTexture;

	// create a replacement canvas for the hue shift
	const { width, height } = texture.resource;
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');

	// redraw the texture
	canvas.width = width;
	canvas.height = height;
	ctx.drawImage(texture.resource.source, 0, 0);

	// get the pixels to use
	const pixels = ctx.getImageData(0, 0, width, height);

	// request the hue shift
	return new Promise(resolve => {

		// perform the work async
		const worker = createWorker(HSLShiftWorker);
		worker.postMessage({ hue, pixels: pixels.data }, [ pixels.data.buffer ]);
		
		// wait for the finished result
		worker.onmessage = msg => {
			
			// replace the canvas with the shifted texture
			const replacement = ctx.createImageData(width, height)
			replacement.data.set(msg.data.updated);
			ctx.putImageData(replacement, 0, 0);

			// create thw new texture
			const texture = PIXI.Texture.from(canvas);

			// HACK?: PIXI would throw errors when using the
			// canvas renderer trying to find the texxture
			// by calling a missing function. Providing the canvas
			// to the replacement texture solves the problem
			texture.getDrawableSource = () => canvas;

			// console.log(sprites);
			// now, replace each sprite with the
			// updated texture
			for (const sprite of sprites) {
				sprite.texture = sprite.texture.clone();
				sprite.texture.baseTexture = texture;
				sprite.texture.update();
				
				// animated sprites
				if (sprite.textures) {
					for (let i = sprite.textures.length; i-- > 0;) {
						sprite.textures[i] = sprite.textures[i].clone();
						sprite.textures[i].baseTexture = texture;
						sprite.textures[i].update();
					}
				}
			}

			// all finished 
			resolve();
		};


		// don't crash for this
		worker.onerror = () => {
			console.warn('Failed to perform hue shift');
			resolve();
		};

	});

}


// performs a hue shift in a worker thread
function HSLShiftWorker() {

	// waits for incoming messages
	this.onmessage = function (msg) {
		const { pixels, hue } = msg.data;
		const total = pixels.length;

		// perform the conversion for each
		for (let i = 0; i < total; i += 4) {
			let r = pixels[i] / 255;
			let g = pixels[i + 1] / 255;
			let b = pixels[i + 2] / 255;
		
			// Find greatest and smallest channel values
			let cmin = Math.min(r,g,b),
					cmax = Math.max(r,g,b),
					delta = cmax - cmin,
					h = 0,
					s = 0,
					l = 0;
		
			// Calculate hue
			// No difference
			if (delta === 0)
				h = 0;
			// Red is max
			else if (cmax === r)
				h = ((g - b) / delta) % 6;
			// Green is max
			else if (cmax === g)
				h = (b - r) / delta + 2;
			// Blue is max
			else
				h = (r - g) / delta + 4;
		
			h = Math.round(h * 60);
		
			h += hue;
				
			// Make negative hues positive behind 360°
			if (h < 0) h += 360;
			h %= 360;
		
			// Calculate lightness
			l = (cmax + cmin) / 2;
		
			// Calculate saturation
			s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
		
			let c = (1 - Math.abs(2 * l - 1)) * s,
					x = c * (1 - Math.abs((h / 60) % 2 - 1)),
					m = l - c/2;
		
			if (0 <= h && h < 60) {
				r = c; g = x; b = 0;
			} else if (60 <= h && h < 120) {
				r = x; g = c; b = 0;
			} else if (120 <= h && h < 180) {
				r = 0; g = c; b = x;
			} else if (180 <= h && h < 240) {
				r = 0; g = x; b = c;
			} else if (240 <= h && h < 300) {
				r = x; g = 0; b = c;
			} else if (300 <= h && h < 360) {
				r = c; g = 0; b = x;
			}
		
			r = Math.round((r + m) * 255);
			g = Math.round((g + m) * 255);
			b = Math.round((b + m) * 255);
		
			// save the change
			pixels[i] = r;
			pixels[i + 1] = g;
			pixels[i + 2] = b;
		}

		// notify this is done
		this.postMessage({ updated: pixels }, [ pixels.buffer ])
	}

}


function getRootTexture(sprite) {

	// find the base texture
	let { texture } = sprite;
	let safety = 10;
	let previous = texture;

	while (texture.baseTexture && --safety > 0) {
		previous = texture;
		texture = texture.baseTexture;
	}

	return previous;
	
}