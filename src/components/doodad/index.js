import { findDisplayObjectsOfRole, PIXI, removeDisplayObject } from 'nt-animator';
import { isNumber, merge, noop } from '../../utils';
import { LAYER_TRAIL } from '../../views/track/layers';

export default class Doodad extends PIXI.Container {

  static COMPARISONS = {
    ':eq': (a, b) => a === b,
    ':gte': (a, b) => a >= b,
    ':gt': (a, b) => a > b,
    ':lte': (a, b) => a <= b,
    ':lt': (a, b) => a < b,
    ':mod': (a, b) => a % b === 0,
    ':even': (a) => a % 2 === 0,
    ':odd': (a) => a % 2 !== 0,
  }

  static setLayer(doodad, target = { zIndex: 0 }) {
    if (doodad?.config?.layer) {
      if (doodad.isOverCar) {
        doodad.zIndex = target.zIndex + 1;
      }
      else if (isNumber(doodad.config.layer)) {
        doodad.zIndex = doodad.config.layer;
      }
      else {
        doodad.zIndex = target.zIndex - 1;
      }
    }
    else {
      doodad.zIndex = LAYER_TRAIL;
    }
  }

  // toggle layers depending on conditions
  static evaluateConditions(level, nodes, remove = [ ]) {
    for (const node of nodes) {

      // has doodad config
      if (node.config?.doodad) {
        const [type, ...rest] = node.config.doodad
        const compare = Doodad.COMPARISONS[type]
        node.visible = !!(compare && rest.find(v => compare(level, v)))
      }

      // we don't need to evaluate this now
      if (!node.visible) {
        remove.push(node)
      }

      // check child nodes, if any
      if (node.visible && node.children?.length) {
        Doodad.evaluateConditions(level, node.children, remove)
      }
    }

    return remove
  }

  /** handles creating the new doodad instance */
  static async create (options) {
    const { type, level, view } = options

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

    // finally, we need to activate all doodad layers depending on rules
    const remove = Doodad.evaluateConditions(level, [ instance ])
    for (const node of remove) {
      removeDisplayObject(node)
    }

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
