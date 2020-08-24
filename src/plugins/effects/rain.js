import * as PIXI from 'pixi.js';

export default class RainEffect {

	constructor({ track, animator }) {
		this.track = track;
		this.animator = animator;
	}

	async init() {
		
		const { animator, track } = this;
		
		// load resources
		await animator.getSpritesheet('extras/rain');

		// console.log(track);
		// const bg = await animator.getSprite('extras/rain', 'bg');
		const bg = await animator.getImage('extras/rain', 'bg');
		const splash_1 = await animator.getImage('extras/rain', 'splash_1');
		const splash_2 = await animator.getImage('extras/rain', 'splash_2');
		const splash_3 = await animator.getImage('extras/rain', 'splash_3');

		const reflect = new PIXI.TilingSprite(PIXI.Texture.from(bg));
		reflect.width = track.width;
		reflect.height = 570;

		const textures = [
			PIXI.Texture.from(splash_2),
			PIXI.Texture.from(splash_1),
			PIXI.Texture.from(splash_3)
		];
		const drips = [ ];

		function move() {
			requestAnimationFrame(move);
			reflect.tilePosition.x -= Math.min(1.5, 0.25 + (track.state.speed * 0.5));
			for (const drip of drips) {
				drip.x -= track.state.speed;
			}
		}

		move();

		for (let i = 0; i < 100; i++)
			(() => {

				const reset = () => {
					drip.x = -(track.view.width / 2) + ( 0 | (Math.random() * track.view.width));
					drip.y = -(track.view.height / 2) + ( 0 | (Math.random() * track.view.height));
					drip.gotoAndPlay(0);
				};
				
				const drip = new PIXI.AnimatedSprite(textures);
				drips.push(drip);
				drip.animationSpeed = (Math.random() * 0.2) + 0.1;
				drip.play();
				drip.onLoop = reset;

				track.track.overlay.addChild(drip);
				drip.gotoAndPlay(Math.floor(Math.random() * drip.totalFrames));
				reset();
			})();
		
		// this.bg = bg;
		track.track.overlay.addChild(reflect);
		// const texture = PIXI.Texture.from(bg);
		// this.bg = new PIXI.Sprite(texture)
		reflect.blendMode = PIXI.BLEND_MODES.SCREEN;
		reflect.y = -320;
		reflect.alpha = 0.5
		reflect.x = track.view.width / -2;
		// track.track.overlay.addChild(this.bg);


		// const splash_1 = await.animator.getImage




	}

}