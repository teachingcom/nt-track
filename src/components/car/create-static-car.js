import * as PIXI from 'pixi.js';
import { loadImage } from 'nt-animator';

// handles loading a legacy car
export async function createStaticCar(baseUrl, type) {
	const url = `${baseUrl}/${type}.png`;
	try {
		const img = await loadImage(url);
		const texture = PIXI.Texture.from(img);
		return PIXI.Sprite.from(texture);
	}
	// needs to use a fallback?
	catch (ex) {
		console.error(`Failed to load ${url}`);
		console.error(ex);
	}
}
