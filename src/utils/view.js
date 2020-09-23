import { Emitter } from "nt-animator";

// state change listeners
const listeners = [ ];

// current visibility
let isViewCurrentlyActive;

// update the current state
updateViewActiveState();

/** checks for view visibilty */
export function isViewActive() {
	return isViewCurrentlyActive;
}

// creates a listener for visibility state changes
export function onViewActiveStateChanged(listener) {
	listeners.push(listener);
	return () => removeListener(listener);
}

// removes an active listener
function removeListener(listener) {
	const index = listeners.indexOf(listener);
	listeners.splice(index, 1);
}

// updates state change
function updateViewActiveState() {
	isViewCurrentlyActive = document.visibilityState !== 'hidden';
	for (let i = listeners.length; i-- > 0;)
		try {
			listeners[i](isViewCurrentlyActive);
		}
		// don't prevent other listener updates
		catch (ex) {
			console.error(ex);
		}
}

// start monitoring for changes
document.addEventListener('visibilitychange', updateViewActiveState);