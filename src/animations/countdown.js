import Animation from "./base";
import { PIXI as AnimatorPIXI, findDisplayObjectsOfRole, animate } from "nt-animator";
import { VOLUME_COUNTDOWN_ANNOUNCER, VOLUME_START_ACCELERATION } from "../audio/volume";
import * as audio from '../audio';

export default class CountdownAnimation extends Animation {

	constructor({ track, stage, animator }) {
		super();

		// save references
		this.track = track;
		this.animator = animator;
		this.stage = stage;
	}

	async init() {
		const { animator } = this;

		// load resources
		await animator.getSpritesheet('extras/countdown');
		
		// save references
		const countdown = await animator.create('extras/countdown');
		const [ go ] = findDisplayObjectsOfRole(countdown, 'go');
		const [ numbers ] = findDisplayObjectsOfRole(countdown, 'numbers');
		const [ flash ] = findDisplayObjectsOfRole(countdown, 'flash');
		const colors = findDisplayObjectsOfRole(countdown, 'color');

		// include the main countdown area
		const container = new AnimatorPIXI.ResponsiveContainer();
		container.relativeX = 0.5;
		container.relativeY = 0.5;
		container.alpha = 0;
		container.addChild(countdown);

		// save refs
		this.go = go;
		this.countdown = countdown;
		this.numbers = numbers;
		this.flash = flash;
		this.container = container;
		this.colors = colors;

		// hide the go text
		go.alpha = 0;
	}

	/** replaces the color shade */
	setColor = value => {

		// switches the tint - would be nice to tween this
		for (const item of this.colors)
			item.tint = value;
	}

	// replaces the current digit
	setDigit = count => {
		const { numbers } = this;

		// set the digit
		numbers.gotoAndStop(3 - count);
		pop(numbers);
	}
	
	// begins the animation - does not
	// finish until "go" is called
	start = () => {

		// set timeouts to favor being done a little early
		// since it'll add to the suspense for the "GO" call
		const offset = 250;
		
		setTimeout(this.show3, 1000 - offset);
		setTimeout(this.show2, 2000 - offset);
		setTimeout(this.show1, 3000 - offset);
	}

	// display 3
	show3 = () => {
		const { track, stage, container } = this;
		stage.addChild(container);
		
		// start the countdown
		if (track.isViewActive) {
			const announcer = audio.create('sfx', 'common', 'countdown_count');
			announcer.volume(VOLUME_COUNTDOWN_ANNOUNCER);
			announcer.play();
		}

		// quick fade in
		animate({
			from: { alpha: 0 },
			to: { alpha: 1 },
			duration: 150,
			loop: false,
			update: props => container.alpha = props.alpha
		});

		// show the digit
		this.setDigit(3);
	}
	
	// display 2
	show2 = () => {
		this.setColor(0xfff000);
		this.setDigit(2);
	}

	// display 1
	show1 = () => this.setDigit(1)

	// hides the view
	hideCountdown = () => {
		const { countdown } = this;
		animate({
			from: { alpha: 1 },
			to: { alpha: 0 },
			duration: 300,
			loop: false,
			update: props => countdown.alpha = props.alpha,
			complete: this.dispose
		});
	}

	// activates the final animation
	finish = () => {
		const { numbers, go, countdown, flash } = this;

		// play the go audio clip
		const start = audio.create('sfx', 'common', 'countdown_go');
		start.volume(VOLUME_COUNTDOWN_ANNOUNCER);
		start.play();

		// also play the car acceleration noise
		const accelerate = audio.create('sfx', 'common', 'acceleration');
		accelerate.volume(VOLUME_START_ACCELERATION);
		accelerate.play();
		
		// change to green
		this.setColor(0x00ff00);

		// hide the numbers
		numbers.alpha = 0;

		// show "go"
		go.alpha = 1;
		flash.emitter.emit = true;
		pop(go);

		// pop the container out some
		pop(countdown, 150, 1, 1.1);

		// wait a moment then remove
		setTimeout(this.hideCountdown, 500);
	}

	// clean up
	dispose = () => {
		const { stage, container, flash } = this;
		flash.emitter.emit = false;
		stage.removeChild(container);

		// extra cleanup
		container.children[0].controller.dispose();
	}

}


// animates a character appearing
function pop(target, speed = 350, min = 0.7, max = 1) {
	animate({ 
		from: { scale: min },
		to: { scale: max },
		duration: speed,
		loop: false,
		ease: 'easeOutSine',
		update: prop => target.scale.x = target.scale.y = prop.scale
	});
}