import * as wampus from './plugins/cars/wampus'

// ID to car mappings
// TODO: does this make sense to be part of the manifest?
const WAMPUS = 97
const XCELSIOR = 86
const FURZE_SCREW_TANK = 220
const FURZE_HOVER_BIKE = 221
const FURZE_JET_BIKE = 222

// look up special animations
export function getCarAnimations (id) {
  return CAR_MAPPINGS[id] || id
}

// look up car plugins
export function getCarPlugin (type) {
  return CAR_PLUGINS[type]
}

// various car plugins
export const CAR_PLUGINS = {
  [WAMPUS]: wampus.extend,
  wampus: wampus.extend
}

// mapping for advanced animation cars
export const CAR_MAPPINGS = {
  [XCELSIOR]: 'xcelsior',
  [WAMPUS]: 'wampus',
  [FURZE_HOVER_BIKE]: 'furze_hover_bike',
  [FURZE_JET_BIKE]: 'furze_jet_bike',
  [FURZE_SCREW_TANK]: 'furze_tank'
  // 15: 'xcelsior',
  // 3: 'grid',
}
