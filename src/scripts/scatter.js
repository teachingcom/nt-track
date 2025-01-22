// import { findDisplayObjectsOfRole, PIXI } from 'nt-animator'
// import { GameScript } from './base'

// const REACTION_DISTANCE = 250

// export default class Scatter extends GameScript {
	
// 	async init() {
//     this.isIdle = false
// 		this.checkInterval = 0
//     this.sprite = findDisplayObjectsOfRole(this.obj, 'scatter')?.[0]
//     console.log('create', this.sprite)

//     setTimeout(() => this.update(), 3000)
// 	}


// 	update(state) {
//     const source = new PIXI.Point()
// 		this.sprite.getGlobalPosition(source, true)

//     // use the life
//     if (this.velocity > 0.25) {
//       console.log('do?', this.life)
//       this.sprite.x += this.dirX * this.velocity
//       this.sprite.y -= this.dirY * this.velocity
//       this.sprite.rotation += this.spin * this.velocity
//       this.velocity *= 0.9
//     }

// 		// if (!this.isIdle) {
// 		// 	const source = new PIXI.Point()
// 		// 	this.obj.getGlobalPosition(source, true)

      
// 		// 	return
// 		// }

//     // did it jump back to the front (as if it were being cycled again)
//     if (source.x > this.track.width) {
//       this.sprite.y = 0
//       this.sprite.x = 0
//       return
//     }


// 		// // throttle how often to perform hit detection
// 		// this.checkInterval++
// 		// if (this.checkInterval % 10 !== 0) { 
// 		// 	return
// 		// }
		
// 		// get the gull position
		

// 		// compare if close to any players
// 		const reactionDistance = REACTION_DISTANCE // * (1 * state.speed)
// 		const compareTo = new PIXI.Point()
// 		for (const player of this.track.players) {
// 			const { car } = player
// 			car.getGlobalPosition(compareTo, true)

//       // back of car
//       compareTo.x -= 600

//       // 
// 			const x = compareTo.x - source.x
// 			const y = compareTo.y - source.y
// 			const dist = Math.hypot(x, y)

// 			// check the distance
// 			if (dist < reactionDistance) {
//         // get the angle
//         const angle = Math.atan2(compareTo.y - source.y, compareTo.x - source.x)
//         this.velocity = reactionDistance - dist
//         this.dirX = Math.cos(angle)
//         this.dirY = Math.sin(angle)
//         this.spin = 0.001

//         // console.log(angle, reactionDistance, compareTo)

//         // this.sprite.x +=  * dist * 1.5
//         // this.sprite.y += Math.sin(angle) * dist * 1.5
//         // // this.sprite.rotation += 0.01
// 			}
// 		}

// 	}

// }