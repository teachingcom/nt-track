import { BaseView } from '../base'
import { animate, findDisplayObjectsOfRole, PIXI, removeDisplayObject } from 'nt-animator'

import Treadmill from '../../components/treadmill'
import Car from '../../components/car'
import Trail from '../../components/trail'
import { TRAIL_SCALE_IN_PREVIEW } from '../../config'
import { LAYER_TRAIL } from '../track/layers'
import { waitForCondition } from '../../utils/wait'

const DEFAULT_MAX_HEIGHT = 250
const OTHER_DRIVER_OFFSCREEN_DISTANCE = -1200
const CONTENT_Y = -25
const CONTENT_X = 125

export default class CustomizerView extends BaseView {

  // the camera focus point
  focus = { x: 130, y: 0 }
  
  // initializes the view
  async init (options) {
    await super.init({
      scale: { DEFAULT_MAX_HEIGHT },
      backgroundColor: 0x222835,
      useDynamicPerformance: false,
      // forceCanvas: true,
      ...options
    })


    this.namecardContainer = new PIXI.ResponsiveContainer()
    this.namecardContainer.relativeX = 0.5
    this.namecardContainer.relativeY = 0.375
    const namecard = await this.animator.create('namecards/gold')
    this.stage.addChild(this.namecardContainer)
    this.namecardContainer.addChild(namecard)


    // // setup the main view
    // this.workspace = new PIXI.ResponsiveContainer()
    // this.workspace.scaleX = 1
    // this.workspace.scaleY = 1
    // this.workspace.relativeX = 0.275
    // this.workspace.relativeY = 0.5

    // // setup a container used for panning the view
    // this.viewport = new PIXI.Container()

    // // create containers
    // this.workspace.addChild(this.viewport)
    // this.stage.addChild(this.workspace)

    // // attach elements
    // await this._createTreadmill()
    // await this._createOtherDriver()
    // await this._createSprayer()

    // // make sure the game animates relative values
    // this.animationVariables.speed = 1
    // this.animationVariables.base_speed = 1
    // this.animationVariables.movement = 1
    
    // begin rendering
    this.startAutoRender()
    this.ready = true
  }

  async _createOtherDriver() {
    this.otherDriver = await this.animator.getSprite('extras/customizer', 'driver')
    this.viewport.addChild(this.otherDriver)
    
    // speed that the other driver passes at
    this.passingSpeed = 0

    // animate
    this.otherDriver.visible = false
    this.otherDriver.scale.x = this.otherDriver.scale.y = 1.1
    this.otherDriver.pivot.y = this.otherDriver.height / 2

    // queue the next pass attempt
    this._queuePassing()
  }

  // creates the scrolling treadmill area
  async _createTreadmill () {
    // create segments
    this.treadmill = await Treadmill.create({
      totalSegments: 10,
      fitToHeight: 700,
      onCreateSegment: () => this.animator.create('extras/customizer')
    })

    // set the position
    this.treadmill.y = -140
    this.treadmill.x = 0
    this.treadmill.scale.x = this.treadmill.scale.y = 0.8

    // add the treadmill to the view
    const container = new PIXI.Container()
    container.addChild(this.treadmill)

    // add to the main view
    this.viewport.addChild(container)
    this.viewport.x = CONTENT_X
  }

  // creates a paint spray effect
  async _createSprayer() {
    const sprayer = await this.animator.create('extras/sprayer')
    sprayer.y = CONTENT_Y
    sprayer.x = CONTENT_X
    sprayer.controller?.stopEmitters()

    this.sprayer = sprayer
    this.workspace.addChild(sprayer)
  }

  async waitForActivity(activity) {
    return await waitForCondition(
      `customizer:wait-for-car-to-${activity}`, 
      { single: true }, 
      () => !!this.isReady
    );
  }

  // changes the paint for a car
  async setPaint (hue) {
    await this.waitForActivity('paint');

    // performt the paint effect
    if (this.sprayer) {
      this.sprayer.controller?.activateEmitters()
      clearTimeout(this.__pendingHueShift)
      clearTimeout(this.__clearSprayingEffect)
      this.__clearSprayingEffect = setTimeout(() => {
        this.sprayer?.controller?.stopEmitters()
      }, 1000)
    }
    
    // perform the switch
    // if the car is missing, then it's probably in
    // a transitional phase and can be skipped
    this.__pendingHueShift = setTimeout(() => {
      this.car?.repaintCar(hue);
    }, 300)
  }

  // replaces the active car
  async setCar ({ type, hue, isAnimated, trail, tweaks }) {
    return
    this.isReady = false

    // clear the existing data
    this._removeExistingCars()

    // create the new car instance
    const car = await Car.create({
      view: this,
      baseHeight: 150,
      type,
      isAnimated,
      hue,
      tweaks,
      lighting: { x: -5, y: 7 }
    })

    // put the car inside of a container that
    // can be used to attach trails and 
    // other effects to
    const container = new PIXI.Container()
    container.pivot.x = 0.5
    container.scale.x = container.scale.y = 0.85
    container.y = CONTENT_Y
    container.alpha = 0
    container.isCar = true

    // add to the view
    container.addChild(car)
    this.viewport.addChild(container)

    // used for certain animation effects
    container.isPlayerRoot = true
    container.movement = 1

    this.container = container
    this.car = car

    // set the trail to use, otherwise
    // just dispose of the active one
    delete this.trail
    if (trail) {
      await this.setTrail(trail, false)
    }
    
    // animate the new car into view
    this.isReady = true
    return this._animatePlayerCarIntoView(this.container)
  }

