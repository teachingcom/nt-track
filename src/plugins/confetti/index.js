
import { noop } from '../../utils';
import FastConfetti from './generator';

// handles creating a confetti effect instance
export default async function createConfetti(animator, controller, path, layer, data) {
	const { track } = layer.params;
	const instance = await FastConfetti.create(animator, track);
	const { dispose } = instance;


		// not all properties are supported
		const { props = { } } = data;
		if ('x' in props)
			instance.sprite.x = animator.evaluateExpression(props.x);

		if ('y' in props)
			instance.sprite.y = animator.evaluateExpression(props.y);
	
	// return for use
	return [{ displayObject: instance.sprite, update: noop, dispose }]
}
