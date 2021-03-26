import { PIXI, removeDisplayObject } from 'nt-animator'
import Trail from '../../components/trail'
import { BaseView } from '../base'

// config
const DEFAULT_MAX_HEIGHT = 250

// creates an animated view for a resource
export default class AnimationView extends BaseView {

  async init (options) {
		this.defaultOptions  = options
		this.preferredHeight = options.baseHeight || DEFAULT_MAX_HEIGHT

    // initialize the view
    await super.init({
      scale: { height: this.preferredHeight },
      useDynamicPerformance: false,
			forceCanvas: !!options.useWebGL,
      ...options
    })

		this.container = new PIXI.ResponsiveContainer()
		this.container.relativeX = this.container.relativeY = 0.5
		this.view.addChild(this.container)

		// check for special modes
		switch (options.mode) {
			// create a trail preview 
			case 'trail-preview':
				this._initTrailPreview()
				break
			
			// load an animated nitro
			case 'nitro-preview':
				this._initNitroPreview()
				break

			// load a generic animation
			default:
    		await this._initResource()
		}
		
		// automatically render
    this.startAutoRender()
    
  }

  // creates the rolling track
  async _initResource() {
		const { scale, path } = this.defaultOptions

		await this.animator.importManifest(path)
    const animation = await this.animator.create(path)
		this.animation = animation

		animation.scale.x = animation.scale.y = scale || 1
		this.container.addChild(animation)
  }

	// trails are shifted over and a fake car
	// bumper is shown behind it
	async _initTrailPreview() {

		// load all assets used
		const bumper = await this.animator.getSprite('extras/shop', 'car_tail')
		const trail = await Trail.create({
			view: this,
			baseHeight: this.preferredHeight,
			type: this.options.path
		});

		// setup the main container
		this.container.scale.x = this.container.scale.y = this.options.scale || 1
		this.container.relativeX = 0.7

		// align the number
		bumper.pivot.x = bumper.width * 0.05
		bumper.pivot.y = bumper.height * 0.5

		// set the position for the faded background
		// to help the trails stand out more
		let bg
		if (!this.options.hideBackground) {
			bg = await this.animator.getSprite('extras/shop', 'asset_bg')
			bg.pivot.x = bg.width
			bg.pivot.y = bg.height * 0.5
			bg.alpha = 0.66
			bg.x = bg.width * 0.25
		}

		// since we're using the trail class for the trail
		// we need a shared container to help make sure
		// the trail lines up correctly using the 
		// attachTo function
		const contain = new PIXI.Container()
		contain.addChild(bumper)
		trail.attachTo(contain)

		// assemble all layers
		if (bg) {
			this.container.addChild(bg)
		}
		this.container.addChild(contain)
	}

	// a nitro is shown and animated from time to time
	async _initNitroPreview() {

	}

  // cleanup
  dispose = () => {
    // cancel rendering
    this.stopAutoRender()

		// remove all objects and animations
		removeDisplayObject(this.obj);
  }
  
}
