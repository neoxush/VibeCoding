# Design Document

## Overview

This design document outlines the architecture and implementation approach for refactoring JungleRush from a monolithic HTML file into a modular, maintainable codebase. The refactoring will leverage existing modular files (scenes and entities) while ensuring all functionality is preserved and enhanced. The design focuses on separation of concerns, proper asset management, and extensibility for future features.

## Architecture

### High-Level Structure

```
junglerush/
├── game.html                 # Main HTML entry point (minimal)
├── js/
│   ├── main.js              # Game configuration and initialization
│   ├── config.js            # Game constants and configuration
│   ├── scenes/
│   │   ├── BootScene.js     # Initial boot and setup
│   │   ├── PreloadScene.js  # Asset loading with progress
│   │   ├── GameScene.js     # Main platformer gameplay
│   │   ├── BattleScene.js   # Turn-based battle system
│   │   ├── UIScene.js       # Battle UI overlay
│   │   └── GameOverScene.js # Game over and restart
│   ├── entities/
│   │   ├── Player.js        # Player entity class
│   │   └── Enemy.js         # Enemy entity class
│   ├── managers/
│   │   ├── GameStateManager.js  # Global game state
│   │   ├── AssetManager.js      # Procedural asset generation
│   │   └── SoundManager.js      # Sound effect generation
│   └── utils/
│       └── Constants.js     # Game constants
├── css/
│   └── style.css            # Minimal styling
└── assets/                  # Optional external assets
```

### Module Responsibilities

#### game.html
- Minimal HTML structure
- Script imports in correct order
- Game container div
- No inline JavaScript (except Phaser CDN)

#### main.js
- Phaser game configuration
- Scene registration
- Game instance creation
- Global gameData initialization

#### config.js
- Game dimensions
- Physics settings
- Default player stats
- Enemy configurations
- Level configurations

## Components and Interfaces

### Scene Architecture

#### BootScene
**Purpose:** Initial game setup and immediate transition to PreloadScene

**Responsibilities:**
- Display initial loading message
- Transition to PreloadScene
- No asset loading (moved to PreloadScene)

**Interface:**
```javascript
class BootScene extends Phaser.Scene {
    constructor()
    create()
}
```

#### PreloadScene
**Purpose:** Load and generate all game assets with progress indication

**Responsibilities:**
- Generate procedural textures using AssetManager
- Generate procedural sounds using SoundManager
- Display loading progress bar
- Transition to GameScene when complete

**Interface:**
```javascript
class PreloadScene extends Phaser.Scene {
    constructor()
    preload()
    create()
    updateProgressBar(percentage)
}
```

**Key Methods:**
- `createTextures()`: Generate all procedural textures
- `createSounds()`: Generate all procedural sounds
- `updateProgressBar()`: Update visual loading indicator

#### GameScene
**Purpose:** Main platformer gameplay with side-scrolling and enemy encounters

**Responsibilities:**
- Create level environment (platforms, background, decorations)
- Spawn and manage player
- Spawn and manage enemies
- Handle player-enemy collision detection
- Trigger battle transitions
- Handle player death
- Track level completion

**Interface:**
```javascript
class GameScene extends Phaser.Scene {
    constructor()
    create()
    update()
    createLevel()
    createPlayer()
    createEnemies()
    encounterEnemy(player, enemy)
    handleBattleEnd(result, enemy)
    checkLevelComplete()
    handlePlayerDeath()
    restartLevel()
}
```

**State Management:**
- `enemyEncountered`: Boolean flag for battle state
- `playerDied`: Boolean flag for death state
- `enemiesRemaining`: Counter for level completion

#### BattleScene
**Purpose:** Turn-based combat system

**Responsibilities:**
- Display battle background and combatants
- Manage turn order (player → enemy)
- Execute battle actions (attack, defend, special)
- Calculate damage with formulas
- Display battle text and feedback
- Handle victory/defeat conditions
- Emit battle-end events

