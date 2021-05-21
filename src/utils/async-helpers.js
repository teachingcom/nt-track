const checks = [ ]

// checks if props are required
setInterval(
	function checkForProps() {
		const len = checks.length
		
		// nothing to check
		if (!len) {
			return
		}

		// run through each check
		const now = Date.now()
		for (let i = 0; i < len; i++) {
			try {
				checks[i].check(now)
			}
			// nothing to do, maybe remove it
			// or call reject
			catch (ex) {
				checks[i].reject()
			}
		}
	}, 100);

// removes a check
function removeCheck(check) {
	const index = checks.indexOf(check);
	checks.splice(index, 1);
}

// waits until all props become available
export function waitForProps(obj, ...props, { timeout } = { }) {
	return new Promise((resolve, reject) => {
		const started = Date.now()
		const expires = started + timeout
		const hasExpiration = !isNaN(expires)

		// prevent from activating this more than once
		let resolved = false

		// handles checking for props
		const check = ts => {
			if (resolved) {
				return
			}

			// check for each property
			for (const prop of props) {
				if (!(prop in obj)) {

					// check if this expired
					if (hasExpiration && ts > expires) {
						resolved = true
						removeCheck(check)
						return reject()
					}

					return;
				}
			}

			// everything appeared to be found
			resolved = true
			removeCheck(check)
			resolve()
		}

		// add to the list of checks
		checks.push({ check, reject })
	});
}
