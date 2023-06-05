import Car from '../../components/car'
import { animate, createContext, findDisplayObjectsOfRole, getBoundsForRole, PIXI, removeDisplayObject } from 'nt-animator';
import { BaseView } from '../base'
import Trail from '../../components/trail';
import { TRAIL_SCALE } from '../../config';
import NameCard from '../../components/namecard';
import Treadmill from '../../components/treadmill';

const DEFAULT_MAX_HEIGHT = 250

export default class BundleView extends BaseView {

	goldOffset = 200

	async init (options) {
    // initialize the view
    await super.init({
      scale: { DEFAULT_MAX_HEIGHT },
      useDynamicPerformance: false,
      ...options
    })

		this.contentHasChanged = true

		this.treadmill = await Treadmill.create({
      totalSegments: 10,
      fitToHeight: 375,
      onCreateSegment: () => this.animator.create('extras/bundle')
    })

		this.resize(options.container.offsetWidth, options.container.offsetHeight)

		// setup the main view
    this.workspace = new PIXI.ResponsiveContainer()
    this.workspace.scaleX = 1
    this.workspace.scaleY = 1

    // this.workspace.relativeX = 0.275
    this.workspace.relativeY = 0.5
		this.workspace.relativeX = 0.5

		// when gold
		// this.workspace.relativeX = 0.8

		// make sure the game animates relative values
    this.animationVariables.speed = 1
    this.animationVariables.base_speed = 1
    this.animationVariables.movement = 1

		// setup a container used for panning the view
    this.viewport = new PIXI.Container()

		this.workspace.addChild(this.treadmill)
		this.workspace.addChild(this.viewport)
    this.stage.addChild(this.workspace)
    
    // automatically render
    this.startAutoRender()
  }

	active = { }

	async setContent({ car, trail, nametag }) {

		const carHasChanged = this.contentHasChanged || (this.active.car !== car?.type)
		const trailHasChanged = this.contentHasChanged || (this.active.trail !== trail?.type)
		const nametagHasChanged = this.contentHasChanged || (this.active.nametag !== nametag?.type)
		this.contentHasChanged = false

		this.active = {
			car: car?.type,
			trail: trail?.type,
			nametag: nametag?.type
		}

		// needs to remove the car
		for (const obj of [
			carHasChanged && this.car,
			trailHasChanged && this.trail,
			nametagHasChanged && this.nametag
		]) {
			obj && removeItem(obj)
		}

		// start queueing content to load
		const queue = [ ]
		if (car && carHasChanged) {
			queue.push(this._initCar(car))
		}
		if (trail && (carHasChanged || trailHasChanged)) {
			queue.push(this._initTrail(trail))
		}
		if (nametag && (carHasChanged || nametagHasChanged)) {
			queue.push(this._initNametag(nametag))
		}

		const pending = await Promise.all(queue)
		this._assemble(pending)

	}

	async _assemble() {
		const { car, trail, nametag } = this

		// used for certain animation effects
		if (car) {
			car.isPlayerRoot = true
			car.movement = 1
		}

		// update the trail
		if (trail) {
			car.addChild(trail)

			// position the trail correctly
			const zIndex = trail.config.layer === 'over_car' ? 100 : -100
			Trail.setLayer(trail, { zIndex })
			car.sortChildren()
			
			// set the view and scaling
			trail.x = car.positions.back / 2
			trail.scale.x = trail.scale.y = 0.75
		}

		// update the nametag
		if (nametag) {
			car.addChild(nametag)

			nametag.visible = true
			nametag.scale.x = nametag.scale.y = 0.8

			nametag.x = trail ? -600 : 0
		}

	}

	async _initCar({ type, hue, isAnimated }) {
		this.car = await Car.create({
			view: this, 
      type,
      isAnimated: isAnimated,
			hue: hue || 0,
			baseHeight: this.height * 0.225,
			lighting: { x: -5, y: 7 }
		})

		// add to the view
		this.viewport.addChild(this.car)
		showItem(this.car)
	}

	setFocus(target, instant) {
		
		let x = target === 'nametag' ? -(this.nametag?.x + (this.nametag?.width * 0.2))
			: target === 'trail' ? -this.car?.positions.back
			: this.car?.positions.back * 0.15

		// if nan or an error?
		x = x || 0

		// cancel the prior animation
		this.__animate_focus?.stop()

		if (instant) {
			this.viewport.x = x
			return
		}
		
		// focus to the new view
		this.__animate_focus = animate({
			from: { x: this.viewport.x },
			to: { x },
			ease: 'easeOutQuad',
      duration: 330,
			loop: false,
      update: props => {
				this.viewport.x = props.x
			}
		});

	}

	async _initTrail({ type }) {

		this.trail = await Trail.create({
      view: this,
      baseHeight: 200,
      type
    })

		showItem(this.trail)
	}

	async _initNametag({ type, name, tag, tagColor, rank }) {
		this.nametag = await NameCard.create({
			view: this,
			baseHeight: this.height * 0.225,
			type,
			name,
			team: tag,
			isAnimated: true,
			color: tagColor,
			playerRank: rank
		});

		showItem(this.nametag)
	}

	render(...args) {
		const now = Date.now()
		const delta = Math.min(2, this.getDeltaTime(now))
		this.treadmill?.update({
			diff: -25 * delta,
			horizontalWrap: -800
		})
		
		super.render(...args);
	}

}

function showItem(obj) {
	obj.alpha = 0

	animate({
		from: { a: 0 },
		to: { a: 1 },
		duration: 300,
		loop: false,
		ease: 'easeOutQuad',
		update: props => {
			obj.alpha = props.a
		}
	})
}

function removeItem(obj) {
	obj.removed = true

	return new Promise(resolve => {
		animate({
			from: { a: 1 },
			to: { a: 0 },
			ease: 'easeInQuad',
			duration: 300,
			loop: false,
			update: props => {
				obj.alpha = props.a
			},
			complete: () => {
				removeDisplayObject(obj)
				resolve()
			}
		})
	})
}