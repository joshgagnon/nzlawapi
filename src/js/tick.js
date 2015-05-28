// Based on https://github.com/petehunt/react-raf-batching
// but also triggers `tick` regularly if tab is inactive.

'use strict';

var ReactUpdates = require('react/lib/ReactUpdates'),
    now = require('react/lib/performanceNow');

var FORCE_TICK_INTERVAL = 1000,
    FORCE_TICK_THRESHOLD = 100,
    lastTick;

function tick() {
  ReactUpdates.flushBatchedUpdates();
  window.requestAnimationFrame(tick);

  lastTick = now();
}

function forceTick() {
  if (now() - lastTick > FORCE_TICK_THRESHOLD) {
    tick();
  }
}

var ReactRAFBatchingStrategy = {
  isBatchingUpdates: true,

  /**
   * Call the provided function in a context within which calls to `setState`
   * and friends are batched such that components aren't updated unnecessarily.
   */
  batchedUpdates: function(callback, a, b) {
    callback(a, b);
  }
};

tick();
setInterval(forceTick, FORCE_TICK_INTERVAL);

module.exports = ReactRAFBatchingStrategy;