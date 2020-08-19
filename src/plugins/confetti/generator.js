import * as PIXI from 'pixi.js';
import { createContext } from 'nt-animator';
import { LAYER_TRACK_OVERLAY } from '../../views/track/layers';

const PARTICLE_COUNT = 125;
const DEFAULT_PARTICLE_SIZE = 11;

// array positions
const INDEX_SPRITE = 0;
const INDEX_LIFE = 1;
const INDEX_MOVEMENT_X = 2;
const INDEX_MOVEMENT_Y = 3;
const INDEX_ORIGIN_X = 4;
const INDEX_ORIGIN_Y = 5;
const INDEX_ROTATION = 6;

// creates a sprite that renders confetti
export default class FastConfetti {

	static async create(animator, track) {
		const instance = new FastConfetti(track);
		instance.c1 = await animator.getImage('particles', 'confetti_1');
		instance.c2 = await animator.getImage('particles', 'confetti_2');
		instance.c3 = await animator.getImage('particles', 'confetti_3');
		instance.c4 = await animator.getImage('particles', 'confetti_4');

		// start animating
		instance.start();

		return instance;
	}

	constructor(track) {
		this.track = track;
		this.view = track.view;
		const { width, height } = this.view;
		
		this.context = createContext(1000, 1000);
		this.texture = PIXI.Texture.from(this.context.canvas);
		this.sprite = new PIXI.Sprite(this.texture);
		this.sprite.x = width * -0.5;
		this.sprite.y = height * -0.5;
		this.sprite.zIndex = LAYER_TRACK_OVERLAY;
	}

	particles = [ ]

	// kick off the effect
	start = () => {
		this.update();
		// manage the animation
		// this.animator = everyFrame()
		// 	.start(this.update);
	}

	dispose = () => {
		this.isDisposed = true;
	}

	// creates a new particle value
	createParticle = () => {
		const pick = [this.c1, this.c2, this.c3, this.c4][0 | (Math.random() * 4)];
		const dir = (Math.PI * 0.475) + (Math.random() * (Math.PI * 0.33));
		const originX = Math.random() * this.view.width;
		const originY = -DEFAULT_PARTICLE_SIZE * 2;
		const speed = 1 + Math.random() * 2;
		const movementX = Math.cos(dir) * speed;
		const movementY = Math.sin(dir) * speed;
		const life = Math.random() * 200;

		// save the particle
		return [ pick, life, movementX, movementY, originX, originY, Math.random() * Math.PI ];
	}

	// handles updating confetti effects
	update = () => {
		
		// check if this should continue to update
		if (this.isDisposed) return;
		
		// queue the next update
		requestAnimationFrame(this.update);
		
		// calculate the new size
		const { sprite, context, view, particles, track } = this;
		const { ctx, canvas } = context;
		const { width, height, scaleX } = view;
		const { delta } = track.state;

		// pre-calculate a few values
		const size = scaleX * DEFAULT_PARTICLE_SIZE;
		const offscreen = height + 5;

		// match size
		sprite.width = canvas.width = width;
		sprite.height = canvas.height = height;

		// update all particles
		for (let i = PARTICLE_COUNT; i-- > 0;) {
			let particle = this.particles[i];

			// create a new particle
			if (!particle) {
				particle = this.createParticle();
				particles.push(particle);
			}

			// adjust
			particle[INDEX_LIFE] += (1 * delta);
			particle[INDEX_ROTATION] += (0.05 * delta);
			const x = (particle[INDEX_MOVEMENT_X] * particle[INDEX_LIFE]) + particle[INDEX_ORIGIN_X];
			const y = (particle[INDEX_MOVEMENT_Y] * particle[INDEX_LIFE]) + particle[INDEX_ORIGIN_Y];

			// reset the particle
			if (y > offscreen) particle[INDEX_LIFE] = 0;

			// create a slight drifing effect
			// const drift = (Math.sin(particle[INDEX_LIFE]) * 0.01) * -50;

			// draw the particle
			// ctx.translate(x, y);
			// ctx.rotate(particle[INDEX_ROTATION]);
			// ctx.translate(drift, 0);
			// ctx.drawImage(particle[INDEX_SPRITE], 0, 0, size, size);
			// ctx.setTransform(1, 0, 0, 1, 0, 0);

			// doesn't look as good, but faster on chromebooks
			ctx.drawImage(particle[INDEX_SPRITE], x, y, size, size);
		}

		// refresh the texture
		this.texture.update();
	}

}