import FastConfetti from './generator';

// handles creating a confetti effect instance
export default async function createConfetti(animator, track) {
	const instance = await FastConfetti.create(animator, track);
	return instance;
}
