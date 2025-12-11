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
- Minimal HTML structure (50 lines total)
- Script imports in correct dependency order
- Game container div with responsive design
- No inline JavaScript (clean separation of concerns)
- Phaser CDN import only

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
**Purpose:** Main platformer gameplay with side-scrolling, stealth mechanics, and enemy encounters

**Responsibilities:**
- Create level environment (platforms, background, decorations, grass patches)
- Spawn and manage player with stealth states
- Spawn and manage enemies with enhanced AI navigation
- Handle player-enemy collision detection and line-of-sight
- Manage stealth mechanics (hiding in grass)
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
    createGrassPatches()
    createPlayer()
    createEnemies()
    checkPlayerStealth()
    checkEnemyLineOfSight(enemy, player)
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
- `playerHidden`: Boolean flag for stealth state
- `grassPatches`: Array of grass hiding spots

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
**Purpose:** Player character with movement, stats, and stealth capabilities

**Responsibilities:**
- Handle keyboard input for movement
- Manage player physics (jumping, gravity)
- Store player stats (health, attack, defense)
- Manage stealth state when hiding in grass
- Provide update method for movement logic
- Handle stealth visual effects

**Interface:**
```javascript
class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y)
    update(cursors)
    takeDamage(amount)
    heal(amount)
    resetStats()
    setHidden(hidden)
    isHidden()
    updateStealthVisuals()
}
```

**Properties:**
- `moveSpeed`: Horizontal movement speed
- `jumpSpeed`: Jump velocity
- `health`: Current health
- `maxHealth`: Maximum health
- `attack`: Attack power
- `defense`: Defense power
- `hidden`: Boolean stealth state
- `stealthAlpha`: Visual transparency when hidden

#### Enemy Class
**Purpose:** Enemy entities with enhanced AI navigation and detection

**Responsibilities:**
- Advanced patrol behavior with platform navigation
- Store enemy stats based on type
- Line-of-sight detection for player tracking
- Smart pathfinding across available walking areas
- Handle different enemy types (slime, goblin) with unique behaviors
- Search patterns when player is lost

**Interface:**
```javascript
class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, type)
    update()
    setupEnemyType()
    updateAIState()
    enterIdleState()
    enterCasualPatrolState()
    enterPursuingState()
    enterSearchingState()
    calculateWanderDistance()
    chooseWanderDirection()
    checkLevelBoundaries()
    checkPlatformEdges()
    canJumpToPlatform(platform)
    executeJump(targetPlatform)
    patrol()
    searchForPlayer()
    canSeePlayer(player)
    navigateToTarget(targetX)
    findNearestPlatform()
    jumpToPlatform(platform)
    smoothMovement(targetVelocity)
    takeDamage(amount)
}
```

**Properties:**
- `type`: Enemy type ('slime' or 'goblin')
- `health`: Current health
- `attack`: Attack power
- `homePosition`: Original spawn position (x, y)
- `wanderDistance`: Current wander distance for this cycle
- `maxWanderDistance`: Maximum allowed wander distance
- `minWanderDistance`: Minimum wander distance
- `currentWanderTarget`: Target position for current wander
- `moveSpeed`: Base movement speed
- `currentSpeed`: Current actual speed (for smooth transitions)
- `direction`: Current movement direction
- `aiState`: Current AI state ('idle', 'casual_patrol', 'pursuing', 'searching')
- `stateTimer`: Time in current state
- `idleDuration`: How long to stay idle (2-4 seconds)
- `wanderCyclesCompleted`: Number of wander cycles completed
- `detectionRange`: Line-of-sight distance
- `searchTimer`: Time spent searching for player
- `lastKnownPlayerX`: Last seen player position
- `currentPlatform`: Current platform reference
- `canJump`: Ability to jump between platforms
- `jumpHeight`: Maximum jump height for this mob type
- `jumpCooldown`: Time between jump attempts
- `levelBounds`: Level boundary limits (left, right, top, bottom)
- `acceleration`: Speed change rate for smooth movement
- `pauseTimer`: Timer for random pauses during patrol
- `personalityTraits`: Individual variation factors (wanderiness, jumpiness, etc.)

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
- Generate player texture (normal and stealth variants)
- Generate enemy textures (slime, goblin) with detection states
- Generate environment textures (platforms, grass patches, clouds)
- Generate UI textures (buttons, backgrounds)
- Generate stealth and detection visual effects
- Cache generated textures

