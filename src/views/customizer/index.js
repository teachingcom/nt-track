import { BaseView } from '../base'
import { animate, PIXI, removeDisplayObject } from 'nt-animator'

import Treadmill from '../../components/treadmill'
import Car from '../../components/car'

const DEFAULT_MAX_HEIGHT = 250

export default class CustomizerView extends BaseView {
  offsetSpeed = 0
  
  async init (options) {
    await super.init({
      scale: { DEFAULT_MAX_HEIGHT },
      backgroundColor: 0x222835,
      // useDynamicPerformance: false,
      // forceCanvas: true,
      ...options
    })

    // setup the main view
    this.workspace = new PIXI.ResponsiveContainer()
    this.workspace.scaleX = 1
    this.workspace.scaleY = 1
    this.workspace.relativeX = 0.275
    this.workspace.relativeY = 0.5

    // setup a container used for panning the view
    this.viewport = new PIXI.Container()

    // create containers
    this.workspace.addChild(this.viewport)
    this.stage.addChild(this.workspace)

    // attach elements
    await this._createTreadmill()
    await this._createSprayer()
    
    // begin rendering
    this.startAutoRender()
  }

  // creates the scrolling treadmill area
  async _createTreadmill () {
    // create segments
    this.treadmill = await Treadmill.create({
      totalSegments: 10,
      fitToHeight: 700,
      onCreateSegment: () => this.animator.create('extras/cruise')
    })

    // set the position
    this.treadmill.y = -190
    this.treadmill.scale.x = this.treadmill.scale.y = 0.7

    // add the treadmill to the view
    const container = new PIXI.Container()
    container.addChild(this.treadmill)
    container.x = -400

    // add to the main view
    this.viewport.addChild(container)
  }

  async _createSprayer() {
    const sprayer = await this.animator.create('extras/sprayer')
    sprayer.y = -50
    sprayer.controller.stopEmitters()

    this.sprayer = sprayer
    this.workspace.addChild(sprayer)
  }

  // changes the paint for a car
  setPaint (hue) {
    this.sprayer.controller.activateEmitters()
    clearTimeout(this.__pendingHueShift)
    clearTimeout(this.__clearSprayingEffect)
    
    // perform the switch
    this.__pendingHueShift = setTimeout(() => this.car.repaintCar(hue), 300)
    this.__clearSprayingEffect = setTimeout(() => this.sprayer.controller.stopEmitters(), 1000)
  }

