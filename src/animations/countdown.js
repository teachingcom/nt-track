import Animation from "./base";
import { PIXI, findDisplayObjectsOfRole, animate } from "nt-animator";
import { VOLUME_COUNTDOWN_ANNOUNCER, VOLUME_START_ACCELERATION } from "../audio/volume";
import * as audio from '../audio';
import { createSurface, wait } from "../utils";

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
		
		// save references
		let countdown = await animator.create('extras/countdown');
		if (!countdown) {
			return new BackupCountdown(this);
		}

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
		this.colors = colors;
		this.container = container;
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
			const announcer = audio.create('sfx', 'countdown_count');
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
		if (onBeginRace) {
			onBeginRace();
		}

		// if for some reason the countdown hasn't finished
		// then go ahead and stop it
		clearInterval(countdownInterval);

		// play the go audio clip
		const start = audio.create('sfx', 'countdown_go');
		start.volume(VOLUME_COUNTDOWN_ANNOUNCER);
		start.play();

		// also play the car acceleration noise
		const accelerate = audio.create('sfx', 'acceleration');
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



class BackupCountdown {
	constructor(instance) {
		this.instance = instance;

		// generate backup countdowns
		const surface = createSurface(400, 300);
		const { ctx, el, clear } = surface;

		// create each numeric countdown
		for (const text of ['3','2','1','GO']) {
			const id = text.toLowerCase();
			clear();
			
			// draw labels
			ctx.fillStyle = 'white';
			ctx.shadowOffsetY = 3;
			ctx.shadowBlur = 5;
			ctx.shadowColor = 'black';
			ctx.font = 'bold 160px sans-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			
			// check for the final
			if (id == 'go') {
				ctx.font = 'bold 220px sans-serif';
				ctx.shadowOffsetY = 3;
				ctx.shadowBlur = 15;
				ctx.shadowColor = '#00ff00';
			}
			
			// draw the number
			ctx.fillText(text, 200, 150);

			// generate a texture for the number
			const img = document.createElement('img');
			img.src = el.toDataURL();
			document.body.appendChild(img);

			// create a game sprite
			const texture = PIXI.Texture.from(img);
			const sprite = new PIXI.Sprite(texture);

			// add to the view
			sprite.visible = false;
			sprite.pivot.x = 150;
			sprite.pivot.y = 150;
			sprite.x = instance.track.cx;
			sprite.y = instance.track.cy;
			sprite.zIndex = 9999;
			instance.stage.addChild(sprite);

			// save a reference
			this[`digit_${id}`] = sprite;
		}

		// prevent errors by overriding methods
		instance.setColor = () => { };
		instance.dispose = () => { };
		instance.hideCountdown = () => { };
		instance.isReady = true;
		
		// setup special replacement functions
		instance.show3 = () => this.setDigit(3);
		instance.show2 = () => this.setDigit(2);
		instance.show1 = () => this.setDigit(1);

		// end the animation
		instance.finish = async () => {
			this.setDigit('go');

			// notify this has started
			if (instance.onBeginRace) {
				instance.onBeginRace();
			}

			// hide the digit
			await wait(1000);
			this.setDigit(null);
		};

	}

	setDigit = (id) => {
		this.digit_3.visible = this.digit_1.visible = this.digit_2.visible = this.digit_go.visible = false;

		// set the visible digit
		if (id) {
			const digit = this[`digit_${id}`];
			digit.visible = true;
		}
	}

}