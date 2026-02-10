/**
 * GameRenderer class - handles all DOM manipulation and visual updates
 * Stateless renderer that receives data from Game and updates UI
 */

import { isCornerCell } from '../utils/helpers.js';

export default class GameRenderer {
  constructor() {
    this.elements = this.cacheElements();
  }

  /**
   * Get placement instructions text based on powerup type
   * @private
   */
  getPlacementInstructions(placementType) {
    const instructions = {
      bridge: 'Select a wall to convert to a bridge',
      teleport: 'Select a cell to teleport to'
    };
    return instructions[placementType] || `Select a cell for ${placementType}`;
  }

  /**
   * Check if a cell is selectable for the current placement type
   * @private
   */
  isCellSelectableForPlacement(cell, x, y, placementType, playerPos) {
    if (x === playerPos.x && y === playerPos.y) return false;

    switch (placementType) {
      case 'bridge':
        return cell.isWall;
      case 'teleport':
        return !cell.isWall;
      default:
        return false;
    }
  }

  /**
   * Cache all DOM element references upfront for performance
   */
  cacheElements() {
    return {
      // Grid
      grid: document.getElementById('grid'),

      // Score displays
      score: document.getElementById('score'),
      highScore: document.getElementById('high-score'),

      // Timer
      timer: document.getElementById('timer'),
      timerDisplay: document.getElementById('timer-display'),

      // Buttons
      undoButton: document.getElementById('undo'),
      runItBtn: document.getElementById('run-it-btn'),

      // Inventory
      inventoryPanel: document.getElementById('inventory-panel'),
      bridgeBtn: document.getElementById('bridge-inventory-btn'),
      bridgeCount: document.getElementById('bridge-count'),
      teleportBtn: document.getElementById('teleport-inventory-btn'),
      teleportCount: document.getElementById('teleport-count'),

      // Placement UI
      placementUI: document.getElementById('placement-ui'),
      placementInstructions: document.getElementById('placement-instructions'),
      placeBridgeBtn: document.getElementById('place-bridge-btn'),
      placeTeleportBtn: document.getElementById('place-teleport-btn'),

      // Game over overlay
      gameOverOverlay: document.getElementById('game-over-overlay'),
      gameOverReason: document.getElementById('game-over-reason'),
      finalScore: document.getElementById('final-score'),

      // Viewing mode UI
      viewingModeUI: document.getElementById('viewing-mode-ui'),

      // Pre-programmed mode UI
      scriptQueueTable: document.getElementById('script-queue-table'),
      scriptingControls: document.getElementById('scripting-controls'),
      playbackControls: document.getElementById('playback-controls'),
      playPauseBtn: document.getElementById('play-pause-btn'),
      skipToStartBtn: document.getElementById('skip-to-start-btn'),
      skipBackBtn: document.getElementById('skip-back-btn'),
      skipForwardBtn: document.getElementById('skip-forward-btn'),
      skipToEndBtn: document.getElementById('skip-to-end-btn')
    };
  }

