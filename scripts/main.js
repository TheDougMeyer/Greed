/**
 * Main initialization and event handlers
 */

import Game from './core/Game.js';
import { GAME_MODES } from './config/modes.js';
import { sleep } from './utils/helpers.js';

// Initialize game
const game = new Game();

// Helper function to initialize game based on mode
async function initializeGame(modeConfig, settings) {
  if (modeConfig.hasTimer && !modeConfig.isProgrammed) {
    // Timer mode only
    game.init(modeConfig, settings, { skipTimerStart: true });
    await showCountdown(3);
    game.startTimer();
    game.enableControls();
  } else if (modeConfig.isProgrammed && !modeConfig.hasTimer) {
    // Pre-programmed mode only
    game.init(modeConfig, settings);
    // Controls already enabled for scripting by init()
  } else if (modeConfig.isProgrammed && modeConfig.hasTimer) {
    // Combined mode
    game.init(modeConfig, settings, { skipTimerStart: true });
    await showCountdown(3);
    game.startTimer();  // Timer runs during scripting
    // Controls already enabled for scripting
  } else {
    // Classic mode
    game.init(modeConfig, settings);
    game.enableControls();
  }
}

// Welcome screen state
let selectedMode = 'classic';
let gameSettings = {
  powerupsEnabled: false,
  timerDuration: 120
};

// Mode selection handlers
document.querySelectorAll('.mode-card').forEach(card => {
  card.addEventListener('click', () => {
    // Remove selected class from all cards
    document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));

    // Add selected class to clicked card
    card.classList.add('selected');

    // Store selected mode
    selectedMode = card.dataset.mode;
  });
});

// Select classic mode by default
document.querySelector('[data-mode="classic"]').classList.add('selected');

// Timer option button handlers
document.querySelectorAll('.timer-option').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent mode card selection

    // Find the parent mode card to determine which set of timer options
    const modeCard = btn.closest('.mode-card');

    // Remove selected from all timer options in this mode card
    modeCard.querySelectorAll('.timer-option').forEach(b =>
      b.classList.remove('selected')
    );

    // Add to clicked button
    btn.classList.add('selected');
  });
});

// Countdown function
async function showCountdown(seconds) {
  const overlay = document.getElementById('countdown-overlay');
  const numberEl = document.getElementById('countdown-number');

  overlay.classList.add('visible');

  for (let i = seconds; i > 0; i--) {
    numberEl.textContent = i;
    // Reset animation by removing and re-adding the element
    numberEl.style.animation = 'none';
    setTimeout(() => {
      numberEl.style.animation = '';
    }, 10);
    await sleep(1000);
  }

  overlay.classList.remove('visible');
}

// Start game button
document.getElementById('start-game').addEventListener('click', async () => {
  // Get settings
  // Capture individual powerup settings
  gameSettings.bridgeEnabled = document.getElementById('bridge-enabled').checked;
  gameSettings.teleportEnabled = document.getElementById('teleport-enabled').checked;
  // Future: gameSettings.hammerEnabled = document.getElementById('hammer-enabled').checked;

  // Get timer duration from selected button (for timer and combined modes)
  if (selectedMode === 'timer' || selectedMode === 'combined') {
    const modeCard = document.querySelector(`[data-mode="${selectedMode}"]`);
    const selectedOption = modeCard.querySelector('.timer-option.selected');
    gameSettings.timerDuration = parseInt(selectedOption.dataset.duration);
  }

  // Hide welcome overlay
  document.getElementById('welcome-overlay').classList.remove('visible');

  // Show/hide UI elements based on mode
  const timerDisplay = document.getElementById('timer-display');
  const queuePanel = document.getElementById('script-queue-panel');
  const runItContainer = document.getElementById('run-it-container');
  const modeConfig = GAME_MODES[selectedMode];

  console.log('Starting game with mode:', selectedMode, modeConfig);
  console.log('Queue panel element:', queuePanel);

  timerDisplay.style.display = modeConfig.hasTimer ? 'block' : 'none';
  queuePanel.style.display = modeConfig.isProgrammed ? 'block' : 'none';
  runItContainer.style.display = modeConfig.isProgrammed ? 'flex' : 'none';
  console.log('Queue panel display set to:', queuePanel.style.display);

  // Initialize game
  await initializeGame(modeConfig, gameSettings);
});

// Keyboard controls
document.addEventListener('keydown', (e) => {
  const keyMap = {
    'ArrowUp': 'up',
    'ArrowDown': 'down',
    'ArrowLeft': 'left',
    'ArrowRight': 'right',
    'w': 'up',
    'W': 'up',
    's': 'down',
    'S': 'down',
    'a': 'left',
    'A': 'left',
    'd': 'right',
    'D': 'right'
  };

  const direction = keyMap[e.key];

  if (direction) {
    e.preventDefault();
    game.routeDirectionInput(direction);
  }

  // Undo handling
  if ((e.key === 'u' || e.key === 'U' || e.key === 'z' || e.key === 'Z') && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();

    // Block undo during execution phase
    if (game.isExecutionPhase) return;

    if (game.isScriptingPhase) {
      game.removeLastMoveFromScript();
    } else {
      game.undo();
    }
  }
});

// Button controls
document.querySelectorAll('.arrow-controls button').forEach(btn => {
  btn.addEventListener('click', () => {
    const direction = btn.dataset.direction;
    game.routeDirectionInput(direction);
  });
});

document.getElementById('restart').addEventListener('click', async () => {
  // Stop any running timer and execution
  game.stopTimer();
  game.isExecutionPhase = false;
  game.isExecutionPaused = false;

  document.getElementById('game-over-overlay').classList.remove('visible');
  const modeConfig = GAME_MODES[selectedMode];

  // Initialize game
  await initializeGame(modeConfig, gameSettings);
});

