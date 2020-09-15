import { PIXI, loadImage } from 'nt-animator';

// handles loading a legacy car
export async function createStaticCar(baseUrl, type) {

	// HACK: this is a temporary solution - we want to use
	// large version for cars on the responsive track
	type = type.replace(/small/gi, 'large');

	// try and load the car
	const url = `${baseUrl}/${type}.png`;
	try {
		const img = await loadImage(url);
		const texture = PIXI.Texture.from(img);
		return PIXI.Sprite.from(texture);
	}
	// needs to use a fallback?
	catch (ex) {
		console.error(`Failed to load car ${url}`);
		throw ex;
	}
}