  /**
   * Render the game grid with cells, player, powerups, and placement mode
   * @param {Object} data - Grid data { grid, playerPos, isPlacementMode, placementType, selectedCellPos }
   * @param {Object} callbacks - Event callbacks { onCellClick }
   */
  renderGrid(data, callbacks = {}) {
    const { grid, playerPos, isPlacementMode, placementType, selectedCellPos } = data;
    const gridElement = this.elements.grid;

    gridElement.innerHTML = '';

    for (let y = 0; y < 11; y++) {
      for (let x = 0; x < 11; x++) {
        const cell = grid[y][x];
        const cellDiv = document.createElement('div');
        cellDiv.className = 'cell';

        // Check for placed bridge or teleport first (regardless of wall status)
        if (cell.hasBridge) {
          // Placed bridge: black background + static cyan bridge icon
          cellDiv.classList.add('placed-bridge');
          const icon = document.createElement('img');
          icon.src = 'assets/Bridge.svg';
          icon.className = 'placed-bridge-icon';
          cellDiv.appendChild(icon);
        } else if (cell.hasTeleport) {
          // Teleported cell: black background + static cyan teleport icon
          cellDiv.classList.add('placed-teleport');
          const icon = document.createElement('img');
          icon.src = 'assets/Teleport.svg';
          icon.className = 'placed-teleport-icon';
          cellDiv.appendChild(icon);
        } else if (cell.isWall) {
          cellDiv.classList.add('wall');
          cellDiv.textContent = 'X';
        } else {
          cellDiv.classList.add(`value-${cell.value}`);

          // Show powerup icon if present
          if (cell.powerup === 'bridge') {
            cellDiv.classList.add('has-powerup');

            // Add bridge icon
            const icon = document.createElement('img');
            icon.src = 'assets/Bridge.svg';
            icon.className = 'powerup-icon';
            cellDiv.appendChild(icon);

            // Still show value as faded text
            const valueText = document.createElement('span');
            valueText.className = 'cell-value';
            valueText.textContent = cell.value;
            cellDiv.appendChild(valueText);
          } else if (cell.powerup === 'teleport') {
            cellDiv.classList.add('has-powerup');

            // Add teleport icon
            const icon = document.createElement('img');
            icon.src = 'assets/Teleport.svg';
            icon.className = 'powerup-icon';
            cellDiv.appendChild(icon);

            // Still show value as faded text
            const valueText = document.createElement('span');
            valueText.className = 'cell-value';
            valueText.textContent = cell.value;
            cellDiv.appendChild(valueText);
          } else {
            cellDiv.textContent = cell.value;
          }
        }

        // Mark corner cells
        if (isCornerCell(x, y)) {
          cellDiv.classList.add('corner');
        }

        // Add player indicator
        if (x === playerPos.x && y === playerPos.y) {
          const player = document.createElement('div');
          player.className = 'player';
          cellDiv.appendChild(player);
        }

        gridElement.appendChild(cellDiv);
      }
    }

    // Handle placement mode (unified for all powerup types)
    if (isPlacementMode && placementType) {
      // Show placement UI
      if (this.elements.placementUI) {
        this.elements.placementUI.style.display = 'flex';
      }

      // Update instruction text
      if (this.elements.placementInstructions) {
        this.elements.placementInstructions.textContent = this.getPlacementInstructions(placementType);
      }

      // Update place buttons state based on type
      if (this.elements.placeBridgeBtn) {
        this.elements.placeBridgeBtn.disabled = !selectedCellPos;
        this.elements.placeBridgeBtn.style.display = placementType === 'bridge' ? 'block' : 'none';

        // Add enter-hint class when a cell is selected
        if (selectedCellPos && placementType === 'bridge') {
          this.elements.placeBridgeBtn.classList.add('enter-hint');
        } else {
          this.elements.placeBridgeBtn.classList.remove('enter-hint');
        }
      }

      if (this.elements.placeTeleportBtn) {
        this.elements.placeTeleportBtn.disabled = !selectedCellPos;
        this.elements.placeTeleportBtn.style.display = placementType === 'teleport' ? 'block' : 'none';

        // Add enter-hint class when a cell is selected
        if (selectedCellPos && placementType === 'teleport') {
          this.elements.placeTeleportBtn.classList.add('enter-hint');
        } else {
          this.elements.placeTeleportBtn.classList.remove('enter-hint');
        }
      }

      // Add cell highlighting and click handlers
      for (let y = 0; y < 11; y++) {
        for (let x = 0; x < 11; x++) {
          const cellIndex = y * 11 + x;
          const cellDiv = gridElement.children[cellIndex];
          const cell = grid[y][x];

          // Check if cell is selectable for current placement type
          if (this.isCellSelectableForPlacement(cell, x, y, placementType, playerPos)) {
            // Add appropriate CSS class based on type
            if (placementType === 'bridge') {
              cellDiv.classList.add('wall-selectable');
            } else if (placementType === 'teleport') {
              cellDiv.classList.add('cell-selectable');
            }

            // Highlight selected cell
            if (selectedCellPos &&
                selectedCellPos.x === x &&
                selectedCellPos.y === y) {
              if (placementType === 'bridge') {
                cellDiv.classList.add('wall-selected');
              } else {
                cellDiv.classList.add('cell-selected');
              }
            }

            // Make cell clickable
            cellDiv.style.cursor = 'pointer';
            if (callbacks.onCellClick) {
              cellDiv.addEventListener('click', () => {
                callbacks.onCellClick(x, y);
              });
            }
          }
        }
      }
    } else {
      // Hide placement UI
      if (this.elements.placementUI) {
        this.elements.placementUI.style.display = 'none';
      }
    }
  }

