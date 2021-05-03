import ReactiveGull from './reactive_gull';

// loads a script as required
export async function loadScript(name, config, obj, track, animator) {
	const Type = name === 'reactive_gull' ? ReactiveGull
		: null;

	// load if possible
	if (!Type) {
		return console.warn(`script missing: ${name}`);
	}
	
	const instance = new Type(config, obj, track, animator);
	if (instance.init) {
		await instance.init();
	}

	// give back the managed instance
	if (instance.update) {
		return instance;
	}
}

// parses script arguments
export function parseScriptArgs(args) {
	const name = args.shift();
	const config = { };

	// parse each arg
	for (const arg of args) {
		if (typeof arg === 'object') {
			for (const key of Object.keys(arg)) {
				config[key] = arg[key]
			}
		}
		else if (typeof arg === 'string') {
			config[key] = true;
		}
	}

	return [ name, config ]
}
