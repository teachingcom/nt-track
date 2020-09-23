import Animation from "./base";
import { PIXI, findDisplayObjectsOfRole, animate } from "nt-animator";
import { VOLUME_COUNTDOWN_ANNOUNCER, VOLUME_START_ACCELERATION } from "../audio/volume";
import * as audio from '../audio';

export default class CountdownAnimation extends Animation {

	constructor({ track, stage, animator, onBeginRace }) {
		super();

		// save references
		this.track = track;
		this.animator = animator;
		this.stage = stage;
		this.onBeginRace = onBeginRace;
	}

	async init() {
		const { animator } = this;
		
		// load resources
		const resources = await animator.getSpritesheet('extras/countdown');
		if (!resources) throw new Error('Missing Countdown assets');
		
		// save references
		const countdown = await animator.create('extras/countdown');
		if (!countdown) throw new Error('Missing Countdown animation');

		// create the object
		const [ go ] = findDisplayObjectsOfRole(countdown, 'go');
		const [ numbers ] = findDisplayObjectsOfRole(countdown, 'numbers');
		const [ flash ] = findDisplayObjectsOfRole(countdown, 'flash');
		const colors = findDisplayObjectsOfRole(countdown, 'color');
		
		// force the shadow color
		const [ shadow ] = findDisplayObjectsOfRole(countdown, 'shadow');
		shadow.tint = 0x000000;

		// include the main countdown area
		const container = new PIXI.ResponsiveContainer();
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
		this.isReady = true;

		// hide the go text
		go.alpha = 0;
		this.setColor(0xff0000);
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

		// has already started
		if (!!this.countdownInterval) return;

		// set timeouts to favor being done a little early
		// since it'll add to the suspense for the "GO" call
		let step = 4;
		this.countdownInterval = setInterval(() => {

			// increment the counter
			if (--step <= 0)
				clearInterval(this.countdownInterval)

			// start counting the steps down
			if (step === 3) this.show3();
			else if (step === 2) this.show2();
			else if (step === 1) this.show1();
		}, 1000);
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
	show1 = () => {
		this.setDigit(1);
	}

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
		const { numbers, go, countdown, flash, countdownInterval, onBeginRace } = this;

		// notify this has started
		onBeginRace();

		// if for some reason the countdown hasn't finished
		// then go ahead and stop it
		clearInterval(countdownInterval);

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
		flash.emitter.activate();
		pop(go);

		// pop the container out some
		pop(countdown, 150, 1, 1.1);

		// wait a moment then remove
		setTimeout(this.hideCountdown, 500);
	}

	// clean up
	dispose = () => {
		const { stage, container } = this;
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