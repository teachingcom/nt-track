import { findDisplayObjectsOfRole, PIXI } from 'nt-animator';
import { createSurface } from '../utils';

const width = 600;
const height = 1000;

// textures
let LEAF_1
let LEAF_2
let LEAF_3

export default class LeavesEffect {

	constructor(track, container, animator) {
		this.track = track;
		this.container = container;
		this.animator = animator;
	}

	async init() {
		const { track, animator } = this;

		// TODO: use animator.getImage
		LEAF_1 = await createLeaf('iVBORw0KGgoAAAANSUhEUgAAABkAAAAXCAMAAADJPRQhAAAADFBMVEXCXwnIZQnZeAz6nRBH53IJAAAABHRSTlMCVar95AmYiAAAAF9JREFUeNqV0kEOxCAMxdDY//53rmhHSANBar3Mi4AF9TJOc+3XNak1657vgpCRqxhzkl9AFZ2YaDaZcZQ4jbQkmLUhQHMa/T3y4W0+VSNFFfwJPrImxZQt9CTD3n2QC7v2AnVdiqWiAAAAAElFTkSuQmCC');
		LEAF_2 = await createLeaf('iVBORw0KGgoAAAANSUhEUgAAABkAAAAXCAMAAADJPRQhAAAADFBMVEXEhxjNlRzfsCH62ynxcoHCAAAABHRSTlMEdr7+TM65AgAAAF9JREFUeNqN0VEKgEAMA9Gd6f3vrK6wusSC+eyDEOj4Gbq7dlApzPuZAKGuGFI6JRbM85SL+JQqMWX5I+wijayNQEhxw6C6OqOrkZEior6EfdImuGQL3I12D30kcfzKAZY2AlF5aMSDAAAAAElFTkSuQmCC');
		LEAF_3 = await createLeaf('iVBORw0KGgoAAAANSUhEUgAAABkAAAAXCAMAAADJPRQhAAAADFBMVEXCTAnIUQnZYAz6fRB/mqLrAAAABHRSTlMCVar95AmYiAAAAF9JREFUeNqV0kEKwzAMBVHN/PvfubgphkYyJLPUE7YXrodxmuu8rkkbW995F4WsbBJzkl9AFZOYaJrsOErcRkYSzL0lwHAa8z3y4m1e1SBFFfwJXnJPii0t9CTLnn2QD73FAnYAzYazAAAAAElFTkSuQmCC');

		// handle effects
		track.on('race:start', this.increaseLeavesSpeed);
		track.on('race:finish', this.restoreLeavesSpeed);

		// generate some textures
		animator.addTexture('leaves_1', makeLeavesTexture(width, height));
		animator.addTexture('leaves_2', makeLeavesTexture(width, height));
		animator.addTexture('leaves_3', makeLeavesTexture(width, height));
		animator.addTexture('leaves_4', makeLeavesTexture(width, height));

	}

	async setup() {

		// gather the emitters
		const { effect } = this.container;

		this.emitters = {
			fast: findDisplayObjectsOfRole(effect, 'fast_leaves'),
			slow: findDisplayObjectsOfRole(effect, 'slow_leaves'),
		};

		// deactivate the fast emitter right away
		const [ fast ] = this.emitters.fast;
		if (fast) {
			fast.emitter.emit = false;
		}
	}


	increaseLeavesSpeed = () => {
		const { emitters } = this

		// toggle fast animations
		const [ fast ] = emitters.fast;
		const [ slowA, slowB ] = emitters.slow;

		// start the fast emitter
		setTimeout(() => {
			fast.emitter.autoUpdate = true;
			fast.emitter.emit = true;
		}, 4000);
		
		// stop slow emitters
		setTimeout(() => {
			slowA.emitter.emit = false;
			slowA.emitter.autoUpdate = false;
			slowB.emitter.emit = false;
			slowB.emitter.autoUpdate = false;
		}, 2000);
	}

	restoreLeavesSpeed = () => {
		const { emitters } = this;
		const [ fast ] = emitters.fast;
		const [ slowA, slowB ] = emitters.slow;

		fast.visible = false;
		fast.emitter.autoUpdate = false;
		fast.emitter.emit = false;

		// stop animating
		slowA.emitter.emit = true;
		slowA.emitter.autoUpdate = true;

		slowB.emitter.emit = true;
		slowB.emitter.autoUpdate = true;
	}

}


// let emitters;

// export async function init(track, container, animator) {
// 	const width = 600;
// 	const height = 1000;


