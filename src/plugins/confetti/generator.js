import { PIXI, createContext, drawPixiTexture, RAD } from 'nt-animator';
import { LAYER_TRACK_OVERLAY } from '../../views/track/layers';
import { BASE_HEIGHT } from '../../views/track/scaling';

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
		const startingWidth = track.view.width;
		const startingHeight = track.view.height;
		const startingRatio = startingWidth / startingHeight;

		
		const calculateLifetime = ({ speed }) => {
			const time = (track.view.height / ((speed.start + speed.end) * 0.5)) * 0.9;
			return { min: time, max: time };
		};
		
		const container = new PIXI.Container();
		
		// create the base config
		const config = {
			particlesPerWave: 1,
			maxParticles: 40,
			frequency: 0.25,
			spawnChance: 1,
			alpha: { list: [{ value: 0, time: 0 }, { value: 1, time: 0.1 }, { value: 1, time: 0.9 }, { value: 0, time: 1 }]},

			startRotation: { min: 93, max: 98 }, 
			rotationSpeed: { min: -18, max: 18 },
			orderedArt: true,

			spawnRect: { w: startingWidth, h: 0, x: 0, y: -100 },
			spawnType: 'rect',

			pos: {
				x: 0,
				y: 0
			}
		};


		// create the emitter instance
		const speedScale = 0.66;
		const lifetime = 4;

		const config1 = { ...config, lifetime: { min: lifetime, max: lifetime }, speed: { start: 350 * speedScale, end: 420 * speedScale }, maxParticles: 25, freq: 0.25, scale: { start: 0.7, end: 0.5 } };
		const config2 = { ...config, lifetime: { min: lifetime, max: lifetime }, speed: { start: 220 * speedScale, end: 310 * speedScale }, maxParticles: 15, freq: 1, scale: { start: 0.9, end: 0.7 } };
		const generator1 = new PIXI.Container();
		const generator2 = new PIXI.Container();
		const emitter1 = new PIXI.Particles.Emitter(generator1, [ tx1, tx2, tx3 ], config1);
		const emitter2 = new PIXI.Particles.Emitter(generator2, [ tx1, tx2, tx3 ], config2);

		generator1.emitter = emitter1;
		generator2.emitter = emitter2;

		// manually update the confetti - for some reason
		// the confetti stops when races end and it has something
		// to do with autoUpdate not running anymore. I couldn't
		// figure out the reason, but this is a cgood way to accomplish the
		// same thing
		const preferredInterval = 32
		setInterval(() => { 
			emitter1.update(preferredInterval / 1000)
			emitter2.update(preferredInterval / 1000)
		}, preferredInterval)

		// update scale to match the view - this scales confetti to match
		// as the screen changes. it does not maintain a 1/1 aspect ratio but
		// if the containing element stays the same aspect ratio, then this
		// should not change
		const matchToView = () => {
			const scale = track.view.height / BASE_HEIGHT;
			container.scale.y = scale;
			container.scale.x = scale;

			emitter1.spawnRect.width = track.view.width
			emitter2.spawnRect.width = track.view.width
		}

		// set default scaling
		matchToView();
		
		// make sure to update values when the track size changes
		track.on('resize', matchToView);
			
		// save configs
		emitter1.config = config;
		emitter1.emit = true;
		emitter2.config = config;
		emitter2.emit = true;

		// add to the view
		container.addChild(generator1);
		container.addChild(generator2);

		// use the build in canvas, if possible
		container.zIndex = LAYER_TRACK_OVERLAY;
		return container;
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