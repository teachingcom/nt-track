import { findDisplayObjectsOfRole, PIXI, removeDisplayObject } from 'nt-animator';
import { isNumber, merge, noop } from '../../utils';
import { LAYER_TRAIL } from '../../views/track/layers';

export default class Doodad extends PIXI.Container {

  static setLayer(doodad, target = { zIndex: 0 }) {
    if (doodad?.config?.layer) {
      if (doodad.isOverCar) {
        doodad.zIndex = target.zIndex + 1;
      }
      else if (isNumber(doodad.config.layer)) {
        doodad.zIndex = doodad.config.layer;
      }
    }
    else {
      doodad.zIndex = LAYER_TRAIL;
    }
  }

  /** handles creating the new doodad instance */
  static async create (options) {
    const { type, view } = options

    // resolve the doodad
    const path = `doodads/${type}`
    await view.animator.importManifest(path)
    const config = view.animator.lookup(path)

    // if this doesn't exist, don't try and create
    if (!config) return

    // determine the type to create
    const instance = new Doodad()
    merge(instance, { options, view, path, config })

    // initialize all car parts
    await instance._initDoodad()

    // if this didn't load for some reason
    if (!instance.isValid) return

    // give back the instance
    return instance
  }

  get isOverCar() {
    return /(over|above)_car/i.test(this.config?.layer)
  }

  // syncs a doodad position to a car
  syncToCar(car) {

  }

  alignTo(car, position) {
    this.x = car.positions[position] * car.pivot.x;
  }

  // start creating loot
  async _initDoodad () {
    const { view, options } = this
    const { type } = options

    // load the animation
    const path = `doodads/${type}`
    const doodad = this.doodad = await view.animator.create(path)
    if (!doodad) {
      console.error(`Unable to create doodad "${path}"`)
      return
    }

    // toggle visibility
    const tiers = findDisplayObjectsOfRole(doodad, 'tier')
    const limit = parseInt(window.location.search?.substring(1), 10) || 0
    for (const tier of tiers) {
      let condition
      let level

      // defaults to greater than or equal to
      if (typeof tier.config.tier === 'number' || tier.config.tier instanceof Number) {
        level = tier.config.tier
        condition = 'lte'
      }
      else {
        condition = tier.config.tier[0]
        level = tier.config.tier[1]
      }

      // check conditions
      const show = condition === 'lte' && limit >= level ? true
        : condition === 'only' && limit === level ? true
        : false

      // not usable
      if (!show) {
        tier.visible = false
        tier.controller?.stopEmitters?.()
      }
    }

    // save the doodad instance
    this.parts = doodad.children.slice()
    this.addChild(doodad)
  }

  /** is a valid Doodad instance */
  get isValid () {
    return this.parts && this.parts.length > 0
  }

  /** deactivates the doodad */
  stop () {
    this.doodad.controller.stopEmitters()
  }

  dispose() {
    this.stop()
    removeDisplayObject(this)
  }
}
