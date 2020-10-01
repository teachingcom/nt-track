
export function searchForEnhancedCar(id) {
	id = id.replace(/_.*$/g, '');
	return CAR_MAPPINGS[id] || id;
}

// mapping for advanced animation cars
export const CAR_MAPPINGS = {
	'86': 'xcelsior'
};