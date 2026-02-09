/**
 * Powerup type definitions
 * Centralizes all powerup behavior configuration
 */
export const POWERUP_TYPES = {
  bridge: {
    id: 'bridge',
    name: 'Bridge',
    description: 'Convert a wall back into a traversable cell',

    // Mode compatibility
    allowedModes: ['classic', 'timer'],  // NOT in programmed/combined

    // Spawn behavior
    spawnOnValues: [1],  // Only replaces value-1 cells
    spawnCount: 1,       // One per grid

    // Collection & usage
    requiresInventory: true,   // Goes to inventory when collected
    requiresPlacement: true,   // Needs placement mode
    consumeOnUse: true,        // Removed from inventory after use

    // Game mechanics
    breaksUndoChain: true,     // Creates undo checkpoint

    // Visual
    icon: 'assets/Bridge.svg',
    markerEmoji: '🌉'
  },

  teleport: {
    id: 'teleport',
    name: 'Teleport',
    description: 'Instantly teleport to a random location',

    // Mode compatibility
    allowedModes: ['classic', 'timer'],  // NOT in programmed/combined

    // Spawn behavior
    spawnOnValues: [3],  // Only replaces value-3 cells
    spawnCount: 1,       // One per grid

    // Collection & usage
    requiresInventory: true,   // Goes to inventory when collected
    requiresPlacement: false,  // No placement mode (random for now)
    consumeOnUse: true,        // Removed from inventory after use

    // Game mechanics
    breaksUndoChain: true,     // Creates undo checkpoint
    isRandom: true,            // Random destination (vs player choice)

    // Visual
    icon: 'assets/Teleport.svg',
    markerEmoji: '✨'
  }

  // Future powerups:
  // hammer: { ... }
};

/**
 * Helper: Check if powerup is allowed in current mode
 */
export function isPowerupAllowedInMode(powerupId, modeConfig) {
  const powerup = POWERUP_TYPES[powerupId];
  if (!powerup) return false;

  return powerup.allowedModes.includes(modeConfig?.id);
}

/**
 * Helper: Get all enabled powerups based on settings
 */
export function getEnabledPowerups(settings) {
  const enabled = [];

  if (settings.bridgeEnabled) {
    enabled.push(POWERUP_TYPES.bridge);
  }

  if (settings.teleportEnabled) {
    enabled.push(POWERUP_TYPES.teleport);
  }

  // Future: if (settings.hammerEnabled) enabled.push(POWERUP_TYPES.hammer);

  return enabled;
}
