
/** convert a numeric value to rgb */
export function toRGB(color, scale = true) {
	let r = ((color >> 16) % 256);
	let g = ((color >> 8) % 256);
	let b = ((color >> 0) % 256);

	if (scale) {
		r /= 256;
		g /= 256;
		b /= 256;
	}

	return [r, g, b];
}