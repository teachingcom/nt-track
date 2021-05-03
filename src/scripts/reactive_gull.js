import { findDisplayObjectsOfRole, PIXI } from 'nt-animator'
import { GameScript } from './base'

const REACTION_DISTANCE = 300

export default class ReactiveGull extends GameScript {
	
	async init() {
		this.checkInterval = 0

		// the sprites
		this.sprites = {
			idle = findDisplayObjectsOfRole(this.obj, 'idle')[0],
			flee = findDisplayObjectsOfRole(this.obj, 'flee')[0]
		};

		this.isIdle = true
	}


	update() {
		if (!this.isIdle) {
			const source = new PIXI.Point()
			this.obj.getGlobalPosition(source, true)

			// did it jump back to the front (as if it were being cycled again)
			if (source.x > this.track.width) {
				this.isIdle = true
				this.sprites.flee.y = 0
				this.sprites.flee.x = 0

				// swap visibility
				this.sprites.idle.visible = true
				this.sprites.flee.visible = false
			}
			// otherwise, continue to flee away
			else {
				this.sprites.flee.y -= this.travelY
				this.sprites.flee.x += this.travelX
			}
			
			return
		}


		// throttle how often to perform hit detection
		this.checkInterval++
		if (this.checkInterval % 10 !== 0) { 
			return
		}
		
		// get the gull position
		const source = new PIXI.Point()
		this.sprites.idle.getGlobalPosition(source, true)

		// compare if close to any players
		const compareTo = new PIXI.Point()
		for (const player of this.track.players) {
			const { car } = player
			car.getGlobalPosition(compareTo, true)
			
			// check the distance
			const x = compareTo.x - source.x
			const y = compareTo.y - source.y
			const dist = Math.hypot(x, y)
			if (dist < REACTION_DISTANCE) {

				// make visible
				this.isIdle = false
				this.sprites.idle.visible = false
				this.sprites.flee.visible = true

				// choose a random speed
				this.travelX = 0 | (Math.random() * 20)
				this.travelY = 15 + (0 | (Math.random() * 20))

				// no need to check anymore
				return
			}
		}

	}

}