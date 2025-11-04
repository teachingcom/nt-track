import * as AudioController from './audio'
export { default as Track } from './views/track'
export { default as Composer } from './views/composer'
export { default as Garage } from './views/garage'
export { default as Preview } from './views/preview'
export { default as Cruise } from './views/cruise'
export { default as Bundle } from './views/bundle'
export { default as Customizer } from './views/customizer'
export { default as Animation } from './views/animation'
export { default as NameCard } from './views/namecard'
export const Audio = AudioController


try { window.NTTRACK = '4.2.7' } catch (ex) { }
