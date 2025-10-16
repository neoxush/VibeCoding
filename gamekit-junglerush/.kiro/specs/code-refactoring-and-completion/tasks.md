# Implementation Plan

## Phase 1: Foundation - Create Manager and Utility Infrastructure

- [x] 1. Create configuration file


  - Create js/config.js with game constants (dimensions, physics settings, default stats, enemy configurations)
  - Extract configuration values from game.html inline code
  - _Requirements: 1.3, 9.2_

- [x] 2. Create Constants utility file


  - Create js/utils/Constants.js with named constants to replace magic numbers
  - Define constants for colors, dimensions, speeds, and other magic numbers
  - _Requirements: 9.2_

- [x] 3. Implement GameStateManager


  - Create js/managers/GameStateManager.js with state management class
  - Implement state initialization, getters, setters, and reset methods
  - Add methods for playerHealth, playerAttack, playerDefense, level, score, enemiesDefeated
  - Add JSDoc comments for all methods
  - _Requirements: 5.1, 5.2, 5.3, 5.6, 9.1_

- [x] 4. Implement AssetManager for procedural texture generation


  - Create js/managers/AssetManager.js with static texture generation methods
  - Extract and refactor texture generation code from game.html createTextures() method
  - Implement generatePlayerTexture() following art style guide specifications
  - Implement generateSlimeTexture() and generateGoblinTexture() for enemies
  - Implement generatePlatformTexture() and generateGrassTexture() for environment
  - Implement generateBattleBackground() and generateButtonTexture() for UI
  - Implement generateAllTextures() to create all textures at once
  - Add JSDoc comments for all methods
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 9.1_

- [x] 5. Implement SoundManager for procedural sound generation



  - Create js/managers/SoundManager.js with sound generation class
  - Implement Web Audio API-based sound generation for attack, hurt, jump, victory, death sounds
  - Implement play methods for each sound type
  - Add error handling for Web Audio API unavailability
  - Add JSDoc comments for all methods
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 9.1_

## Phase 2: Scene Refactoring - Extract and Enhance Scene Logic

- [x] 6. Update BootScene





  - Modify js/scenes/BootScene.js to display initial message
  - Change transition from GameScene to PreloadScene
  - Add JSDoc comments
  - _Requirements: 1.1, 9.1_

- [x] 7. Update PreloadScene to use AssetManager and SoundManager


  - Modify js/scenes/PreloadScene.js to call AssetManager.generateAllTextures()
  - Add SoundManager initialization and sound generation
  - Implement loading progress bar with updateProgressBar() method
  - Add error handling for asset generation failures
  - Transition to GameScene when loading completes
  - Add JSDoc comments
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.5, 9.1_

- [x] 8. Refactor GameScene with full functionality from game.html


  - Extract complete GameScene implementation from game.html inline code
  - Update js/scenes/GameScene.js with all methods: createTextures(), create(), createPlatforms(), createGrassPatches(), createKillZone(), createPlayer(), createIdleAnimation(), createEnemies(), createCloud(), update(), updatePlayerMovement(), updateEnemies(), updateGrassInteractions(), checkEntityGrassOverlap(), encounterEnemy(), playerDeath(), enemyDeath(), restartLevel()
  - Remove inline texture generation (use AssetManager instead)
  - Integrate GameStateManager for state access
  - Add checkLevelComplete() method to detect when all enemies are defeated
  - Add handlePlayerDeath() method for death handling
  - Add level progression logic
  - Add JSDoc comments for all methods
  - Add inline comments for complex logic (enemy AI, grass interactions, level generation)
  - _Requirements: 1.1, 1.4, 5.1, 5.4, 5.5, 7.1, 7.2, 7.3, 7.4, 7.5, 9.1, 9.3_

- [x] 9. Enhance BattleScene with proper damage calculation and state management



  - Update js/scenes/BattleScene.js to use GameStateManager instead of global gameData
  - Implement calculateDamage() method with proper formula (attack - defense)
  - Update playerAttack() to use calculateDamage() and SoundManager
  - Update playerDefend() to temporarily boost defense and use SoundManager
  - Update playerSpecial() to deal 1.5x damage, cost health, and use SoundManager
  - Update enemyAttack() to use calculateDamage() and SoundManager
  - Ensure battle end emits proper events to GameScene
  - Add JSDoc comments for all methods
  - Add inline comments for damage calculation logic
  - _Requirements: 4.1, 4.2, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 9.1, 9.3_

