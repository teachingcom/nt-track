
export function searchForEnhancedCar(id) {
	const revised = id.replace(/_.*$/g, '');
	return CAR_MAPPINGS[revised] || id;
}

// mapping for advanced animation cars
export const CAR_MAPPINGS = {
	'86': 'xcelsior'
};