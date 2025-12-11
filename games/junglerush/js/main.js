// Wait for DOM to be ready and all scripts to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing game...');
    
    // Check if all required classes are available
    const requiredClasses = ['BootScene', 'PreloadScene', 'GameScene', 'BattleScene', 'UIScene', 'GameStateManager'];
    const missingClasses = requiredClasses.filter(className => typeof window[className] === 'undefined');
    
    if (missingClasses.length > 0) {
        console.error('Missing classes:', missingClasses);
        document.getElementById('game-container').innerHTML = '<div style="color: white; padding: 20px;">Error: Missing classes: ' + missingClasses.join(', ') + '</div>';
        return;
    }
    
    console.log('All classes loaded successfully');
    
    try {
        // Initialize GameStateManager
        const gameStateManager = new GameStateManager();
        console.log('GameStateManager initialized');
        
        // Game configuration
        const config = {
            type: Phaser.AUTO,
            width: 1200,
            height: 800,
            parent: 'game-container',
            backgroundColor: '#87ceeb', // Sky blue background
            pixelArt: true, // Enable pixel art mode for crisp pixels
            antialias: false, // Disable anti-aliasing for sharp pixels
            roundPixels: true, // Round pixel positions to prevent sub-pixel rendering
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { y: 300 },
                    debug: false // Disable debug for cleaner display
                }
            },
            scene: [BootScene, PreloadScene, GameScene, BattleScene, UIScene]
        };
        
        console.log('Creating Phaser game with config:', config);
        
        // Create the game instance
        const game = new Phaser.Game(config);
        
        // Make gameStateManager globally available
        window.gameStateManager = gameStateManager;
        
        console.log('Game initialized successfully!');
        
    } catch (error) {
        console.error('Error initializing game:', error);
        document.getElementById('game-container').innerHTML = '<div style="color: white; padding: 20px;">Error: ' + error.message + '</div>';
    }
});