// 	// TODO: use animator.getImage
// 	LEAF_1 = await createLeaf('iVBORw0KGgoAAAANSUhEUgAAABkAAAAXCAMAAADJPRQhAAAADFBMVEXCXwnIZQnZeAz6nRBH53IJAAAABHRSTlMCVar95AmYiAAAAF9JREFUeNqV0kEOxCAMxdDY//53rmhHSANBar3Mi4AF9TJOc+3XNak1657vgpCRqxhzkl9AFZ2YaDaZcZQ4jbQkmLUhQHMa/T3y4W0+VSNFFfwJPrImxZQt9CTD3n2QC7v2AnVdiqWiAAAAAElFTkSuQmCC');
// 	LEAF_2 = await createLeaf('iVBORw0KGgoAAAANSUhEUgAAABkAAAAXCAMAAADJPRQhAAAADFBMVEXEhxjNlRzfsCH62ynxcoHCAAAABHRSTlMEdr7+TM65AgAAAF9JREFUeNqN0VEKgEAMA9Gd6f3vrK6wusSC+eyDEOj4Gbq7dlApzPuZAKGuGFI6JRbM85SL+JQqMWX5I+wijayNQEhxw6C6OqOrkZEior6EfdImuGQL3I12D30kcfzKAZY2AlF5aMSDAAAAAElFTkSuQmCC');
// 	LEAF_3 = await createLeaf('iVBORw0KGgoAAAANSUhEUgAAABkAAAAXCAMAAADJPRQhAAAADFBMVEXCTAnIUQnZYAz6fRB/mqLrAAAABHRSTlMCVar95AmYiAAAAF9JREFUeNqV0kEKwzAMBVHN/PvfubgphkYyJLPUE7YXrodxmuu8rkkbW995F4WsbBJzkl9AFZOYaJrsOErcRkYSzL0lwHAa8z3y4m1e1SBFFfwJXnJPii0t9CTLnn2QD73FAnYAzYazAAAAAElFTkSuQmCC');

// 	// handle effects
// 	track.on('race:start', () => increaseLeavesSpeed(track, container, animator, emitters));
// 	track.on('race:finish', () => restoreLeavesSpeed(track, container, animator, emitters));

// 	// generate some textures
// 	animator.addTexture('leaves_1', makeLeavesTexture(width, height));
// 	animator.addTexture('leaves_2', makeLeavesTexture(width, height));
// 	animator.addTexture('leaves_3', makeLeavesTexture(width, height));
// 	animator.addTexture('leaves_4', makeLeavesTexture(width, height));
// }

// export async function setup(track, container, animator) {
// 	emitters = gatherEmitters(container)

// 	// disable 
// 	emitters.fast[0].emitter.emit = false;

// }

// function increaseLeavesSpeed(track, container, animator, emitters) {

// 	// toggle fast animations
// 	const [ fast ] = emitters.fast;
// 	const [ slowA, slowB ] = emitters.slow;

// 	// start the fast emitter
// 	setTimeout(() => {
// 		fast.emitter.autoUpdate = true;
// 		fast.emitter.emit = true;
// 	}, 4000);
	
// 	// stop slow emitters
// 	setTimeout(() => {
// 		slowA.emitter.emit = false;
// 		slowA.emitter.autoUpdate = false;
// 		slowB.emitter.emit = false;
// 		slowB.emitter.autoUpdate = false;
// 	}, 2000);
// }

// function restoreLeavesSpeed(track, container, animator, emitters) {
// 	// toggle fast animations
// 	const [ fast ] = emitters.fast;
// 	const [ slowA, slowB ] = emitters.slow;

// 	// emitters.fast[0].emitter.emit = true;
// 	// emitters.fast[0].emitter.emit = true;

// 	fast.visible = false;
// 	fast.emitter.autoUpdate = false;
// 	fast.emitter.emit = false;

// 	// stop animating
// 	slowA.emitter.emit = true;
// 	slowA.emitter.autoUpdate = true;

// 	slowB.emitter.emit = true;
// 	slowB.emitter.autoUpdate = true;
// }

// function gatherEmitters(container, animator) {
// 	const { effect } = container;

// 	return {
// 		fast: findDisplayObjectsOfRole(effect, 'fast_leaves'),
// 		slow: findDisplayObjectsOfRole(effect, 'slow_leaves'),
// 	};


// 	// console.log(emitters);

// 	// // gather the emitters to use
// 	// for (const child of effect.children) {
// 	// 	const { emitter } = child
// 	// 	const nodes = [ ];
// 	// 	emitters.push({ instance: emitter, min: emitter.minLifetime, max: emitter.maxLifetime, frequency: emitter.frequency, nodes });
// 	// 	console.log('emitter', emitter)
		
// 	// 	// capture all of the nodes
// 	// 	let node = emitter.startSpeed
// 	// 	do {
// 	// 		nodes.push({ original: node.value, node })
// 	// 		node = node.next
// 	// 	}
// 	// 	while (node);
// 	// }
// }

// // // start increasing speeds
// // function increaseLeavesSpeed(track, animator, emitters) {
// // 	// gatherEmitters(track, emitters);
	
// // 	// const CAPPED = 1500;
// // 	// const MIN = 1;
// // 	// const MAX = 2;

// // 	// // animate the speed up
// // 	// let count = 20;
// // 	// const increase = setInterval(() => {
// // 	// 	if (--count <= 0) {
// // 	// 		clearInterval(increase);
// // 	// 	}

