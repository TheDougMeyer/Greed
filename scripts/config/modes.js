/**
 * Game mode configurations
 * Used for Phase 2 implementation (multiple game modes)
 */

export const GAME_MODES = {
  classic: {
    id: 'classic',
    name: 'Classic',
    hasTimer: false,
    isProgrammed: false
  },
  timer: {
    id: 'timer',
    name: 'Timer Mode',
    hasTimer: true,
    isProgrammed: false,
    defaultTime: 120
  },
  programmed: {
    id: 'programmed',
    name: 'Pre-programmed',
    hasTimer: false,
    isProgrammed: true
  },
  combined: {
    id: 'combined',
    name: 'Combined Challenge',
    hasTimer: true,
    isProgrammed: true,
    defaultTime: 180
  }
};