  async setTrail(type, waitForReady = true) {
    // wait for the customizer to be ready for changes, if needed
    if (waitForReady) {
      await this.waitForActivity('trail');
    }

    this.trail?.dispose()

    // if there's not a trail, they probably set
    // it to none
    if (!type) {
      return
    }

    // set the trail
    const trail = await Trail.create({
      view: this,
      baseHeight: 130,
      type
    })

    // in case of an unusual scenario where
    // a trail might not be disposed, go ahead and target
    // each trail part and remove it individually
    try {
      if (this.trail) {
        removeDisplayObject(this.trail)
      }
    }
    // nothing to do here
    catch (ex) { }

    // attach to the view
    this.trail = trail
    this.container.addChild(this.trail)
    this.trail.x = this.car.positions.back
    this.trail.scale.x = this.trail.scale.y = TRAIL_SCALE_IN_PREVIEW
    Trail.setLayer(this.trail, this.car);
    
    this.container.sortChildren()


    // also, fade in the trails
    animate({
      duration: 500,
      from: { t: 0 },
      to: { t: 1 },
      loop: false,
      update: update => {
        trail.alpha = update.t
      }
    })
  }

  // queues the next time the extra should pass
  _queuePassing()  {
    const nextPass = 0 | (3000 + (Math.random() * 4000))
    setTimeout(() => {
      this.otherDriver.visible = true
      this.otherDriver.x = 500
      this.passingSpeed = (Math.random() * 5) + 8
    }, nextPass)
  }

  // animates an object into the center of the view
  _animatePlayerCarIntoView(obj) {
    return new Promise(resolve => {
      // determine the middle section
      const mid = Math.floor((this.width / this.ssaaScalingLevel) / -2)
      animate({
        loop: false,
        duration: 500,
        easing: 'easeOutQuad',
        from: { t: 0 },
        to: { t: 1 },
        update: props => {
          obj.x = (1 - props.t) * mid
          obj.alpha = props.t
        },

        // finishing
        complete: () => {
          
          // if there's a left over car
          for (const child of this.viewport.children) {
            if (child.ready && child.isCar && child !== obj) {
              removeDisplayObject(child)
            }
          }
          
          // finish
          obj.ready = true
          resolve()
        }
      })
    })
  }

  // removes all existing cars on the view
  _removeExistingCars() {
    for (const child of this.viewport.children) {
      if (!child.isCar) {
        continue
      }

      // remove the car
      child.ready = false
      animate({
        loop: false,
        duration: 200,
        easing: 'easeInQuad',
        from: { t: 1 },
        to: { t: 0 },
        update: props => {
          child.x = (1 - props.t) * 400
          child.alpha = props.t
        },
        complete: () => {
          removeDisplayObject(child)
        }
      })
    }
  }

  // NOT IMPLEMENTED YET
  // setNamecard () { }
  // setNitro () { }
  // setSpeedTrail () { }
  // setCelebration () { }

  getFocusForZone(zone) {
    switch (zone) {
      case 'trail':
        const center = (this.car?.width || 240) / 2
        return { x: CONTENT_X + 200 + center, y: 0 }

      default:
        return { x: CONTENT_X + 155, y: 0 }
    }
  }

  // sets the current focal point
  setFocus (zone) {
    // cancel prior animations
    this.__panViewport?.stop()

    // animate the next view
    const { x, y } = this.getFocusForZone(zone)
    this.__panViewport = animate({
      from: { ...this.focus },
      to: { x, y },
      duration: 700,
      easing: 'easeInOutQuad',
      loop: false,
      update: t => this.focus = t
    })
  }

  // renders the view
  _render (...args) {
    if (!this.ready) {
      return
    }

    // get timings
    const now = Date.now()
    const delta = Math.min(2, this.getDeltaTime(now))
    
    // match the viewport to the focal point
    this.viewport.x = this.focus.x
    this.viewport.y = this.focus.y

    // show a car passing by
    if (this.otherDriver.x > OTHER_DRIVER_OFFSCREEN_DISTANCE) {
      this.otherDriver.x -= this.passingSpeed
      this.otherDriver.y = 210 + (Math.cos(now * 0.003) * 10)

      if (this.otherDriver.x < OTHER_DRIVER_OFFSCREEN_DISTANCE) {
        this._queuePassing()
      }
    }

    // check for the currently previewed car
    // animates the car shifting back and forth
    if (this.container?.ready) {
      this.container.offsetScale = Math.min(1, (this.container.offsetScale || 0) + 0.01)
      this.container.y = CONTENT_Y + ((Math.cos(now * 0.0007) * 11) * this.container.offsetScale)
      this.container.x = (Math.sin(now * 0.001) * 20) * this.container.offsetScale
    }
  
    // cause the view to shift left and right  
    const viewportTurnAngle = Math.min(0, Math.cos(now * 0.00015)) * (Math.cos(now * 0.0005) * -(Math.PI * 0.05))
    this.viewport.rotation = viewportTurnAngle

    // scroll the track
    this.treadmill.update({
      diff: (-45 + Math.abs(viewportTurnAngle * 90)) * delta,
      horizontalWrap: -600
    })

    super.render(...args)
  }

}
