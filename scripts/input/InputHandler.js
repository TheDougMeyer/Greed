/**
 * InputHandler - Centralized input management for keyboard, mouse, and touch events
 * Provides unified action routing and visual feedback for all input methods
 */

// Action types enum - all input sources map to these unified actions
const ACTIONS = {
  // Directional movement
  MOVE_UP: 'move_up',
  MOVE_DOWN: 'move_down',
  MOVE_LEFT: 'move_left',
  MOVE_RIGHT: 'move_right',

  // Game controls
  UNDO: 'undo',
  CANCEL_PLACEMENT: 'cancel_placement',

  // Script controls (pre-programmed mode)
  RUN_SCRIPT: 'run_script',
  CLEAR_SCRIPT: 'clear_script',
  UNDO_QUEUE: 'undo_queue',

  // Playback controls
  PLAY_PAUSE: 'play_pause',
  SKIP_TO_START: 'skip_to_start',
  SKIP_BACK: 'skip_back',
  SKIP_FORWARD: 'skip_forward',
  SKIP_TO_END: 'skip_to_end',

  // Powerup controls
  ACTIVATE_BRIDGE: 'activate_bridge',
  PLACE_BRIDGE: 'place_bridge',
  ACTIVATE_TELEPORT: 'activate_teleport',
  PLACE_TELEPORT: 'place_teleport',
  CONFIRM_PLACEMENT: 'confirm_placement'
};

// Minimum swipe distance in pixels
const MIN_SWIPE_DISTANCE = 30;

export default class InputHandler {
  constructor(game) {
    this.game = game;
    this.elements = this.cacheElements();
    this.touchStart = { x: 0, y: 0 };
    this.touchEnd = { x: 0, y: 0 };
    this.keyButtonMap = this.buildKeyButtonMap();
  }

  /**
   * Cache all DOM elements for performance
   */
  cacheElements() {
    return {
      grid: document.getElementById('grid'),
      arrowButtons: document.querySelectorAll('.arrow-controls button'),
      undoButton: document.getElementById('undo'),
      runItBtn: document.getElementById('run-it-btn'),
      clearScriptBtn: document.getElementById('clear-script-btn'),
      undoQueueBtn: document.getElementById('undo-queue-btn'),
      playPauseBtn: document.getElementById('play-pause-btn'),
      skipToStartBtn: document.getElementById('skip-to-start-btn'),
      skipBackBtn: document.getElementById('skip-back-btn'),
      skipForwardBtn: document.getElementById('skip-forward-btn'),
      skipToEndBtn: document.getElementById('skip-to-end-btn'),
      bridgeInventoryBtn: document.getElementById('bridge-inventory-btn'),
      placeBridgeBtn: document.getElementById('place-bridge-btn'),
      teleportInventoryBtn: document.getElementById('teleport-inventory-btn'),
      placeTeleportBtn: document.getElementById('place-teleport-btn'),
      cancelPlacementBtn: document.getElementById('cancel-placement-btn')
    };
  }

  /**
   * Build mapping from keyboard keys to their corresponding on-screen buttons
   * Used for visual feedback when keys are pressed
   */
  buildKeyButtonMap() {
    return {
      // Arrow keys
      'ArrowUp': document.querySelector('[data-direction="up"]'),
      'ArrowDown': document.querySelector('[data-direction="down"]'),
      'ArrowLeft': document.querySelector('[data-direction="left"]'),
      'ArrowRight': document.querySelector('[data-direction="right"]'),

      // WASD keys
      'w': document.querySelector('[data-direction="up"]'),
      'W': document.querySelector('[data-direction="up"]'),
      's': document.querySelector('[data-direction="down"]'),
      'S': document.querySelector('[data-direction="down"]'),
      'a': document.querySelector('[data-direction="left"]'),
      'A': document.querySelector('[data-direction="left"]'),
      'd': document.querySelector('[data-direction="right"]'),
      'D': document.querySelector('[data-direction="right"]'),

      // Undo keys
      'u': document.getElementById('undo'),
      'U': document.getElementById('undo'),
      'z': document.getElementById('undo'),
      'Z': document.getElementById('undo')
    };
  }

  /**
   * Initialize all event listeners
   */
  init() {
    this.setupKeyboardListeners();
    this.setupButtonListeners();
    this.setupTouchListeners();
  }

  /**
   * Setup keyboard event listeners with visual feedback
   */
  setupKeyboardListeners() {
    // Keydown handler - process input and add visual feedback
    document.addEventListener('keydown', (e) => {
      const action = this.mapKeyToAction(e.key, e);

      if (action) {
        e.preventDefault();
        this.activateButtonFeedback(e.key);
        this.handleInput(action);
      }
    });

    // Keyup handler - remove visual feedback
    document.addEventListener('keyup', (e) => {
      this.deactivateButtonFeedback(e.key);
    });
  }

