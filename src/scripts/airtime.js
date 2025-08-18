import { PIXI } from 'nt-animator'
import { GameScript } from './base'

const REACTION_DISTANCE = 500
const JUMP_DURATION = 22
const JUMP_POWER = 0.04
const JUMP_GRAVITY = 0.02
const JUMP_BOUNCE = 4
const JUMP_BOUNCE_COUNT = 3

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
			const { car, doodad } = player
      
      // already updated this frame
      if (car.__airtime_last_update__ === this.track.frame) {
        continue
      }
      
      // race is over, fix all scaling
      if (this.track.state.isFinished) {
        this.isFinished = true
        resetJump(car)
        resetJump(doodad)
        continue
      }
      
      // always update positions
      car.getGlobalPosition(compareTo, true)
			const x = compareTo.x - (source.x - REACTION_DISTANCE)
      const activate = Math.abs(x) < REACTION_DISTANCE

      // activate the jump
      if (!car.__airtime_perform_jump__ && activate) {
        car.__airtime_perform_jump__ = true
        car.__airtime_jump__ = JUMP_DURATION
        car.__airtime_velocity__ = 0
        car.__airtime_bounce__ = JUMP_BOUNCE_COUNT
      }

      // save the position
      car.__airtime_prior_x__ = x

      // if this is in a jump, do the animation
      if (car.__airtime_perform_jump__) {
        car.__airtime_last_update__ = this.track.frame
        
        // apply the jump
        if (--car.__airtime_jump__ > 0) {
          car.__airtime_velocity__ += JUMP_POWER
          car.__airtime_velocity__ *= 0.95
        }
        // apply gravity
        else {
          car.__airtime_velocity__ -= JUMP_GRAVITY
        }
        
        // ensure the range
        let scale = 1 + car.__airtime_velocity__
        if (scale < 1) {
          scale = 1

          // perform a bounce instead
          if (--car.__airtime_bounce__ > 0) {
            car.__airtime_jump__ = JUMP_BOUNCE * car.__airtime_bounce__
          }
          else {
            car.__airtime_perform_jump__ = false
          }

        }

        // apply the jump value
        applyJump(car, scale)
        applyJump(doodad, scale)
        continue
      }

		}

	}

}

function resetJump(target) {
  applyJump(target, 1)
}


function applyJump(target, value) {
  if (target) {
    target.scale.x = target.scale.y = value
  }
}