document.getElementById('undo').addEventListener('click', () => {
  // Block during execution
  if (game.isExecutionPhase) return;

  game.undo();
});

document.getElementById('change-mode').addEventListener('click', () => {
  // Stop timer if running
  game.stopTimer();

  // Clean up execution state (prevents race conditions)
  game.isExecutionPhase = false;
  game.isExecutionPaused = false;
  game.scriptQueue = [];
  game.executionHistory = [];

  // Show welcome overlay
  document.getElementById('welcome-overlay').classList.add('visible');

  // Hide game over overlay if visible
  document.getElementById('game-over-overlay').classList.remove('visible');
});

document.getElementById('play-again').addEventListener('click', async () => {
  // Stop any running timer and execution
  game.stopTimer();
  game.isExecutionPhase = false;
  game.isExecutionPaused = false;

  document.getElementById('game-over-overlay').classList.remove('visible');
  const modeConfig = GAME_MODES[selectedMode];

  // Initialize game
  await initializeGame(modeConfig, gameSettings);
});

document.getElementById('main-menu').addEventListener('click', () => {
  // Stop timer
  game.stopTimer();

  // Clean up execution state
  game.isExecutionPhase = false;
  game.isExecutionPaused = false;
  game.scriptQueue = [];
  game.executionHistory = [];

  // Hide game over overlay
  document.getElementById('game-over-overlay').classList.remove('visible');

  // Show welcome overlay
  document.getElementById('welcome-overlay').classList.add('visible');
});

// Script queue controls
document.getElementById('run-it-btn').addEventListener('click', () => {
  game.startScriptExecution();
});

document.getElementById('clear-script-btn').addEventListener('click', () => {
  game.clearScript();
});

document.getElementById('undo-queue-btn').addEventListener('click', () => {
  game.removeLastMoveFromScript();
});

// Playback controls
document.getElementById('play-pause-btn').addEventListener('click', () => {
  if (game.isExecutionPaused) {
    game.resumeExecution();
  } else {
    game.pauseExecution();
  }
});

document.getElementById('skip-to-start-btn').addEventListener('click', () => {
  game.skipToBeginning();
});

document.getElementById('skip-back-btn').addEventListener('click', () => {
  game.skipBackward();
});

document.getElementById('skip-forward-btn').addEventListener('click', () => {
  game.skipForward();
});

document.getElementById('skip-to-end-btn').addEventListener('click', () => {
  game.skipToEnd();
});

// Instructions overlay handlers
const instructionsOverlay = document.getElementById('instructions-overlay');
const howToPlayBtn = document.getElementById('how-to-play-btn');
const closeInstructionsBtn = document.getElementById('close-instructions');
const gotItBtn = document.getElementById('got-it-btn');

function showInstructions() {
  instructionsOverlay.classList.add('visible');
}

function hideInstructions() {
  instructionsOverlay.classList.remove('visible');
}

if (howToPlayBtn) {
  howToPlayBtn.addEventListener('click', showInstructions);
}

if (closeInstructionsBtn) {
  closeInstructionsBtn.addEventListener('click', hideInstructions);
}

if (gotItBtn) {
  gotItBtn.addEventListener('click', hideInstructions);
}

// Click outside to close
if (instructionsOverlay) {
  instructionsOverlay.addEventListener('click', (e) => {
    if (e.target === instructionsOverlay) {
      hideInstructions();
    }
  });
}

// Touch/swipe controls for mobile
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

const gridElement = document.getElementById('grid');

gridElement.addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].screenX;
  touchStartY = e.changedTouches[0].screenY;
}, { passive: false });

gridElement.addEventListener('touchend', (e) => {
  if (game.isGameOver || !game.controlsEnabled) return;

  touchEndX = e.changedTouches[0].screenX;
  touchEndY = e.changedTouches[0].screenY;

  handleSwipe();
  e.preventDefault(); // Prevent default touch behavior
}, { passive: false });

// Bridge inventory button
document.getElementById('bridge-inventory-btn').addEventListener('click', () => {
  if (game.isPlacementMode) {
    game.cancelPlacementMode();
  } else {
    game.activateBridgePlacement();
  }
});

// Place bridge button
document.getElementById('place-bridge-btn').addEventListener('click', () => {
  game.confirmBridgePlacement();
});

// Teleport inventory button
document.getElementById('teleport-inventory-btn').addEventListener('click', () => {
  if (game.isPlacementMode) {
    game.cancelPlacementMode();
  } else {
    game.activateTeleportPlacement();
  }
});

// Place teleport button (for future choice mode)
document.getElementById('place-teleport-btn').addEventListener('click', () => {
  game.confirmTeleportation();
});

// Cancel placement button
document.getElementById('cancel-placement-btn').addEventListener('click', () => {
  game.cancelPlacementMode();
});

// ESC key to cancel placement (add to existing keydown handler)
const originalKeydownHandler = document.querySelector('script');  // Get reference
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && game.isPlacementMode) {
    e.preventDefault();
    game.cancelPlacementMode();
  }
});

function handleSwipe() {
  const deltaX = touchEndX - touchStartX;
  const deltaY = touchEndY - touchStartY;
  const minSwipeDistance = 30; // Minimum pixels for a valid swipe

  // Check if swipe distance is sufficient
  if (Math.abs(deltaX) < minSwipeDistance && Math.abs(deltaY) < minSwipeDistance) {
    return; // Too short, ignore
  }

  // Determine direction
  let direction;
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    // Horizontal swipe
    direction = deltaX > 0 ? 'right' : 'left';
  } else {
    // Vertical swipe
    direction = deltaY > 0 ? 'down' : 'up';
  }

  game.routeDirectionInput(direction);
}
