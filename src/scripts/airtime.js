import { findDisplayObjectsOfRole, PIXI } from 'nt-animator'
import { GameScript } from './base'

const REACTION_DISTANCE = 800
const SCALE_UP = 0.1
const SCALE_DOWN = 0.05

export default class Airtime extends GameScript {
	
	async init() {
	}


	update(state) {
    const source = new PIXI.Point()
		this.obj.getGlobalPosition(source, true)

		// compare if close to any players
		const reactionDistance = REACTION_DISTANCE // * (1 * state.speed)
		const compareTo = new PIXI.Point()
		for (const player of this.track.players) {
			const { car } = player
			car.getGlobalPosition(compareTo, true)

			const x = compareTo.x - source.x
      let diff = x / reactionDistance
      
      // adjust scaling
      if (Math.abs(diff) < 1) {

        if (diff < 0) {
          diff += (1 - diff) * SCALE_UP
        }
        else if (diff > 0) {
          diff -= (1 - diff) * SCALE_DOWN
        }
 
        car.__airtimeScriptUpdate__ = this.track.frame
        car.scale.x = car.scale.y = 1 + Math.sin((1 - Math.abs(diff)) * 0.5)

      }
      // someone else didn't update
      else if (car.__airtimeScriptUpdate__ !== this.track.frame) {
        car.scale.x = car.scale.y = 1
      }


		}

	}

}