  // replaces the active car
  async setCar ({ type, hue, isAnimated }) {
    // remove all existing cars
    for (const child of this.viewport.children) {
      if (!child.car) {
        continue
      }

      // remove the car
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

    // create the new car to view
    const car = await Car.create({
      view: this,
      baseHeight: 140,
      type,
      isAnimated,
      hue
    })

    // cars have their pivot modified so they
    // would look correct on the track - for
    // now we'll just center it
    car.pivot.x = 0.5
    car.y = -50
    car.alpha = 0

    // add to the view
    this.viewport.addChild(car)
    this.car = car

    // animate into view
    return new Promise(resolve => {
      animate({
        loop: false,
        duration: 500,
        easing: 'easeOutQuad',
        from: { t: 0 },
        to: { t: 1 },
        update: props => {
          car.x = (1 - props.t) * -400
          car.alpha = props.t
        },
        completed: resolve
      })
    })
  }

  // NOT IMPLEMENTED YET
  // setTrail () { }
  // setNamecard () { }
  // setNitro () { }
  // setSpeedTrail () { }
  // setCelebration () { }
  setFocus (zone) { }

  // setFocus(zone) {

  //   if (this._transition) {
  //     this._transition.stop()
  //   }

    
  //   const start = { 
  //     x: this.container.x,
  //     y: this.container.y,
  //     scale: this.container.scale.x,
  //   }

  //   const end = { ...start }

  //   if (zone === 'back') {
  //     end.x = this.bounds.width * 1.6
  //     end.y = 0
  //     end.scale = 0.75
  //   }
  //   else if (zone === 'namecard') {
  //     end.x = -this.namecard.x * 2
  //     end.y = -this.namecard.y * 2
  //     end.scale = 2
  //   }
  //   else if (zone === 'car') {
  //     end.x = 0
  //     end.y = 0
  //     end.scale = 1
  //   }

  //   this._transition = animate({
  //     duration: 500,
  //     ease: 'easeInOutQuad',
  //     from: start,
  //     to: end,
  //     loop: false,
  //     update: props => {
  //       this.container.x = props.x
  //       this.container.y = props.y
  //       this.container.scale.x = this.container.scale.y = props.scale
  //     }
  //   })

  // }

  // async replaceCar({ carId, hue, isCarAnimated, playerName, playerTeam, trailId, namecardId, isNamecardAnimated }) {

  //   this.removeCurrent();
  //   const player = await Player.create({
  //     view: this,
  //     type: carId,
  //     hue,
  //     playerName,
  //     playerTeam,
  //     isAnimated: isCarAnimated,
  //     mods: {
  //       // trail: trailId,
  //       // card: namecardId,
  //       // isNamecardAnimated
  //     }
  //   })


  //   return new Promise(resolve => { 

  //     const dist = -400
  //     player.car.x = dist
  //     // player.car.alpha = 0

  //     animate({
  //       easing: 'easeOutQuad',
  //       duration: 600,
  //       from: { t: -500 },
  //       to: { t: 0 },
  //       loop: false,
  //       update: props => {
  //         console.log('fade in')
  //         // player.car.alpha = props.t
  //         // player.car.x = props.t
  //       },
  //       complete: () => {
  //         this.player = player
  //         resolve(this.player)
  //       }
  //     })
      
  //   })
  // }

  // // removes the current car preview, if any
  // async removeCurrent() {
  //   // nothing to remove
  //   if (!this.player) {
  //     return null
  //   }

  //   const remove = this.player
  //   return new Promise(resolve => {

  //     animate({
  //       from: { t: 1 },
  //       to: { t: 0 },
  //       easing: 'easeInQuad',
  //       loop: false,
  //       duration: 750,
  //       update: props => {
  //         remove.car.x = (1 - props.t) * 250 // Math.cos(props.t *)
  //         // remove.car.skew.y = Math.cos(props.t)
  //         remove.alpha = props.t
  //       },
  //       complete: () => {
  //         console.log('all remove')
  //         remove.dispose()
  //         resolve()
  //       }
  //     })

  //   });
  // }

  // repaintCar (hue) {
  //   this.player.repaintCar(hue)
  // }

  // async updateCar ({ carId, isCarAnimated, hue }) {

  //   let player = this.player;
  //   if (this.carId !== carId) {
  //     player = await this.replaceCar({ carId, hue, isCarAnimated })
  //   }
  //   else if (this.hue !== hue) { 
  //     player.repaintCar(hue)
  //   }

  //   // 
  //   this.carId = carId
  //   this.hue = hue
  //   this.player = player

  //   // use the bounds to determine car positions
  //   this.bounds = player.car.bounds

  //   // scale the player to the view
  //   player.scaleX = 0.7
  //   player.scaleY = 0.7
  //   player.relativeX = 0.1
  //   player.relativeY = 0

  //   // move the namecard off screen
  //   const nc = player.namecard
  //   nc.x = -200
  //   nc.y = -400
    
  //   nc.scale.x = 0.8
  //   nc.scale.y = 0.8

  //   this.namecard = nc
  //   // container.addChild(player)
  //   this.container.addChild(player)
  //   this.container.addChild(nc)
  // }

  // setTrail (trail) {

  // }

  // setNitro (nitro) {

  // }
  
  // renders the view
  render (...args) {
    if (this.treadmill) {
      const now = Date.now()
      const delta = Math.min(2, this.getDeltaTime(now))
      this.treadmill.update({ diff: -(45 + this.offsetSpeed) * delta, horizontalWrap: -200 })
    }

    super.render(...args)
  }

}
