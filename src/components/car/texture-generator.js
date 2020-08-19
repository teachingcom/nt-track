// TODO: this file needs to be optimized

import * as PIXI from 'pixi.js';
import { createContext } from "nt-animator";
import { CAR_SHADOW_PADDING, NITRO_BLUR_REALTIVE_SIZE_SCALING, CAR_SHADOW_BLUR } from '../../config';

// reusable renderer for assets
const spriteRenderer = new PIXI.Renderer({ transparent: true });

// create some containers for effects
const blurContainer = (() => {
	const container = new PIXI.Container();
	
	// set blurs
	const blur = new PIXI.filters.BlurFilter();
	blur.quality = 10;
	
	// set adjustments
	const base = new PIXI.filters.ColorMatrixFilter();
	
	// allow hue shifting
	const color = new PIXI.filters.ColorMatrixFilter();
	container.colorFilter = color;
	container.blurFilter = blur;
	container.baseFilter = base;

	// set the filter order
	container.filters = [ base, color, blur ];
	return container;
})();


// create some containers for effects
const shadowContainer = (() => {
	const container = new PIXI.Container();

	// make blurred - only uses a blur filter
	// since there doesn't appear to be a way
	// to make all pixels completely black
	// instead there's a second canvas that does this
	const blur = new PIXI.filters.BlurFilter();
	blur.quality = 100;
	blur.blur = CAR_SHADOW_BLUR;
	container.filters = [ blur ];
	return container;
})();

// contexts for creating reused textures
// const shadowBuilder = createContext();
// const normalMapBuilder = createContext();

// handles generating expensive textures
export default function generateTextures(source, options) {
	const { parent } = source;
	const { includeNitroBlur, includeShadow, isDarkCar, nitroBlurHue = 0 } = options;

	return { 
		shadow: new PIXI.Container(),
		nitroBlur: new PIXI.Container(),
	}

	// get the position of the
	// source in it's container so it
	// can be added back when finished
	let index;
	if (parent) {
		index = parent.getChildIndex(source);
	}

	// create each pregenerated texture
	const nitroBlur = includeNitroBlur && createNitroBlur(source, nitroBlurHue, isDarkCar);
	const shadow = includeShadow && createShadow(source);
	// const normalMap = includeNormalMap && createNormalMap(source);

	// put the child back where it came from, if needed
	if (parent) {
		parent.addChildAt(source, index);
	}

	return { shadow, nitroBlur }
}


// generates a blurred nitro image
function createNitroBlur(source, hue, isDarkCar) {
	blurContainer.addChild(source);
	
	// render a blurred streak for the car when using a nitro
	blurContainer.blurFilter.blurX = 0 | (source.width * NITRO_BLUR_REALTIVE_SIZE_SCALING);

	// match the car
	blurContainer.baseFilter.reset();
	blurContainer.colorFilter.reset();
	blurContainer.colorFilter.hue(hue);
	
	// for dark cars, bump up the brightness
	if (isDarkCar) {
		blurContainer.baseFilter.contrast(500);
		blurContainer.baseFilter.saturate(1, true);
	}
	
	// center into the view
	blurContainer.x = source.width * NITRO_BLUR_REALTIVE_SIZE_SCALING;
	blurContainer.y = source.height / 2;
	
	// render the blur streak
	spriteRenderer.resize(source.width * 2, source.height);
	spriteRenderer.render(blurContainer);

	// give back the result
	const blur = spriteRenderer.plugins.extract.canvas();
	return new PIXI.Sprite.from(blur);
}


// generates a car shadow
function createShadow(source) {
	const width = source.width + CAR_SHADOW_PADDING;
	const height = source.height + CAR_SHADOW_PADDING;
	
	// next, render the car shadow
	shadowContainer.addChild(source);
	
	// center into the view
	shadowContainer.x = width / 2;
	shadowContainer.y = height / 2;
	
	// render the blurred version of the car
	spriteRenderer.resize(width, height);
	spriteRenderer.render(shadowContainer);
	
	// next 'stencil' out the canvas using the blurred car
	const shadowImage = spriteRenderer.plugins.extract.canvas();
	const shadow = createContext();

	// match the size	
	shadow.canvas.width = width;
	shadow.canvas.height = height;

	// draw the car
	shadow.ctx.drawImage(shadowImage, 0, 0);

	// then fill over with black
	shadow.ctx.globalCompositeOperation = 'source-in';
	shadow.ctx.fillStyle = 'black';
	shadow.ctx.fillRect(0, 0, width, height);

	// return the canvas
	return new PIXI.Sprite.from(shadow.canvas);
}




// // pixel array offset values
// const RED_OFFSET = 0;
// const GREEN_OFFSET = 1;
// const BLUE_OFFSET = 2;
// const ALPHA_OFFSET = 3;

