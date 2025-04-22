import { createContext, loadImage, PIXI, removeDisplayObject } from 'nt-animator'
import NameCard from '../../components/namecard'
import Trail from '../../components/trail'
import { BaseView } from '../base'
import { LAYER_TRAIL } from '../track/layers'
import Nitro from '../../components/nitro'

// config
const DEFAULT_MAX_HEIGHT = 250
const NITRO_DELAY = 1000
const NITRO_INTERVAL = 4000

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
				await this._initTrailPreview()
				break

			// create a nametag preview 
			case 'namecard-preview':
			case 'nametag-preview':
				await this._initNametagPreview()
				break
			
			// load an animated nitro
			case 'nitro-preview':
				await this._initNitroPreview()
				break

			// load a generic animation
			default:
				console.log('default', options, options.mode)
    		await this._initResource()
		}
		
		// automatically render
    this.startAutoRender()

		// notify this is ready to go
		if (options.mode === 'nitro-preview') {		
			options.onNitroReady?.()
		}
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

	async _initCarBumper() {
		const { getCarUrl, playerCar } = this.options
		let bumper

		if (playerCar) {
			const url = getCarUrl(playerCar.id, true, playerCar.hue)
			const img = await loadImage(url)
			const back = createBumper(img)
			
			// load all assets used
			const texture = PIXI.Texture.from(back)
			bumper = new PIXI.Sprite(texture)

			// align for car images
			bumper.rotation = Math.PI
			bumper.scale.x = bumper.scale.y = 1.5
			bumper.pivot.x = (bumper.width / 1.5) * 0.95
			bumper.pivot.y = (bumper.height / 1.5) * 0.5
		}
		// without a player car, create a false car
		else {
			bumper = await this.animator.getSprite('extras/shop', 'car_tail')
			
			// align for the false car
			bumper.pivot.x = bumper.width * 0.05
			bumper.pivot.y = bumper.height * 0.5
			bumper.scale.x = bumper.scale.y = 0.7
		}

		const contain = new PIXI.Container()
		contain.addChild(bumper)
		contain.sprite = bumper

		return contain
	}

	// trails are shifted over and a fake car
	// bumper is shown behind it
	async _initTrailPreview() {
		// load the user car
		const bumper = await this._initCarBumper()	

		// create the trail
		const trail = await Trail.create({
			view: this,
			baseHeight: this.preferredHeight,
			type: this.options.path
		});

		// trim the view so the gradient car doesn't
		// peek any trails underneath
		if (!trail.isOverCar) {
			const graphics = new PIXI.Graphics();
			graphics.beginFill(0xFF3300);
			graphics.drawRect(0, 0, 800, 500);
			graphics.endFill();
			graphics.pivot.x = 800;
			graphics.x = trail.x
			trail.mask = graphics;
		}

		// setup the main container
		this.container.scale.x = this.container.scale.y = this.options.scale || 1
		this.container.relativeX = 0.75

		// set the position for the faded background
		// to help the trails stand out more
		let bg
		if (!this.options.hideBackground) {
			bg = await this.animator.getSprite('extras/shop', 'asset_bg')
			bg.pivot.x = bg.width
			bg.pivot.y = bg.height * 0.5
			bg.alpha = 0.66
			bg.x = bg.width * 0.2
		}

		// since we're using the trail class for the trail
		// we need a shared container to help make sure
		// the trail lines up correctly using the 
		// attachTo function
		const contain = new PIXI.Container()
		contain.sortableChildren = true;
		contain.addChild(trail)
		contain.addChild(bumper)
		
		// assemble all layers
		if (bg) {
			this.container.addChild(bg)
		}
		this.container.addChild(contain);

		// adjust z-index as needed
		Trail.setLayer(trail, bumper);
		contain.sortChildren();
	}

	async _initNametagPreview() {
		// load the user car
		let bumper
		if (!this.options.assetOnly) {
			bumper = await this._initCarBumper()	
		}

		// create the nametag
		const namecard = await NameCard.create({
			view: this,
			baseHeight: this.preferredHeight,
			...this.options,
			...this.options.nametag,
			type: this.options.path
		})

		// set positions
		if (bumper) {
			bumper.x = (namecard.width * 0.5)
			bumper.scale.x = bumper.scale.y = 1.85
			bumper.x += (namecard.x * 0.5)
			namecard.x = namecard.width * -0.075
		}

		// since we're using the trail class for the trail
		// we need a shared container to help make sure
		// the trail lines up correctly using the 
		// attachTo function
		const contain = new PIXI.Container()
		contain.sortableChildren = true
		contain.addChild(namecard)

		// add the bumper, if any
		if (bumper) {
			contain.addChild(bumper)
		}

		// display
		contain.sortChildren()
		namecard.visible = true
		this.container.addChild(contain);
	}

	// a nitro is shown and animated from time to time
	async _initNitroPreview() {
		// load the user car
		const bumper = await this._initCarBumper()	
		const nitro = await Nitro.create({
			view: this,
			baseHeight: this.preferredHeight,
			type: this.options.path
		})

		this.nitro = nitro

		// set the position for the faded background
		// to help the trails stand out more
		let bg
		if (!this.options.hideBackground) {
			bg = await this.animator.getSprite('extras/shop', 'asset_bg')
			bg.pivot.x = bg.width
			bg.pivot.y = bg.height * 0.5
			bg.scale.x = 1.33
			bg.alpha = 0.66
		}
		
		// put everything into a view container
		const contain = new PIXI.Container()
		contain.addChild(bumper)
		contain.x = Math.max(0, (this.view.width * 0.3))
		
		// config overrides this value
		if (nitro.config.preview?.x) {
			contain.x = nitro.config.preview.x
		}
		
		// adds the background
		if (bg) {
			this.container.addChild(bg)
			bg.x = contain.x + bumper.width
			bg.zIndex - 100
		}

		// make sure to layer correctly
		Nitro.setLayer(nitro)
		contain.addChild(nitro)
		contain.sortChildren()
		

		this.container.addChild(contain);
	}

	activateNitro = () => {
		this.nitro.activate()

		// notify as needed
		this.defaultOptions.onActivateNitro?.()
	}

  // cleanup
  dispose = () => {
    // cancel rendering
    this.stopAutoRender()

		// stop timers
		clearTimeout(this.__activateNitroInit)
		clearInterval(this.__activateNitroInterval)

		// remove all objects and animations
		removeDisplayObject(this.obj);
  }
  
}


// creates a car bumper from the provided image
const cache = { }
function createBumper(img) {
	if (cache[img.src]) {
		return cache[img.src]
	}
	
	// create the drawing surface
	const fade = createContext()
	const { height } = img
	const width = 80

	// match the preferred size
	fade.resize(width, height)
	
	// create a faded gradient to hide the rest of the car
	const gradient = fade.ctx.createLinearGradient(0, 0, width, 0)
	gradient.addColorStop(0, 'rgba(0,0,0,0)')
	gradient.addColorStop(0.25, 'rgba(0,0,0,1)')
	gradient.addColorStop(1, 'rgba(0,0,0,1)')
	
	// draw the faded bumper
	fade.ctx.fillStyle = gradient
	fade.ctx.fillRect(0, 0, width, height)
	fade.ctx.globalCompositeOperation = 'source-in'
	fade.ctx.drawImage(img, width - img.width, 0)

	// give back the faded version
	cache[img.src] = fade.canvas
	return fade.canvas
}