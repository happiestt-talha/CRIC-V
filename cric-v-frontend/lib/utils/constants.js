export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const ROLES = {
    ADMIN: 'admin',
    COACH: 'coach',
    PLAYER: 'player',
}

export const SESSION_TYPES = {
    BOWLING: 'bowling',
    BATTING: 'batting',
    BOTH: 'both',
}

export const SESSION_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
}

export const BATTING_HANDS = [
    { value: 'right', label: 'Right Hand' },
    { value: 'left', label: 'Left Hand' },
]

export const BOWLING_STYLES = [
    { value: 'right_arm_fast', label: 'Right Arm Fast' },
    { value: 'right_arm_medium', label: 'Right Arm Medium' },
    { value: 'right_arm_spin', label: 'Right Arm Spin' },
    { value: 'left_arm_fast', label: 'Left Arm Fast' },
    { value: 'left_arm_medium', label: 'Left Arm Medium' },
    { value: 'left_arm_spin', label: 'Left Arm Spin' },
]

export const SHOT_TYPES = [
    'cover_drive',
    'straight_drive',
    'pull_shot',
    'cut_shot',
    'defensive',
    'sweep_shot',
]

export const PITCH_LINES = [
    'outside_off',
    'off_stump',
    'middle_stump',
    'leg_stump',
    'outside_leg',
]

export const PITCH_LENGTHS = [
    'yorker',
    'full',
    'good_length',
    'short_of_length',
    'short',
]