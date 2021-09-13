import { findDisplayObjectsOfRole, PIXI } from 'nt-animator';
import { createSurface } from '../utils';

const width = 600;
const height = 1000;

const MIN_SPEED = 3;
const MAX_SPEED = 23;
const MIN_GUST = 2;
const MAX_GUST = 6;

// textures
let LEAF_1
let LEAF_2
let LEAF_3

export default class LeavesEffect {

	isRacing = false

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
		track.on('race:start', () => this.isRacing = true);
		track.on('race:finish', () => this.isRacing = false);

		// generate some textures
		animator.addTexture('leaves_1', makeLeavesTexture(width, height));
		animator.addTexture('leaves_2', makeLeavesTexture(width, height));
		animator.addTexture('leaves_3', makeLeavesTexture(width, height));
		animator.addTexture('leaves_4', makeLeavesTexture(width, height));

	}

	async setup() {
		const { container, track } = this;
		const { effect } = container;

		// setup each leaf effect
		const leaves = findDisplayObjectsOfRole(effect, 'leaves');
		const total = leaves.length;
		for (let i = 0; i < total; i++) {
			this.createHandler(i / total, leaves[i]);
		}

	}

	createHandler = (origin, leaves) => {
		const { track } = this;
		const update = leaves.updateTransform;
		const rotationSpeed = 0.01;
		const width = track.width * 1.2;
		const halfWidth = width / 2;
		const offset = 100000 * Math.random()

		// tracks the set of leaves behavior
		let modifier = 0;

		// reset the 
		function reset() {
			leaves.x = halfWidth
			leaves.y = 0
			leaves.rotation = (Math.random() * 0.2) - 0.1;
			leaves.dir = (Math.random() * rotationSpeed) - (rotationSpeed / 2);
		}

		// override the update transform method
		leaves.updateTransform = () => {

			// update the effect modifier
			modifier = this.isRacing ? Math.min(modifier + 0.0025, 1) : 0;
				
			// calculate new values
			const now = Math.cos((Date.now() + offset) * 0.001)
			const adjusted = modifier + Math.min(1.5, (track.state.typingSpeedModifier || 0));
			const gustSpeed = Math.max(0, now * (MIN_GUST + (MAX_GUST * adjusted)));
			const speed = (MIN_SPEED + (MAX_SPEED * adjusted)) + gustSpeed;
			
			// update the visuals
			leaves.x -= speed;
			leaves.rotation += now * -0.005;
			leaves.y = now * 0.01 * 100
			
			// reset if needed
			if (leaves.x < -halfWidth) {
				reset();
			}

			// perform the normal update
			update.call(leaves);
		};

		// initial state
		reset();
		leaves.x = width * origin;
	}

}


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
			
			prevX = x;
			prevY = y;
		}

	}

	return new PIXI.Texture.from(leaves.el);	
}
