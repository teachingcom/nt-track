import Car from '../../components/car'
import { animate, getBoundsForRole, PIXI } from 'nt-animator'
import { BaseView } from '../base'
import Treadmill from '../../components/treadmill'

const DEFAULT_MAX_HEIGHT = 250

export default class CruiseView extends BaseView {

  step = 0
  container = new PIXI.Container()

  async init (options) {
    // initialize the view
    await super.init({
      scale: { DEFAULT_MAX_HEIGHT },
      useDynamicPerformance: false,
      ...options
    })

    // container for all things
    
    // load all resources
    // await this.animator.getSpritesheet('extras/cruise')

    // create segments
    this.treadmill = await Treadmill.create({
      totalSegments: 10,
      fitToHeight: 700,
      onCreateSegment: () => this.animator.create('extras/cruise')
    })

    const car = await Car.create({
			view: this, 
			type: options.type,
			hue: options.hue || 0,
      baseHeight: 220,
      lighting: { x: -5, y: 7 }
		});

    this.treadmill.pivot.x = 0
    this.treadmill.pivot.y = 0
    this.container.addChild(this.treadmill)
    this.container.addChild(car)
    this.view.addChild(this.container)

    const CAR_X = 660
    const CAR_Y = 350

    car.x = CAR_X
    car.y = CAR_Y
    car.alpha = 0
    
    // this.container.alpha = 0
    this.container.pivot.x = 420
    this.container.pivot.y = 350
    this.container.y = this.view.height * 0.5
    this.container.x = -1.5
  
    
    // fade in the car
		animate({
			from: { alpha: 0 },
			to: { alpha: 1 },
			ease: 'linear',
      duration: 500,
			loop: false,
      update: props => car.alpha = props.alpha
		});

    
    // pan the animation into view
		animate({
			from: { x: -1.5 },
			to: { x: this.view.width * 0.25 },
			ease: 'easeOutQuad',
      duration: 1500,
			loop: false,
      update: props => this.container.x = props.x
		});
    
		// animate the player entry
		animate({
			from: { x: CAR_X - 100 },
			to: { x: CAR_X + 150 },
			ease: 'easeInOutQuad',
      duration: 3000,
      direction: 'alternate',
			loop: true,
			update: props => car.x = props.x
		});
    
		animate({
      from: { y: CAR_Y - 100 },
			to: { y: CAR_Y + 100 },
			ease: 'easeInOutQuad',
			duration: 6000,
      direction: 'alternate',
			loop: true,
			update: props => car.y = props.y
		});
    

    // automatically render
    this.startAutoRender()
  }
  
  render(...args) {
    if (this.treadmill) {
      const now = Date.now();
      const delta = this.getDeltaTime(now);
      this.container.rotation = (Math.sin(this.step++ / 300) / 5) + (Math.PI * -0.2)
      this.treadmill.update({ diff: -25 * delta, horizontalWrap: -200 })
    }
    super.render(...args)
  }
}
