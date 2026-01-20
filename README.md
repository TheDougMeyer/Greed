# Greed - Grid Puzzle Game

A web-based puzzle game where you navigate a grid, consuming cells and avoiding walls to maximize your score.

## How to Play

### Game Rules

1. **Starting Position**: You begin at the center of an 11x11 grid. The center cell has a value of 0 and becomes a wall after your first move.

2. **Movement**:
   - Choose one of 4 cardinal directions (Up, Down, Left, Right)
   - The game looks at the **target cell** (immediate neighbor in that direction)
   - You move a number of spaces equal to that target cell's value
   - Example: At position (5,5), if you move LEFT and cell (4,5) has value 3, you travel 3 spaces left, landing at (2,5)

3. **Scoring**:
   - Your score increases by the sum of all cells you traverse
   - **Corner Bonus**: Landing on any of the 4 corners awards +25 points
   - Corners are marked with gold borders and star icons (★)

4. **Walls**:
   - All cells you traverse become walls (marked with X)
   - The starting center cell becomes a wall after your first move
   - You cannot move through walls

5. **Game Over**:
   - Moving into a wall
   - Moving off the grid

### Controls

**Keyboard**:
- Arrow keys or WASD to move
- U or Z to undo

**Mouse**:
- Click directional arrow buttons
- Click "Restart Game" to start over
- Click "Undo Move" to undo last move

## Features

- **11x11 Grid**: Randomly generated with numbers 1-5
- **High Score Tracking**: Your best score is saved and persists across sessions
- **Move History**: See all your moves with point values
- **Undo System**: Undo any move to try different strategies
- **Corner Bonuses**: Strategic high-value targets (+25 points)
- **Responsive Design**: Works on desktop and mobile
- **Visual Indicators**:
  - Color-coded cells (different color for each number value)
  - Gold-bordered corners with star icons
  - White circle shows your current position
  - Walls marked with X

## Technical Details

- **Built with**: Vanilla HTML, CSS, and JavaScript
- **Single file**: No dependencies or build process required
- **Storage**: Uses localStorage for high score persistence
- **Browser Support**: All modern browsers

## Running the Game

Simply open `index.html` in any web browser. No server or installation required.

## Deployment

### GitHub Pages
The game can be hosted on GitHub Pages:
1. Push to your GitHub repository
2. Go to repository Settings → Pages
3. Select "main" branch as source
4. Your game will be available at: `https://[username].github.io/Greed/`

## Development History

### Initial Vision
- 9x9 grid with random numbers 1-5
- Movement based on current cell value
- Score tracking and wall mechanics

### Refinements
1. **Expanded to 11x11** for longer gameplay
2. **Fixed movement logic** to use target cell (not current cell)
3. **Added special center cell** (value 0, becomes wall after first move)
4. **Corner bonus system** for strategic depth
5. **Undo functionality** for experimentation
6. **Move history display** for tracking progress
7. **High score persistence** via localStorage
8. **Visual polish** with color-coding and indicators

## Game Strategy Tips

- Plan your route to maximize cell values
- Try to land on corners for the +25 bonus
- Watch out for moves that might trap you
- Use undo to experiment with different paths
- Higher numbers (4-5) give longer moves but can be harder to control

## License

Created with Claude Code.

## Credits

Developed by Doug Meyer ([@TheDougMeyer](https://github.com/TheDougMeyer))
