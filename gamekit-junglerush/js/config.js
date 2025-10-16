/**
 * Game Configuration
 * Central configuration file for JungleRush game constants
 */

const GameConfig = {
    // Game dimensions
    width: 800,
    height: 600,
    
    // World dimensions
    worldWidth: 2400,
    worldHeight: 600,
    
    // Physics settings
    physics: {
        gravity: 300,
        debug: false
    },
    
    // Player configuration
    player: {
        health: 100,
        maxHealth: 100,
        attack: 20,
        defense: 10,
        moveSpeed: 160,
        jumpSpeed: -330,
        width: 32,
        height: 48
    },
    
    // Enemy configurations
    enemies: {
        slime: {
            health: 30,
            attack: 10,
            moveSpeed: 85,
            jumpSpeed: -300,
            jumpProbability: 0,
            width: 32,
            height: 32,
            patrolDistance: 350
        },
        goblin: {
            health: 50,
            attack: 15,
            moveSpeed: 105,
            jumpSpeed: -300,
            jumpProbability: 0.008,
            width: 32,
            height: 48,
            patrolDistance: 300
        }
    },
    
    // Enemy spawn positions for level 1
    enemySpawns: [
        // Ground level enemies
        { x: 300, y: 520, type: 'slime', patrolDistance: 350, moveSpeed: 80, jumpProbability: 0, platformBound: true },
        { x: 900, y: 520, type: 'slime', patrolDistance: 400, moveSpeed: 90, jumpProbability: 0, platformBound: true },
        { x: 1500, y: 520, type: 'slime', patrolDistance: 380, moveSpeed: 85, jumpProbability: 0, platformBound: true },
        
        // Platform enemies
        { x: 600, y: 370, type: 'goblin', patrolDistance: 200, moveSpeed: 100, jumpProbability: 0.005, platformBound: true },
        { x: 750, y: 190, type: 'goblin', patrolDistance: 180, moveSpeed: 110, jumpProbability: 0.01, platformBound: true },
        { x: 1200, y: 520, type: 'goblin', patrolDistance: 420, moveSpeed: 105, jumpProbability: 0.008, platformBound: true },
        { x: 1800, y: 520, type: 'goblin', patrolDistance: 380, moveSpeed: 115, jumpProbability: 0.01, platformBound: true }
    ],
    
    // Level progression settings
    levelProgression: {
        healthRestorePercent: 0.3, // Restore 30% health on level complete
        enemyHealthScaling: 1.2, // Multiply enemy health by 1.2 per level
        enemyAttackScaling: 1.15, // Multiply enemy attack by 1.15 per level
        scorePerEnemy: 100,
        scorePerLevel: 500
    },
    
    // Battle settings
    battle: {
        specialAttackMultiplier: 1.5,
        specialAttackHealthCost: 10,
        defendBonus: 5,
        minDamage: 1
    },
    
    // Animation settings
    animations: {
        idleBreathingDuration: 1500,
        idleBreathingScale: 1.03,
        slimePulseDuration: 1000,
        slimePulseScaleX: 1.1,
        slimePulseScaleY: 0.9,
        goblinBreathingDuration: 1200,
        walkingBobDistance: 5,
        walkingBobDuration: 150,
        jumpSquashScaleX: 0.8,
        jumpSquashScaleY: 1.2,
        landSquashScaleX: 1.2,
        landSquashScaleY: 0.8,
        grassRustleScaleX: 1.1,
        grassRustleScaleY: 0.95,
        grassRustleDuration: 200
    },
    
    // Platform configuration
    platforms: {
        groundY: 550,
        groundHeight: 32,
        groundWidth: 100,
        groundGaps: [8, 9, 18, 19], // Indices where gaps should be
        floatingPlatforms: [
            { x: 600, y: 400 },
            { x: 50, y: 250 },
            { x: 750, y: 220 }
        ]
    },
    
    // Grass configuration
    grassPatches: [
        // Ground level bushes
        { x: 150, y: 534, scale: 1.2 },
        { x: 200, y: 534, scale: 1.0 },
        { x: 350, y: 534, scale: 1.3 },
        { x: 450, y: 534, scale: 1.1 },
        { x: 700, y: 534, scale: 1.4 },
        { x: 1000, y: 534, scale: 1.2 },
        { x: 1050, y: 534, scale: 1.0 },
        { x: 1200, y: 534, scale: 1.3 },
        { x: 1400, y: 534, scale: 1.1 },
        { x: 1700, y: 534, scale: 1.2 },
        { x: 2000, y: 534, scale: 1.3 },
        
        // Bushes on platforms
        { x: 580, y: 384, scale: 0.8 },
        { x: 620, y: 384, scale: 0.7 },
        { x: 30, y: 234, scale: 0.8 },
        { x: 70, y: 234, scale: 0.7 },
        { x: 730, y: 204, scale: 0.8 },
        { x: 770, y: 204, scale: 0.7 }
    ],
    
    // Killzone configuration
    killzone: {
        y: 590,
        height: 60,
        visualY: 590,
        collisionY: 620
    },
    
    // Camera settings
    camera: {
        followLerpX: 0.5,
        followLerpY: 0.5
    },
    
    // Enemy AI settings
    enemyAI: {
        maxFallTime: 60, // Frames before enemy tries to recover from falling
        edgeCheckDistance: 10,
        directionChangeInterval: 180, // Frames between potential direction changes
        pauseChance: 0.02, // Chance per frame to pause
        pauseDuration: 60, // Frames to pause
        airSpeedMultiplier: 0.8 // Speed multiplier when in air
    },
    
    // Grass interaction settings
    grassInteraction: {
        playerAlpha: 0.2, // Player becomes nearly invisible
        enemyAlpha: 0.6, // Enemy becomes partially visible
        enemyDepth: 5, // Depth when enemy is in grass
        fadeDuration: 300 // Fade animation duration in ms
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameConfig;
}
