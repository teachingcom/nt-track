import Animation from './base'

import { noop } from '../utils'
import * as audio from '../audio'
import { RACE_FINISH_CAR_STOPPING_TIME, RACE_SOUND_TIRE_SCREECH_MAX_INTERVAL } from '../config'
import { VOLUME_FINISH_LINE_STOP } from '../audio/volume'
import { animate } from 'nt-animator'

export default class CarFinishLineAnimation extends Animation {
  constructor ({ isActivePlayer, player, track, place }) {
    super()

    this.player = player
    this.track = track
    this.place = place
    this.isActivePlayer = isActivePlayer
  }

  play ({ isInstant = false, delay = 0, elapsed = 0, update = noop, complete = noop }) {
    const { player } = this

    // if this animation has already been activated, then
    // don't do it again
    // TODO: there was a scenario where the finish line
    // animation played twice - This is to prevent it from happening
    // but that bug should be tracked down
    if (player.hasShownFinishLineAnimation) return
    player.hasShownFinishLineAnimation = true

    // check for instant animations
    isInstant = isInstant || (elapsed > RACE_FINISH_CAR_STOPPING_TIME)

    // if this car is entering
    if (!isInstant) {
      const stop = audio.create('sfx', 'car_stopping')
      const now = Date.now();
			const diff = now - stop.lastInstancePlay
			const volumeLimiter = Math.min(1, diff / RACE_SOUND_TIRE_SCREECH_MAX_INTERVAL);
			const rate = [1, 0.85, 1.2, 0.925, 1.1][stop.playCount % 5]

      stop.rate(rate)
      stop.volume(VOLUME_FINISH_LINE_STOP * volumeLimiter)
      stop.play()
    }

    // starting and ending points
    const entryOrigin = { playerX: -0.1 }
    const entryDestination = { playerX: 0.975 }

    // handle updating the entry animation
    const updateEntryProps = props => {

      // if the track view is not active then
      // make sure they're placed at the end
      if (!this.track.isViewActive) {
        player.relativeX = entryDestination.playerX;
      }

      player.relativeX = Math.max(player.relativeX, props.playerX)
      player.visible = true
    }

    // set the new starting positions
    player.relativeX = entryOrigin.playerX;

    // if this shouldn't be animated, for example
    // the player isn't finishing in first place
    if (isInstant || !this.track.isViewActive) {
      updateEntryProps(entryDestination);
      if (complete) complete();
      return;
    }

    // set starting positions
    updateEntryProps(entryOrigin);

    // start the ending animation
    animate({
      delay,
      duration: RACE_FINISH_CAR_STOPPING_TIME,
      elapsed: Math.min(elapsed, RACE_FINISH_CAR_STOPPING_TIME),
      ease: 'easeOutCirc',
      from: entryOrigin,
      to: entryDestination,
      update: updateEntryProps,
      loop: false
    });

  }

}