// // 	// 	// update emitters
// // 	// 	for (const emitter of emitters) {
// // 	// 		emitter.instance.maxLifetime = Math.max(MAX, emitter.instance.maxLifetime * 0.6);
// // 	// 		emitter.instance.minLifetime = Math.max(MIN, emitter.instance.minLifetime * 0.6);
// // 	// 		emitter.instance.frequency *= 0.9;

// // 	// 		// speed up each node
// // 	// 		for (const node of emitter.nodes) {
// // 	// 			node.node.value = Math.min(node.node.value * 1.15, CAPPED);
// // 	// 		}
// // 	// 	}
// // 	// }, 500);
// // }

// // function restoreLeavesSpeed(track, animator, emitters) {
// // 	// for (const emitter of emitters) {
// // 	// 	emitter.instance.maxLifetime = emitter.maxLifetime;
// // 	// 	emitter.instance.minLifetime = emitter.minLifetime;
// // 	// 	emitter.instance.frequency = emitter.frequency;

// // 	// 	for (const node of emitter.nodes) {
// // 	// 		node.node.value = node.original;
// // 	// 	}
// // 	// }

// // }


function createLeaf(src) {
	return new Promise(resolve => {
		const img = document.createElement('img');
		img.src = `data:image/png;base64,${src}`;
		img.onload = () => resolve(img);
	})
}

function makeLeavesTexture(width, height) {
	const shadowSize = 30;
	const halfShadowSize = shadowSize / 2;
	const shadow = createSurface(shadowSize, shadowSize);
	shadow.ctx.fillStyle = shadow.ctx.createRadialGradient(halfShadowSize, halfShadowSize, 0, halfShadowSize, halfShadowSize, halfShadowSize);
	shadow.ctx.fillStyle.addColorStop(0, 'rgba(0,0,0,1)');
	shadow.ctx.fillStyle.addColorStop(1, 'rgba(0,0,0,0)');
	shadow.ctx.fillRect(0, 0, shadowSize, shadowSize);

	const leaves = createSurface(width, height);
	
	let x = 0;
	let y = 0;

	let prevX = -100;
	let prevY = -100;

	const images = [LEAF_1, LEAF_2, LEAF_3]
	const density = 0.6

	while (x < width) {
		x += Math.random() * width * density;
		y = 0;

		while (y < height) {
			y += Math.random() * height * density;

			// require a minimum distance
			if (Math.abs(Math.abs(x - prevX) + Math.abs(y - prevY)) < 50) {
				continue
			}


			const scale = (Math.random() * 0.5) + 0.5
			leaves.ctx.translate(x, y);

			const offset = 2 + (Math.random() * 10)
			leaves.ctx.globalAlpha = 0.1 + ((1 - (offset / 12)) * 0.1)
			leaves.ctx.scale(scale, scale);
			leaves.ctx.drawImage(shadow.el, (offset / scale) + -halfShadowSize, -halfShadowSize)
			leaves.ctx.globalAlpha = 1
			
			leaves.ctx.rotate(Math.random() * (Math.PI * 2));
			
			const image = images[(0 | x + y) % 3];
			leaves.ctx.drawImage(image, 0, 0);

			leaves.ctx.setTransform(1, 0, 0, 1, 0, 0);
			// leaves.ctx.fillRect(x, y, 4, 4);

			prevX = x;
			prevY = y;
		}

	}

	document.body.appendChild(leaves.el)

	return new PIXI.Texture.from(leaves.el);

	// // 
	// rain.ctx.strokeStyle = "white";
	// rain.ctx.translate(rain.width / 2, rain.height / 2);

	// const hw = width / 2;
	// const hh = height / 2;
	// const max = Math.max(hw, hh);

	// let i = 0;
	// let x;
	// let y;
	// while (i < Math.PI * 2) {
	// 	i += Math.random() * 0.1;

	// 	// get the starting point
	// 	const sx = Math.max(-hw, Math.min(hw, Math.cos(i) * width));
	// 	const sy = Math.max(-hh, Math.min(hh, Math.sin(i) * height));

	// 	// require a valid distance
	// 	if (isNaN(x) || Math.abs(x - sx) + Math.abs(y - sy) < 4) {
	// 		x = sx;
	// 		y = sy;
	// 		continue;
	// 	}

	// 	x = sx;
	// 	y = sy;

	// 	// get the center point
	// 	const mx = sx * 0.66;
	// 	const my = sy * 0.66;

	// 	// get the starting point
	// 	const bt = Math.random() * 0.4;
	// 	const et = bt + Math.random() * 0.6;
	// 	const bx = interpolate(sx, mx, bt);
	// 	const by = interpolate(sy, my, bt);
	// 	const ex = interpolate(sx, mx, et);
	// 	const ey = interpolate(sy, my, et);

	// 	rain.ctx.beginPath();
	// 	rain.ctx.globalAlpha = Math.random() * 0.8 + 0.2;
	// 	rain.ctx.moveTo(bx, by);
	// 	rain.ctx.lineTo(ex, ey);
	// 	rain.ctx.stroke();
	// }

	
}
