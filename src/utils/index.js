export const merge = Object.assign;

// no-operation
export const noop = () => { };

export const isArray = val => typeof val === 'array' || val instanceof Array;
export const isNumber = val => typeof val === 'number' || val instanceof Number;
export const isNil = val => val === null || val === undefined;

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