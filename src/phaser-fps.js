// Rewrite of Phaser FPS
/**
 * @author       Richard Davey <rich@photonstorm.com>
 * @copyright    2020 Photon Storm Ltd.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */

import { noop } from "nt-animator";

export default class PhaserFPS {
  constructor(config = { }) {

		this.raf = new RequestAnimationFrame();
    this.started = false;
    this.running = false;

    this.minFps = config.min || 5; // GetValue(config, 'min', 5);
    this.targetFps = config.target || 60; // GetValue(config, 'target', 60);

    //calculated
    this._min = 1000 / this.minFps;
    this._target = 1000 / this.targetFps;
    this.actualFps = this.targetFps;

    // props
    this.nextFpsUpdate = 0;
    this.framesThisSecond = 0;
    this.callback = noop;
    this.forceSetTimeOut = config.forceSetTimeOut || false;
    this.time = 0;
    this.startTime = 0;
    this.lastTime = 0;
    this.frame = 0;
    this.inFocus = true;

    // internal
    this._pauseTime = 0;
    this._coolDown = 0;

    this.delta = 0;
    this.deltaIndex = 0;
    this.deltaHistory = [];
    this.deltaSmoothingMax = config.deltaHistory || 10;
    this.panicMax = config.panicMax || 120;
    this.rawDelta = 0;
    this.now = 0;
    this.smoothStep = config.smoothStep !== false;
  }

  blur() {
    this.inFocus = false;
  }

  focus() {
    this.inFocus = true;
    this.resetDelta();
  }

  pause() {
    this._pauseTime = window.performance.now();
  }

  resume() {
    this.resetDelta();
    this.startTime += this.time - this._pauseTime;
  }

  resetDelta() {
    var now = window.performance.now();

    this.time = now;
    this.lastTime = now;
    this.nextFpsUpdate = now + 1000;
    this.framesThisSecond = 0;

    //  Pre-populate smoothing array
    for (var i = 0; i < this.deltaSmoothingMax; i++) {
      this.deltaHistory[i] = Math.min(this._target, this.deltaHistory[i]);
    }

    this.delta = 0;
    this.deltaIndex = 0;

    this._coolDown = this.panicMax;
  }

  start(callback) {
    if (this.started) {
      return this;
    }

    this.started = true;
    this.running = true;

    for (var i = 0; i < this.deltaSmoothingMax; i++) {
      this.deltaHistory[i] = this._target;
    }

    this.resetDelta();
    this.startTime = window.performance.now();
    this.callback = callback || noop;

    this.raf.start(this.step.bind(this), this.forceSetTimeOut, this._target);
  }

  step() {
    //  Because the timestamp passed in from raf represents the beginning of the main thread frame that we’re currently in,
    //  not the actual time now, and as we want to compare this time value against Event timeStamps and the like, we need a
    //  more accurate one:

    var time = window.performance.now();

    this.now = time;

    var before = time - this.lastTime;

    if (before < 0) {
      //  Because, Chrome.
      before = 0;
    }

    this.rawDelta = before;

    var idx = this.deltaIndex;
    var history = this.deltaHistory;
    var max = this.deltaSmoothingMax;

    //  delta time (time is in ms)
    var dt = before;

    //  Delta Average
    var avg = before;

    //  When a browser switches tab, then comes back again, it takes around 10 frames before
    //  the delta time settles down so we employ a 'cooling down' period before we start
    //  trusting the delta values again, to avoid spikes flooding through our delta average

    if (this.smoothStep) {
      if (this._coolDown > 0 || !this.inFocus) {
        this._coolDown--;

        dt = Math.min(dt, this._target);
      }

      if (dt > this._min) {
        //  Probably super bad start time or browser tab context loss,
        //  so use the last 'sane' dt value

        dt = history[idx];

        //  Clamp delta to min (in case history has become corrupted somehow)
        dt = Math.min(dt, this._min);
      }

      //  Smooth out the delta over the previous X frames

      //  add the delta to the smoothing array
      history[idx] = dt;

      //  adjusts the delta history array index based on the smoothing count
      //  this stops the array growing beyond the size of deltaSmoothingMax
      this.deltaIndex++;

      if (this.deltaIndex > max) {
        this.deltaIndex = 0;
      }

      //  Loop the history array, adding the delta values together
      avg = 0;

      for (var i = 0; i < max; i++) {
        avg += history[i];
      }

      //  Then divide by the array length to get the average delta
      avg /= max;
    }

    //  Set as the world delta value
    this.delta = avg;

    //  Real-world timer advance
    this.time += this.rawDelta;

    // Update the estimate of the frame rate, `fps`. Every second, the number
    // of frames that occurred in that second are included in an exponential
    // moving average of all frames per second, with an alpha of 0.25. This
    // means that more recent seconds affect the estimated frame rate more than
    // older seconds.
    //
    // When a browser window is NOT minimized, but is covered up (i.e. you're using
    // another app which has spawned a window over the top of the browser), then it
    // will start to throttle the raf callback time. It waits for a while, and then
    // starts to drop the frame rate at 1 frame per second until it's down to just over 1fps.
    // So if the game was running at 60fps, and the player opens a new window, then
    // after 60 seconds (+ the 'buffer time') it'll be down to 1fps, so rafin'g at 1Hz.
    //
    // When they make the game visible again, the frame rate is increased at a rate of
    // approx. 8fps, back up to 60fps (or the max it can obtain)
    //
    // There is no easy way to determine if this drop in frame rate is because the
    // browser is throttling raf, or because the game is struggling with performance
    // because you're asking it to do too much on the device.

    if (time > this.nextFpsUpdate) {
      //  Compute the new exponential moving average with an alpha of 0.25.
      this.actualFps = 0.25 * this.framesThisSecond + 0.75 * this.actualFps;
      this.nextFpsUpdate = time + 1000;
      this.framesThisSecond = 0;
    }

    this.framesThisSecond++;

    //  Interpolation - how far between what is expected and where we are?
    var interpolation = avg / this._target;

		if (this.callback)
    	this.callback(time, avg, interpolation);

    //  Shift time value over
    this.lastTime = time;

    this.frame++;
  }