**Interface:**
```javascript
class BattleScene extends Phaser.Scene {
    constructor()
    init(data)
    create()
    startPlayerTurn()
    startEnemyTurn()
    playerAttack()
    playerDefend()
    playerSpecial()
    enemyAttack()
    calculateDamage(attacker, defender, isSpecial)
    enemyDefeated()
    playerDefeated()
    endBattle(result)
}
```

**Battle Flow:**
1. Initialize with player and enemy data
2. Display battle UI
3. Player turn → action selection
4. Execute player action with animation
5. Check enemy defeat
6. Enemy turn → AI decision
7. Execute enemy action with animation
8. Check player defeat
9. Repeat until victory or defeat
10. End battle and return to GameScene

#### UIScene
**Purpose:** Battle UI overlay with action buttons

**Responsibilities:**
- Create and manage action buttons
- Handle button interactions
- Show/hide buttons based on turn
- Communicate with BattleScene

**Interface:**
```javascript
class UIScene extends Phaser.Scene {
    constructor()
    create()
    createActionButtons()
    showActionButtons()
    hideActionButtons()
    handleActionClick(action)
}
```

#### GameOverScene (New)
**Purpose:** Display game over screen and allow restart

**Responsibilities:**
- Display final score and statistics
- Show restart button
- Reset game state on restart
- Transition back to GameScene

**Interface:**
```javascript
class GameOverScene extends Phaser.Scene {
    constructor()
    init(data)
    create()
    displayStats()
    handleRestart()
}
```

### Entity Architecture

#### Player Class
**Purpose:** Player character with movement and stats

**Responsibilities:**
- Handle keyboard input for movement
- Manage player physics (jumping, gravity)
- Store player stats (health, attack, defense)
- Provide update method for movement logic

**Interface:**
```javascript
class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y)
    update(cursors)
    takeDamage(amount)
    heal(amount)
    resetStats()
}
```

**Properties:**
- `moveSpeed`: Horizontal movement speed
- `jumpSpeed`: Jump velocity
- `health`: Current health
- `maxHealth`: Maximum health
- `attack`: Attack power
- `defense`: Defense power

#### Enemy Class
**Purpose:** Enemy entities with AI and stats

**Responsibilities:**
- Patrol behavior with boundaries
- Store enemy stats based on type
- Provide update method for AI logic
- Handle different enemy types (slime, goblin)

**Interface:**
```javascript
class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, type)
    update()
    setupEnemyType()
    patrol()
    takeDamage(amount)
}
```

**Properties:**
- `type`: Enemy type ('slime' or 'goblin')
- `health`: Current health
- `attack`: Attack power
- `patrolDistance`: Patrol range
- `moveSpeed`: Movement speed
- `direction`: Current movement direction

### Manager Classes

#### GameStateManager
**Purpose:** Centralized game state management

**Responsibilities:**
- Store global game state
- Provide getters/setters for state
- Handle state persistence
- Emit state change events

**Interface:**
```javascript
class GameStateManager {
    constructor()
    initializeState()
    getPlayerHealth()
    setPlayerHealth(value)
    getPlayerAttack()
    setPlayerAttack(value)
    getPlayerDefense()
    setPlayerDefense(value)
    getLevel()
    incrementLevel()
    getScore()
    addScore(points)
    getEnemiesDefeated()
    incrementEnemiesDefeated()
    resetState()
    getState()
}
```

**State Structure:**
```javascript
{
    playerHealth: 100,
    playerMaxHealth: 100,
    playerAttack: 20,
    playerDefense: 10,
    level: 1,
    score: 0,
    enemiesDefeated: 0
}
```

#### AssetManager
**Purpose:** Procedural texture generation

**Responsibilities:**
- Generate player texture
- Generate enemy textures (slime, goblin)
- Generate environment textures (platforms, grass, clouds)
- Generate UI textures (buttons, backgrounds)
- Cache generated textures

