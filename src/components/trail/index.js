import { PIXI, removeDisplayObject } from 'nt-animator';
import { TRAIL_SCALE } from '../../config';
import { isNumber, merge, noop } from '../../utils';
import { LAYER_TRAIL } from '../../views/track/layers';

export default class Trail extends PIXI.Container {

  static setLayer(trail, car) {
    if (trail?.config?.layer) {
      if (trail.isOverCar) {
        const { zIndex } = car;
        trail.zIndex = zIndex + 1;
      }
      else if (isNumber(trail.config.layer)) {
        trail.zIndex = trail.config.layer;
      }
    }
    else {
      trail.zIndex = LAYER_TRAIL;
    }

    // if the trail is marked as linked, then
    // the x and y position need to sync to 
    // the car provided
    if (trail.config?.attached && car.car?.follow) {
      const follow = car.car.follow?.children[0] || { x: 0, y: 0 }
      trail.updateTransform = (...args) => {   
        
        // this is not 100% correct, but given the ranges the
        // x/y distance will ever be, it's close enough for now
        trail.trail.y = (follow.y * TRAIL_SCALE) * trail.scale.y
        trail.trail.x = (follow.x * TRAIL_SCALE) * trail.scale.x
        return PIXI.Container.prototype.updateTransform.apply(trail, args)
      };
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
