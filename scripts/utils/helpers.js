/**
 * Utility helper functions
 */

/**
 * Fisher-Yates shuffle algorithm for unbiased randomization
 * @param {Array} array - Array to shuffle
 * @returns {Array} - New shuffled array
 */
export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Deep copy a 2D grid of cell objects
 * @param {Array<Array<Object>>} grid - Grid to copy
 * @returns {Array<Array<Object>>} - New deep copied grid
 */
export function deepCopyGrid(grid) {
  return grid.map(row =>
    row.map(cell => ({ ...cell }))
  );
}

/**
 * Sleep utility for async delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} - Promise that resolves after delay
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
