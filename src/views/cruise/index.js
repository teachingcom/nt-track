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
			baseHeight: 220
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

    this.container.pivot.x = 420
    this.container.pivot.y = 350
    this.container.y = this.view.height * 0.5
    this.container.x = this.view.width * 0.25

    
    // setup the main
    // this.container.pivot.x = 200
    // this.container.pivot.y = this.view.height / 2
    // this.container.x = -100
    // this.container.y = this.view.height

    
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
      this.container.rotation = (Math.sin(this.step++ / 300) / 5) + (Math.PI * -0.2)
      this.treadmill.update({ diff: -25, horizontalWrap: -200 })
    }
    super.render(...args)
  }
}
