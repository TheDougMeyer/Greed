# Developer Guide: Greed Game Architecture

## Quick Reference for Making Changes

### Where to Find Things

#### Want to modify the game board appearance?
→ `styles/game-grid.css`
- Cell colors, sizes, grid layout
- Player indicator styling
- Corner marker styling

#### Want to change button styles or layout?
→ `styles/ui-panels.css`
- Button appearance and hover effects
- Score display styling
- Move history panel
- Instructions panel

#### Want to modify mobile responsiveness?
→ `styles/mobile.css`
- Breakpoint at 768px
- Touch-friendly sizes
- Stacked layouts

#### Want to change game mechanics?
→ `scripts/core/Game.js`
- Movement logic in `calculateMove()`
- Scoring in `executeMove()`
- Grid generation in `generateGrid()`
- All game state management

#### Want to add keyboard shortcuts?
→ `scripts/main.js`
- Keyboard event handler (lines 11-31)
- Button click handlers (lines 34-54)
- Touch/swipe handlers (lines 57-114)

#### Want to add utility functions?
→ `scripts/utils/helpers.js`
- Already has: `shuffleArray()`, `deepCopyGrid()`, `sleep()`
- Add new helper functions here

#### Want to add new game modes?
→ `scripts/config/modes.js`
- Configuration objects for modes
- Ready for Phase 2 implementation

## Common Tasks

### Adding a New CSS Color Scheme

**File**: `styles/game-grid.css`

```css
/* Add new value color */
.value-6 { background: #your-color; color: #text-color; }
```

### Adding a New Keyboard Shortcut

**File**: `scripts/main.js`

```javascript
// Add to keyMap object
const keyMap = {
  'ArrowUp': 'up',
  'n': 'new-action',  // Add your new key
  // ...
};
```

### Modifying Grid Size

**Files**:
1. `scripts/core/Game.js` - Update grid generation logic
2. `styles/game-grid.css` - Update `grid-template-columns/rows`

### Adding a New Rendering Method

**File**: `scripts/core/Game.js`

```javascript
// Add new method to Game class
renderNewFeature() {
  // Your rendering logic
}

// Call it in render() method
render() {
  this.renderGrid();
  this.renderScore();
  this.renderNewFeature();  // Add here
  // ...
}
```

## Module Import/Export Patterns

### Exporting from a module

```javascript
// Named exports (helpers.js)
export function myFunction() { }
export const myConstant = 42;

// Default export (Game.js)
export default class Game { }
```

### Importing into another module

```javascript
// Named imports
import { myFunction, myConstant } from './utils/helpers.js';

// Default import
import Game from './core/Game.js';

// Mixed
import Game, { helperFunc } from './core/Game.js';
```

## File Organization Philosophy

### CSS Files
- **base.css**: Foundation (resets, body, container) - rarely modified
- **game-grid.css**: Core game visuals - modify for visual changes
- **ui-panels.css**: Interface elements - modify for UI updates
- **overlays.css**: Modals - modify for overlay features
- **mobile.css**: Responsive - modify for mobile optimization

### JavaScript Files
- **Game.js**: Game logic - modify for mechanics changes
- **main.js**: Event handlers - modify for input handling
- **helpers.js**: Utilities - add reusable functions
- **modes.js**: Configuration - add new game modes (Phase 2)

## Testing After Changes

### Quick Browser Test Checklist
1. Open `index.html` in browser
2. Check browser console for errors (F12)
3. Test keyboard controls (arrows, WASD, U/Z)
4. Test button clicks
5. Test mobile (browser device emulation)
6. Verify game mechanics work correctly

### Console Testing Commands

```javascript
// Test equal distribution
const counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
for (let y = 0; y < 11; y++) {
  for (let x = 0; x < 11; x++) {
    const val = game.grid[y][x].value;
    if (val >= 1 && val <= 5) counts[val]++;
  }
}
console.log(counts); // Should show {1: 24, 2: 24, 3: 24, 4: 24, 5: 24}

// Test game state
console.log(game.playerPos);
console.log(game.score);
console.log(game.history.length);
```

## Best Practices

### When modifying Game.js
- Always test undo after changes
- Verify state snapshots include new properties
- Check that render() calls all necessary render methods

### When modifying CSS
- Test both desktop and mobile views
- Verify hover states on interactive elements
- Check that changes don't break existing layouts

### When modifying main.js
- Ensure event listeners are properly cleaned up
- Check that all inputs (keyboard, mouse, touch) work
- Verify game.isGameOver checks prevent unwanted actions

### Adding new features
1. Update Game class properties in constructor
2. Add methods for feature logic
3. Update saveState() to include new state
4. Update render() if visual changes needed
5. Add event handlers in main.js if needed
6. Update CSS files for styling
7. Test thoroughly!

## Phase 2 Preparation

The codebase is ready for these additions:

1. **Welcome Screen**: Add overlay in `index.html`, styles in new CSS file
2. **Timer**: Add timer properties to Game, render method, UI in HTML
3. **Pre-programmed Mode**: Add queue management, async execution
4. **Powerups**: Add powerup properties, collection logic, activation
5. **Config-driven modes**: Use `modes.js` to drive behavior

All utility functions needed are already in `helpers.js`.

## Getting Help

- Check `CLAUDE.md` for detailed architecture documentation
- Check `REFACTORING_SUMMARY.md` for what changed in refactoring
- Check `README.md` for user-facing game instructions
- Browser console is your friend for debugging
- Use `console.log()` liberally during development

## Common Pitfalls

❌ **Don't**: Modify `index.html` for logic - keep it HTML-only
✅ **Do**: Add logic to `Game.js` or `main.js`

❌ **Don't**: Add inline styles - use CSS files
✅ **Do**: Add new classes and styles to appropriate CSS file

❌ **Don't**: Forget to import utilities when adding new Game methods
✅ **Do**: Import from `helpers.js` at top of `Game.js`

❌ **Don't**: Forget `type="module"` when adding new script tags
✅ **Do**: Always use `<script type="module">` for ES6 modules

❌ **Don't**: Break the undo system by forgetting to update saveState()
✅ **Do**: Add new state properties to saveState() snapshot

## File Sizes Reference

- `index.html`: 75 lines (2.4KB)
- `Game.js`: 335 lines (10KB)
- `main.js`: 114 lines (2.6KB)
- `helpers.js`: 40 lines (1KB)
- Total CSS: ~6.8KB across 5 files

Keeping files focused and small makes them easier to understand and modify!
