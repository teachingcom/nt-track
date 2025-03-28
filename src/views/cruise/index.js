import Car from '../../components/car'
import Trail from '../../components/trail'
import { animate, getBoundsForRole, PIXI } from 'nt-animator'
import { BaseView } from '../base'
import Treadmill from '../../components/treadmill'
import { NITRO_SCALE, TRAIL_SCALE_IN_PREVIEW } from '../../config'
import { LAYER_TRAIL } from '../track/layers'
import NameCard from '../../components/namecard'
import Nitro from '../../components/nitro'

// config
const DEFAULT_MAX_HEIGHT = 250

// extra scaling when looking at trails
const CRUISE_VIEW_BONUS_SCALING = 1.3
const FIRST_NITRO_DELAY = 1000
const NITRO_ACTIVATION_INTERVAL = 4000

// creates a rolling view for an individual car
export default class CruiseView extends BaseView {

  step = 0
  container = new PIXI.Container()

  // preferred target locations
  originX = 660
  originY = 350

  // animated sway rotation scaling
  swayScaling = 1
  swayOffset = 0

  async init (options) {
    // initialize the view
    await super.init({
      scale: { DEFAULT_MAX_HEIGHT },
      useDynamicPerformance: false,
      ...options
    })

    // prepare the view
    await this._initCar(options);
    await this._initView()
    this._initAnimations()
    
    // automatically render
    this.startAutoRender()
  }

  // creates the rolling track
  async _initView() {
    this.treadmill = await Treadmill.create({
      totalSegments: 10,
      fitToHeight: 700,
      onCreateSegment: () => this.animator.create('extras/cruise')
    })

    // reset the pivot
    this.treadmill.pivot.x = 0
    this.treadmill.pivot.y = 0
    
    // set the container positions
    // this.container.alpha = 0
    this.container.pivot.x = 420
    this.container.pivot.y = 350
    this.container.y = this.view.height * 0.5
    this.container.x = -1.5

    // slightly larger
    this.container.scale.x = this.container.scale.y = 1.2;
    
    // if this is a trail preview, focus differently
    if (['trail', 'nitro'].includes(this.options.focus)) {
      this.container.scale.x = this.container.scale.y = 1.5;
      this.container.pivot.x -= 250
    }

    // if this is a trail preview, focus differently
    if (this.options.focus === 'nametag') {
      this.container.scale.x = this.container.scale.y = 1;
      this.container.pivot.x -= 250
      this.swayScaling = 0.2
    }

    // assemble the view
    this.container.addChild(this.treadmill)
    this.container.addChild(this.car)
    this.view.addChild(this.container)
  }

  // creates the car to display
  async _initCar(options) {
    const baseHeight = 200
    const car = await Car.create({
			view: this, 
      type: options.type,
      isAnimated: options.isAnimated,
      tweaks: options.tweaks,
			hue: options.hue || 0,
      baseHeight,
      lighting: { x: -5, y: 7 }
    });

    // save the car reference
    this.carInstance = car

    // create the unified container
    const container = new PIXI.Container()
    container.x = this.originX
    container.y = this.originY
    container.alpha = 0

    // merge together
    container.addChild(car)

    // used for certain animation effects
    container.isPlayerRoot = true
    container.movement = 1

    if (options.trail) {
      const trail = await Trail.create({
        view: this,
        baseHeight: baseHeight * CRUISE_VIEW_BONUS_SCALING,
        type: options.trail
      })

      // link to a car
      container.addChild(trail)
      trail.scale.x = trail.scale.y = TRAIL_SCALE_IN_PREVIEW * CRUISE_VIEW_BONUS_SCALING
      trail.x = car.positions.back
      Trail.setLayer(trail, car)
      
      car.trail = trail
      container.sortChildren()
    }

    if (options.nametag && !options.nitro) {
      const namecard = await NameCard.create({
        view: this,
        baseHeight: baseHeight * CRUISE_VIEW_BONUS_SCALING,
        ...options.nametag
      })

      // link to a car
      container.addChild(namecard)

      // shift the view over to fit the nametag
      this.originX += 620

      namecard.x = car.positions.back
      namecard.x -= namecard.width * 0.75
      namecard.visible = true
      namecard.scale.x = namecard.scale.y = 0.8
    }
    
    if (options.nitro) {
      const nitro = await Nitro.create({
        view: this,
        baseHeight: baseHeight * CRUISE_VIEW_BONUS_SCALING,
        type: options.nitro
      })
      
      // link to a car
      container.addChild(nitro)
      Nitro.setLayer(nitro, car)

			// update scaling
      Nitro.alignToCar(nitro, car, CRUISE_VIEW_BONUS_SCALING)
      car.nitro = nitro
			
      // queue up nitro animations
      setTimeout(this.activateNitro, FIRST_NITRO_DELAY)
    }

    // update layers
    container.sortChildren()

    // add the car
    this.car = container
  }

  _initAnimations() {
    const { car, view, container } = this

    // fade in the car
		this.__animate_fadeIn = animate({
			from: { alpha: 0 },
			to: { alpha: 1 },
			ease: 'linear',
      duration: 500,
			loop: false,
      update: props => car.alpha = props.alpha
		});

    
    // pan the animation into view
		this.__animate_entry = animate({
			from: { x: -1.5 },
			to: { x: view.width * 0.25 },
			ease: 'easeOutQuad',
      duration: 1500,
			loop: false,
      update: props => container.x = props.x
		});
    
		// animate the player entry
		this.__animate_backForth = animate({
			from: { x: -100 },
			to: { x: 150 },
			ease: 'easeInOutQuad',
      duration: 3000,
      direction: 'alternate',
			loop: true,
			update: props => car.x = this.originX + (props.x * this.swayScaling)
		});
    
		this.__animate_upDown = animate({
      from: { y: -100 },
			to: { y: 100 },
			ease: 'easeInOutQuad',
			duration: 6000,
      direction: 'alternate',
			loop: true,
			update: props => car.y = this.originY + (props.y * this.swayScaling)
		});
  }

  activateNitro = () => {
    this.carInstance?.activateNitro?.()
    this.__activateNitro = setTimeout(this.activateNitro, NITRO_ACTIVATION_INTERVAL)
  }

  // cleanup
  dispose = () => {
    // cancel rendering
    this.stopAutoRender()
    
    // stop animations
    this.__animate_fadeIn.stop()
    this.__animate_entry.stop()
    this.__animate_backForth.stop()
    this.__animate_upDown.stop()
    
    clearTimeout(this.__activateNitro)
  }
  
  render(...args) {
    if (this.treadmill && this.isViewActive) {
      const now = Date.now();
      const delta = Math.min(2, this.getDeltaTime(now));
      this.container.rotation = ((Math.sin(this.step++ / 300) / 5) + (Math.PI * -0.2)) * this.swayScaling
      this.container.rotation += this.swayOffset
      this.treadmill.update({ diff: -25 * delta, horizontalWrap: -1500 })
    }
    super.render(...args)
  }
}
