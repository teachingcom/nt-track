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
		const tx1 = makeConfettiTexture();
		const tx2 = makeConfettiTexture();
		const tx3 = makeConfettiTexture();
		
		const calculateLifetime = ({ speed }) => {
			const time = (track.view.height / ((speed.start + speed.end) * 0.5)) * 0.9;
			return { min: time, max: time };
		};
		
		const generator = new PIXI.Container();

		// create the base config
		const config = {
			particlesPerWave: 2,
			maxParticles: 40,
			frequency: 0.25,
			spawnChance: 1,
			alpha: { list: [{ value: 0, time: 0 }, { value: 1, time: 0.1 }, { value: 1, time: 0.9 }, { value: 0, time: 1 }]},

			startRotation: { min: 93, max: 98 }, 
			rotationSpeed: { min: -18, max: 18 },
			orderedArt: true,

			spawnRect: { w: track.view.width, h: 0, x: 0, y: 0 },
			spawnType: 'rect',

			pos: {
				x: 0,
				y: 0
			}
		};


		// create the emitter instance
		const config1 = { ...config, speed: { start: 350, end: 420 }, maxParticles: 25, freq: 0.25, scale: { start: 0.9, end: 0.6 } };
		const config2 = { ...config, speed: { start: 220, end: 310 }, maxParticles: 15, freq: 1, scale: { start: 1.1, end: 0.8 } };
		const emitter1 = new PIXI.Particles.Emitter(generator, [ tx1, tx2, tx3 ], { ...config1, lifetime: calculateLifetime(config1) });
		const emitter2 = new PIXI.Particles.Emitter(generator, [ tx1, tx2, tx3 ], { ...config2, lifetime: calculateLifetime(config2) });
		
		// make sure to update values when the track size changes
		track.on('resize', () => { 
			emitter1.spawnRect.width = emitter2.spawnRect.width = track.view.width;

			const life1 = calculateLifetime(config1);
			const life2 = calculateLifetime(config2);
			
			emitter1.maxLifetime = emitter1.minLifetime = life1.min;
			emitter2.maxLifetime = emitter2.minLifetime = life2.min;
		});

		// const _spawnFunc = emitter._spawnFunc;
		// emitter._spawnFunc = (...args) => {
		// 	_spawnFunc.apply(emitter, args);

		// 	// update speeds
		// 	emitter.startSpeed.value = speed.start + ((speed.start * 0.75) * Math.random())
		// 	emitter.startSpeed.next.value = speed.end + ((speed.end * 0.75) * Math.random())

		// 	// emitter.maxSpeed = speed.end + ((speed.end * 0.25) * Math.random())
		// };
		

		// emitter.parent.x = track.width * 0.5
		emitter1.config = config;
		emitter1.autoUpdate = true;
		emitter1.emit = true;

		emitter2.config = config;
		emitter2.autoUpdate = true;
		emitter2.emit = true;

		// window.EMM = emitter



		// use the build in canvas, if possible
		generator.zIndex = LAYER_TRACK_OVERLAY;
		return generator;
	}

}

function makeConfettiTexture() {
	const size = 512;
	
	let colorIndex = 0
	const context = createContext(size, size);
	const { ctx, canvas } = context;
	canvas.width = canvas.height = size;
	
	const colors = ['#25F2E2', '#854AFF', '#F228A1', '#FD3E11', '#FEE141', '#CBFB0A', '#0AF75C', '#FF2600'];
	const { length: total } = colors;

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
		
		const shiftA = Math.random()
		const shiftB = 1 - shiftA;
		const skewA = shiftA * 0.3;
		const skewB = shiftB * 0.3;
		ctx.transform(1, skewA, skewB, 1, 0, 0);
		
		const useColor = (++colorIndex) % total;
		ctx.shadowColor = colors[useColor];
		ctx.shadowBlur = 10;
		ctx.fillStyle = colors[useColor];
		ctx.fillRect(0, 0, cs, cs);
	}

	const texture = PIXI.Texture.from(canvas);
	return texture;
}