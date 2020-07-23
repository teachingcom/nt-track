export const merge = Object.assign;

// no-operation
export const noop = () => { };

export const isArray = val => typeof val === 'array' || val instanceof Array;
export const isNumber = val => typeof val === 'number' || val instanceof Number;
export const isNil = val => val === null || val === undefined;

/** clamps between two ranges */
export function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}

/** grabs the first item from a collection */
export function first(...collection) {
	
	// just a single array, otherwise expects multiple arguments
	if (collection.length === 1) {
		collection = collection[0]
	}

	// check for the first non-nil
	for (let index in collection) {
		if (!isNil(collection[index]))
			return collection[index];
	}

	// if nothing was found, just take the last one
	return collection[collection.length - 1];
}


// simple filter function
export function filter(collection, condition) {
	const keep = [ ];
	for (const index in collection) {
		const item = collection[index];
		if (condition(item, index))
			keep.push(item);
	}
	return keep;
}


// takes a random item from an array
export const sample = (collection) => {
	return collection[Math.floor(Math.random() * collection.length)];
}

// returns a shuffled version of an array
export function shuffle(collection) {
	const shuffled = [ ];
	for (let i = collection.length; i-- > 0;) {
		const index = Math.floor(Math.random() * collection.length);
		shuffled.push(collection.splice(index, 1));
	}

	return shuffled;
}

// makes a random selection from array, otherwise just
// returns the value provided
export function choose(source) {
	return isArray(source) ? sample(source) : source;
}

/** Merges two functions into sequential calls */
export function appendFunc(baseFunction, includedFunction) {
	return includedFunction
		? (...args) => { baseFunction(...args); includedFunction(...args); }
		: baseFunction;
}
