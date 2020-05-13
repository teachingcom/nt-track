// TODO: this file needs to be optimized

import * as PIXI from 'pixi.js';
import { createContext } from "../../utils/graphics";

// pixel array offset values
const RED_OFFSET = 0;
const GREEN_OFFSET = 1;
const BLUE_OFFSET = 2;
const ALPHA_OFFSET = 3;

// sample range for 	
const SHADOW_PADDING = 10;
const SHADOW_SAMPLE_STEP = 2;
const SHADOW_SAMPLE_COUNT = 3;
const SHADOW_SAMPLES_PER_ROW = SHADOW_SAMPLE_COUNT * 2;
const SHADOW_SAMPLE_TOTAL = SHADOW_SAMPLES_PER_ROW * SHADOW_SAMPLES_PER_ROW;

// reusable renderer for assets
const spriteRenderer = new PIXI.Renderer({ transparent: true });

// contexts for creating reused textures
const shadowBuilder = createContext();
const normalMapBuilder = createContext();

// handles generating expensive textures
export default function generateTextures(source, options) {
	const { includeNormalMap = true, includeShadow = false } = options;
	const { width, height } = source;

	// if neither are needed
	if (!(includeNormalMap || includeShadow)) {
		return { };
	}

	// calculate the size to capture
	const padding = SHADOW_PADDING;
	const fullPadding = padding * 2;
	const left = padding;
	const right = width + padding;
	const top = padding;
	const bottom = height + padding;
	const paddedWidth = width + fullPadding;
	const paddedHeight = height + fullPadding;
	const size = paddedWidth * paddedHeight;

	// create target pixel arrays for image data
	const normalMapData = normalMapBuilder.ctx.createImageData(width, height);
	const shadowData = shadowBuilder.ctx.createImageData(paddedWidth, paddedHeight);

	// extract pixels for the existing car
	const pixels = spriteRenderer.plugins.extract.pixels(source);

	// helper function to grab a pixel from a location
	const pixel = (x, y, offset = 0) => {
		x -= offset;
		y -= offset;
		if (x < 0 || x > width || y < 0 || y > height) return 0;
		return pixels[(((y * width) + x) * 4) + 3] || 0;
	};

	// to save time, we generate the normal map and the shadow
	// at the same time - the shadow is generated on a slightly
	// larger area than the car itself (to allow blurring) - the
	// normal map checks for a smaller bounding area within
	for (let i = 0; i < size; i++) {
		const index = i * 4;
		const col = i % paddedWidth;
		const row = 0 | i / paddedWidth;

		// if within range, create a very crude normal map - we can
		// revisit this to make it look better, but this should provide
		// some level of visible lighting effects
		// TODO: this could be way better
		if (includeNormalMap && col >= left && col < right && row >= top && row < bottom) {
			const normalMapCol = col - padding;
			const normalMapRow = row - padding;
			const normalMapIndex = ((normalMapRow * width) + normalMapCol) * 4;

			// calculate r/g based on the x/y positions of the pixel
			const r = 255 * (normalMapCol / width); 
			const g = 255 - (255 * (normalMapRow / height));
			normalMapData.data[normalMapIndex + RED_OFFSET] = r;
			normalMapData.data[normalMapIndex + GREEN_OFFSET] = g;
			normalMapData.data[normalMapIndex + BLUE_OFFSET] = Math.max(0, 255 - r - g);
			normalMapData.data[normalMapIndex + ALPHA_OFFSET] = pixel(normalMapCol, normalMapRow);
		}

		// take a sample of nearby pixels to create the shadow
		// TODO: this can be way better, but the approach
		// is good enough to continue forward - consider creating
		// a compiled javascript function that doesn't use arrays
		if (includeShadow) {
			let sum = 0;
			for (let j = 0; j < SHADOW_SAMPLE_TOTAL; j++) {
				const sampleColumn = col + (((j % SHADOW_SAMPLES_PER_ROW) - SHADOW_SAMPLE_COUNT) * SHADOW_SAMPLE_STEP);
				const sampleRow = row + (((0 | j / SHADOW_SAMPLES_PER_ROW) - SHADOW_SAMPLE_COUNT) * SHADOW_SAMPLE_STEP);
				sum += pixel(sampleColumn, sampleRow);
			}
			
			// save the shadow sample
			shadowData.data[index + ALPHA_OFFSET] = sum / (SHADOW_SAMPLE_TOTAL + 1);
		}
	}

	// finalize the shadow, if any
	let shadow;
	if (includeShadow) {
		const context = createContext();
		context.canvas.width = paddedWidth;
		context.canvas.height = paddedHeight;
		context.ctx.putImageData(shadowData, 0, 0);
		shadow = context.canvas;
	}

	// finalize the normal map, if any
	let normalMap;
	if (includeNormalMap) {
		const context = createContext();
		context.canvas.width = width;
		context.canvas.height = height;
		context.ctx.putImageData(normalMapData, 0, 0);
		normalMap = context.canvas;
	}

	// give back the generated textures
	return { shadow, normalMap };
}
