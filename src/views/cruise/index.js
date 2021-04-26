import Car from '../../components/car'
import Trail from '../../components/trail'
import { animate, getBoundsForRole, PIXI } from 'nt-animator'
import { BaseView } from '../base'
import Treadmill from '../../components/treadmill'

// config
const DEFAULT_MAX_HEIGHT = 250

// creates a rolling view for an individual car
export default class CruiseView extends BaseView {

  step = 0
  container = new PIXI.Container()

  // preferred target locations
  originX = 660
  originY = 350

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
    if (this.options.focus === 'trail') {
      this.container.scale.x = this.container.scale.y = 1.5;
      this.container.pivot.x -= 250
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
			hue: options.hue || 0,
      baseHeight,
      lighting: { x: -5, y: 7 }
    });

    if (options.trail) {
      const trail = await Trail.create({
        view: this,
        baseHeight: baseHeight * 1.2,
        type: options.trail
      })

      trail.link({ car });
    }

    // create the unified container
    const container = new PIXI.Container();
    container.x = this.originX
    container.y = this.originY
    container.alpha = 0

    // merge together
    container.addChild(car)

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
			from: { x: this.originX - 100 },
			to: { x: this.originX + 150 },
			ease: 'easeInOutQuad',
      duration: 3000,
      direction: 'alternate',
			loop: true,
			update: props => car.x = props.x
		});
    
		this.__animate_upDown = animate({
      from: { y: this.originY - 100 },
			to: { y: this.originY + 100 },
			ease: 'easeInOutQuad',
			duration: 6000,
      direction: 'alternate',
			loop: true,
			update: props => car.y = props.y
		});
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
  }
  
  render(...args) {
    if (this.treadmill && this.isViewActive) {
      const now = Date.now();
      const delta = Math.min(2, this.getDeltaTime(now));
      this.container.rotation = (Math.sin(this.step++ / 300) / 5) + (Math.PI * -0.2)
      this.treadmill.update({ diff: -25 * delta, horizontalWrap: -1500 })
    }
    super.render(...args)
  }
}
