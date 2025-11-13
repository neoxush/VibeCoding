/**
 * BootScene - Initial boot scene that displays a loading message
 * and transitions to the PreloadScene for asset loading.
 * 
 * This scene serves as the entry point for the game, providing
 * immediate visual feedback to the player before assets are loaded.
 */
class BootScene extends Phaser.Scene {
    /**
     * Creates a new BootScene instance.
     */
    constructor() {
        super('BootScene');
    }

    /**
     * Creates the initial boot screen with a loading message
     * and immediately transitions to PreloadScene.
     */
    create() {
        console.log('BootScene started');

        // Display initial loading message - centered for new canvas size
        this.add.text(600, 400, 'Loading...', {
            fontSize: '32px',
            fill: '#fff'
        }).setOrigin(0.5);

        // Transition to PreloadScene for asset loading
        this.scene.start('PreloadScene');
    }
}

// Make BootScene globally available
window.BootScene = BootScene;