- [ ] 10. Update UIScene with JSDoc comments
  - Add JSDoc comments to all methods in js/scenes/UIScene.js
  - Document the purpose of the scene and its interaction with BattleScene
  - _Requirements: 1.4, 6.1, 6.2, 6.3, 9.1_

- [ ] 11. Implement GameOverScene
  - Create js/scenes/GameOverScene.js with game over display
  - Implement init() to receive final score and statistics
  - Implement create() to display game over message, final score, and restart button
  - Implement handleRestart() to reset GameStateManager and transition to GameScene
  - Add JSDoc comments
  - _Requirements: 8.3, 8.4, 8.5, 8.6, 9.1_

## Phase 3: Entity Refactoring - Enhance Entity Classes

- [ ] 12. Refactor Player entity class
  - Update js/entities/Player.js to use pre-generated 'player' texture from AssetManager
  - Remove inline texture generation from constructor
  - Add takeDamage(), heal(), and resetStats() methods
  - Add health, maxHealth, attack, defense properties
  - Integrate with GameStateManager for stat management
  - Add JSDoc comments for all methods
  - _Requirements: 1.2, 5.2, 5.3, 9.1_

- [ ] 13. Refactor Enemy entity class
  - Update js/entities/Enemy.js to use pre-generated 'slime' and 'goblin' textures from AssetManager
  - Remove inline texture generation from constructor
  - Extract complete Enemy implementation from game.html inline code
  - Add takeDamage() method
  - Ensure setupEnemyType() uses configuration from GameConfig
  - Implement full patrol behavior with boundary checking, jumping, platform bounds, edge detection
  - Add all properties: patrolDistance, startX, leftBound, rightBound, direction, moveSpeed, jumpProbability, jumpSpeed, jumpCooldown, canJump, platformBound, fallTimer, maxFallTime, directionChangeTimer, edgeCheckCounter, moveTimer, pauseTimer, state
  - Add JSDoc comments for all methods
  - Add inline comments for patrol AI logic
  - _Requirements: 1.2, 5.2, 9.1, 9.3_

## Phase 4: Integration - Wire Everything Together

- [ ] 14. Update main.js with proper game configuration
  - Update js/main.js to use GameConfig settings for game dimensions and physics
  - Register GameOverScene in the scene array
  - Replace global gameData object with gameStateManager singleton
  - Add JSDoc comments
  - _Requirements: 1.5, 5.1, 9.1_

- [ ] 15. Refactor game.html to use modular structure
  - Remove all inline JavaScript code from game.html (2319 lines of inline code)
  - Copy the modular structure from game-modular.html to game.html
  - Add script import for GameOverScene
  - Ensure game container div is properly referenced
  - Keep only HTML structure, CSS, and script tags
  - _Requirements: 1.1, 1.3_

## Phase 5: Polish and Testing

- [ ] 16. Replace remaining magic numbers with named constants
  - Review GameScene.js, BattleScene.js, and other scene files for magic numbers
  - Add any missing constants to js/utils/Constants.js
  - Replace magic numbers with constant references throughout codebase
  - _Requirements: 9.2_

- [ ] 17. Add player death handling integration
  - Ensure handlePlayerDeath() in GameScene triggers on killzone collision
  - Ensure handlePlayerDeath() triggers on zero health in BattleScene
  - Transition to GameOverScene with final statistics
  - Ensure proper cleanup of game state
  - _Requirements: 8.1, 8.2, 8.3_

- [ ] 18. Perform comprehensive testing
  - Test game loading and PreloadScene progress display
  - Test player movement controls (left, right, jump)
  - Test enemy encounters and battle transitions
  - Test all battle actions (attack, defend, special)
  - Test battle victory and return to GameScene
  - Test battle defeat and game over flow
  - Test level completion and progression
  - Test player death from killzone
  - Test restart functionality from GameOverScene
  - Verify no console errors during gameplay
  - Test sound effects play correctly (or fail gracefully)
  - Test grass interaction mechanics (player hiding, enemy partial hiding, rustling animations)
  - Test enemy AI patrol behavior (boundary checking, jumping, platform bounds)
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_
