
// creates a common animation update function
export const createUpdater = (layer, scale = 1) => (v) => {
	layer.rotation = v.rotation;
	layer.x = v.x * scale;
	layer.y = v.y * scale;
};