import * as audio from '../audio'
import Animation from './base'

import { noop } from "../utils"
import { RACE_START_CAR_ENTRY_TIME, RACE_ENTRY_SOUND_REPEAT_TIME_LIMIT } from "../config"
import { VOLUME_CAR_ENTRY } from '../audio/volume'
import { animate } from 'nt-animator'
import { onViewActiveStateChanged } from '../utils/view'

export default class CarEntryAnimation extends Animation {

	constructor({ player, enterSound, namecard, track }) {
		super()
		
		this.player = player
		this.track = track
		this.namecard = namecard
		this.enterSound = enterSound
	}

	play = ({ isInstant = false, update = noop, complete = noop }) => {
		const { player, enterSound } = this
		
		// offscreen starting position
		const entryOrigin = {
			playerX: -0.1
		}
		
		// starting line position
		const entryDestination = {
			playerX: this.track.getStartingLinePosition()
		}

		// keep track if focus is lost
		const disposeViewStateWatcher = onViewActiveStateChanged(active => {
			if (!active) player.relativeX = entryDestination.playerX
		})

		// update the player position
		const updateEntry = props => {
			player.relativeX = Math.max(player.relativeX, props.playerX)
		}

		// apply positions immediately
		if (isInstant) {
			updateEntry(entryDestination)
			if (complete) complete()
			return
		}

		// starting positions
		player.relativeX = entryOrigin.playerX
		
		// animate the player entry
		animate({
			from: entryOrigin,
			to: entryDestination,
			ease: 'easeOutQuad',
			duration: RACE_START_CAR_ENTRY_TIME,
			loop: false,
			update: props => updateEntry(props),
			complete: () => {

				// set to idle
				player.toggle.activate('idle')

				disposeViewStateWatcher()
				complete()
			}
		});

		
		// play the entry sound, if possible
		// don't play duplicate sounds too close together
		try {
			const rev = audio.create('sfx', `entry_${enterSound}`)
			
			// play at lower volumes for subsequent cars
			const now = Date.now()
			const diff = now - rev.lastInstancePlay
			const volumeLimiter = Math.min(1, diff / RACE_ENTRY_SOUND_REPEAT_TIME_LIMIT)
			const rate = [1, 1.3, 0.85, 1.2, 0.925][rev.playCount % 5]
			const carCountLimiter = 1 - (rev.playCount * 0.1)

			// play the sound
			rev.volume(VOLUME_CAR_ENTRY * volumeLimiter * carCountLimiter)
			rev.rate(rate)
			rev.loop(false)
			rev.play()
		}
		catch (ex) {
			console.warn('unable to play entry sound')
		}

	}

}