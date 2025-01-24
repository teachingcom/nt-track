import { findDisplayObjectsOfRole, PIXI } from 'nt-animator'
import { GameScript } from './base'

const REACTION_DISTANCE = 600
const SCALE_UP = 0.1
const SCALE_DOWN = 0.05

export default class Airtime extends GameScript {
	
	async init() {
	}


	update(state) {
    if (this.isFinished) {
      return
    }

    const source = new PIXI.Point()
		this.obj.getGlobalPosition(source, true)

		// compare if close to any players
		const reactionDistance = REACTION_DISTANCE // * (1 * state.speed)
		const compareTo = new PIXI.Point()
		for (const player of this.track.players) {
			const { car } = player
			car.getGlobalPosition(compareTo, true)

      // race is over, fix all scaling
      if (this.track.state.isFinished) {
        this.isFinished = true
        car.scale.x = car.scale.y = 1
        continue
      }

			const x = compareTo.x - source.x
      let diff = x / reactionDistance
      
      // adjust scaling
      if (Math.abs(diff) < 1) {

        // if (diff < 0) {
        //   diff += (1 - diff) * SCALE_UP
        // }
        // else if (diff > 0) {
        //   diff -= (1 - diff) * SCALE_DOWN
        // }

 
        car.__airtimeScriptUpdate__ = this.track.frame
       
        const reduce = 0.4
        const x = Math.abs(diff)
        const scale = ease((diff + 1) / 2)
        const shift = ((1 - x) * scale) * reduce

        // car.scale.x = car.scale.y = 1 + Math.sin((1 - Math.abs(diff)) * 0.5)
        car.scale.x = car.scale.y = 1 + shift

      }
      // someone else didn't update
      else if (car.__airtimeScriptUpdate__ !== this.track.frame) {
        car.scale.x = car.scale.y = 1
      }


		}

	}

}

function ease(x) {
  // return 1 - Math.pow(1 - x, 4);
  return 1 - Math.pow(1 - x, 5);
  // return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2;
  // return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}