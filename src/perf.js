import { isNumber } from "./utils"

export const MINIMAL = 0
export const LOW = 1
export const MEDIUM = 2
export const HIGH = 3
export const PERFORMANCE_LEVEL = ['minimal', 'low', 'medium', 'high']

// caching key for performance
const PERFORMANCE_PREFIX = 'nt:performance-'
// const DYNAMIC_SAMPLE_COUNT = 3

// the frequency in which to monitor performance changes
const PERFORMANCE_MONITORING_INTERVAL = 3000

// the minimum FPS to get before considering the player
// at risk of needing to be down graded on performance
const MINOR_FRAMERATE_RISK = 42
// const NOTICABLE_FRAMERATE_RISK = MINOR_FRAMERATE_RISK * 0.66
// const MAJOR_FRAMERATE_RISK = MINOR_FRAMERATE_RISK * 0.33

// the amount to upscale for SSAA
const SSAA_SCALING_AMOUNT = [1, 1.15, 1.5, 2]

// animation speeds
const ANIMATION_RENDERING_INTERVAL = [3, 2, 2, 1]
const ANIMATION_PARTICLE_UPDATE_FREQUENCY = [4, 3, 2, 1]
const ANIMATION_ANIMATION_UPDATE_FREQUENCY = [4, 3, 2, 1]

// handles dynamically changing performance in response to
// track racing performance measurements
export default class DynamicPerformanceController {

  // listening for performance changed events
  listeners = [ ]

  // the maximum allowed rendering performance
  // for this specific instance
  maxAllowedScore = HIGH

  // tracking changes
  upgrades = 0
  downgrades = 0

  constructor({ view, key, fps, delay = 0, onPerformanceChanged }) {

    // there should be at least one action for changes
    if (!!onPerformanceChanged) {
      this.onPerformanceChanged(onPerformanceChanged)
    }

    this.key = key
    this.fps = fps
    this.view = view

    // load the original score
    this.init(delay)
  }

  // shares the tracing 
  init(delay) {
    // try and find a previous score to use
    let score = getCachedPerformanceScore(this.key)
    if (!isNumber(score)) {
      score = HIGH
    }
    // and existing score was found
    else {
      if (score < HIGH) {
        this.upgrades++
      }

      // update the score
      score++
    }

    // ensure the correct range
    score = this.clampScore(score)

    // save some data
    this.initialLevel = PERFORMANCE_LEVEL[score]
    this.cachedLevel = PERFORMANCE_LEVEL[score - this.upgrades]
    
    //  get the original value
    this.setScore(score)

    // activate monitoring
    setTimeout(() => {
      this.evaluatePerformance()
      this.interval = setInterval(this.evaluatePerformance, PERFORMANCE_MONITORING_INTERVAL)
    }, delay)
  }

  // handles updated performance values
  onPerformanceChanged = listener => {
    this.listeners.push(listener)
  }

  // ensure the score range
  clampScore = score => {
    return Math.max(MINIMAL, Math.min(this.maxAllowedScore, score))
  }

  getVariance() {
    const current = PERFORMANCE_LEVEL[this.maxAllowedScore]
    return `${this.initialLevel} > ${current}`
  }

  // looks at performace to determine if the rendering
  // should be adjusted for a better game pla
  evaluatePerformance = () => {
    // view must be active
    if (!this.view.isViewActive) {
      return
    }
    
    // get a active sample of the track performance
    const sample = this.fps.getSample()
    
    // if below minimal value FPS, consider the player at risk
    const atRiskOfPoorFramerate = sample < MINOR_FRAMERATE_RISK
    if (this.isAtRisk && atRiskOfPoorFramerate) {
      // // depending on how bad they're doing, just
      // // skip certain levels
      // let downgradeBy = 0
      // if (sample < MAJOR_FRAMERATE_RISK) {
      //   downgradeBy = 3
      // }
      // else if (sample < NOTICABLE_FRAMERATE_RISK) {
      //   downgradeBy = 2
      // }
      // else if (sample < MINOR_FRAMERATE_RISK) {
      //   downgradeBy = 1
      // }

      // only downgrade by one at a time
      const downgradeBy = 1
      
      // reset the risk tracking and
      // try to race again
      this.downgrades = Math.max(HIGH, downgradeBy - this.downgrades)
      
      // update the score
      this.setScore(this.maxAllowedScore - downgradeBy)
      this.isAtRisk = false
    }
    // save if the player is at risk
    else {
      this.isAtRisk = atRiskOfPoorFramerate
    }

    // save that this has happened
    this.hasEvaluatedPerformance = true
  }

  // track the final 
  finalize = () => {
    // require at least one evaluation attempt
    if (!this.hasEvaluatedPerformance) {
      return
      
    }

    setCachedPerformanceScore(this.key, this.maxAllowedScore)
  }

  // updates the current score
  setScore = (score, notify = true) => {
    // cap the score
    score = this.clampScore(score)
    this.maxAllowedScore = score

    // reassign changes
    this.ssaaScalingAmount = SSAA_SCALING_AMOUNT[score]
    this.renderingInterval = ANIMATION_RENDERING_INTERVAL[score]
    this.animationParticleUpdateFrequency = ANIMATION_PARTICLE_UPDATE_FREQUENCY[score]
    this.animationAnimationUpdateFrequency = ANIMATION_ANIMATION_UPDATE_FREQUENCY[score]

    // notify all listeners
    if (notify) {
      for (const listener of this.listeners) {
        listener(this)
      }
    }
  }
}

// tries to find a previously cached score
function getCachedPerformanceScore(key) {
  try {
    let score = parseInt(localStorage.getItem(PERFORMANCE_PREFIX + key))
    score = Math.max(Math.min(HIGH, score), MINIMAL)
    return isNaN(score) ? null : score
  }
  catch (ex) {
    return null
  }
}

// saves a cached score
function setCachedPerformanceScore(key, score) {
  try {
    localStorage.setItem(PERFORMANCE_PREFIX + key, score)
  }
  // don't fail
  catch (ex) { }
}