**Interface:**
```javascript
class AssetManager {
    static generatePlayerTexture(scene)
    static generatePlayerStealthTexture(scene)
    static generateSlimeTexture(scene)
    static generateGoblinTexture(scene)
    static generatePlatformTexture(scene)
    static generateGrassTexture(scene)
    static generateGrassPatchTexture(scene)
    static generateDetectionIndicator(scene)
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

## Stealth and AI Navigation System

### Stealth Mechanics

#### Grass Hiding System
**Concept:** Grass patches serve as stealth zones where players can hide from enemy detection.

**Implementation:**
- Grass patches are static physics bodies placed throughout levels
- When player overlaps with grass, stealth state activates
- Player becomes semi-transparent (alpha 0.5) when hidden
- Enemies cannot detect hidden players within grass patches
- Player can still move while hidden but at reduced speed (0.7x)

**Detection Rules:**
1. **Line of Sight:** Enemies can only detect players within their detection range AND with clear line of sight
2. **Grass Override:** Players in grass are undetectable regardless of line of sight
3. **Movement Penalty:** Hidden players move slower to maintain stealth
4. **Exit Stealth:** Leaving grass patch immediately ends stealth state

#### Visual Feedback
- **Player:** Semi-transparent when hidden, normal opacity when visible
- **Enemies:** Detection indicator (exclamation mark) when player spotted
- **Grass:** Subtle animation/sway to indicate interactive areas

### Enhanced Enemy AI Navigation

#### Multi-Platform Pathfinding
**Concept:** Enemies can navigate across multiple platforms to search for and pursue the player.

**Navigation Behaviors:**
1. **Standard Patrol:** Move back and forth on current platform
2. **Player Pursuit:** When player detected, move toward player position
3. **Cross-Platform Search:** Jump to adjacent platforms when searching
4. **Return to Base:** Return to original patrol area after losing player

#### AI State Machine
```
IDLE → CASUAL_PATROL → DETECTED → PURSUING → SEARCHING → IDLE
  ↑         ↓              ↓           ↓          ↓        ↑
  └─────────┴──────────────┴───────────┴──────────┴────────┘
                    LOST_PLAYER (timeout)
```

**State Descriptions:**
- **IDLE:** Stationary, looking around occasionally (2-4 seconds)
- **CASUAL_PATROL:** Slow, relaxed movement with pauses (30% normal speed)
- **DETECTED:** Player spotted, transition to alert state
- **PURSUING:** Fast movement toward player position (100% speed)
- **SEARCHING:** Active searching on multiple platforms (70% speed)
- **LOST_PLAYER:** Gradual return to idle state via casual patrol

#### Natural Movement Patterns

**Idle Behavior:**
- Stand still for 2-4 seconds
- Occasional "look around" animation (flip sprite briefly)
- Random chance to enter casual patrol (20% every 2 seconds)
- Immediate alert if player detected

**Casual Patrol Behavior:**
- Move at 30% of normal speed (relaxed pace)
- Choose random wander distance based on mob type and personality
- Respect level boundaries and platform edges
- Random pauses during movement (10% chance per second)
- Smooth acceleration/deceleration instead of instant direction changes
- Return to idle state after completing wander cycle

#### Intelligent Wandering System

**Distance-Based Movement:**
- Each mob calculates a random wander distance when entering patrol state
- Distance varies by mob type and individual personality traits
- Mobs remember their "home position" and wander within their territory

**Mob-Specific Wander Patterns:**

**Slimes (Blob Mobs):**
- Wander Distance: 100-300 pixels from home position
- Can jump to higher platforms within 1-2 tile heights
- Prefer staying on ground level but will explore vertically
- Jump probability: 30% when encountering higher platform
- Movement style: Bouncy, with small hops during movement

**Goblins:**
- Wander Distance: 150-400 pixels from home position  
- Primarily horizontal movement, avoid jumping
- More cautious about platform edges
- Jump probability: 10% only for small gaps
- Movement style: Steady walking with occasional quick dashes

**Boundary Awareness:**
- **Level Boundaries:** Never move outside defined level area
- **Platform Edges:** Stop at platform edges unless jumping
- **Floor Detection:** Always ensure there's ground to walk on
- **Height Limits:** Respect maximum jump heights per mob type

**Randomization System:**
- **Distance Variance:** ±20% variation from base wander distance
- **Direction Choice:** 60% chance to continue current direction, 40% to reverse
- **Pause Timing:** Random 0.5-2 second pauses during wander
- **Jump Timing:** Random delays before attempting jumps (1-3 seconds)

#### Wandering Algorithm

**Phase 1: Wander Distance Calculation**
```javascript
// Calculate this cycle's wander distance
const baseDistance = random(minWanderDistance, maxWanderDistance);
const variance = baseDistance * wanderVariance * (random(-1, 1));
const personalityFactor = personalityTraits.wanderiness;
wanderDistance = (baseDistance + variance) * personalityFactor;
```

**Phase 2: Direction and Target Selection**
```javascript
// Choose direction based on current position relative to home
const distanceFromHome = Math.abs(currentX - homePosition.x);
const maxAllowedDistance = Math.min(wanderDistance, maxWanderDistance);

