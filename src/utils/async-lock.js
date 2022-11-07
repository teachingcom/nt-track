
export default class AsyncLock {

	_priorArgs = [ ]

	constructor(lockByDefault = true) {
		if (lockByDefault) {
			this.lock();
		}
	}

	lock() {
		this.pending = [ ];
	}

	release = (args) => {
		for (const waiting of this.pending || [ ]) {
			waiting(args);
		}

		this._priorArgs = args;
		delete this.pending;
	}

	wait() {
		if (this.pending) {
			return new Promise(resolve => this.pending.push(resolve))
		}

		return this._priorArgs
	}
}
