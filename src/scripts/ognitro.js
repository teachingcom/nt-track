import { GameScript } from './base'
import * as audio from '../audio'
import { VOLUME_OGNITRO_BARK } from '../audio/volume'

const IDLE_MIN_DURATION = 6000
const IDLE_MAX_DURATION = 12000
const START_WAIT_MIN_DURATION = 1000
const START_WAIT_MAX_DURATION = 2000
const TURN_IDLE_MIN_DURATION = 4000
const TURN_IDLE_MAX_DURATION = 8000

const STATE_IDLE = 'idle'
const STATE_IDLE_RESUME = 'idle_resume'
const STATE_START_WAIT = 'start_wait'
const STATE_START = 'start'
const STATE_BARK = 'bark'
const STATE_LOOK = 'look'
const STATE_TURN_FORWARD = 'turn_forward'
const STATE_TURN_IDLE = 'turn_idle'
const STATE_TURN_REVERSE = 'turn_reverse'

export default class Ognitro extends GameScript {

	async init() {
		this.animations = {
			bark: findAnimation(this.obj, 'animation:bark'),
			idle: findAnimation(this.obj, 'animation:idle'),
			look: findAnimation(this.obj, 'animation:look'),
			start: findAnimation(this.obj, 'animation:start'),
			turn: findAnimation(this.obj, 'animation:turn'),
			turnIdle: findAnimation(this.obj, 'animation:turn_idle'),
		}

		if (!this.animations.bark || !this.animations.idle || !this.animations.look || !this.animations.start || !this.animations.turn || !this.animations.turnIdle) {
			console.warn('ognitro script requires animation:bark, animation:idle, animation:look, animation:start, animation:turn, and animation:turn_idle roles')
			this.isValid = false
			return
		}

		this.isValid = true
		this.sprites = findAnimations(this.obj)
		for (const sprite of this.sprites) {
			const fps = Number(sprite.config?.props?.fps) || 60
			sprite.__ognitroFps = fps
			sprite.config.props.fps = 0
			sprite.visible = false
			sprite.gotoAndStop(0)
		}

		this.raceFinished = !!this.track?.state?.isFinished
		this.track?.on?.('race:start', () => {
			this.raceFinished = false
		})
		this.track?.on?.('race:finish', () => {
			this.raceFinished = true
		})

		this.wasMoving = this.isMoving()
		this.suppressBark = false
		this.enterNextCycle(Date.now())
	}

	update({ car } = { }) {
		if (!this.isValid) return
		if (car) this.car = car

		const now = Date.now()
		if (this.track?.state?.isFinished) {
			this.raceFinished = true
		}
		this.syncMovementState(now)
		this.updateBarkSound(now)
		let safety = 6
		while (now >= this.stateEndsAt && safety-- > 0) {
			const nextStartedAt = this.stateEndsAt

			if (this.state === STATE_START_WAIT) {
				this.enterStart(nextStartedAt)
			}
			else if (this.state === STATE_IDLE) {
				if (this.isMoving()) {
					this.enterLook(nextStartedAt)
				}
				else {
					this.enterStartWait(nextStartedAt)
				}
			}
			else if (this.state === STATE_START) {
				if (this.isMoving()) {
					this.enterIdle(nextStartedAt)
				}
				else if (this.suppressBark) {
					this.enterStartWait(nextStartedAt)
				}
				else {
					this.enterBark(nextStartedAt)
				}
			}
			else if (this.state === STATE_BARK) {
				if (this.isMoving()) {
					this.enterIdle(nextStartedAt)
				}
				else {
					this.enterStartWait(nextStartedAt)
				}
			}
			else if (this.state === STATE_LOOK) {
				this.enterIdleResume(nextStartedAt)
			}
			else if (this.state === STATE_IDLE_RESUME) {
				if (this.isMoving()) {
					this.enterTurnForward(nextStartedAt)
				}
				else {
					this.enterStartWait(nextStartedAt)
				}
			}
			else if (this.state === STATE_TURN_FORWARD) {
				this.enterTurnIdle(nextStartedAt)
			}
			else if (this.state === STATE_TURN_IDLE) {
				this.enterTurnReverse(nextStartedAt)
			}
			else {
				this.enterNextCycle(nextStartedAt)
			}
		}

		this.render(now)
	}

	enterIdle(startedAt) {
		const duration = randomDuration(IDLE_MIN_DURATION, IDLE_MAX_DURATION)
		this.idleEndsAt = startedAt + duration
		this.idleMidpoint = duration / 2
		this.enter(STATE_IDLE, this.animations.idle, startedAt, this.idleMidpoint)
	}

	enterStartWait(startedAt) {
		this.enter(STATE_START_WAIT, this.animations.start, startedAt,
			randomDuration(START_WAIT_MIN_DURATION, START_WAIT_MAX_DURATION))
		this.animations.start.gotoAndStop(0)
	}

	enterLook(startedAt) {
		this.enter(STATE_LOOK, this.animations.look, startedAt,
			animationDuration(this.animations.look))
	}

	enterStart(startedAt) {
		this.startLoopCount = 1 + Math.floor(Math.random() * 2)
		this.enter(STATE_START, this.animations.start, startedAt,
			animationDuration(this.animations.start) * this.startLoopCount)
	}

	enterBark(startedAt) {
		this.barkLoopDuration = animationDuration(this.animations.bark)
		this.barkLoopCount = this.selectBarkLoopCount()
		const duration = this.barkLoopDuration * this.barkLoopCount
		this.barkSounds = createBarkSoundOrder(this.barkLoopCount)
		this.barkSoundsPlayed = 0
		this.enter(STATE_BARK, this.animations.bark, startedAt, duration)
	}