// Bias toward home if too far away
if (distanceFromHome > maxAllowedDistance * 0.8) {
    direction = (currentX > homePosition.x) ? -1 : 1; // toward home
} else {
    direction = random() < 0.6 ? currentDirection : -currentDirection;
}

// Calculate target position
wanderTarget = currentX + (direction * wanderDistance);
```

**Phase 3: Boundary Checking**
```javascript
// Ensure target is within level bounds
wanderTarget = Math.max(levelBounds.left, Math.min(levelBounds.right, wanderTarget));

// Check for platform edges if mob respects them
if (respectsPlatformEdges && !canReachTarget(wanderTarget)) {
    wanderTarget = findSafestReachablePosition(wanderTarget);
}
```

**Phase 4: Jump Decision Making**
```javascript
// For slimes encountering higher platforms
if (type === 'slime' && jumpCooldown <= 0) {
    const nearbyPlatforms = findPlatformsInRange(jumpHeight);
    const jumpChance = jumpProbability * personalityTraits.jumpiness;
    
    if (nearbyPlatforms.length > 0 && random() < jumpChance) {
        const targetPlatform = selectBestPlatform(nearbyPlatforms);
        if (targetPlatform) {
            executeJump(targetPlatform);
            jumpCooldown = jumpCooldownTime;
        }
    }
}
```

**Phase 5: Movement Execution**
- Move toward wander target with smooth acceleration
- Pause randomly during movement based on pause chance
- Monitor for level boundaries and platform edges continuously
- Return to idle state when wander target is reached

**Movement Smoothing:**
- Gradual speed changes instead of instant velocity switches
- Acceleration phase when starting movement (0.5 seconds)
- Deceleration phase when stopping (0.3 seconds)
- Natural turning animation at patrol boundaries

#### Platform Navigation Logic
1. **Current Platform Check:** Identify which platform enemy is on
2. **Target Platform Selection:** Find platform closest to player/search area
3. **Jump Decision:** Calculate if jump is possible and beneficial
4. **Path Execution:** Move to edge and jump with appropriate velocity
5. **Landing Verification:** Ensure successful platform landing

#### Enhanced Detection System
- **Detection Range:** Configurable per enemy type (slimes: 150px, goblins: 200px)
- **Line of Sight:** Raycast from enemy to player, blocked by platforms
- **Search Duration:** Time limit for active searching (5-10 seconds)
- **Memory System:** Remember last known player position for smarter searching

#### Realistic AI Timing
**Idle State Timing:**
- Slimes: 2-3 seconds idle, then 20% chance to patrol
- Goblins: 3-4 seconds idle, then 25% chance to patrol
- Look around animation every 1-2 seconds while idle

**Casual Patrol Timing:**
- Move at 30% speed with smooth acceleration (0.5s ramp-up)
- Pause for 1-2 seconds at patrol boundaries
- 10% chance per second to pause mid-patrol (0.5-1s pause)
- Complete 1-2 patrol cycles before returning to idle

**State Transition Smoothing:**
- Gradual speed changes over 0.3-0.5 seconds
- No instant velocity reversals
- Natural deceleration when changing direction
- Smooth animation blending between states

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
    moveSpeed: Number,         // Base movement speed
    
    // Wandering Behavior
    minWanderDistance: Number, // Minimum wander distance (pixels)
    maxWanderDistance: Number, // Maximum wander distance (pixels)
    wanderVariance: Number,    // Random variance in wander distance (±%)
    
    // Movement Characteristics
    detectionRange: Number,    // Line-of-sight distance
    searchDuration: Number,    // Time to search when player lost (ms)
    idleTimeMin: Number,       // Minimum idle duration (ms)
    idleTimeMax: Number,       // Maximum idle duration (ms)
    casualSpeedMultiplier: Number, // Speed during casual patrol (0.3)
    pauseChance: Number,       // Chance to pause during patrol (0.1)
    wanderCyclesBeforeIdle: Number, // Cycles before returning to idle (1-2)
    
    // Jumping and Vertical Movement
    canJump: Boolean,          // Can jump between platforms
    jumpHeight: Number,        // Maximum jump height (pixels)
    jumpProbability: Number,   // Chance to jump when encountering platform (0-1)
    jumpCooldown: Number,      // Time between jump attempts (ms)
    
    // Boundary Behavior
    respectsPlatformEdges: Boolean, // Stops at platform edges
    staysInLevel: Boolean,     // Never leaves level boundaries
    acceleration: Number,      // Speed change rate for smooth movement
    
    // Personality Traits (individual variation)
    personalityVariance: {
        wanderiness: Number,   // How much this individual likes to wander (0.5-1.5)
        jumpiness: Number,     // How likely to jump (0.5-1.5 multiplier)
        cautiousness: Number   // How careful about edges (0.5-1.5)
    }
}
```