  /**
   * Render score displays
   * @param {number} score - Current score
   * @param {number} highScore - High score
   */
  renderScore(score, highScore) {
    this.elements.score.textContent = score;
    this.elements.highScore.textContent = highScore;
  }

  /**
   * Update undo button state
   * @param {boolean} hasHistory - Whether undo history exists
   */
  updateUndoButton(hasHistory) {
    this.elements.undoButton.disabled = !hasHistory;
  }

  /**
   * Render game over overlay
   * @param {string} reason - Game over reason ('wall collision', 'out of bounds', etc.)
   * @param {number} score - Final score
   */
  renderGameOver(reason, score) {
    const reasons = {
      'wall collision': 'You hit a wall!',
      'out of bounds': 'You moved off the grid!',
      'time expired': 'Time ran out!',
      'script complete': 'Script Complete! 🎉'
    };

    this.elements.gameOverReason.textContent = reasons[reason];
    this.elements.finalScore.textContent = score;
    this.elements.gameOverOverlay.classList.add('visible');
  }

  /**
   * Hide game over overlay
   */
  hideGameOverOverlay() {
    this.elements.gameOverOverlay.classList.remove('visible');
  }

  /**
   * Show/hide viewing mode UI
   * @param {boolean} isViewing - Whether in viewing mode
   */
  renderViewingModeUI(isViewing) {
    if (!this.elements.viewingModeUI) return;
    this.elements.viewingModeUI.style.display = isViewing ? 'block' : 'none';
  }

  /**
   * Render timer display
   * @param {Object} data - Timer data { timeRemaining, isExecutionPhase, isProgrammed }
   */
  renderTimer(data) {
    const { timeRemaining, isExecutionPhase, isProgrammed } = data;

    if (!this.elements.timer || !this.elements.timerDisplay) return;

    // Hide timer during execution phase in combined mode
    if (isExecutionPhase && isProgrammed) {
      this.elements.timerDisplay.style.opacity = '0.3';
      this.elements.timerDisplay.style.pointerEvents = 'none';
      return;
    }

    // Show timer during scripting or non-programmed modes
    this.elements.timerDisplay.style.opacity = '1';
    this.elements.timerDisplay.style.pointerEvents = 'auto';

    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    this.elements.timer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Add warning styling when time is low
    if (timeRemaining <= 10) {
      this.elements.timerDisplay.classList.add('timer-warning');
    } else {
      this.elements.timerDisplay.classList.remove('timer-warning');
    }
  }

  /**
   * Render powerup inventory panel
   * @param {Object} data - Inventory data { powerupsEnabled, inventory, isPlacementMode, placementType, isGameOver }
   */
  renderInventory(data) {
    const { powerupsEnabled, inventory, isPlacementMode, placementType, isGameOver } = data;

    if (!this.elements.inventoryPanel) return;

    // Show panel only if powerups enabled
    this.elements.inventoryPanel.style.display = powerupsEnabled ? 'block' : 'none';

    // Update bridge count
    this.elements.bridgeCount.textContent = inventory.bridges;

    // Enable bridge button if bridges available and not in placement mode
    const canActivateBridge = inventory.bridges > 0 && !isPlacementMode && !isGameOver;
    this.elements.bridgeBtn.disabled = !canActivateBridge;

    // Highlight bridge if in placement mode
    if (isPlacementMode && placementType === 'bridge') {
      this.elements.bridgeBtn.classList.add('active');
    } else {
      this.elements.bridgeBtn.classList.remove('active');
    }

    // Update teleport count
    this.elements.teleportCount.textContent = inventory.teleports;

    // Enable teleport button if teleports available and not in placement mode
    const canActivateTeleport = inventory.teleports > 0 && !isPlacementMode && !isGameOver;
    this.elements.teleportBtn.disabled = !canActivateTeleport;

    // Highlight teleport if in placement mode
    if (isPlacementMode && placementType === 'teleport') {
      this.elements.teleportBtn.classList.add('active');
    } else {
      this.elements.teleportBtn.classList.remove('active');
    }
  }

