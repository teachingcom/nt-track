import { BaseView } from '../base'
import { animate, findDisplayObjectsOfRole, getBoundsForRole, PIXI } from 'nt-animator'

import Player from '../track/player'

const DEFAULT_MAX_HEIGHT = 250

export default class CustomizerView extends BaseView {
  async init (options) {
    console.log('di in', options)
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

    this.workspace.scaleX = 1
    this.workspace.scaleY = 1
    this.workspace.relativeX = 0.275
    this.workspace.relativeY = 0.5

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

  async updateCar ({ carId, isCarAnimated, hue, trailId, namecardId, isNamecardAnimated }) {

    // check for things that require a full rebuild

    if (this.player) {
      this.player.dispose()
    }

    const player = this.player = await Player.create({
      view: this,
      type: carId,
      hue,
      playerName: 'BOSS MAN',
      playerTeam: 'NTRO',
      isAnimated: isCarAnimated,
      mods: {
        trail: trailId,
        card: namecardId,
        isNamecardAnimated
      }
    })

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

    player.scaleX = 1
    player.scaleY = 1
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

  // focusOnCelebrations () { }
}