**Interface:**
```javascript
class AssetManager {
    static generatePlayerTexture(scene)
    static generateSlimeTexture(scene)
    static generateGoblinTexture(scene)
    static generatePlatformTexture(scene)
    static generateGrassTexture(scene)
    static generateBattleBackground(scene)
    static generateButtonTexture(scene)
    static generateAllTextures(scene)
}
```

**Texture Generation Approach:**
- Use Phaser.GameObjects.Graphics
- Follow art style guide color specifications
- Generate textures with appropriate dimensions
- Use `generateTexture()` to create reusable textures

#### SoundManager
**Purpose:** Procedural sound effect generation

**Responsibilities:**
- Generate sound effects using Web Audio API
- Provide play methods for each sound
- Handle sound availability gracefully
- Cache generated sounds

**Interface:**
```javascript
class SoundManager {
    constructor(scene)
    generateAttackSound()
    generateHurtSound()
    generateJumpSound()
    generateVictorySound()
    generateDeathSound()
    playAttackSound()
    playHurtSound()
    playJumpSound()
    playVictorySound()
    playDeathSound()
    generateAllSounds()
}
```

**Sound Generation Approach:**
- Use Web Audio API OscillatorNode
- Create simple waveforms (sine, square, sawtooth)
- Apply envelopes (attack, decay, sustain, release)
- Use frequency modulation for variety
- Fallback to silent operation if Web Audio unavailable

## Data Models

### Game State Model
```javascript
{
    playerHealth: Number,      // Current player health (0-100)
    playerMaxHealth: Number,   // Maximum player health
    playerAttack: Number,      // Player attack power
    playerDefense: Number,     // Player defense power
    level: Number,             // Current level (1+)
    score: Number,             // Total score
    enemiesDefeated: Number    // Total enemies defeated
}
```

### Enemy Configuration Model
```javascript
{
    type: String,              // 'slime' or 'goblin'
    health: Number,            // Base health
    attack: Number,            // Base attack power
    moveSpeed: Number,         // Movement speed
    patrolDistance: Number,    // Patrol range
    jumpProbability: Number,   // Chance to jump (0-1)
    platformBound: Boolean     // Stay on platform
}
```

### Level Configuration Model
```javascript
{
    levelNumber: Number,       // Level identifier
    enemyCount: Number,        // Number of enemies
    enemyTypes: Array,         // Mix of enemy types
    difficultyMultiplier: Number, // Stat multiplier
    platformLayout: Array      // Platform positions
}
```

## Error Handling

### Asset Loading Errors
- **Strategy:** Graceful degradation with fallback assets
- **Implementation:** Try-catch blocks around asset generation
- **Fallback:** Use simple colored rectangles if texture generation fails
- **User Feedback:** Display warning message but continue game

### Sound Generation Errors
- **Strategy:** Silent operation if Web Audio unavailable
- **Implementation:** Check for Web Audio API support before generation
- **Fallback:** No-op sound methods that don't throw errors
- **User Feedback:** No user notification (sounds are optional)

### Battle State Errors
- **Strategy:** Reset battle state and return to GameScene
- **Implementation:** Try-catch around battle actions
- **Fallback:** Force battle end with no result
- **User Feedback:** Display "Battle error occurred" message

### Player Death Errors
- **Strategy:** Force game over state
- **Implementation:** Ensure death handlers always complete
- **Fallback:** Direct transition to GameOverScene
- **User Feedback:** Standard game over screen

## Testing Strategy

### Unit Testing Approach
- **Managers:** Test state management, asset generation, sound generation
- **Entities:** Test movement, damage calculation, stat management
- **Utilities:** Test helper functions and constants

### Integration Testing Approach
- **Scene Transitions:** Verify all scene transitions work correctly
- **Battle Flow:** Test complete battle from start to end
- **Level Progression:** Test enemy defeat and level completion
- **Player Death:** Test death triggers and restart flow