// // sample range for 	
// const SHADOW_PADDING = 10;
// const SHADOW_SAMPLE_STEP = 2;
// const SHADOW_SAMPLE_COUNT = 3;
// const SHADOW_SAMPLES_PER_ROW = SHADOW_SAMPLE_COUNT * 2;
// const SHADOW_SAMPLE_TOTAL = SHADOW_SAMPLES_PER_ROW * SHADOW_SAMPLES_PER_ROW;

// const { includeNormalMap = false, includeShadow = false } = options;
// const { width, height } = source;

// // if neither are needed
// if (!(includeNormalMap || includeShadow)) {
// 	return { };
// }

// // calculate the size to capture
// const padding = SHADOW_PADDING;
// const fullPadding = padding * 2;
// const left = padding;
// const right = width + padding;
// const top = padding;
// const bottom = height + padding;
// const paddedWidth = width + fullPadding;
// const paddedHeight = height + fullPadding;
// const size = paddedWidth * paddedHeight;

// // create target pixel arrays for image data
// const normalMapData = normalMapBuilder.ctx.createImageData(width, height);
// const shadowData = shadowBuilder.ctx.createImageData(paddedWidth, paddedHeight);

// // extract pixels for the existing car
// const pixels = spriteRenderer.plugins.extract.pixels(source);

// // helper function to grab a pixel from a location
// const pixel = (x, y, offset = 0) => {
// 	x -= offset;
// 	y -= offset;
// 	if (x < 0 || x > width || y < 0 || y > height) return 0;
// 	return pixels[(((y * width) + x) * 4) + 3] || 0;
// };

// // to save time, we generate the normal map and the shadow
// // at the same time - the shadow is generated on a slightly
// // larger area than the car itself (to allow blurring) - the
// // normal map checks for a smaller bounding area within
// for (let i = 0; i < size; i++) {
// 	const index = i * 4;
// 	const col = i % paddedWidth;
// 	const row = 0 | i / paddedWidth;

// 	// if within range, create a very crude normal map - we can
// 	// revisit this to make it look better, but this should provide
// 	// some level of visible lighting effects
// 	// TODO: this could be way better
// 	if (includeNormalMap && col >= left && col < right && row >= top && row < bottom) {
// 		const normalMapCol = col - padding;
// 		const normalMapRow = row - padding;
// 		const normalMapIndex = ((normalMapRow * width) + normalMapCol) * 4;

// 		// calculate r/g based on the x/y positions of the pixel
// 		const r = 255 * (normalMapCol / width); 
// 		const g = 255 - (255 * (normalMapRow / height));
// 		normalMapData.data[normalMapIndex + RED_OFFSET] = r;
// 		normalMapData.data[normalMapIndex + GREEN_OFFSET] = g;
// 		normalMapData.data[normalMapIndex + BLUE_OFFSET] = Math.max(0, 255 - r - g);
// 		normalMapData.data[normalMapIndex + ALPHA_OFFSET] = pixel(normalMapCol, normalMapRow);
// 	}

// 	// take a sample of nearby pixels to create the shadow
// 	// TODO: this can be way better, but the approach
// 	// is good enough to continue forward - consider creating
// 	// a compiled javascript function that doesn't use arrays
// 	if (includeShadow) {
// 		let sum = 0;
// 		for (let j = 0; j < SHADOW_SAMPLE_TOTAL; j++) {
// 			const sampleColumn = col + (((j % SHADOW_SAMPLES_PER_ROW) - SHADOW_SAMPLE_COUNT) * SHADOW_SAMPLE_STEP);
// 			const sampleRow = row + (((0 | j / SHADOW_SAMPLES_PER_ROW) - SHADOW_SAMPLE_COUNT) * SHADOW_SAMPLE_STEP);
// 			sum += pixel(sampleColumn, sampleRow);
// 		}
		
// 		// save the shadow sample
// 		shadowData.data[index + ALPHA_OFFSET] = sum / (SHADOW_SAMPLE_TOTAL + 1);
// 	}
// }

// // finalize the shadow, if any
// let shadowImage;
// if (includeShadow) {
// 	const context = createContext();
// 	context.canvas.width = paddedWidth;
// 	context.canvas.height = paddedHeight;
// 	context.ctx.putImageData(shadowData, 0, 0);
// 	shadowImage = context.canvas;
// }

// // finalize the normal map, if any
// let normalMapImage;
// if (includeNormalMap) {
// 	const context = createContext();
// 	context.canvas.width = width;
// 	context.canvas.height = height;
// 	context.ctx.putImageData(normalMapData, 0, 0);
// 	normalMapImage = context.canvas;
// }

// // give back the generated textures
// return { shadowImage, normalMapImage };