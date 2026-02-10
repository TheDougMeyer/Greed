/**
 * Main initialization and event handlers
 */

import Game from './core/Game.js';
import InputHandler from './input/InputHandler.js';
import { GAME_MODES } from './config/modes.js';
import { sleep } from './utils/helpers.js';

// Initialize game
const game = new Game();

// Initialize input handling
const inputHandler = new InputHandler(game);
inputHandler.init();

// Helper function to initialize game based on mode
async function initializeGame(modeConfig, settings, extraOptions = {}) {
  if (modeConfig.hasTimer && !modeConfig.isProgrammed) {
    // Timer mode only
    game.init(modeConfig, settings, { skipTimerStart: true, ...extraOptions });
    await showCountdown(3);
    game.startTimer();
    game.enableControls();
  } else if (modeConfig.isProgrammed && !modeConfig.hasTimer) {
    // Pre-programmed mode only
    game.init(modeConfig, settings, extraOptions);
    // Controls already enabled for scripting by init()
  } else if (modeConfig.isProgrammed && modeConfig.hasTimer) {
    // Combined mode
    game.init(modeConfig, settings, { skipTimerStart: true, ...extraOptions });
    await showCountdown(3);
    game.startTimer();  // Timer runs during scripting
    // Controls already enabled for scripting
  } else {
    // Classic mode
    game.init(modeConfig, settings, extraOptions);
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

    // Auto-select the parent mode card
    document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
    modeCard.classList.add('selected');
    selectedMode = modeCard.dataset.mode;
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

// Start game function (shared by button click and Enter key)
async function startGame() {
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
}

// Start game button
document.getElementById('start-game').addEventListener('click', startGame);

// Enter key on welcome screen
document.addEventListener('keydown', (e) => {
  const welcomeOverlay = document.getElementById('welcome-overlay');
  if (e.key === 'Enter' && welcomeOverlay.classList.contains('visible')) {
    e.preventDefault();
    startGame();
  }
});

// UI Flow buttons
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

// View Board button - enter viewing mode
document.getElementById('view-board').addEventListener('click', () => {
  game.enterViewingMode();
});

// Replay This Board button - replay the same grid
document.getElementById('replay-board').addEventListener('click', async () => {
  // Stop any running timer and execution
  game.stopTimer();
  game.isExecutionPhase = false;
  game.isExecutionPaused = false;

  document.getElementById('game-over-overlay').classList.remove('visible');
  const modeConfig = GAME_MODES[selectedMode];

  // Initialize game with the saved initial grid
  await initializeGame(modeConfig, gameSettings, {
    replayGrid: game.initialGrid
  });
});

// Back to Results button - exit viewing mode
document.getElementById('back-to-results').addEventListener('click', () => {
  game.exitViewingMode();
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