### Manual Testing Checklist
1. **Game Load:** Verify game loads without errors
2. **Player Movement:** Test all movement controls (left, right, jump)
3. **Enemy Encounters:** Trigger battles with different enemy types
4. **Battle Actions:** Test attack, defend, and special actions
5. **Victory:** Defeat enemy and verify return to GameScene
6. **Defeat:** Lose battle and verify game over flow
7. **Level Completion:** Defeat all enemies and verify level progression
8. **Player Death:** Fall into killzone and verify death handling
9. **Restart:** Use restart button and verify state reset
10. **Performance:** Check for frame rate issues or memory leaks

### Testing Tools
- **Browser Console:** Monitor for errors and warnings
- **Phaser Debug:** Enable physics debug to verify collisions
- **Performance Monitor:** Check FPS and memory usage
- **Cross-Browser:** Test in Chrome, Firefox, Edge

## Implementation Phases

### Phase 1: Code Extraction and Modularization
1. Extract inline code from game.html to separate files
2. Update game.html to import all required scripts
3. Verify game still works with modular structure
4. Remove duplicate code between inline and separate files

### Phase 2: Asset Management System
1. Implement AssetManager with texture generation
2. Update PreloadScene to use AssetManager
3. Implement SoundManager with sound generation
4. Update scenes to use generated assets

### Phase 3: Game State Management
1. Implement GameStateManager
2. Replace global gameData with GameStateManager
3. Update all scenes to use GameStateManager
4. Add state persistence (optional)

### Phase 4: Enhanced Features
1. Implement GameOverScene
2. Add level progression logic
3. Enhance battle system with proper damage calculation
4. Add player death and respawn handling

### Phase 5: Polish and Testing
1. Add JSDoc comments to all classes and methods
2. Replace magic numbers with named constants
3. Perform comprehensive testing
4. Fix bugs and optimize performance

## Dependencies

### External Dependencies
- **Phaser 3:** Game framework (loaded via CDN)
- **Web Audio API:** Sound generation (browser built-in)

### Internal Dependencies
- **Scene Dependencies:** BootScene → PreloadScene → GameScene ⇄ BattleScene/UIScene → GameOverScene
- **Manager Dependencies:** All scenes depend on GameStateManager
- **Entity Dependencies:** GameScene and BattleScene depend on Player and Enemy classes

## Performance Considerations

### Texture Generation
- Generate all textures once during PreloadScene
- Cache textures for reuse
- Use appropriate texture dimensions (power of 2 when possible)
- Avoid regenerating textures during gameplay

### Sound Generation
- Generate sounds once during PreloadScene
- Reuse AudioBuffer objects
- Limit concurrent sound playback
- Use short sound durations to minimize memory

### Physics Optimization
- Use static groups for platforms (no physics updates)
- Limit number of active enemies on screen
- Disable physics for off-screen entities
- Use appropriate collision bounds

### Memory Management
- Destroy defeated enemies properly
- Clean up tweens and timers
- Remove event listeners when scenes stop
- Avoid memory leaks in scene transitions

## Security Considerations

### Input Validation
- Validate all user input (keyboard, mouse)
- Prevent injection attacks (not applicable for this game)
- Sanitize any user-generated content (not applicable)

### Data Integrity
- Validate game state values (health, attack, etc.)
- Prevent negative health or invalid stats
- Ensure level numbers are within valid range
- Validate enemy configurations

### Browser Compatibility
- Test in modern browsers (Chrome, Firefox, Edge, Safari)
- Provide fallbacks for unsupported features
- Handle Web Audio API unavailability
- Ensure game works without external assets

## Future Extensibility

### Planned Extensions
- **Save/Load System:** LocalStorage-based game state persistence
- **Multiple Levels:** Level selection and progression system
- **Power-ups:** Collectible items that enhance player abilities
- **Boss Battles:** Special enemy encounters with unique mechanics
- **Achievements:** Track player accomplishments
- **Difficulty Settings:** Easy, Normal, Hard modes

### Architecture Support
- **Modular Design:** Easy to add new scenes and entities
- **Manager Pattern:** Centralized state and asset management
- **Configuration-Driven:** Enemy and level configs in separate files
- **Event System:** Loose coupling between scenes via events
- **Plugin Support:** Phaser plugin system for extensions
