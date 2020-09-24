export const MINIMAL = 0;
export const LOW = 1;
export const MEDIUM = 2;
export const HIGH = 3;

// highly experimental
const MINIMAL_SCORE = 80000;
const LOW_SCORE = 150000;
const MEDIUM_SCORE = 400000;

// peforms a crude test to determine performance
// potential for rendering
export default function getPerformanceScore() {
	const stopAt = (+new Date) + 250;

	// drawing surface
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	ctx.fillStyle = 'white';
	const { width, height } = canvas;

	// determine how many cycles can be done in
	// a quarter of a second
	let cycles = 0;
	while (true) {
		cycles++;
		const x = 0 | width * Math.random();
		const y = 0 | height * Math.random();
		ctx.fillRect(x, y, 1, 1);
		if (+new Date > stopAt) break;
	}

	// return a simple score to determine which
	// quality settings to use
	console.log('cycles:', cycles);
	return cycles < MINIMAL_SCORE ? MINIMAL
		: cycles < LOW_SCORE ? LOW
		: cycles < MEDIUM_SCORE ? MEDIUM
		: HIGH;
}