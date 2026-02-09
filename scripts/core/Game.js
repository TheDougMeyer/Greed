/**
 * Main Game class - manages all game state and logic
 */

import { shuffleArray, deepCopyGrid, sleep } from '../utils/helpers.js';
import { POWERUP_TYPES, isPowerupAllowedInMode, getEnabledPowerups } from '../config/powerups.js';

// Pre-programmed mode constants
const MAX_SCRIPT_MOVES = 20;
const EXECUTION_DELAY_MS = 500;
const SCRIPT_COMPLETION_BONUS_MULTIPLIER = 2;

export default class Game {
  constructor() {
    this.grid = [];
    this.playerPos = { x: 5, y: 5 };
    this.score = 0;
    this.isGameOver = false;
    this.gameOverReason = '';
    this.history = [];
    this.moveHistory = [];
    this.highScore = this.loadHighScore();
    this.startingPos = { x: 5, y: 5 };
    this.isFirstMove = true;

    // Mode management
    this.mode = null;
    this.modeConfig = null;

    // Timer state (for timer modes)
    this.timeRemaining = 0;
    this.timerInterval = null;
    this.isPaused = false;

    // Settings
    this.powerupsEnabled = false;

    // Powerup settings (loaded from config)
    this.enabledPowerups = [];  // Array of enabled POWERUP_TYPES

    // Powerup inventory
    this.inventory = {
      bridges: 0,
      teleports: 0
    };

    // Placement mode state
    this.isPlacementMode = false;
    this.placementType = null;  // 'bridge' | 'teleport' | null
    this.selectedCellPos = null;  // {x, y} | null

    // Teleport configuration
    this.TELEPORT_RANDOM_MODE = true;  // Set to false to enable choice mode

    // Controls state
    this.controlsEnabled = false;

    // Pre-programmed mode state
    this.scriptQueue = [];
    this.isScriptingPhase = false;
    this.isExecutionPhase = false;
    this.isExecutionPaused = false;
    this.currentExecutionIndex = -1;
    this.executionHistory = [];
  }

  init(modeConfig = null, settings = {}, options = {}) {
    // Set mode
    this.mode = modeConfig?.id || 'classic';
    this.modeConfig = modeConfig;

    // Apply settings - get enabled powerups from config
    this.enabledPowerups = getEnabledPowerups(settings);
    this.powerupsEnabled = this.enabledPowerups.length > 0;

    // Reset game state
    this.generateGrid();
    this.playerPos = { x: 5, y: 5 };
    this.startingPos = { x: 5, y: 5 };
    this.isFirstMove = true;
    this.score = 0;
    this.isGameOver = false;
    this.gameOverReason = '';
    this.history = [];
    this.moveHistory = [];

    // Load high score for this mode
    this.highScore = this.loadHighScore();

    // Reset pre-programmed mode state
    this.scriptQueue = [];
    this.isScriptingPhase = false;
    this.isExecutionPhase = false;
    this.isExecutionPaused = false;
    this.currentExecutionIndex = -1;
    this.executionHistory = [];

    // Reset inventory and placement state
    this.inventory = { bridges: 0, teleports: 0 };
    this.isPlacementMode = false;
    this.placementType = null;
    this.selectedCellPos = null;

    // Start timer if mode requires it (unless skipped for countdown)
    if (this.modeConfig?.hasTimer && !options.skipTimerStart) {
      this.timeRemaining = settings.timerDuration || this.modeConfig.defaultTime;
      this.startTimer();
    } else if (this.modeConfig?.hasTimer && options.skipTimerStart) {
      // Store duration but don't start yet
      this.timeRemaining = settings.timerDuration || this.modeConfig.defaultTime;
    }

    // Controls disabled by default (except for scripting phase)
    this.controlsEnabled = false;

    // Set initial state based on mode
    if (this.modeConfig?.isProgrammed) {
      this.isScriptingPhase = true;
      this.controlsEnabled = true;  // Enable for scripting
      console.log('Pre-programmed mode initialized:', {
        isScriptingPhase: this.isScriptingPhase,
        controlsEnabled: this.controlsEnabled,
        modeConfig: this.modeConfig
      });
    }

    this.render();
  }

  generateGrid() {
    this.grid = [];

    // Create array with exactly 24 of each number (1-5)
    // Total: 11x11 = 121 cells - 1 center cell = 120 cells
    // Distribution: 120 ÷ 5 = 24 occurrences per number
    const values = [];
    for (let num = 1; num <= 5; num++) {
      for (let count = 0; count < 24; count++) {
        values.push(num);
      }
    }

    // Shuffle the values array for random distribution
    const shuffled = shuffleArray(values);
    let index = 0;

    // Build grid with shuffled values
    for (let y = 0; y < 11; y++) {
      this.grid[y] = [];
      for (let x = 0; x < 11; x++) {
        const isCenterCell = (x === 5 && y === 5);
        this.grid[y][x] = {
          value: isCenterCell ? 0 : shuffled[index++],
          isWall: false
        };
      }
    }

    // Spawn powerups based on enabled types and mode compatibility
    this.spawnPowerups();
  }

