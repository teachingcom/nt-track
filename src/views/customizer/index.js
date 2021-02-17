import { BaseView } from '../base'
import { animate, findDisplayObjectsOfRole, getBoundsForRole, PIXI } from 'nt-animator'

import Player from '../track/player'
import Treadmill from '../../components/treadmill'

const DEFAULT_MAX_HEIGHT = 250

export default class CustomizerView extends BaseView {
  async init (options) {
    await super.init({
      scale: { DEFAULT_MAX_HEIGHT },
      backgroundColor: 0x222835,
      // useDynamicPerformance: false,
      // forceCanvas: true,
      ...options
    })

    // automatically render
    this.workspace = new PIXI.ResponsiveContainer()
    this.container = new PIXI.Container()

    // create segments
    this.treadmill = await Treadmill.create({
      totalSegments: 10,
      fitToHeight: 700,
      onCreateSegment: () => this.animator.create('extras/cruise')
    })

    this.workspace.scaleX = 1
    this.workspace.scaleY = 1
    this.workspace.relativeX = 0.275
    this.workspace.relativeY = 0.5

    const tr = new PIXI.Container()
    tr.addChild(this.treadmill)
    this.treadmill.y = -220
    this.treadmill.scale.x = this.treadmill.scale.y = 0.7

    this.container.addChild(tr)
    tr.x = -400

    this.workspace.addChild(this.container)
    this.stage.addChild(this.workspace)

    this.startAutoRender()
  }

  setPaint (hue) {

  }

  setFocus(zone) {

    if (this._transition) {
      this._transition.stop()
    }

    
    const start = { 
      x: this.container.x,
      y: this.container.y,
      scale: this.container.scale.x,
    }

    const end = { ...start }

    if (zone === 'back') {
      end.x = this.bounds.width * 1.6
      end.y = 0
      end.scale = 0.75
    }
    else if (zone === 'namecard') {
      end.x = -this.namecard.x * 2
      end.y = -this.namecard.y * 2
      end.scale = 2
    }
    else if (zone === 'car') {
      end.x = 0
      end.y = 0
      end.scale = 1
    }

    this._transition = animate({
      duration: 500,
      ease: 'easeInOutQuad',
      from: start,
      to: end,
      loop: false,
      update: props => {
        this.container.x = props.x
        this.container.y = props.y
        this.container.scale.x = this.container.scale.y = props.scale
      }
    })

  }

  async replaceCar({ carId, hue, isCarAnimated, playerName, playerTeam, trailId, namecardId, isNamecardAnimated }) {

    if (this.player) {
      this.player.dispose()
    }

    this.player = await Player.create({
      view: this,
      type: carId,
      hue,
      playerName,
      playerTeam,
      isAnimated: isCarAnimated,
      mods: {
        // trail: trailId,
        // card: namecardId,
        // isNamecardAnimated
      }
    })

    return this.player;
  }

  repaintCar (hue) {
    this.player.repaintCar(hue)
  }

  async updateCar ({ carId, isCarAnimated, hue }) {

    let player = this.player;
    if (this.carId !== carId) {
      player = await this.replaceCar({ carId, hue, isCarAnimated })
    }
    else if (this.hue !== hue) { 
      player.repaintCar(hue)
    }
    
    this.carId = carId
    this.hue = hue
    this.player = player

    // check for things that require a full rebuild


    // finds the bounds for a car - if nothing was
    // found then it's most likely a simple car.
    // use the sprite height of the car
    this.bounds = getBoundsForRole(player.car, 'base') || player.car

    // calculate scale - include some extra
    // padding to make sure effects (if any) are visible
    // const display = this.getDisplaySize()
    // const target = display.height
    // const scale = (target / bounds.height) // * EFFECTS_PADDING_SCALING

    // setup the car
    // container.addChild(car);
    // car.pivot.x = 0.5;
    // car.pivot.y = 0.5;
    // car.scale.x = scale;
    // car.scale.y = scale;

    // setup the container
    // container.scale.x = scale
    // container.scale.y = scale
    // container.relativeX = 0.5
    // container.relativeY = 0.5
    // container.rotation = Math.PI

    // console.log(player);

    player.scaleX = 0.7
    player.scaleY = 0.7
    player.relativeX = 0.1
    player.relativeY = 0

    const nc = player.namecard
    nc.x = -200
    nc.y = -400
    
    nc.scale.x = 0.8
    nc.scale.y = 0.8

    this.namecard = nc
    // container.addChild(player)
    this.container.addChild(player)
    this.container.addChild(nc)
  }

  setTrail (trail) {

  }

  setNitro (nitro) {

  }

  setNamecard (namecard) {

  }

  focusOnCar () {

  }

  focusOnTrail () {

  }

  focusOnNamecard () {

  }
  
  step = 0

  render (...args) {
    if (this.treadmill) {
      const now = Date.now()
      const delta = this.getDeltaTime(now)
      // this.container.rotation = (Math.sin(this.step++ / 300) / 5) + (Math.PI * -0.2)
      this.treadmill.update({ diff: -45 * delta, horizontalWrap: -200 })
    }
    super.render(...args)
  }

  // focusOnCelebrations () { }
}
