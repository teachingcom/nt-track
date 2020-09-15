import FastConfetti from './generator';

// handles creating a confetti effect instance
export default async function createConfetti(animator, track) {
	const instance = await FastConfetti.create(animator, track);
	instance.start();

	// give back the stage object, if any
	return instance.isDirectDraw ? null : instance.sprite;
}
