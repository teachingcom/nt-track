import randomSeed from 'random-seed';

/** random selection helper */
export default class Random {

	// create the randomizer
	constructor(seed) {
		this.rng = randomSeed.create(seed || `${+new Date}`);
	}
	
	/** returns a number between the range provided. If only one value
	 * is provided, then the range will be between 0 and the argument
	 */
	int = (a, b) => {
		const { rng } = this;
		return b === undefined ? rng.intBetween(0, a) : rng.intBetween(a, b);
	}
	
	/** returns a number between the range provided. If only one value
	 * is provided, then the range will be between 0 and the argument
	 */
	float = (a, b) => {
		const { rng } = this;
		return b === undefined ? rng.floatBetween(0, a) : rng.floatBetween(a, b);
	}
	
	/** returns a number between 0-1 */
	random = () => {
		const { rng } = this;
		return rng.random();
	}
	
	/** randomly selects a value from a collection */
	select = (source) => {
		return source[0 | (this.random() * source.length)];
	}

}