  /**
   * Setup button click event listeners
   */
  setupButtonListeners() {
    // Arrow buttons - directional movement
    this.elements.arrowButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const direction = btn.dataset.direction;
        const action = this.mapDirectionToAction(direction);
        this.handleInput(action);
      });
    });

    // Undo button
    if (this.elements.undoButton) {
      this.elements.undoButton.addEventListener('click', () => {
        this.handleInput(ACTIONS.UNDO);
      });
    }

    // Script controls
    if (this.elements.runItBtn) {
      this.elements.runItBtn.addEventListener('click', () => {
        this.handleInput(ACTIONS.RUN_SCRIPT);
      });
    }

    if (this.elements.clearScriptBtn) {
      this.elements.clearScriptBtn.addEventListener('click', () => {
        this.handleInput(ACTIONS.CLEAR_SCRIPT);
      });
    }

    if (this.elements.undoQueueBtn) {
      this.elements.undoQueueBtn.addEventListener('click', () => {
        this.handleInput(ACTIONS.UNDO_QUEUE);
      });
    }

    // Playback controls
    if (this.elements.playPauseBtn) {
      this.elements.playPauseBtn.addEventListener('click', () => {
        this.handleInput(ACTIONS.PLAY_PAUSE);
      });
    }

    if (this.elements.skipToStartBtn) {
      this.elements.skipToStartBtn.addEventListener('click', () => {
        this.handleInput(ACTIONS.SKIP_TO_START);
      });
    }

    if (this.elements.skipBackBtn) {
      this.elements.skipBackBtn.addEventListener('click', () => {
        this.handleInput(ACTIONS.SKIP_BACK);
      });
    }

    if (this.elements.skipForwardBtn) {
      this.elements.skipForwardBtn.addEventListener('click', () => {
        this.handleInput(ACTIONS.SKIP_FORWARD);
      });
    }

    if (this.elements.skipToEndBtn) {
      this.elements.skipToEndBtn.addEventListener('click', () => {
        this.handleInput(ACTIONS.SKIP_TO_END);
      });
    }

    // Powerup controls
    if (this.elements.bridgeInventoryBtn) {
      this.elements.bridgeInventoryBtn.addEventListener('click', () => {
        this.handleInput(ACTIONS.ACTIVATE_BRIDGE);
      });
    }

    if (this.elements.placeBridgeBtn) {
      this.elements.placeBridgeBtn.addEventListener('click', () => {
        this.handleInput(ACTIONS.PLACE_BRIDGE);
      });
    }

    if (this.elements.teleportInventoryBtn) {
      this.elements.teleportInventoryBtn.addEventListener('click', () => {
        this.handleInput(ACTIONS.ACTIVATE_TELEPORT);
      });
    }

    if (this.elements.placeTeleportBtn) {
      this.elements.placeTeleportBtn.addEventListener('click', () => {
        this.handleInput(ACTIONS.PLACE_TELEPORT);
      });
    }

    if (this.elements.cancelPlacementBtn) {
      this.elements.cancelPlacementBtn.addEventListener('click', () => {
        this.handleInput(ACTIONS.CANCEL_PLACEMENT);
      });
    }
  }

  /**
   * Setup touch/swipe event listeners
   */
  setupTouchListeners() {
    if (!this.elements.grid) return;

    this.elements.grid.addEventListener('touchstart', (e) => {
      this.touchStart.x = e.changedTouches[0].screenX;
      this.touchStart.y = e.changedTouches[0].screenY;
    }, { passive: false });

    this.elements.grid.addEventListener('touchend', (e) => {
      // Guard checks
      if (this.game.isGameOver || !this.game.controlsEnabled) return;

      this.touchEnd.x = e.changedTouches[0].screenX;
      this.touchEnd.y = e.changedTouches[0].screenY;

      const direction = this.detectSwipeDirection();
      if (direction) {
        const action = this.mapDirectionToAction(direction);
        this.handleInput(action);
        e.preventDefault(); // Prevent default touch behavior
      }
    }, { passive: false });
  }

  /**
   * Map keyboard key to action type
   */
  mapKeyToAction(key, event) {
    // Directional keys
    const directionMap = {
      'ArrowUp': ACTIONS.MOVE_UP,
      'ArrowDown': ACTIONS.MOVE_DOWN,
      'ArrowLeft': ACTIONS.MOVE_LEFT,
      'ArrowRight': ACTIONS.MOVE_RIGHT,
      'w': ACTIONS.MOVE_UP,
      'W': ACTIONS.MOVE_UP,
      's': ACTIONS.MOVE_DOWN,
      'S': ACTIONS.MOVE_DOWN,
      'a': ACTIONS.MOVE_LEFT,
      'A': ACTIONS.MOVE_LEFT,
      'd': ACTIONS.MOVE_RIGHT,
      'D': ACTIONS.MOVE_RIGHT
    };

    // Check directional keys first
    if (directionMap[key]) {
      return directionMap[key];
    }

    // Undo (avoid Ctrl+Z / Cmd+Z browser shortcuts)
    if ((key === 'u' || key === 'U' || key === 'z' || key === 'Z') &&
        !event.ctrlKey && !event.metaKey) {
      return ACTIONS.UNDO;
    }

    // ESC for cancel placement
    if (key === 'Escape') {
      return ACTIONS.CANCEL_PLACEMENT;
    }

    // Enter for confirm placement
    if (key === 'Enter') {
      return ACTIONS.CONFIRM_PLACEMENT;
    }

    return null;
  }

  /**
   * Map direction string to action type
   */
  mapDirectionToAction(direction) {
    const map = {
      'up': ACTIONS.MOVE_UP,
      'down': ACTIONS.MOVE_DOWN,
      'left': ACTIONS.MOVE_LEFT,
      'right': ACTIONS.MOVE_RIGHT
    };
    return map[direction];
  }

  /**
   * Detect swipe direction from touch coordinates
   */
  detectSwipeDirection() {
    const deltaX = this.touchEnd.x - this.touchStart.x;
    const deltaY = this.touchEnd.y - this.touchStart.y;

    // Ignore short swipes
    if (Math.abs(deltaX) < MIN_SWIPE_DISTANCE &&
        Math.abs(deltaY) < MIN_SWIPE_DISTANCE) {
      return null;
    }

    // Determine primary axis
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX > 0 ? 'right' : 'left';
    } else {
      return deltaY > 0 ? 'down' : 'up';
    }
  }

  /**
   * Add visual feedback class to corresponding button
   */
  activateButtonFeedback(key) {
    const button = this.keyButtonMap[key];
    if (button && !button.disabled) {
      button.classList.add('key-active');
    }
  }

  /**
   * Remove visual feedback class from corresponding button
   */
  deactivateButtonFeedback(key) {
    const button = this.keyButtonMap[key];
    if (button) {
      button.classList.remove('key-active');
    }
  }

  /**
   * Central action handler - routes all input through unified state guards
   */
  handleInput(action, metadata = {}) {
    const { game } = this;

    // Directional movement
    if (action.startsWith('move_')) {
      if (game.isGameOver || !game.controlsEnabled) return;
      const direction = action.split('_')[1]; // 'move_up' → 'up'
      game.routeDirectionInput(direction);
      return;
    }

    // Undo
    if (action === ACTIONS.UNDO) {
      if (game.isExecutionPhase) return;  // Block during execution

      if (game.isScriptingPhase) {
        game.removeLastMoveFromScript();
      } else {
        game.undo();
      }
      return;
    }

    // Cancel placement (ESC key)
    if (action === ACTIONS.CANCEL_PLACEMENT) {
      if (game.isPlacementMode) {
        game.cancelPlacementMode();
      }
      return;
    }

    // Confirm placement (Enter key)
    if (action === ACTIONS.CONFIRM_PLACEMENT) {
      if (game.isPlacementMode && game.selectedCellPos) {
        if (game.placementType === 'bridge') {
          game.confirmBridgePlacement();
        } else if (game.placementType === 'teleport') {
          game.confirmTeleportation();
        }
      }
      return;
    }

    // Script controls
    if (action === ACTIONS.RUN_SCRIPT) {
      game.startScriptExecution();
      return;
    }

    if (action === ACTIONS.CLEAR_SCRIPT) {
      game.clearScript();
      return;
    }

    if (action === ACTIONS.UNDO_QUEUE) {
      game.removeLastMoveFromScript();
      return;
    }

    // Playback controls
    if (action === ACTIONS.PLAY_PAUSE) {
      if (game.isExecutionPaused) {
        game.resumeExecution();
      } else {
        game.pauseExecution();
      }
      return;
    }

    if (action === ACTIONS.SKIP_TO_START) {
      game.skipToBeginning();
      return;
    }

    if (action === ACTIONS.SKIP_BACK) {
      game.skipBackward();
      return;
    }

    if (action === ACTIONS.SKIP_FORWARD) {
      game.skipForward();
      return;
    }

    if (action === ACTIONS.SKIP_TO_END) {
      game.skipToEnd();
      return;
    }

    // Powerup controls
    if (action === ACTIONS.ACTIVATE_BRIDGE || action === ACTIONS.ACTIVATE_TELEPORT) {
      if (game.isPlacementMode) {
        game.cancelPlacementMode();
      } else {
        const type = action === ACTIONS.ACTIVATE_BRIDGE ? 'bridge' : 'teleport';
        game.activatePlacement(type);
      }
      return;
    }

    if (action === ACTIONS.PLACE_BRIDGE) {
      game.confirmBridgePlacement();
      return;
    }

    if (action === ACTIONS.PLACE_TELEPORT) {
      game.confirmTeleportation();
      return;
    }
  }
}