### Mob Type Configurations

#### Slime Configuration
```javascript
{
    type: 'slime',
    minWanderDistance: 100,
    maxWanderDistance: 300,
    wanderVariance: 0.2,
    jumpHeight: 80,
    jumpProbability: 0.3,
    jumpCooldown: 2000,
    canJump: true,
    respectsPlatformEdges: false, // Can jump off platforms
    casualSpeedMultiplier: 0.25
}
```

#### Goblin Configuration  
```javascript
{
    type: 'goblin',
    minWanderDistance: 150,
    maxWanderDistance: 400,
    wanderVariance: 0.15,
    jumpHeight: 40,
    jumpProbability: 0.1,
    jumpCooldown: 3000,
    canJump: true,
    respectsPlatformEdges: true, // Stops at platform edges
    casualSpeedMultiplier: 0.3
}
```

### Grass Patch Model
```javascript
{
    x: Number,                 // X position
    y: Number,                 // Y position
    width: Number,             // Width of grass patch
    height: Number,            // Height of grass patch
    stealthBonus: Number       // Stealth effectiveness (0-1)
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
3. **Stealth Mechanics:** Test hiding in grass patches and stealth visual effects
4. **Enemy Detection:** Verify line-of-sight detection and grass hiding effectiveness
5. **Enemy Navigation:** Test enemy platform jumping and pathfinding
6. **Enemy AI States:** Verify patrol → detection → pursuit → search → return cycle
7. **Enemy Encounters:** Trigger battles with different enemy types
8. **Battle Actions:** Test attack, defend, and special actions
9. **Victory:** Defeat enemy and verify return to GameScene
10. **Defeat:** Lose battle and verify game over flow
11. **Level Completion:** Defeat all enemies and verify level progression
12. **Player Death:** Fall into killzone and verify death handling
13. **Stealth Strategy:** Test avoiding enemies using grass patches
14. **AI Search Behavior:** Test enemy searching when player is hidden
15. **Restart:** Use restart button and verify state reset
16. **Performance:** Check for frame rate issues or memory leaks

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
