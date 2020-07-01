
// individual layer data for animations
export default {
	hand_l: {
		sprite: 'hand', 
		pivot: 0.75, 
		flipX: true
	},
	hand_r: {
		sprite: 'hand', 
		pivot: 0.75 
	},
	arm_l: {
		sprite: 'forearm', 
		pivot: 0.8, 
		flipX: true 
	},
	arm_r: {
		sprite: 'forearm', 
		pivot: 0.8  
	},
	shoulder_l: {
		sprite: 'shoulder', 
		pivot: 0.75, 
		flipX: true 
	},
	shoulder_r: {
		sprite: 'shoulder', 
		pivot: 0.75 
	},
	torso: {
		sprite: 'torso', 
		pivot: 0.75 
	},
	head: {
		sprite: 'head', 
		pivot: 0.8,
		attachments: [	
			{ type: 'face', offsetY: 4, chance: 0.33 },
			{ type: 'head', offsetY: -8, chance: 0.95 }
		],
	},
	legs: {
		sprite: 'legs',
		pivot: 0.15
	},
}