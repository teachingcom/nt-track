import { isNumber } from "./utils";

export const MINIMAL = 0
export const LOW = 1
export const MEDIUM = 2
export const HIGH = 3
export const PERFORMANCE_LEVEL = ['minimal', 'low', 'medium', 'high'];

// caching key for performance
const PERFORMANCE_PREFIX = 'nt:performance-';
const DYNAMIC_SAMPLE_COUNT = 3;

// the minimum FPS to get before considering the player
// at risk of needing to be down graded on performance
const MINOR_FRAMERATE_RISK = 48;
const NOTICABLE_FRAMERATE_RISK = MINOR_FRAMERATE_RISK * 0.66;
const MAJOR_FRAMERATE_RISK = MINOR_FRAMERATE_RISK * 0.33;

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

  constructor({ view, key, fps, onPerformanceChanged }) {

    // there should be at least one action for changes
    if (!!onPerformanceChanged) {
      this.onPerformanceChanged(onPerformanceChanged)
    }

    this.key = key;
    this.fps = fps;
    this.view = view;

    // load the original score
    this.init();
  }

  // shares the tracing 
  init() {
    this.interval = setInterval(this.evaluatePerformance, 3000);

    // try and find a previous score to use
    let score = getCachedPerformanceScore(this.key);
    if (!isNumber(score)) {
      score = HIGH;
    }
    // and existing score was found
    else {
      score++;
    }

    // ensure the correct range
    score = this.clampScore(score);
    
    //  get the original value
    console.log('perf:', PERFORMANCE_LEVEL[score]);
    this.setScore(score);
  }

  // handles updated performance values
  onPerformanceChanged = listener => {
    this.listeners.push(listener);
  }

  // ensure the score range
  clampScore = score => {
    return Math.max(MINIMAL, Math.min(this.maxAllowedScore, score))
  }

  // looks at performace to determine if the rendering
  // should be adjusted for a better game pla
  evaluatePerformance = () => {

    // view must be active
    if (!this.view.isViewActive) {
      return;
    }

    // get a sample of the last 5 track fps values
    const sample = this.fps.getSample(DYNAMIC_SAMPLE_COUNT);
    
    // if below minimal value FPS, consider the player at risk
    const atRiskOfPoorFramerate = sample < MINOR_FRAMERATE_RISK;
    if (this.isAtRisk && atRiskOfPoorFramerate) {
      
      // depending on how bad they're doing, just
      // skip certain levels
      if (sample < MAJOR_FRAMERATE_RISK) {
        this.maxAllowedScore -= 3;
      }
      else if (sample < NOTICABLE_FRAMERATE_RISK) {
        this.maxAllowedScore -= 2;
      }
      else if (sample < MINOR_FRAMERATE_RISK) {
        this.maxAllowedScore -= 1;
      }
      
      // reset the risk tracking and
      // try to race again
      this.setScore(this.maxAllowedScore);
      this.isAtRisk = false;
    }
    // save if the player is at risk
    else {
      this.isAtRisk = atRiskOfPoorFramerate;
    }
    
  }

  // track the final 
  finalize = () => {
    setCachedPerformanceScore(this.key, this.maxAllowedScore);
  }

  // updates the current score
  setScore = (score, notify = true) => {

    // cap the score
    score = this.clampScore(score);
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
    let score = parseInt(localStorage.getItem(PERFORMANCE_PREFIX + key));
    score = Math.max(Math.min(HIGH, score), MINIMAL);
    return isNaN(score) ? null : score;
  }
  catch (ex) {
    return null;
  }
}

// saves a cached score
function setCachedPerformanceScore(key, score) {
  try {
    localStorage.setItem(PERFORMANCE_PREFIX + key, score);
  }
  // don't fail
  catch (ex) { }
}
