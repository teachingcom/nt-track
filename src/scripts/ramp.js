import { findDisplayObjectsOfRole, PIXI } from 'nt-animator'
import { GameScript } from './base'


export default class Ramp extends GameScript {

	animations = { 

	}
	
	async init() {
		this.checkInterval = 0


		// // the sprites
		// this.sprites = {
		// 	idle: findDisplayObjectsOfRole(this.obj, 'idle')[0],
		// 	flee: findDisplayObjectsOfRole(this.obj, 'flee')[0]
		// };

		// this.isIdle = true
	}


	update(state) {
		// const source = new PIXI.Point()
		// this.obj.getGlobalPosition(source, true)


		// if (!this.isIdle) {

		// 	// did it jump back to the front (as if it were being cycled again)
		// 	if (source.x > this.track.width) {
		// 		this.isIdle = true
		// 		this.sprites.flee.y = 0
		// 		this.sprites.flee.x = 0

		// 		// swap visibility
		// 		this.sprites.idle.visible = true
		// 		this.sprites.flee.visible = false
		// 	}
		// 	// otherwise, continue to flee away
		// 	else {
		// 		this.sprites.flee.y -= this.travelY
		// 		this.sprites.flee.x += this.travelX
		// 	}
			
		// 	return
		// }


		// // throttle how often to perform hit detection
		// this.checkInterval++
		// if (this.checkInterval % 10 !== 0) { 
		// 	return
		// }
		
		// get the gull position
		const source = new PIXI.Point()
		this.obj.getGlobalPosition(source, true)

		if (this.isOffScreen && source.x > this.track.width) {
			this.isOffScreen = false;
			// this.reset = 100
		}

		// if (--this.reset < 0) {
		// 	this.reset = Number.MAX_SAFE_INTEGER
		// }
		// if (this.isOffScreen) {
		// 		return
		// 	}
			
			// off screen
			if (!this.isOffScreen && source.x < -1000) {
				this.isOffScreen = true;
				// this.reset = 1000
				setTimeout(() => {
					this.animations = { }
				}, 2000)
			// this.animations = { }
			// return
		}

		// compare if close to any players
		// const reactionDistance = REACTION_DISTANCE // * (1 * state.speed)

		const compareTo = new PIXI.Point()

		for (const player of this.track.players) {
			if (this.animations[player.id]) {
				this.animations[player.id](source.x)
				continue
			}

			if (this.isOffScreen) {
				continue
			}

			// check the distance
			const x = compareTo.x - source.x
			const y = compareTo.y - source.y
			const dist = Math.hypot(x, y)
			if (dist < 100) {
				continue
			}
			
			const { car } = player
			car.getGlobalPosition(compareTo, true)
			
			// check the distance
			if (compareTo.x > source.x) {
				this.animations[player.id] = createRampAnimation(this, player, compareTo.x);
			}

			// const x = compareTo.x - source.x
			// const y = compareTo.y - source.y
			// const dist = Math.hypot(x, y)
			// if (dist < reactionDistance) {

			// 	// make visible
			// 	this.isIdle = false
			// 	this.sprites.idle.visible = false
			// 	this.sprites.flee.visible = true

			// 	// choose a random speed
			// 	this.travelX = 0 | (Math.random() * 20)
			// 	this.travelY = 15 + (0 | (Math.random() * 20))

			// 	// no need to check anymore
			// 	return
			// }
		}

	}

}


function createRampAnimation(script, player, startAt) {
	const { lane } = player.options
	const [ shadow ] = findDisplayObjectsOfRole(player.car, 'shadow')
	const shadowY = shadow?.y || 0

	let fallSpeed = 1.7
	let riseSpeed = 3.2
	let shadowAlpha = shadow?.alpha || 1
	let fadeIn = 0

	if (lane === 0) {
		fallSpeed *= 1.15
		riseSpeed *= 1.35
	}
	else if (lane === 1) {
		fallSpeed *= 1.1
		riseSpeed *= 1.2
	}
	else if (lane === 3) {
		fallSpeed *= 0.7
		riseSpeed *= 0.7
	}
	else if (lane === 4) {
		fallSpeed *= 0.8
		riseSpeed *= 0.8
	}

	return (current) => {
		const diff = startAt - current

		if (diff > 1000) {
			player.car.skew.y *= 0.9
		}
		
		if (diff > 1200) {
			player.car.y += fallSpeed
			if (shadow) {
				fadeIn += 0.05
				shadow.y = -(player.car.y * 2) + shadowY
				shadow.alpha = Math.min(fadeIn, 1) * shadowAlpha
				shadow.skew.y = 0
			}
			fallSpeed *= 1.1
		}
		else {
			riseSpeed *= 0.99
			player.car.y -= riseSpeed
			player.car.skew.y = Math.max(player.car.skew.y - 0.003, -0.1)
			shadow.alpha *= 0.95
		}
		
		player.scale.x = player.scale.y = Math.max(1 + (player.car.y * -0.0043), 1)
		player.car.y = Math.min(player.car.y, 0)
		if (player.trail) {
			for (const part of player.trail.parts) {
				part.pivot.y = -player.car.y * 1.1
			}
		}
		if (shadow) {
			shadow.y = Math.max(shadowY, shadow.y)
		}

	}

}