  /**
   * Update "Run It" button state
   * @param {boolean} hasQueuedMoves - Whether script queue has moves
   */
  updateRunItButton(hasQueuedMoves) {
    if (this.elements.runItBtn) {
      this.elements.runItBtn.disabled = !hasQueuedMoves;
    }
  }

  /**
   * Render script queue table
   * @param {Object} data - Script data { scriptQueue, isExecutionPhase, currentExecutionIndex }
   */
  renderScriptQueue(data) {
    const { scriptQueue, isExecutionPhase, currentExecutionIndex } = data;
    const queueTable = this.elements.scriptQueueTable;

    if (!queueTable) return;

    // Clear table
    queueTable.innerHTML = '';

    if (scriptQueue.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'queue-empty';
      emptyDiv.textContent = 'Queue empty';
      queueTable.appendChild(emptyDiv);
      return;
    }

    // Direction symbols
    const directionSymbols = {
      up: '⬆️',
      down: '⬇️',
      left: '⬅️',
      right: '➡️'
    };

    // Render each move
    scriptQueue.forEach((move, index) => {
      const item = document.createElement('div');
      item.className = 'queue-item';

      // Highlight current move during execution
      if (isExecutionPhase && index === currentExecutionIndex) {
        item.classList.add('current');
      }

      // Mark executed moves
      if (isExecutionPhase && index < currentExecutionIndex) {
        item.classList.add('executed');
      }

      const numberSpan = document.createElement('span');
      numberSpan.className = 'move-number';
      numberSpan.textContent = `${move.sequenceNumber}`;

      const arrowSpan = document.createElement('span');
      arrowSpan.className = 'move-arrow';
      arrowSpan.textContent = directionSymbols[move.direction];

      item.appendChild(numberSpan);
      item.appendChild(arrowSpan);

      queueTable.appendChild(item);
    });

    // Auto-scroll to current move
    if (isExecutionPhase && currentExecutionIndex >= 0) {
      const currentItem = queueTable.querySelector('.queue-item.current');
      if (currentItem) {
        currentItem.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  }

  /**
   * Render execution UI (show/hide scripting vs playback controls)
   * @param {Object} data - Execution state { isScriptingPhase, isExecutionPhase }
   */
  renderExecutionUI(data) {
    const { isScriptingPhase, isExecutionPhase } = data;

    if (!this.elements.scriptingControls || !this.elements.playbackControls) return;

    if (isScriptingPhase) {
      // Show scripting controls (Clear, Undo, Run It)
      this.elements.scriptingControls.style.display = 'flex';
      this.elements.playbackControls.style.display = 'none';
    } else if (isExecutionPhase) {
      // Show playback controls
      this.elements.scriptingControls.style.display = 'none';
      this.elements.playbackControls.style.display = 'flex';
    }
  }

  /**
   * Render playback controls state
   * @param {Object} data - Playback data { isExecutionPaused, currentExecutionIndex, scriptQueueLength }
   */
  renderPlaybackControls(data) {
    const { isExecutionPaused, currentExecutionIndex, scriptQueueLength } = data;

    if (!this.elements.playPauseBtn) return;

    // Update play/pause button
    this.elements.playPauseBtn.textContent = isExecutionPaused ? '▶ Play' : '⏸ Pause';

    // Disable buttons at boundaries
    if (this.elements.skipToStartBtn) {
      this.elements.skipToStartBtn.disabled = currentExecutionIndex < 0;
    }
    if (this.elements.skipBackBtn) {
      this.elements.skipBackBtn.disabled = currentExecutionIndex < 0;
    }
    if (this.elements.skipForwardBtn) {
      this.elements.skipForwardBtn.disabled = currentExecutionIndex >= scriptQueueLength - 1;
    }
    if (this.elements.skipToEndBtn) {
      this.elements.skipToEndBtn.disabled = currentExecutionIndex >= scriptQueueLength - 1;
    }
  }
}
