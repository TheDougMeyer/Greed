# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Game

Simply open `index.html` in any web browser. No build process, dependencies, or server required.

For GitHub Pages deployment:
1. Push to repository
2. Settings → Pages → Select "main" branch
3. Access at `https://[username].github.io/Greed/`

## Code Architecture

### Multi-File Structure

This is a modular web application with separated concerns:

```
greed/
├── index.html                 (75 lines - HTML structure only)
├── styles/
│   ├── base.css              (resets, typography, body)
│   ├── game-grid.css         (grid, cells, player, corners)
│   ├── ui-panels.css         (score, controls, buttons, move-history)
│   ├── overlays.css          (game-over overlay)
│   └── mobile.css            (responsive @media queries)
├── scripts/
│   ├── core/
│   │   └── Game.js           (Game class - main logic)
│   ├── config/
│   │   └── modes.js          (GAME_MODES config for future features)
│   ├── utils/
│   │   └── helpers.js        (shuffleArray, deepCopyGrid, sleep)
│   └── main.js               (initialization, event handlers)
└── README.md
```

**Benefits of this structure:**
- Easier to navigate and understand
- Better for collaboration and AI-assisted development
- Each file has a single responsibility
- Prepared for future feature expansion (game modes, powerups)
- Industry-standard modular architecture

### Game Class Architecture

The `Game` class (`scripts/core/Game.js`) manages all game state and logic:

**Core Properties:**
- `grid`: 2D array of cell objects with `{value, isWall}` properties
- `playerPos`: Current player coordinates `{x, y}`
- `score`, `highScore`: Score tracking
- `history`: Array of state snapshots for undo functionality
- `moveHistory`: Array of move descriptions for UI display
- `isFirstMove`: Tracks whether center cell should become wall

**Key Methods:**

- `init()`: Resets game state and generates new grid
- `generateGrid()`: Creates 11x11 grid with random values 1-5, center cell set to 0
- `move(direction)`: Main entry point for player movement
- `calculateMove(direction)`: **Critical movement logic** - see below
- `executeMove(path, direction, steps)`: Marks walls, updates position, calculates score including corner bonuses
- `saveState()`: Creates deep copy of game state for undo
- `undo()`: Restores previous state from history
- `render()`: Orchestrates all UI updates

### Utility Functions

Utility functions (`scripts/utils/helpers.js`):
- `shuffleArray(array)`: Fisher-Yates shuffle for unbiased randomization
- `deepCopyGrid(grid)`: Deep copy 2D grid of cell objects
- `sleep(ms)`: Promise-based delay (for future animation features)

### Movement Logic (Critical)

**Target-Based Movement**:
The movement system uses the **target cell** value (immediate neighbor in chosen direction) to determine how many spaces to travel:

1. Check immediate neighbor in direction (target cell)
2. If target is wall or out of bounds → game over
3. Read target cell's value to get step count
4. Travel that many spaces in the same direction
5. Validate entire path for walls/bounds

Example: At (5,5), moving LEFT checks cell (4,5). If it has value 3, player travels 3 spaces left to (2,5).

**Path Validation:**
All cells along the path must be:
- Within bounds (0-10 for both x and y)
- Not walls

**After Movement:**
- All traversed cells become walls
- On first move, center starting cell (5,5) also becomes a wall
- Landing on corners (0,0), (10,0), (0,10), (10,10) awards +25 bonus

### State Management

**Undo System**:
Uses a snapshot-based approach:
- `saveState()` creates deep copy of entire game state before each move
- Uses `deepCopyGrid()` utility to map over 2D array
- Stores player position, score, move history, and first-move flag
- `undo()` pops most recent snapshot and restores all state

**Persistence:**
High score saved to `localStorage` key `'greed-high-score'` with try-catch for browsers blocking storage.

### Event Handling Pattern

Event handlers (`scripts/main.js`) handle three input methods, all calling `game.move(direction)`:

1. **Keyboard**: Arrow keys or WASD for movement, U/Z for undo
2. **Arrow buttons**: Grid layout with data-direction attributes
3. **UI buttons**: Restart and undo buttons
4. **Touch/swipe**: Mobile swipe gestures for directional movement

All controls check `game.isGameOver` to prevent moves after game ends.

## Rendering System

Rendering split across specialized methods in Game class:

- `renderGrid()`: Builds 121 cell divs, applies value-based CSS classes, adds player indicator, marks corners
- `renderScore()`: Updates score displays
- `renderMoveHistory()`: Populates move list with auto-scroll to bottom
- `renderGameOver()`: Shows modal overlay with reason and final score
- `updateUndoButton()`: Enables/disables based on history length

## Styling Architecture

CSS organized into separate files for maintainability:

- **base.css**: Resets, typography, body, container
- **game-grid.css**: Grid layout, cells, player indicator, corners, value colors
- **ui-panels.css**: Score section, buttons, arrow controls, move history, instructions
- **overlays.css**: Game over overlay and modal
- **mobile.css**: Responsive breakpoints at 768px (smaller cells, stacked layout, touch optimization)

**Key CSS techniques:**
- Flexbox for container layout
- CSS Grid for 11×11 game board
- CSS classes for cell values (`value-0` through `value-5`, `wall`, `corner`)
- Custom scrollbar styling for move history
- Touch-optimized mobile layout

## Game Mechanics Summary

For quick reference when modifying game logic:

- Grid: 11x11, values 1-5 random, center is 0
- Movement: Target cell value determines steps
- Scoring: Sum of traversed cell values + corner bonus (25)
- Walls: Created from all traversed cells + center after first move
- Game over: Wall collision or out of bounds
- Undo: Unlimited, full state restoration
