import { findDisplayObjectsOfRole, PIXI } from 'nt-animator';
import { createSurface } from '../utils';

const width = 600;
const height = 1000;

const MIN_SPEED = 3;
const MAX_SPEED = 23;
const MIN_GUST = 2;
const MAX_GUST = 6;

// textures
let SNOW_1
let SNOW_2
let SNOW_3

export default class SnowEffect {

	isRacing = false

	constructor(track, container, animator) {
		this.track = track;
		this.container = container;
		this.animator = animator;
	}

	async init() {
		const { track, animator } = this;

		// TODO: use animator.getImage
		// SNOW_1 = await createSnow('iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyhpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDcuMi1jMDAwIDc5LjFiNjVhNzliNCwgMjAyMi8wNi8xMy0yMjowMTowMSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDIzLjUgKE1hY2ludG9zaCkiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NDREMUMwNzk5ODc0MTFFRkEzNkNENTUyMEE0MENFNzQiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NDREMUMwN0E5ODc0MTFFRkEzNkNENTUyMEE0MENFNzQiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo0NEQxQzA3Nzk4NzQxMUVGQTM2Q0Q1NTIwQTQwQ0U3NCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo0NEQxQzA3ODk4NzQxMUVGQTM2Q0Q1NTIwQTQwQ0U3NCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PjH6gEsAAADqSURBVHjaYvj//z8DFCsA8QwgfgjEP6H0dCCWQ1JDEMMYHkD8+T928BGI3UgxEOSyT//xA5C8IjEGMjEwMFQCMS8DfgCSL2EgAjACTX0EpGWJUPsAiBWJMfAnkGYjwsAfQMxJSBHIyy8YiANEqQMZuI1IA7cSpQroZXkg/kAglj9A1RGdDl2g6Q0beA/E9qQmbAZojpgGxHegiRxETyI1pzCCTaUiYGKgMhiUBuoBsR8Qi8OSDSV4JlJq+ArEnpREigkQn0YTu0WJl5WwiClSYuBhIP6GJraT0jB0BuLrQPwLiNcBsRhAgAEAERcnjrR8rWgAAAAASUVORK5CYII=');
		// SNOW_2 = await createSnow('iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyhpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDcuMi1jMDAwIDc5LjFiNjVhNzliNCwgMjAyMi8wNi8xMy0yMjowMTowMSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDIzLjUgKE1hY2ludG9zaCkiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NDREMUMwN0Q5ODc0MTFFRkEzNkNENTUyMEE0MENFNzQiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NDREMUMwN0U5ODc0MTFFRkEzNkNENTUyMEE0MENFNzQiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo0NEQxQzA3Qjk4NzQxMUVGQTM2Q0Q1NTIwQTQwQ0U3NCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo0NEQxQzA3Qzk4NzQxMUVGQTM2Q0Q1NTIwQTQwQ0U3NCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PsV5knMAAAEISURBVHjaYvj//z8DDbAqEK8F4o9A/AnKVkdWQwtL1YD4/X9MABLTpKXFa//jButh6hjBtlMXfARiPhxyX4GYB8RgYqA+YCRGETaL9YDYD4jFybR4Dx65/XAWWvzMRIqPr0DsSUYca+BIXB+AWAtb4jLBovgmmQkMlHo3A/EXqAc2I6doEGZBCgYlLEGjSGZwXwdiX2Lj+DAQf0OT38lAK4AWRM5AfB2IfwHxOiAWo1HJRpN8zEBudhq1eNTi4WlxE7R6a6aVxbjyMagE4wTiL0DMS08f90Etn0pvH4+malIB4VYMDWoeolox1LaU6FYMtYOa6FYMtS0mvhVDgzgmqhUzYPkYIMAA7s15nbdc8/AAAAAASUVORK5CYII=');
		// SNOW_3 = await createSnow('iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyhpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDcuMi1jMDAwIDc5LjFiNjVhNzliNCwgMjAyMi8wNi8xMy0yMjowMTowMSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDIzLjUgKE1hY2ludG9zaCkiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6Njk3Q0QzQUM5ODc0MTFFRkEzNkNENTUyMEE0MENFNzQiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6Njk3Q0QzQUQ5ODc0MTFFRkEzNkNENTUyMEE0MENFNzQiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo0NEQxQzA3Rjk4NzQxMUVGQTM2Q0Q1NTIwQTQwQ0U3NCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo0NEQxQzA4MDk4NzQxMUVGQTM2Q0Q1NTIwQTQwQ0U3NCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PitJ0HAAAAEOSURBVHjaYvz//z/DQAAmhgECyBY3AfFHIG6mgrl6QOwHxOI4VYCCGoq//YeAz0hi5OCZ/xHgKxB7YlOHzGmBKuygwFKT/5jgJiGLqYHDsFj8C5taaieuw0D8DU1sJ6E4RseqQLwWiD8C8ScoW50IXzsD8XWoT9cBsRgpQa0GxO+xBBtITJMa0YJLYu1/3GA9NSxmxFFygfIzH454/ArEPLQquRgHqsjcg0fPfqrYjCMONHAkrg9ArEXLxMUATb2bgfgLtETbTK0UjS9xjYxqcdTiUYuHn8WEG2jUBKQ00KiJSWqgkYmboK2YZnSLiW6gkYmxNpuZSGqgkQf6oOZPxRbHRDXQqIkHrHYCCDAAXtKUT6nnibcAAAAASUVORK5CYII=');

		// handle effects
		track.on('race:start', () => this.isRacing = true);
		track.on('race:finish', () => this.isRacing = false);

		// generate some textures
		animator.addTexture('snow_1', makeSnowTexture(width, height));
		animator.addTexture('snow_2', makeSnowTexture(width, height));
		animator.addTexture('snow_3', makeSnowTexture(width, height));
		animator.addTexture('snow_4', makeSnowTexture(width, height));

	}

