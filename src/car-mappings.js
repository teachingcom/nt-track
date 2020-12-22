import * as wampus from './plugins/cars/wampus'

// look up car plugins
export function getCarPlugin (type) {
  return CAR_PLUGINS[type]
}

// various car plugins
export const CAR_PLUGINS = {
  wampus: wampus.extend
}
