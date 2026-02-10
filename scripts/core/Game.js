/**
 * Main Game class - manages all game state and logic
 */

import { shuffleArray, deepCopyGrid, sleep, isCornerCell } from '../utils/helpers.js';
import { POWERUP_TYPES, isPowerupAllowedInMode, getEnabledPowerups } from '../config/powerups.js';
import GameRenderer from '../view/GameRenderer.js';

// Pre-programmed mode constants
const MAX_SCRIPT_MOVES = 20;
const EXECUTION_DELAY_MS = 500;
const SCRIPT_COMPLETION_BONUS_MULTIPLIER = 2;

export default class Game {
  constructor(renderer = null) {
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

    // Board viewing state
    this.isViewingBoard = false;

    // Initial grid for replay
    this.initialGrid = null;

    // Pre-programmed mode state
    this.scriptQueue = [];
    this.isScriptingPhase = false;
    this.isExecutionPhase = false;
    this.isExecutionPaused = false;
    this.currentExecutionIndex = -1;
    this.executionHistory = [];

    // Renderer (dependency injection for testability)
    this.renderer = renderer || new GameRenderer();
  }

  init(modeConfig = null, settings = {}, options = {}) {
    // Set mode
    this.mode = modeConfig?.id || 'classic';
    this.modeConfig = modeConfig;

    // Apply settings - get enabled powerups from config
    this.enabledPowerups = getEnabledPowerups(settings);
    this.powerupsEnabled = this.enabledPowerups.length > 0;

    // Reset game state
    this.generateGrid(options.replayGrid);
    this.playerPos = { x: 5, y: 5 };
    this.startingPos = { x: 5, y: 5 };
    this.isFirstMove = true;
    this.score = 0;
    this.isGameOver = false;
    this.gameOverReason = '';
    this.history = [];
    this.moveHistory = [];
    this.isViewingBoard = false;

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

  generateGrid(replayGrid = null) {
    // If replaying, use the saved grid
    if (replayGrid) {
      this.grid = deepCopyGrid(replayGrid);
      return;
    }

    // Otherwise generate a new grid
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

    // Save the initial grid for replay functionality
    this.initialGrid = deepCopyGrid(this.grid);
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

  routeDirectionInput(direction) {
    if (this.isScriptingPhase) {
      this.addMoveToScript(direction);
    } else if (!this.isGameOver && this.controlsEnabled) {
      this.move(direction);
    }
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
      if (cell.powerup) {
        const powerupType = cell.powerup;
        const config = POWERUP_TYPES[powerupType];

        if (config && config.requiresInventory) {
          const inventoryKey = `${powerupType}s`;
          if (this.inventory.hasOwnProperty(inventoryKey)) {
            this.inventory[inventoryKey]++;
          } else {
            console.warn(`Inventory key not found: ${inventoryKey}`);
          }
          cell.powerup = undefined;
        }
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
    if (isCornerCell(this.playerPos.x, this.playerPos.y)) {
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
    this.renderer.hideGameOverOverlay();

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

    this.renderer.renderScriptQueue(this.getScriptData());
    this.renderer.updateRunItButton(this.scriptQueue.length > 0);
  }

  removeLastMoveFromScript() {
    if (!this.isScriptingPhase || this.scriptQueue.length === 0) return;

    this.scriptQueue.pop();

    this.renderer.renderScriptQueue(this.getScriptData());
    this.renderer.updateRunItButton(this.scriptQueue.length > 0);
  }

  clearScript() {
    if (!this.isScriptingPhase) return;

    this.scriptQueue = [];

    this.renderer.renderScriptQueue(this.getScriptData());
    this.renderer.updateRunItButton(this.scriptQueue.length > 0);
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
    this.renderer.renderScriptQueue(this.getScriptData());  // Highlight current

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
    this.renderer.renderPlaybackControls(this.getPlaybackData());
  }

  resumeExecution() {
    if (!this.isExecutionPhase || !this.isExecutionPaused) return;

    this.isExecutionPaused = false;
    this.renderer.renderPlaybackControls(this.getPlaybackData());

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
  }

  skipBackward() {
    if (!this.isExecutionPhase || this.currentExecutionIndex < 0) return;

    this.isExecutionPaused = true;

    // Restore snapshot from BEFORE current move
    const snapshot = this.executionHistory[this.currentExecutionIndex];
    this.restoreExecutionSnapshot(snapshot);
    // Note: restoreExecutionSnapshot already sets currentExecutionIndex from snapshot.moveIndex

    this.render();
  }

  skipToBeginning() {
    if (!this.isExecutionPhase || this.executionHistory.length === 0) return;

    this.isExecutionPaused = true;

    // Restore first snapshot (initial state)
    const snapshot = this.executionHistory[0];
    this.restoreExecutionSnapshot(snapshot);

    this.render();
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
    }
  }

  // Data getter methods for renderer
  getGridData() {
    return {
      grid: this.grid,
      playerPos: this.playerPos,
      isPlacementMode: this.isPlacementMode,
      placementType: this.placementType,
      selectedCellPos: this.selectedCellPos
    };
  }

  getInventoryData() {
    return {
      powerupsEnabled: this.powerupsEnabled,
      inventory: this.inventory,
      isPlacementMode: this.isPlacementMode,
      placementType: this.placementType,
      isGameOver: this.isGameOver
    };
  }

  getTimerData() {
    return {
      timeRemaining: this.timeRemaining,
      isExecutionPhase: this.isExecutionPhase,
      isProgrammed: this.modeConfig?.isProgrammed || false
    };
  }

  getScriptData() {
    return {
      scriptQueue: this.scriptQueue,
      isExecutionPhase: this.isExecutionPhase,
      currentExecutionIndex: this.currentExecutionIndex
    };
  }

  getPlaybackData() {
    return {
      isExecutionPaused: this.isExecutionPaused,
      currentExecutionIndex: this.currentExecutionIndex,
      scriptQueueLength: this.scriptQueue.length
    };
  }

  getExecutionUIData() {
    return {
      isScriptingPhase: this.isScriptingPhase,
      isExecutionPhase: this.isExecutionPhase
    };
  }

  render() {
    // Render grid with unified callback for placement mode
    this.renderer.renderGrid(this.getGridData(), {
      onCellClick: (x, y) => this.selectCellForPlacement(x, y)
    });

    // Render score and undo button
    this.renderer.renderScore(this.score, this.highScore);
    this.renderer.updateUndoButton(this.history.length > 0);

    // Render inventory if powerups enabled
    if (this.powerupsEnabled) {
      this.renderer.renderInventory(this.getInventoryData());
    }

    // Render timer if in timer mode
    if (this.modeConfig?.hasTimer) {
      this.renderer.renderTimer(this.getTimerData());
    }

    // Render pre-programmed mode UI
    if (this.modeConfig?.isProgrammed) {
      this.renderer.renderScriptQueue(this.getScriptData());
      this.renderer.renderExecutionUI(this.getExecutionUIData());

      // Render playback controls if in execution phase
      if (this.isExecutionPhase) {
        this.renderer.renderPlaybackControls(this.getPlaybackData());
      }
    }

    // Render game over overlay (unless viewing board)
    if (this.isGameOver && !this.isViewingBoard) {
      // Cancel placement mode if active (game logic)
      if (this.isPlacementMode) {
        this.cancelPlacementMode();
      }

      // Stop timer if running (game logic)
      this.stopTimer();

      // Render overlay (visual update)
      this.renderer.renderGameOver(this.gameOverReason, this.score);
    }

    // Render viewing mode UI
    this.renderer.renderViewingModeUI(this.isViewingBoard);
  }

  // Rendering methods moved to GameRenderer class

  // Powerup placement methods
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

  /**
   * Generic placement activation for any powerup type
   * @param {string} type - Powerup type ('bridge', 'teleport', etc.)
   */
  activatePlacement(type) {
    const config = POWERUP_TYPES[type];
    if (!config) {
      console.error(`Unknown powerup type: ${type}`);
      return;
    }

    const inventoryCount = this.inventory[`${type}s`];
    if (inventoryCount <= 0 || this.isPlacementMode || this.isGameOver) {
      return;
    }

    // Handle random-mode powerups (bypass placement)
    if (config.isRandom) {
      const randomMethod = `executeRandom${type.charAt(0).toUpperCase()}${type.slice(1)}`;
      if (typeof this[randomMethod] === 'function') {
        this[randomMethod]();
      } else {
        console.error(`Random execution method not found: ${randomMethod}`);
      }
      return;
    }

    // Enter placement mode
    this.isPlacementMode = true;
    this.placementType = type;
    this.selectedCellPos = null;
    this.disableControls();
    this.render();
  }

  /**
   * Validates if a cell can be selected for current placement type
   * @private
   */
  validatePlacementSelection(cell, x, y) {
    if (!this.isPlacementMode || !this.placementType) return false;

    if (x === this.playerPos.x && y === this.playerPos.y) return false;

    switch (this.placementType) {
      case 'bridge':
        return cell.isWall;
      case 'teleport':
        return !cell.isWall;
      default:
        return false;
    }
  }

  /**
   * Generic cell selection for placement mode
   */
  selectCellForPlacement(x, y) {
    if (!this.isPlacementMode) return;

    const cell = this.grid[y][x];
    if (!this.validatePlacementSelection(cell, x, y)) return;

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
    const cornerNote = isCornerCell(x, y) ? ' (corner)' : '';
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
    if (isCornerCell(destX, destY)) {
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
        this.renderer.renderTimer(this.getTimerData());

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

  // Board viewing methods
  enterViewingMode() {
    this.isViewingBoard = true;
    this.renderer.hideGameOverOverlay();
    this.render();
  }

  exitViewingMode() {
    this.isViewingBoard = false;
    this.renderer.renderGameOver(this.gameOverReason, this.score);
  }

  // Timer and pre-programmed mode rendering methods moved to GameRenderer class
}