	async setup() {
		const { container, track } = this;
		const { effect } = container;

		// setup each leaf effect
		const snow = findDisplayObjectsOfRole(effect, 'snow');
		const total = snow.length;
		for (let i = 0; i < total; i++) {
			this.createHandler(i / total, snow[i]);
		}

	}

	createHandler = (origin, snow) => {
		const { track } = this;
		const update = snow.updateTransform;
		const rotationSpeed = 0.01;
		const width = track.width * 1.2;
		const halfWidth = width / 2;
		const offset = 100000 * Math.random()

		// tracks the set of leaves behavior
		let modifier = 0;

		// reset the 
		function reset() {
			snow.x = halfWidth
			snow.y = 0
			// snow.rotation = (Math.random() * 0.2) - 0.1;
			snow.dir = (Math.random() * rotationSpeed) - (rotationSpeed / 2);
		}

		// override the update transform method
		snow.updateTransform = () => {

			// update the effect modifier
			modifier = this.isRacing ? Math.min(modifier + 0.0025, 1) : 0;
				
			// calculate new values
			const now = Math.cos((Date.now() + offset) * 0.001)
			const adjusted = modifier + Math.min(1.5, (track.state.typingSpeedModifier || 0));
			const gustSpeed = Math.max(0, now * (MIN_GUST + (MAX_GUST * adjusted)));
			const speed = (MIN_SPEED + (MAX_SPEED * adjusted)) + gustSpeed;
			
			// update the visuals
			snow.x -= speed;
			snow.rotation += now * -0.0033;
			snow.y = now * 100
			
			// reset if needed
			if (snow.x < -halfWidth) {
				reset();
			}

			// perform the normal update
			update.call(snow);
		};

		// initial state
		reset();
		snow.x = width * origin;
	}

}


function createSnow(src) {
	return new Promise(resolve => {
		const img = document.createElement('img');
		img.src = `data:image/png;base64,${src}`;
		img.onload = () => resolve(img);
	})
}

function makeSnowTexture(width, height) {
	// const shadowSize = 30;
	// const halfShadowSize = shadowSize / 2;
	// const shadow = createSurface(shadowSize, shadowSize);
	// shadow.ctx.fillStyle = shadow.ctx.createRadialGradient(halfShadowSize, halfShadowSize, 0, halfShadowSize, halfShadowSize, halfShadowSize);
	// shadow.ctx.fillStyle.addColorStop(0, 'rgba(0,0,0,1)');
	// shadow.ctx.fillStyle.addColorStop(1, 'rgba(0,0,0,0)');
	// shadow.ctx.fillRect(0, 0, shadowSize, shadowSize);

	const snow = createSurface(width, height);

  snow.ctx.shadowBlur = 5
  snow.ctx.shadowOffsetX = 0
  snow.ctx.shadowOffsetY = 0
  snow.ctx.shadowColor = '#bbffff'
  snow.ctx.fillStyle = 'white'
  snow.ctx.strokeStyle = '#b2d8e7'
	
	let x = 0;
	let y = 0;

	let prevX = -100;
	let prevY = -100;

	const images = [SNOW_1, SNOW_2, SNOW_3]
	const density = 0.1

	while (x < width) {
		x += Math.random() * width * density;
		y = 0;

		while (y < height) {
			y += Math.random() * height * density;

			// require a minimum distance
			if (Math.abs(Math.abs(x - prevX) + Math.abs(y - prevY)) < 100) {
				continue
			}



			// const scale = (Math.random() * 0.5) + 0.5
			// snow.ctx.moveTo(x, y);
      snow.ctx.beginPath()
      const rnd = Math.random()
      snow.ctx.shadowBlur = 5 * rnd

      snow.ctx.arc(x, y, 0.5 + (rnd * 1.5), 0, Math.PI * 2)
      snow.ctx.closePath()

      snow.ctx.globalAlpha = Math.min(rnd * 2, 1)
      snow.ctx.fill()
      
      snow.ctx.lineWidth = rnd
      snow.ctx.stroke()

			// const offset = 2 + (Math.random() * 10)
			// snow.ctx.globalAlpha = 0.1 + ((1 - (offset / 12)) * 0.1)
			// snow.ctx.scale(scale, scale);
			// snow.ctx.drawImage(shadow.el, (offset / scale) + -halfShadowSize, -halfShadowSize)
			// snow.ctx.globalAlpha = 1
			
			// snow.ctx.rotate(Math.random() * (Math.PI * 2));
			
			// const image = images[(0 | x + y) % 3];
			// snow.ctx.drawImage(image, 0, 0);
			// snow.ctx.setTransform(1, 0, 0, 1, 0, 0);
			
			prevX = x;
			prevY = y;
		}

    

	}

	return new PIXI.Texture.from(snow.el);	
}