  spawnPowerups() {
    // Spawn each enabled powerup that's allowed in current mode
    this.enabledPowerups.forEach(powerupConfig => {
      if (isPowerupAllowedInMode(powerupConfig.id, this.modeConfig)) {
        this.spawnPowerup(powerupConfig);
      }
    });
  }

  spawnPowerup(powerupConfig) {
    // Find all cells matching powerup's spawn requirements
    const validCells = [];
    for (let y = 0; y < 11; y++) {
      for (let x = 0; x < 11; x++) {
        // Skip center cell
        if (x === 5 && y === 5) continue;

        const cell = this.grid[y][x];

        // Check if cell value matches powerup's spawn requirements
        if (powerupConfig.spawnOnValues.includes(cell.value)) {
          validCells.push({x, y});
        }
      }
    }

    // Randomly select N cells based on spawnCount
    for (let i = 0; i < powerupConfig.spawnCount && validCells.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * validCells.length);
      const {x, y} = validCells.splice(randomIndex, 1)[0];  // Remove from array
      this.grid[y][x].powerup = powerupConfig.id;
    }
  }

  enableControls() {
    this.controlsEnabled = true;
  }

  disableControls() {
    this.controlsEnabled = false;
  }

  move(direction) {
    if (this.isGameOver || !this.controlsEnabled) return;

    // Save state before move (for undo)
    this.saveState();

    // Calculate move
    const moveResult = this.calculateMove(direction);

    if (!moveResult.valid) {
      this.isGameOver = true;
      this.gameOverReason = moveResult.reason;
      this.render();
      return;
    }

    // Execute move
    this.executeMove(moveResult.path, direction, moveResult.steps);
    this.render();
  }

  calculateMove(direction) {
    const { x, y } = this.playerPos;

    // Calculate direction vector
    const vectors = {
      up: { dx: 0, dy: -1 },
      down: { dx: 0, dy: 1 },
      left: { dx: -1, dy: 0 },
      right: { dx: 1, dy: 0 }
    };

    const { dx, dy } = vectors[direction];

    // Check the immediate neighbor (target cell) in the chosen direction
    const targetX = x + dx;
    const targetY = y + dy;

    // Check if target is out of bounds
    if (targetX < 0 || targetX > 10 || targetY < 0 || targetY > 10) {
      return { valid: false, reason: 'out of bounds' };
    }

    // Check if target is a wall
    if (this.grid[targetY][targetX].isWall) {
      return { valid: false, reason: 'wall collision' };
    }

    // Get the number of steps from the target cell
    const steps = this.grid[targetY][targetX].value;
    const path = [];

    // Trace path - move 'steps' spaces in the chosen direction
    for (let i = 1; i <= steps; i++) {
      const newX = x + (dx * i);
      const newY = y + (dy * i);

      // Check bounds
      if (newX < 0 || newX > 10 || newY < 0 || newY > 10) {
        return { valid: false, reason: 'out of bounds' };
      }

      // Check wall collision
      if (this.grid[newY][newX].isWall) {
        return { valid: false, reason: 'wall collision' };
      }

      path.push({ x: newX, y: newY });
    }

    return { valid: true, path, steps };
  }

  executeMove(path, direction, steps) {
    let scoreGain = 0;

    // Mark all traversed cells as walls and sum their values
    path.forEach(pos => {
      const cell = this.grid[pos.y][pos.x];

      // Collect powerup if present
      if (cell.powerup === 'bridge') {
        this.inventory.bridges++;
        cell.powerup = undefined; // Remove from cell
      }

      if (cell.powerup === 'teleport') {
        this.inventory.teleports++;
        cell.powerup = undefined; // Remove from cell
      }

      scoreGain += cell.value;
      cell.isWall = true;
    });

    // If this is the first move, mark the starting position (center) as a wall
    if (this.isFirstMove) {
      this.grid[this.startingPos.y][this.startingPos.x].isWall = true;
      this.isFirstMove = false;
    }

    // Update player position (last position in path)
    const finalPos = path[path.length - 1];
    this.playerPos = { x: finalPos.x, y: finalPos.y };

    // Check for corner bonus
    let cornerBonus = 0;
    const isCorner = (this.playerPos.x === 0 && this.playerPos.y === 0) ||
                     (this.playerPos.x === 10 && this.playerPos.y === 0) ||
                     (this.playerPos.x === 0 && this.playerPos.y === 10) ||
                     (this.playerPos.x === 10 && this.playerPos.y === 10);

    if (isCorner) {
      cornerBonus = 25;
    }

    // Update score
    this.score += scoreGain + cornerBonus;

    // Update high score if needed
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore();
    }

    // Record move
    const directionSymbols = {
      up: '↑',
      down: '↓',
      left: '←',
      right: '→'
    };
    const bonusText = cornerBonus > 0 ? ` +${cornerBonus} corner bonus` : '';
    this.moveHistory.push(
      `${directionSymbols[direction]} ${steps} spaces (+${scoreGain}${bonusText})`
    );
  }

  saveState() {
    const snapshot = {
      grid: deepCopyGrid(this.grid),
      playerPos: { ...this.playerPos },
      score: this.score,
      moveHistory: [...this.moveHistory],
      isFirstMove: this.isFirstMove,
      timeRemaining: this.timeRemaining,
      inventory: { ...this.inventory }
    };
    this.history.push(snapshot);
  }

  undo() {
    if (this.history.length === 0) return;

    // Pause timer during undo if applicable
    const wasTimerRunning = this.modeConfig?.hasTimer && !this.isPaused;
    if (wasTimerRunning) this.pauseTimer();

    const previousState = this.history.pop();
    this.grid = previousState.grid;
    this.playerPos = previousState.playerPos;
    this.score = previousState.score;
    this.moveHistory = previousState.moveHistory;
    this.isFirstMove = previousState.isFirstMove;
    this.inventory = previousState.inventory;

    // Restore timer state if saved
    if (previousState.timeRemaining !== undefined) {
      this.timeRemaining = previousState.timeRemaining;
    }

    this.isGameOver = false;
    this.gameOverReason = '';

    // Hide game over overlay if visible
    document.getElementById('game-over-overlay').classList.remove('visible');

    // Resume timer if it was running
    if (wasTimerRunning) this.resumeTimer();

    this.render();
  }

  // Pre-programmed mode: Scripting phase methods
  addMoveToScript(direction) {
    console.log('addMoveToScript called:', {
      direction,
      isScriptingPhase: this.isScriptingPhase,
      queueLength: this.scriptQueue.length,
      controlsEnabled: this.controlsEnabled
    });

    if (!this.isScriptingPhase) {
      console.log('NOT in scripting phase, returning');
      return;
    }

    if (this.scriptQueue.length >= MAX_SCRIPT_MOVES) {
      return;
    }

    const sequenceNumber = this.scriptQueue.length + 1;
    this.scriptQueue.push({ direction, sequenceNumber });
    console.log('Move added to queue:', this.scriptQueue);

    this.renderScriptQueue();
    this.updateRunItButton();
  }

  removeLastMoveFromScript() {
    if (!this.isScriptingPhase || this.scriptQueue.length === 0) return;

    this.scriptQueue.pop();

    this.renderScriptQueue();
    this.updateRunItButton();
  }

  clearScript() {
    if (!this.isScriptingPhase) return;

    this.scriptQueue = [];

    this.renderScriptQueue();
    this.updateRunItButton();
  }


  updateRunItButton() {
    const runItBtn = document.getElementById('run-it-btn');
    if (runItBtn) {
      runItBtn.disabled = this.scriptQueue.length === 0;
    }
  }

  // Pre-programmed mode: Execution phase methods
  startScriptExecution() {
    if (!this.isScriptingPhase || this.scriptQueue.length === 0) return;

    // Transition from scripting to execution phase
    this.isScriptingPhase = false;
    this.isExecutionPhase = true;
    this.isExecutionPaused = false;
    this.currentExecutionIndex = -1;
    this.executionHistory = [];

    // Stop timer if combined mode (timer runs during scripting only)
    if (this.modeConfig?.hasTimer) {
      this.stopTimer();
    }

    // Disable controls during execution
    this.controlsEnabled = false;

    // Save initial state
    this.saveExecutionSnapshot(-1);

    this.render();

    // Start execution
    this.executeNextMove();
  }

  async executeNextMove() {
    if (!this.isExecutionPhase || this.isExecutionPaused) return;

    this.currentExecutionIndex++;

    // Check completion
    if (this.currentExecutionIndex >= this.scriptQueue.length) {
      this.completeScriptExecution();
      return;
    }

    // Get current move
    const move = this.scriptQueue[this.currentExecutionIndex];
    this.renderScriptQueue();  // Highlight current

    // Validate move
    const moveResult = this.calculateMove(move.direction);
    if (!moveResult.valid) {
      this.isGameOver = true;
      this.gameOverReason = moveResult.reason;
      this.isExecutionPhase = false;
      this.render();
      return;
    }

    // Execute move
    this.executeMove(moveResult.path, move.direction, moveResult.steps);
    this.saveExecutionSnapshot(this.currentExecutionIndex);
    this.render();

    // Delay before next move
    await sleep(EXECUTION_DELAY_MS);

    // Continue if not paused
    if (this.isExecutionPhase && !this.isExecutionPaused) {
      this.executeNextMove();
    }
  }

  saveExecutionSnapshot(moveIndex) {
    const snapshot = {
      moveIndex,
      grid: deepCopyGrid(this.grid),
      playerPos: { ...this.playerPos },
      score: this.score,
      moveHistory: [...this.moveHistory],
      isFirstMove: this.isFirstMove
    };
    this.executionHistory.push(snapshot);
  }

  restoreExecutionSnapshot(snapshot) {
    this.grid = snapshot.grid;
    this.playerPos = snapshot.playerPos;
    this.score = snapshot.score;
    this.moveHistory = snapshot.moveHistory;
    this.isFirstMove = snapshot.isFirstMove;
    this.currentExecutionIndex = snapshot.moveIndex;
  }

  completeScriptExecution() {
    const bonus = SCRIPT_COMPLETION_BONUS_MULTIPLIER * this.scriptQueue.length;
    this.score += bonus;

    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore();
    }

    this.moveHistory.push(`🎉 Script Complete! +${bonus} completion bonus`);

    this.isGameOver = true;
    this.gameOverReason = 'script complete';
    this.isExecutionPhase = false;

    this.render();
  }

  // Pre-programmed mode: Playback control methods
  pauseExecution() {
    if (!this.isExecutionPhase) return;

    this.isExecutionPaused = true;
    this.renderPlaybackControls();
  }

  resumeExecution() {
    if (!this.isExecutionPhase || !this.isExecutionPaused) return;

    this.isExecutionPaused = false;
    this.renderPlaybackControls();

    // Continue execution
    this.executeNextMove();
  }

  skipForward() {
    if (!this.isExecutionPhase) return;

    // If at end, do nothing
    if (this.currentExecutionIndex >= this.scriptQueue.length - 1) return;

    this.isExecutionPaused = true;

    // Move to next move index
    this.currentExecutionIndex++;

    // Get move
    const move = this.scriptQueue[this.currentExecutionIndex];

    // Validate move
    const moveResult = this.calculateMove(move.direction);
    if (!moveResult.valid) {
      this.isGameOver = true;
      this.gameOverReason = moveResult.reason;
      this.isExecutionPhase = false;
      this.render();
      return;
    }

    // Execute move
    this.executeMove(moveResult.path, move.direction, moveResult.steps);
    this.saveExecutionSnapshot(this.currentExecutionIndex);

    this.render();
    this.renderScriptQueue();
    this.renderPlaybackControls();
  }

  skipBackward() {
    if (!this.isExecutionPhase || this.currentExecutionIndex < 0) return;

    this.isExecutionPaused = true;

    // Restore snapshot from BEFORE current move
    const snapshot = this.executionHistory[this.currentExecutionIndex];
    this.restoreExecutionSnapshot(snapshot);
    // Note: restoreExecutionSnapshot already sets currentExecutionIndex from snapshot.moveIndex

    this.render();
    this.renderScriptQueue();
    this.renderPlaybackControls();
  }

  skipToBeginning() {
    if (!this.isExecutionPhase || this.executionHistory.length === 0) return;

    this.isExecutionPaused = true;

    // Restore first snapshot (initial state)
    const snapshot = this.executionHistory[0];
    this.restoreExecutionSnapshot(snapshot);

    this.render();
    this.renderScriptQueue();
    this.renderPlaybackControls();
  }

  skipToEnd() {
    if (!this.isExecutionPhase) return;

    this.isExecutionPaused = true;

    // Execute all remaining moves instantly
    while (this.currentExecutionIndex < this.scriptQueue.length - 1) {
      this.currentExecutionIndex++;

      const move = this.scriptQueue[this.currentExecutionIndex];

      // Validate move
      const moveResult = this.calculateMove(move.direction);
      if (!moveResult.valid) {
        this.isGameOver = true;
        this.gameOverReason = moveResult.reason;
        this.isExecutionPhase = false;
        this.render();
        return;
      }

      // Execute move
      this.executeMove(moveResult.path, move.direction, moveResult.steps);
      this.saveExecutionSnapshot(this.currentExecutionIndex);
    }

    // Check if we've completed the script
    if (this.currentExecutionIndex >= this.scriptQueue.length - 1) {
      this.completeScriptExecution();
    } else {
      this.render();
      this.renderScriptQueue();
      this.renderPlaybackControls();
    }
  }

  render() {
    this.renderGrid();
    this.renderScore();
    this.updateUndoButton();

    // Render inventory if powerups enabled
    if (this.powerupsEnabled) {
      this.renderInventory();
    }

    // Render timer if in timer mode
    if (this.modeConfig?.hasTimer) {
      this.renderTimer();
    }

    // Render pre-programmed mode UI
    if (this.modeConfig?.isProgrammed) {
      this.renderExecutionUI();
    }

    if (this.isGameOver) {
      this.renderGameOver();
    }
  }

  renderGrid() {
    const gridElement = document.getElementById('grid');
    gridElement.innerHTML = '';

    for (let y = 0; y < 11; y++) {
      for (let x = 0; x < 11; x++) {
        const cell = this.grid[y][x];
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
        const isCorner = (x === 0 && y === 0) ||
                         (x === 10 && y === 0) ||
                         (x === 0 && y === 10) ||
                         (x === 10 && y === 10);
        if (isCorner) {
          cellDiv.classList.add('corner');
        }

        // Add player indicator
        if (x === this.playerPos.x && y === this.playerPos.y) {
          const player = document.createElement('div');
          player.className = 'player';
          cellDiv.appendChild(player);
        }

        gridElement.appendChild(cellDiv);
      }
    }

    // Handle placement mode
    const placementUI = document.getElementById('placement-ui');
    if (this.isPlacementMode && this.placementType === 'bridge') {
      // Show placement UI
      if (placementUI) {
        placementUI.style.display = 'flex';
      }

      // Update instruction text
      const instructions = document.getElementById('placement-instructions');
      if (instructions) {
        instructions.textContent = 'Select a wall to convert to a bridge';
      }

      // Update place button state
      const placeBtn = document.getElementById('place-bridge-btn');
      if (placeBtn) {
        placeBtn.disabled = !this.selectedCellPos;
        placeBtn.style.display = 'block';
      }

      // Hide teleport button
      const teleportBtn = document.getElementById('place-teleport-btn');
      if (teleportBtn) {
        teleportBtn.style.display = 'none';
      }

      // Add wall highlighting and click handlers
      for (let y = 0; y < 11; y++) {
        for (let x = 0; x < 11; x++) {
          const cellIndex = y * 11 + x;
          const cellDiv = gridElement.children[cellIndex];
          const cell = this.grid[y][x];

          if (cell.isWall) {
            cellDiv.classList.add('wall-selectable');

            // Highlight selected wall
            if (this.selectedCellPos &&
                this.selectedCellPos.x === x &&
                this.selectedCellPos.y === y) {
              cellDiv.classList.add('wall-selected');
            }

            // Make walls clickable
            cellDiv.style.cursor = 'pointer';
            cellDiv.addEventListener('click', () => {
              this.selectWallForBridge(x, y);
            });
          }
        }
      }
    } else if (this.isPlacementMode && this.placementType === 'teleport') {
      // Show placement UI
      if (placementUI) {
        placementUI.style.display = 'flex';
      }

      // Update instruction text
      const instructions = document.getElementById('placement-instructions');
      if (instructions) {
        instructions.textContent = 'Select a cell to teleport to';
      }

      // Update place button state
      const placeBtn = document.getElementById('place-teleport-btn');
      if (placeBtn) {
        placeBtn.disabled = !this.selectedCellPos;
        placeBtn.style.display = 'block';
      }

      // Hide bridge button
      const bridgeBtn = document.getElementById('place-bridge-btn');
      if (bridgeBtn) {
        bridgeBtn.style.display = 'none';
      }

      // Add cell highlighting and click handlers
      for (let y = 0; y < 11; y++) {
        for (let x = 0; x < 11; x++) {
          const cellIndex = y * 11 + x;
          const cellDiv = gridElement.children[cellIndex];
          const cell = this.grid[y][x];

          // All non-wall cells (except player position) are selectable
          if (!cell.isWall && !(x === this.playerPos.x && y === this.playerPos.y)) {
            cellDiv.classList.add('cell-selectable');

            // Highlight selected cell
            if (this.selectedCellPos &&
                this.selectedCellPos.x === x &&
                this.selectedCellPos.y === y) {
              cellDiv.classList.add('cell-selected');
            }

            cellDiv.style.cursor = 'pointer';
            cellDiv.addEventListener('click', () => {
              this.selectCellForTeleport(x, y);
            });
          }
        }
      }
    } else {
      // Hide placement UI
      if (placementUI) {
        placementUI.style.display = 'none';
      }
    }
  }

  renderScore() {
    document.getElementById('score').textContent = this.score;
    document.getElementById('high-score').textContent = this.highScore;
  }

  renderInventory() {
    const panel = document.getElementById('inventory-panel');
    const bridgeBtn = document.getElementById('bridge-inventory-btn');
    const bridgeCount = document.getElementById('bridge-count');
    const teleportBtn = document.getElementById('teleport-inventory-btn');
    const teleportCount = document.getElementById('teleport-count');

    if (!panel) return;

    // Show panel only if powerups enabled
    panel.style.display = this.powerupsEnabled ? 'block' : 'none';

    // Update bridge count
    bridgeCount.textContent = this.inventory.bridges;

    // Enable bridge button if bridges available and not in placement mode
    const canActivateBridge = this.inventory.bridges > 0 &&
                               !this.isPlacementMode &&
                               !this.isGameOver;
    bridgeBtn.disabled = !canActivateBridge;

    // Highlight bridge if in placement mode
    if (this.isPlacementMode && this.placementType === 'bridge') {
      bridgeBtn.classList.add('active');
    } else {
      bridgeBtn.classList.remove('active');
    }

    // Update teleport count
    teleportCount.textContent = this.inventory.teleports;

    // Enable teleport button if teleports available and not in placement mode
    const canActivateTeleport = this.inventory.teleports > 0 &&
                                 !this.isPlacementMode &&
                                 !this.isGameOver;
    teleportBtn.disabled = !canActivateTeleport;

    // Highlight teleport if in placement mode
    if (this.isPlacementMode && this.placementType === 'teleport') {
      teleportBtn.classList.add('active');
    } else {
      teleportBtn.classList.remove('active');
    }
  }

  renderGameOver() {
    // Cancel placement mode if active
    if (this.isPlacementMode) {
      this.cancelPlacementMode();
    }

    const overlay = document.getElementById('game-over-overlay');
    const reasonElement = document.getElementById('game-over-reason');
    const finalScoreElement = document.getElementById('final-score');

    const reasons = {
      'wall collision': 'You hit a wall!',
      'out of bounds': 'You moved off the grid!',
      'time expired': 'Time ran out!',
      'script complete': 'Script Complete! 🎉'
    };

    reasonElement.textContent = reasons[this.gameOverReason];
    finalScoreElement.textContent = this.score;
    overlay.classList.add('visible');

    // Stop timer if running
    this.stopTimer();
  }

  updateUndoButton() {
    const undoButton = document.getElementById('undo');
    undoButton.disabled = this.history.length === 0;
  }

  // Bridge placement methods
  activateBridgePlacement() {
    if (this.inventory.bridges <= 0 || this.isPlacementMode || this.isGameOver) {
      return;
    }

    this.isPlacementMode = true;
    this.placementType = 'bridge';
    this.selectedCellPos = null;
    this.disableControls();  // Prevent movement during placement

    this.render();
  }

  cancelPlacementMode() {
    if (!this.isPlacementMode) return;

    this.isPlacementMode = false;
    this.placementType = null;
    this.selectedCellPos = null;

    // Re-enable controls if game is active
    if (!this.isGameOver) {
      this.enableControls();
    }

    this.render();
  }

  selectWallForBridge(x, y) {
    if (!this.isPlacementMode || this.placementType !== 'bridge') return;

    const cell = this.grid[y][x];

    // Can only bridge walls
    if (!cell.isWall) {
      return;
    }

    // Cannot bridge player position (shouldn't be possible, but check)
    if (x === this.playerPos.x && y === this.playerPos.y) {
      return;
    }

    this.selectedCellPos = {x, y};
    this.render();
  }

  confirmBridgePlacement() {
    if (!this.selectedCellPos || !this.isPlacementMode) return;

    const {x, y} = this.selectedCellPos;
    const cell = this.grid[y][x];

    // Place bridge
    cell.isWall = false;
    cell.value = 1;  // Becomes value-1 cell
    cell.hasBridge = true;  // Mark as bridged

    // Consume bridge from inventory
    this.inventory.bridges--;

    // Exit placement mode
    this.isPlacementMode = false;
    this.placementType = null;
    this.selectedCellPos = null;

    // CRITICAL: Save post-bridge state, clear history before placement
    // This allows undoing moves AFTER bridge, but not bridge itself or before
    this.saveState();  // Save current state (right after bridge placed)
    this.history = [this.history[this.history.length - 1]];  // Keep only this snapshot

    // Record in move history
    const isCorner = (x === 0 && y === 0) || (x === 10 && y === 0) ||
                     (x === 0 && y === 10) || (x === 10 && y === 10);
    const cornerNote = isCorner ? ' (corner)' : '';
    this.moveHistory.push(`🌉 Bridge placed at (${x}, ${y})${cornerNote}`);

    // Re-enable controls
    if (!this.isGameOver) {
      this.enableControls();
    }

    this.render();
  }

  // ===== Teleport Methods =====

  getValidTeleportDestinations() {
    const validCells = [];

    for (let y = 0; y < 11; y++) {
      for (let x = 0; x < 11; x++) {
        const cell = this.grid[y][x];

        // Can teleport to any non-wall cell except current position
        if (!cell.isWall && !(x === this.playerPos.x && y === this.playerPos.y)) {
          validCells.push({x, y});
        }
      }
    }

    return validCells;
  }

  executeRandomTeleport() {
    if (this.inventory.teleports <= 0 || this.isGameOver) {
      return;
    }

    // Get valid destinations
    const validCells = this.getValidTeleportDestinations();

    if (validCells.length === 0) {
      console.warn('No valid teleport destinations available');
      return;
    }

    // Pick random destination
    const randomIndex = Math.floor(Math.random() * validCells.length);
    const destination = validCells[randomIndex];

    // Execute teleportation
    this.executeTeleportation(destination.x, destination.y);
  }

  executeTeleportation(destX, destY) {
    const originX = this.playerPos.x;
    const originY = this.playerPos.y;
    const destCell = this.grid[destY][destX];

    // Mark origin cell as wall with teleport marker (no score)
    this.grid[originY][originX].isWall = true;
    this.grid[originY][originX].hasTeleport = true;

    // Collect destination cell value
    let scoreGain = destCell.value;

    // Check for corner bonus
    let cornerBonus = 0;
    const isCorner = (destX === 0 && destY === 0) ||
                     (destX === 10 && destY === 0) ||
                     (destX === 0 && destY === 10) ||
                     (destX === 10 && destY === 10);

    if (isCorner) {
      cornerBonus = 25;
    }

    // Update score
    this.score += scoreGain + cornerBonus;

    // Update high score if needed
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore();
    }

    // Mark destination cell as wall with teleport marker
    destCell.isWall = true;
    destCell.hasTeleport = true;

    // Move player to destination
    this.playerPos = {x: destX, y: destY};

    // Consume teleport from inventory
    this.inventory.teleports--;

    // CRITICAL: Save post-teleport state, clear history before teleportation
    this.saveState();
    this.history = [this.history[this.history.length - 1]];

    // Record in move history
    const bonusText = cornerBonus > 0 ? ` +${cornerBonus} corner bonus` : '';
    const coordText = `(${originX}, ${originY}) → (${destX}, ${destY})`;
    this.moveHistory.push(`✨ Teleported ${coordText} (+${scoreGain}${bonusText})`);

    this.render();
  }

  activateTeleportPlacement() {
    if (this.inventory.teleports <= 0 || this.isPlacementMode || this.isGameOver) {
      return;
    }

    // Check if random mode
    if (this.TELEPORT_RANDOM_MODE) {
      this.executeRandomTeleport();
      return;
    }

    // Choice mode (disabled for now)
    this.isPlacementMode = true;
    this.placementType = 'teleport';
    this.selectedCellPos = null;
    this.disableControls();

    this.render();
  }

  selectCellForTeleport(x, y) {
    if (!this.isPlacementMode || this.placementType !== 'teleport') return;

    const cell = this.grid[y][x];

    // Can only teleport to non-wall cells
    if (cell.isWall) {
      return;
    }

    // Cannot teleport to current position
    if (x === this.playerPos.x && y === this.playerPos.y) {
      return;
    }

    this.selectedCellPos = {x, y};
    this.render();
  }

  confirmTeleportation() {
    if (!this.selectedCellPos || !this.isPlacementMode) return;

    const {x, y} = this.selectedCellPos;

    // Exit placement mode
    this.isPlacementMode = false;
    this.placementType = null;
    this.selectedCellPos = null;

    // Execute teleportation
    this.executeTeleportation(x, y);

    // Re-enable controls
    if (!this.isGameOver) {
      this.enableControls();
    }
  }

  loadHighScore() {
    try {
      const saved = localStorage.getItem('greed-high-scores');
      if (saved) {
        const scores = JSON.parse(saved);
        return scores[this.mode] || 0;
      }
      // Legacy: migrate old single high score to classic mode
      const oldScore = localStorage.getItem('greed-high-score');
      if (oldScore) {
        return parseInt(oldScore, 10);
      }
      return 0;
    } catch (e) {
      console.warn('localStorage not available:', e);
      return 0;
    }
  }

  saveHighScore() {
    try {
      const saved = localStorage.getItem('greed-high-scores');
      const scores = saved ? JSON.parse(saved) : {};
      scores[this.mode] = this.highScore;
      localStorage.setItem('greed-high-scores', JSON.stringify(scores));
    } catch (e) {
      console.warn('localStorage not available:', e);
    }
  }

  // Timer methods
  startTimer() {
    this.timerInterval = setInterval(() => {
      if (!this.isPaused && !this.isGameOver && this.timeRemaining > 0) {
        this.timeRemaining--;
        this.renderTimer();

        if (this.timeRemaining <= 0) {
          this.timeUp();
        }
      }
    }, 1000);
  }

  pauseTimer() {
    this.isPaused = true;
  }

  resumeTimer() {
    this.isPaused = false;
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  timeUp() {
    // In Combined Mode scripting phase: auto-execute if moves queued
    if (this.isScriptingPhase && this.scriptQueue.length > 0) {
      // User ran out of time while planning - execute what they have
      this.startScriptExecution();
      return;
    }

    // Otherwise: normal time-up game over
    this.isGameOver = true;
    this.gameOverReason = 'time expired';
    this.stopTimer();
    this.render();
  }

  renderTimer() {
    if (!this.modeConfig?.hasTimer) return;

    const timerDisplay = document.getElementById('timer');
    const timerColumn = document.getElementById('timer-display');
    if (!timerDisplay || !timerColumn) return;

    // Hide timer during execution phase in combined mode
    if (this.isExecutionPhase && this.modeConfig?.isProgrammed) {
      timerColumn.style.opacity = '0.3';  // Fade out
      timerColumn.style.pointerEvents = 'none';
      return;  // Don't update the display
    }

    // Show timer during scripting or non-programmed modes
    timerColumn.style.opacity = '1';
    timerColumn.style.pointerEvents = 'auto';

    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = this.timeRemaining % 60;
    timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Add warning styling when time is low
    if (this.timeRemaining <= 10) {
      timerColumn.classList.add('timer-warning');
    } else {
      timerColumn.classList.remove('timer-warning');
    }
  }

  // Pre-programmed mode: Rendering methods
  renderScriptQueue() {
    const queueTable = document.getElementById('script-queue-table');
    if (!queueTable) return;

    // Clear table
    queueTable.innerHTML = '';

    if (this.scriptQueue.length === 0) {
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
    this.scriptQueue.forEach((move, index) => {
      const item = document.createElement('div');
      item.className = 'queue-item';

      // Highlight current move during execution
      if (this.isExecutionPhase && index === this.currentExecutionIndex) {
        item.classList.add('current');
      }

      // Mark executed moves
      if (this.isExecutionPhase && index < this.currentExecutionIndex) {
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
    if (this.isExecutionPhase && this.currentExecutionIndex >= 0) {
      const currentItem = queueTable.querySelector('.queue-item.current');
      if (currentItem) {
        currentItem.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  }

  renderExecutionUI() {
    const scriptingControls = document.getElementById('scripting-controls');
    const playbackControls = document.getElementById('playback-controls');

    if (!scriptingControls || !playbackControls) return;

    if (this.isScriptingPhase) {
      // Show scripting controls (Clear, Undo, Run It)
      scriptingControls.style.display = 'flex';
      playbackControls.style.display = 'none';
    } else if (this.isExecutionPhase) {
      // Show playback controls
      scriptingControls.style.display = 'none';
      playbackControls.style.display = 'flex';
      this.renderPlaybackControls();
    }

    // Always render queue
    this.renderScriptQueue();
  }

  renderPlaybackControls() {
    const playPauseBtn = document.getElementById('play-pause-btn');
    const skipToStartBtn = document.getElementById('skip-to-start-btn');
    const skipBackBtn = document.getElementById('skip-back-btn');
    const skipForwardBtn = document.getElementById('skip-forward-btn');
    const skipToEndBtn = document.getElementById('skip-to-end-btn');

    if (!playPauseBtn) return;

    // Update play/pause button
    playPauseBtn.textContent = this.isExecutionPaused ? '▶ Play' : '⏸ Pause';

    // Disable buttons at boundaries
    if (skipToStartBtn) {
      skipToStartBtn.disabled = this.currentExecutionIndex < 0;
    }
    if (skipBackBtn) {
      skipBackBtn.disabled = this.currentExecutionIndex < 0;
    }
    if (skipForwardBtn) {
      skipForwardBtn.disabled = this.currentExecutionIndex >= this.scriptQueue.length - 1;
    }
    if (skipToEndBtn) {
      skipToEndBtn.disabled = this.currentExecutionIndex >= this.scriptQueue.length - 1;
    }
  }
}
