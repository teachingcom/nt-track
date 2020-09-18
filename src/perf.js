export const LOW = 0;
export const MEDIUM = 1;
export const HIGH = 2;

// highly experimental
const LOW_SCORE = 340000;
const MEDIUM_SCORE = 545000;

// peforms a crude test to determine performance
// potential for rendering
export default function getPerformanceScore() {
	const stopAt = (+new Date) + 250;

	// determine how many cycles can be done in
	// a quarter of a second
	let cycles = 0;
	while (true) {
		cycles++;
		if (+new Date > stopAt) break;
	}

	// return a simple score to determine which
	// quality settings to use
	return cycles < LOW_SCORE ? LOW
		: cycles < MEDIUM_SCORE ? MEDIUM
		: HIGH;
}