  tick() {
    this.step();
  }

  sleep() {
    if (this.running) {
      this.raf.stop();

      this.running = false;
    }
  }

  wake(seamless) {
    if (this.running) {
      return;
    } else if (seamless) {
      this.startTime +=
        -this.lastTime + (this.lastTime + window.performance.now());
    }

    this.raf.start(this.step.bind(this), this.useRAF);

    this.running = true;

    this.step();
  }

  getDuration() {
    return Math.round(this.lastTime - this.startTime) / 1000;
  }

  getDurationMS() {
    return Math.round(this.lastTime - this.startTime);
  }

  stop() {
    this.running = false;
    this.started = false;

    this.raf.stop();

    return this;
  }

  destroy() {
    this.stop();

    this.callback = noop;

    this.raf = null;
  }
}

/**
 * @author       Richard Davey <rich@photonstorm.com>
 * @copyright    2020 Photon Storm Ltd.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */

class RequestAnimationFrame {
  constructor() {
    this.isRunning = false;
    this.callback = noop;
    this.tick = 0;
    this.isSetTimeOut = false;
    this.timeOutID = null;
    this.lastTime = 0;
    this.target = 0;

    var _this = this;

    this.step = function step() {
      //  Because we cannot trust the time passed to this callback from the browser and need it kept in sync with event times
      var timestamp = window.performance.now();

      //  DOMHighResTimeStamp
      _this.lastTime = _this.tick;
      _this.tick = timestamp;
      _this.callback(timestamp);
      _this.timeOutID = window.requestAnimationFrame(step);
    };

    this.stepTimeout = function stepTimeout() {
      var d = Date.now();
      var delay = Math.min(
        Math.max(_this.target * 2 + _this.tick - d, 0),
        _this.target
      );

      _this.lastTime = _this.tick;
      _this.tick = d;
      _this.callback(d);
      _this.timeOutID = window.setTimeout(stepTimeout, delay);
    };
  }

  start(callback, forceSetTimeOut, targetFPS) {
    if (this.isRunning) {
      return;
    }

    this.callback = callback;

    this.isSetTimeOut = forceSetTimeOut;

    this.target = targetFPS;

    this.isRunning = true;

    this.timeOutID = forceSetTimeOut
      ? window.setTimeout(this.stepTimeout, 0)
      : window.requestAnimationFrame(this.step);
  }

  stop() {
    this.isRunning = false;

    if (this.isSetTimeOut) {
      clearTimeout(this.timeOutID);
    } else {
      window.cancelAnimationFrame(this.timeOutID);
    }
  }

  destroy() {
    this.stop();

    this.callback = noop;
  }
}
