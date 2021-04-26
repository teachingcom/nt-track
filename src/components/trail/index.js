import { PIXI, removeDisplayObject } from 'nt-animator';
import { merge, noop } from '../../utils';

export default class Trail extends PIXI.DetatchedContainer {

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

  // syncs a trail position to a car
  syncToCar(car) {

  }

  // TODO: there's some mismatch in these behaviors (link/alignTo)

  // links a trail to a car
  link({ car, container = car }, action = noop) {
    this.linkedTo = car;
    this.attachTo(car)
    this.each(part => {
      action(part);

      // sync to the back of the car
      part.x = car.positions.back * (car.pivot.x / car.bounds.width)
    });
  }

  alignTo(car, position) {
    this.each(part => {
      part.x = car.positions[position] * car.pivot.x
    });
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
    this.each(removeDisplayObject)
  }
}
