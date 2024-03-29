export const DEVELOPMENT = /(local\.nitro|localhost)/i.test(window.location.host)

// tracks
export const TRACK_MAXIMUM_SCROLL_SPEED = 35
export const TRACK_MAXIMUM_SPEED_BOOST_RATE = 0.33
export const TRACK_MAXIMUM_SPEED_DRAG_RATE = 0.5
export const TRACK_MAXIMUM_SPEED = 0.55
export const TRACK_MAXIMUM_TRAVEL_DISTANCE = TRACK_MAXIMUM_SCROLL_SPEED * 5
export const TRACK_ACCELERATION_RATE = 0.0025
export const TRACK_TOP_SCALE = 0.15
export const TRACK_BOTTOM_SCALE = 0
export const TRACK_SHOULDER_SCALE = 0.06
export const TRACK_CAR_SIZE_RELATIVE_TO_LANE = 0.75
export const TRACK_CAR_LANE_CENTER_OFFSET = 0.03
export const TRACK_STARTING_LINE_POSITION = 0.35
export const TRACK_NAMECARD_EDGE_PADDING = 10
export const TRACK_OFFSCREEN_CAR_FINISH = 0.2

// spectator
export const SPECTATOR_WATERMARK_START_POSITION = 0.75
export const SPECTATOR_WATERMARK_FINISH_POSITION = 0.35

// progress
export const RACE_ENDING_ANIMATION_STANDARD_THRESHOLD = 0.66
export const RACE_ENDING_ANIMATION_QUALIFYING_THRESHOLD = 0.2
export const RACE_PLAYER_DISTANCE_MODIFIER = 5
export const RACE_OFF_SCREEN_FINISH_DISTANCE = 1.15
export const RACE_AUTO_PROGRESS_DISTANCE = 0
export const RACE_START_CAR_ENTRY_TIME = 1600
export const RACE_START_NAMECARD_ENTRY_TIME = 1000
export const RACE_START_NAMECARD_DELAY_TIME = 1200
export const RACE_FINISH_CAR_STOPPING_TIME = 1500
export const RACE_ENTRY_SOUND_REPEAT_TIME_LIMIT = 2500
export const RACE_PROGRESS_TWEEN_TIMING = 1000
export const RACE_SOUND_TIRE_SCREECH_MAX_INTERVAL = 1200
export const RACE_SOUND_ERROR_MAX_INTERVAL = 500
export const RACE_FINISH_FLASH_FADE_TIME = 300

// crowds
export const CROWD_DEFAULT_SCALE = 0.6
export const CROWD_ANIMATION_VARIATIONS = 5
export const CROWD_ANIMATION_FRAME_COUNT = 6
export const CROWD_ANIMATION_DURATION = 1000

// namecards
export const NAMECARD_SCALE = 0.8
export const NAMECARD_TETHER_DISTANCE = 700

// cars
export const CAR_DEFAULT_SHAKE_LEVEL = 0 // 0.25
export const CAR_LANE_SCALE_ADJUSTMENT = 0.9
export const CAR_SHADOW_BLUR = 25
export const CAR_SHADOW_OPACITY = 0.8
export const CAR_SHADOW_SCALE_ADJUST = 0.8
export const CAR_SHADOW_OFFSET_Y = 3
export const CAR_BODY_OFFSET_Y = -4
export const CAR_DEFAULT_FRONT_BACK_OFFSET_X = 0.495
export const CAR_SHAKE_DISTANCE = 4
export const CAR_SHAKE_NITRO_BONUS = 2.125
export const CAR_SHAKE_SHADOW_REDUCTION = 0.33
export const CAR_NITRO_ADVANCEMENT_DISTANCE = 0.125
export const CAR_404_STATIC_VERSION = '9_large_11'
export const CAR_404_ENHANCED_VERSION = '/cars/missing'
export const CAR_DEFAULT_LIGHTING = {
  alpha: 0.4,
  x: 10,
  y: 0
}

// a rotation to apply to all legacy cars
export const STATIC_CAR_ROTATION_FIX = Math.PI

// trails
export const TRAIL_SCALE = 0.55
// trail is slightly increased in size to make it look better
// in the customizer/store view
export const TRAIL_SCALE_IN_PREVIEW = 0.7

// nitros
export const NITRO_SCALE = 0.7
export const NITRO_OFFSET_X = -75
export const NITRO_OFFSET_Y = -7
export const NITRO_ACTIVATED_TRAIL_OPACITY = 0.1
export const NITRO_BLUR_OFFSET_Y = -10
export const NITRO_BLUR_DEFAULT_OFFSET_X = 0.75
export const NITRO_BLUR_REALTIVE_SIZE_SCALING = 0.9

// misc
export const DEFAULT_PERFORMANCE_MONITORING_DELAY = 15000
