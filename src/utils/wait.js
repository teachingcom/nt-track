
const pending = { };

export async function waitForTime(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

// handles waiting for conditions
export async function waitForCondition(id, params, condition) {
  const interval = params.interval || 100;

  // if only a single wait is allowed, clear
  // the previous ones
  if (params.single) {
    const existing = pending[id] || [ ];
    for (const item of existing) {
      try {
        clearTimeout(item.ref);
				if (params.rejectOnAbort) {
					item.reject();
				}
      }
      // don't fail for this
      catch (ex) { }
    }
  }

  // save the reference
  const ref = { };
  pending[id] = pending[id] || [ ];
  pending[id].push(ref);
  
  // give back the promise to wait for
  return new Promise((resolve, reject) => {
    ref.reject = reject;
    ref.resolve = resolve;

    // handles checking for functions
    function check() {

      // check if this passed or not
      if (condition() === true) {
        clearTimeout(ref.pending);
        return resolve();
      }

      // queue the next attempt
      ref.pending = setTimeout(check, interval);
    }

    // trigger the watcher
    setTimeout(check, interval);
  });
}