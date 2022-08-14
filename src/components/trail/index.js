import { PIXI, removeDisplayObject } from 'nt-animator';
import { isNumber, merge, noop } from '../../utils';
import { LAYER_TRAIL } from '../../views/track/layers';

export default class Trail extends PIXI.Container {

  static setLayer(trail, target = { zIndex: 0 }) {
    if (trail?.config?.layer) {
      if (trail.isOverCar) {
        trail.zIndex = target.zIndex + 1;
      }
      else if (isNumber(trail.config.layer)) {
        trail.zIndex = trail.config.layer;
      }
    }
    else {
      trail.zIndex = LAYER_TRAIL;
    }
  }

  /** handles creating the new trail instance */
  static async create (options) {
    const { type, view } = options

    // resolve the trail
    const path = `trails/${type}`
    await view.animator.importManifest(path)
    const config = view.animator.lookup(path)

    // if this doesn't exist, don't try and create
    if (!config) return

    // determine the type to create
    const instance = new Trail()
    merge(instance, { options, view, path, config })

    // initialize all car parts
    await instance._initTrail()

    // if this didn't load for some reason
    if (!instance.isValid) return

    // give back the instance
    return instance
  }

  get isOverCar() {
    return /(over|above)_car/i.test(this.config?.layer)
  }

  // syncs a trail position to a car
  syncToCar(car) {

  }

  alignTo(car, position) {
    this.x = car.positions[position] * car.pivot.x;
  }

  // start creating loot
  async _initTrail () {
    const { view, options } = this
    const { type } = options

    // load the animation
    const path = `trails/${type}`
    const trail = this.trail = await view.animator.create(path)
    if (!trail) {
      console.error(`Unable to create trail "${path}"`)
      return
    }

    // save the trail instance
    this.parts = trail.children.slice()
    this.addChild(trail)
  }

  /** is a valid Trail instance */
  get isValid () {
    return this.parts && this.parts.length > 0
  }

  /** deactivates the trail */
  stop () {
    this.trail.controller.stopEmitters()
  }

  dispose() {
    this.stop()
    removeDisplayObject(this)
  }
}