	selectBarkLoopCount() {
		const loopCount = this.barkLoopStreak >= 2
			? (this.lastBarkLoopCount === 1 ? 2 : 1)
			: (Math.random() < 0.5 ? 1 : 2)

		this.barkLoopStreak = loopCount === this.lastBarkLoopCount
			? this.barkLoopStreak + 1
			: 1
		this.lastBarkLoopCount = loopCount
		return loopCount
	}

	enterIdleResume(startedAt) {
		this.enter(STATE_IDLE_RESUME, this.animations.idle, startedAt,
			Math.max(0, this.idleEndsAt - startedAt), this.idleMidpoint)
	}

	enterNextCycle(startedAt) {
		if (this.isMoving()) {
			this.enterIdle(startedAt)
		}
		else {
			this.enterStartWait(startedAt)
		}
	}

	enterTurnForward(startedAt) {
		this.enter(STATE_TURN_FORWARD, this.animations.turn, startedAt,
			animationDuration(this.animations.turn))
	}

	enterTurnIdle(startedAt) {
		this.enter(STATE_TURN_IDLE, this.animations.turnIdle, startedAt,
			randomDuration(TURN_IDLE_MIN_DURATION, TURN_IDLE_MAX_DURATION))
	}

	enterTurnReverse(startedAt) {
		this.enter(STATE_TURN_REVERSE, this.animations.turn, startedAt,
			animationDuration(this.animations.turn))
	}

	enter(state, sprite, startedAt, duration, animationOffset = 0) {
		for (const animation of this.sprites) {
			animation.visible = animation === sprite
		}

		this.state = state
		this.sprite = sprite
		this.stateStartedAt = startedAt
		this.stateEndsAt = startedAt + duration
		this.animationOffset = animationOffset
	}

	render(now) {
		if (this.state === STATE_START_WAIT) {
			this.sprite.gotoAndStop(0)
			return
		}

		if (this.state === STATE_IDLE || this.state === STATE_IDLE_RESUME) {
			return
		}

		const elapsed = this.animationOffset + Math.max(0, now - this.stateStartedAt)
		const frame = Math.floor((elapsed / 1000) * this.sprite.__ognitroFps)
		const lastFrame = this.sprite.totalFrames - 1

		if (this.state === STATE_LOOK || this.state === STATE_TURN_FORWARD) {
			this.sprite.gotoAndStop(Math.min(frame, lastFrame))
		}
		else if (this.state === STATE_TURN_REVERSE) {
			this.sprite.gotoAndStop(Math.max(lastFrame - frame, 0))
		}
		else {
			this.sprite.gotoAndStop(frame % this.sprite.totalFrames)
		}
	}

	isMoving() {
		return !this.raceFinished && this.animations.idle.config.props.fps > 0
	}

	syncMovementState(now) {
		const isMoving = this.isMoving()
		if (isMoving !== this.wasMoving) {
			this.wasMoving = isMoving
			this.suppressBark = !isMoving
			if (!isMoving) {
				this.enterStartWait(now)
				return
			}

			if (this.state === STATE_START_WAIT) {
				this.enterIdle(now)
				return
			}
			if (this.state === STATE_START) {
				this.shortenToCurrentLoop(now, animationDuration(this.animations.start))
			}
			else if (this.state === STATE_BARK) {
				this.shortenToCurrentLoop(now, this.barkLoopDuration)
			}
		}

		if (isMoving) return
		if (this.state !== STATE_IDLE && this.state !== STATE_IDLE_RESUME) return
		this.enterStartWait(now)
	}

	shortenToCurrentLoop(now, loopDuration) {
		const elapsed = Math.max(0, now - this.stateStartedAt)
		const loop = Math.max(1, Math.ceil((elapsed / loopDuration) - 1e-9))
		this.stateEndsAt = Math.min(this.stateEndsAt,
			this.stateStartedAt + (loop * loopDuration))
	}

	updateBarkSound(now) {
		if (this.state !== STATE_BARK) return

		const elapsed = Math.max(0, now - this.stateStartedAt)
		const midpointsPassed = Math.min(this.barkLoopCount,
			Math.floor((elapsed + (this.barkLoopDuration / 2)) / this.barkLoopDuration))

		while (this.barkSoundsPlayed < midpointsPassed) {
			this.playBarkSound(this.barkSounds[this.barkSoundsPlayed++])
		}
	}

	playBarkSound(key) {
		if (!this.shouldPlayBarkSound()) return

		const sound = audio.create('sfx', key)
		sound.volume(VOLUME_OGNITRO_BARK)
		sound.play()
	}

	shouldPlayBarkSound() {
		const audience = this.car?.options?.tweaks?.bark || 'all'
		return audience !== 'none'
			&& (audience !== 'self' || !!this.car?.options?.isPlayer)
	}
}

function findAnimations(obj) {
	const results = [ ]

	for (const child of obj.children || [ ]) {
		if (child.role?.some(role => role.indexOf('animation:') === 0)) {
			results.push(child)
		}
		results.push(...findAnimations(child))
	}

	return results
}

function findAnimation(obj, role) {
	return findAnimations(obj).find(child => child.role.includes(role))
}

function animationDuration(sprite) {
	return (sprite.totalFrames / sprite.__ognitroFps) * 1000
}

function randomDuration(min, max) {
	return min + (Math.random() * (max - min))
}

function createBarkSoundOrder(loopCount) {
	if (loopCount === 1) {
		return [ Math.random() < 0.5 ? 'bark_1' : 'bark_2' ]
	}

	return Math.random() < 0.5
		? [ 'bark_1', 'bark_2' ]
		: [ 'bark_2', 'bark_1' ]
}
