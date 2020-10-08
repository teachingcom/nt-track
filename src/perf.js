
export const MINIMAL = 0
export const LOW = 1
export const MEDIUM = 2
export const HIGH = 3

// local storage tracking
const KEY_FPS_TRACKING = 'nt:fps'

// tracks fps and quality
export function savePerformanceResult (quality, fps) {
  const hour = 1000 * 60 * 60
  const expires = hour + Date.now()
  const data = JSON.stringify({ fps: 0 | fps, quality, expires })
  window.localStorage.setItem(KEY_FPS_TRACKING, data)
}

// peforms a crude test to determine performance
// potential for rendering
export function getPerformanceScore () {
  try {
    const record = window.localStorage.getItem(KEY_FPS_TRACKING)
    const data = JSON.parse(record)
    const { fps, quality, expires = 0 } = data || { }

    // downgrade the experience on poor framerate
    let score = quality
    if (isNaN(score)) {
      score = HIGH
    }

    // if it's been a long time since this recording
    if (expires < Date.now()) {
      score = HIGH
    }

    // poor FPS
    if (fps < 40) {
      score--
    }

    // very poor FPS
    if (fps < 20) {
      score--
    }

    // ensure result
    if (isNaN(score)) {
      score = HIGH
    }

    // give back a score
    return Math.max(MINIMAL, score)
  } catch (ex) {
    return HIGH
  }
}
