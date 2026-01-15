# GD Match3 - Prototype

## How to Run
1. **Open Godot 4.x**.
2. Click **Import**.
3. Browse to this project folder and select the `project.godot` file.
4. Click **Import & Edit**.
5. Once the editor opens, press **F5** (or the Play button in the top right) to run the game.

## Project Structure
- **scripts/grid.gd**: The brain of the game. Handles board generation, input, matching logic, and game state management.
- **scripts/tile.gd**: Controls individual candy pieces and their interactions.
- **scripts/explosion.gd**: Manages particle effects for matched candies.
- **scenes/main.tscn**: The main scene containing the game setup.
- **scenes/game.tscn**: The game scene containing the Grid and gameplay elements.
- **scenes/tile.tscn**: The individual tile scene for candy pieces.
- **scenes/explosion_particles.tscn**: Particle effect scene for candy matches.
- **assets/**: Contains all the generated graphics and candy sprites.

## Game Features
- Match-3 puzzle mechanics with candy swapping
- Particle effects for successful matches
- Touch and mouse input support
- 6x8 grid layout with colorful candy pieces
- Automatic match detection and clearing

## Controls
- **Mouse/Touch**: Click and drag a candy to an adjacent spot to swap.
- Matches of 3 or more will clear the candies and trigger particle effects.
- The game automatically detects and processes matches when valid swaps are made.
