import { PIXI, createContext, drawPixiTexture, RAD } from 'nt-animator';
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
		const tx1 = makeConfettiTexture()
		const tx2 = makeConfettiTexture()
		const tx3 = makeConfettiTexture()

		const generator = new PIXI.Container();
		
		const config = {
			particlesPerWave: 2,
			maxParticles: 30,
			frequency: 0.25,
			spawnChance: 1,
			alpha: { list: [{ value: 1, time: 0 }, { value: 1, time: 0.9 }, { value: 0, time: 1 }]},

			speed: { start: 200, end: 300 },
			startRotation: { min: 93, max: 98 }, 
			rotationSpeed: { min: 7, max: 15 },
			orderedArt: true,

			spawnRect: { w: track.width, h: 0, x: 0, y: -200 },
			spawnType: 'rect',

			// noRotation: true,
			lifetime: { min: 5, max: 5 },
			pos: {
				x: 0,
				y: 0
			}
		};


		const emitter = new PIXI.Particles.Emitter(generator, [ tx1, tx2, tx3 ], config)
		emitter.config = config;
		emitter.autoUpdate = true;
		emitter.emit = true;

		// use the build in canvas, if possible
		generator.zIndex = LAYER_TRACK_OVERLAY;
		return generator;
	}

}

function makeConfettiTexture() {
	const size = 512;
	const colors = ['#25F2E2', '#854AFF', '#F228A1', '#FD3E11', '#FEE141', '#CBFB0A', '#0AF75C', '#FF2600'];
	let colorIndex = 0
	const { length: total } = colors;
	const context = createContext(size, size);
	const { ctx, canvas } = context;
	canvas.width = canvas.height = size;

	// draw some particles
	const edge = 10;
	const padding = edge * 2;
	const offset = size - padding;
	const totalParticles = 22;

	for (let i = 0; i < totalParticles; i++) {
		const x = ((offset) * Math.random()) + edge;
		const y = ((offset) * Math.random()) + edge;

		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.translate(x, y);
		ctx.rotate(Math.random() * Math.PI);
		const cs = Math.floor(8 + (6 * Math.random()))
		ctx.fillStyle = colors[(++colorIndex) % total]
		ctx.fillRect(0, 0, cs, cs);
	}

	const texture = PIXI.Texture.from(canvas);
	return texture;
}