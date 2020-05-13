
export const BASE_HEIGHT = 800;
export const BACKGROUND_SCALE = 0.20;
export const FOREGROUND_SCALE = 0.025;
export const SHOULDER_SCALE = 0.04;
export const CAR_SIZE_RELATIVE_TO_LANE = 0.88;
export const LANE_COUNT = 5;

// sizes
export const TRACK_HEIGHT = 1 - (BACKGROUND_SCALE + FOREGROUND_SCALE);
export const SHOULDER_HEIGHT = (TRACK_HEIGHT * SHOULDER_SCALE);
export const LANE_HEIGHT = (TRACK_HEIGHT - SHOULDER_HEIGHT) / LANE_COUNT;
export const CAR_HEIGHT = LANE_HEIGHT * CAR_SIZE_RELATIVE_TO_LANE;

// positions
export const TRACK_TOP = BACKGROUND_SCALE;
export const TRACK_BOTTOM = TRACK_TOP + TRACK_HEIGHT;
export const LANE_START = TRACK_TOP + (SHOULDER_HEIGHT / 2);

// create the sizing for each lane
export const LANES = [];
for (let i = 0; i < LANE_COUNT; i++) {
	// calculate the y positions for each lane
	const y = LANE_START + (i * LANE_HEIGHT) + (LANE_HEIGHT / 2);
	LANES.push(y);
}

// calculated values
export const SCALED_CAR_HEIGHT = CAR_HEIGHT * BASE_HEIGHT;
export const SCALED_LANE_HEIGHT = LANE_HEIGHT * BASE_HEIGHT;