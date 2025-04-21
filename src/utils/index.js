export const merge = Object.assign;

/** timeout with async pattern */
export async function wait(time) {
	return new Promise(resolve => setTimeout(resolve, time));
}

/** awaits an activity with a timeout */
export async function waitWithTimeout(promise, timeout) {
	return new Promise(async (resolve, reject) => {
		let success = false;
		setTimeout(() => {
			if (success) return;
			reject();
		}, timeout);

		try {
			const result = await promise;
			success = true;
			resolve(result);
		}
		catch (ex) {
			reject(ex);
		}

	});
}

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


/** creates a simple web worker */
export function createWorker(func) {
	try {
		const body = func.toString().replace(/^[^{]*{\s*/, '').replace(/\s*}[^}]*$/, '');
		const blob = new Blob([ body ], { type: 'text/javascript' });
		const url = URL.createObjectURL(blob);
		return new Worker(url);
	}
	// create an async version
	catch (ex) {
		throw 'workers not supported';
	}
}


/** finds all sprites inside of a container */
export function getSprites(container, sprites = [ ]) {
	if (!(container.children?.length > 0)) return sprites;

	// find each sprite
	for (const child of container.children) {
		if (child.isSprite) sprites.push(child);

		// search containers, exclude particles
		// maybe do this
		else if (child.children)
			getSprites(child, sprites);
	}

	return sprites;
}

/** interpolates two values */
export function interpolate(a, b, t) {
  return a + (b - a) * t;
}

// recursively finds textures
export function findTextures (target, collection = { }) {
  // skip this item
  if (target.config?.ignoreHueShift || target.emitter?.config?.ignoreHueShift) {
    return
  }

  // particle emitters keep textures in a separate array
  if (target.emitter) {
    const { particleImages } = target.emitter
    // for (const texture of target.particleImages) {
    for (let i = particleImages.length; i-- > 0;) {
      addTexture(collection, particleImages, i)
    }

  // sprites just add the texture as is
  } else if (target.isSprite) {
    addTexture(collection, target)

  // recursively look for children
  } else if (target.children) {
    for (const child of target.children) {
      findTextures(child, collection)
    }
  }

  return collection
}

// adds a texture to the search collection
function addTexture (collection, target, index) {
  const source = !isNaN(index) ? target[index] : target.texture
  const { cacheId } = source.baseTexture

  // make sure the group is ready
  let group = collection[cacheId]
  if (!group) {
    group = collection[cacheId] = {
      texture: source.baseTexture,
      targets: []
    }
  }

  // append the texture target
  group.targets.push([target, index])
}

// quickly creates a rendering surface
export function createSurface(...args) {
  const el = document.createElement("canvas");
  const ctx = el.getContext("2d");

  function clear() {
    el.width = el.width;
  }

  function resize(width, height) {
    el.width = width;
    el.height = height;
    instance.width = width;
    instance.height = height;
  }

  const instance = { el, ctx, resize, clear };
  resize(...args);

  return instance;
}