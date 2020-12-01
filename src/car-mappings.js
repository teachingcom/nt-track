import * as wampus from './plugins/cars/wampus'

// ID to car mappings
// TODO: does this make sense to be part of the manifest?
const WAMPUS = 97
const XCELSIOR = 86
const FURZE_SCREW_TANK = 220
const FURZE_HOVER_BIKE = 221
const FURZE_JET_BIKE = 222
const FROSTED_ROLLER = 192
const NT_GOLD = 175
const CHRISTMAS_TANK = 224
const WRAPPING_PAPER_PLANE = 223

// look up special animations
export function getCarAnimations (id) {
  return CAR_MAPPINGS[id] || id
}

// look up car plugins
export function getCarPlugin (type) {
  return CAR_PLUGINS[type]
}

// look up car plugins
export function getCarOverrides (type) {
  return CAR_OVERRIDES[type]
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
  [FURZE_SCREW_TANK]: 'furze_tank',
  [CHRISTMAS_TANK]: 'christmas_tank',
  [WRAPPING_PAPER_PLANE]: 'wrapping_paper_plane'
  // 15: 'xcelsior',
  // 3: 'grid',
}

// special transforms for cars depending on their sprites
export const CAR_OVERRIDES = {
  // Frosted Roller
  [FROSTED_ROLLER]: { flipY: true },

  // NT-Gold
  [NT_GOLD]: { rotation: -Math.PI },

  // no trails for furze cars
  [FURZE_HOVER_BIKE]: { noTrail: true },
  [FURZE_SCREW_TANK]: { noTrail: true },
  [FURZE_JET_BIKE]: { noTrail: true }
}
