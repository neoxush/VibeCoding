// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#87ceeb', // Sky blue background
    pixelArt: true, // Enable pixel art mode for crisp pixels
    antialias: false, // Disable anti-aliasing for sharp pixels
    roundPixels: true, // Round pixel positions to prevent sub-pixel rendering
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: true // Enable physics debug to see what's happening
        }
    },
    scene: [BootScene, PreloadScene, GameScene, BattleScene, UIScene]
};

// Create the game instance
const game = new Phaser.Game(config);

// Global game variables
let gameData = {
    playerHealth: 100,
    playerAttack: 20,
    playerDefense: 10,
    level: 1,
    score: 0,
    enemiesDefeated: 0
};

// Add some debug info
console.log('Game initialized with config:', config);
