# JungleRush - Game Rules and Design Document

## Game Overview

JungleRush is a turn-based strategy game with side-scrolling platformer elements. The game combines the exploration mechanics of classic platformers with strategic turn-based combat when encountering enemies.

## Core Gameplay

### Platformer Mode

1. **Movement**: Players control a character that can move left and right in a platformer world.
   - Move left/right using arrow keys
   - Jump using the up arrow key
   - Character has a movement speed of 160 units
   - Jump speed is set to -330 units

2. **World Interaction**:
   - Players navigate through platforms and obstacles
   - The camera follows the player with a slight lag for smooth scrolling
   - The world extends horizontally (800 × 3 units wide)
   - Gravity is set to 300 units

3. **Enemies**:
   - Enemies patrol specific areas with a patrol distance
   - When the player collides with an enemy, the game transitions to Battle Mode
   - Enemy types include:
     - Slime: Lower health (30), lower attack (10)
     - Goblin: Higher health (50), higher attack (15)

### Battle Mode

1. **Turn System**:
   - Combat is strictly turn-based
   - Player always goes first
   - Each combatant takes one action per turn

2. **Player Actions**:
   - **Attack**: Deal damage based on player's attack stat (default: 20)
   - **Defend**: Reduce incoming damage (implementation details TBD)
   - **Special**: Special abilities (implementation details TBD)

3. **Enemy Actions**:
   - Enemies use a simple AI to select actions
   - Currently, enemies only perform basic attacks

4. **Combat Resolution**:
   - Damage calculation: Attacker's attack value - Defender's defense value
   - Minimum damage is 1
   - Combat ends when either the player or enemy health reaches 0
   - Upon victory, the enemy is removed from the game world and the player earns score points

## Game Stats and Progression

### Player Stats
- **Health**: 100 (starting value)
- **Attack**: 20 (starting value)
- **Defense**: 10 (starting value)

### Game Progress Tracking
- **Level**: Starts at 1
- **Score**: Increases by 100 for each defeated enemy
- **Enemies Defeated**: Counter for total enemies defeated

## Level Design

1. **Platforms**:
   - Platforms are statically placed in the game world
   - Players must navigate these platforms to progress

2. **Enemy Placement**:
   - Enemies are placed at specific positions throughout the level
   - Current enemy positions:
     - Slime at x:300, y:450
     - Goblin at x:600, y:300
     - Slime at x:900, y:450
     - Goblin at x:1200, y:450
     - Slime at x:1500, y:450

3. **Level Structure**:
   - The game uses a simple level structure with platforms and enemies
   - Level data can be loaded from JSON files (e.g., level1.json)

## Technical Implementation

1. **Game Engine**: Phaser 3
2. **Screen Size**: 800×600 pixels
3. **Physics System**: Arcade physics with gravity
4. **Scene Management**:
   - BootScene: Initial loading
   - GameScene: Main platformer gameplay
   - BattleScene: Turn-based combat
   - UIScene: User interface elements
5. **Deployment**:
   - Standalone HTML/JS application
   - No server requirements
   - Main game file: game.html (all code in one file)

## Future Considerations

The following elements could be expanded in future iterations:

1. **Additional Enemy Types**: More variety in enemies with unique behaviors and stats
2. **Power-ups and Items**: Collectibles that enhance player abilities
3. **Multiple Levels**: Progression through different themed environments
4. **Character Progression**: RPG elements like leveling up and skill trees
5. **Enhanced Battle System**: More strategic options during combat
6. **Environmental Hazards**: Obstacles and traps in the platformer world
7. **Boss Battles**: Special challenging encounters
8. **Story Elements**: Narrative integration through cutscenes or dialogue

## Asset Requirements

The game requires the following assets:
- Player character spritesheet (32×48 pixels per frame)
- Slime enemy spritesheet (32×32 pixels per frame)
- Goblin enemy spritesheet (32×48 pixels per frame)
- Tileset for the game world (32×32 pixels per tile)
- Battle backgrounds and UI elements
