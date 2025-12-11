/**
 * PreloadScene - Handles asset loading and generation with progress indication.
 * 
 * This scene generates all procedural textures and sounds using AssetManager
 * and SoundManager, displays a loading progress bar, and transitions to
 * GameScene when complete.
 */
class PreloadScene extends Phaser.Scene {
    /**
     * Creates a new PreloadScene instance.
     */
    constructor() {
        super('PreloadScene');
        this.progressBar = null;
        this.progressText = null;
    }

    /**
     * Preload phase - sets up the loading progress bar.
     */
    preload() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Create loading text
        this.progressText = this.add.text(width / 2, height / 2 - 50, 'Loading: 0%', {
            fontSize: '24px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Create progress bar background
        const progressBarBg = this.add.graphics();
        progressBarBg.fillStyle(0x222222, 0.8);
        progressBarBg.fillRect(width / 2 - 160, height / 2 - 10, 320, 20);

        // Create progress bar
        this.progressBar = this.add.graphics();
    }

    /**
     * Create phase - generates all assets and initializes managers.
     */
    create() {
        try {
            // Update progress: Starting asset generation
            this.updateProgressBar(10);

            // Generate all textures using AssetManager
            AssetManager.generateAllTextures(this);
            this.updateProgressBar(50);

            // Initialize SoundManager (sounds are generated on-demand, not preloaded)
            if (!this.soundManager) {
                this.soundManager = new SoundManager();
            }
            this.updateProgressBar(80);

            // Create simple animations
            this.createSimpleAnimations();
            this.updateProgressBar(100);

            // Small delay to show 100% completion
            this.time.delayedCall(500, () => {
                // Transition to GameScene
                this.scene.start('GameScene');
            });

        } catch (error) {
            console.error('Error during asset generation:', error);
            // Display error message but continue to game
            this.progressText.setText('Asset generation error - continuing with fallbacks');
            this.time.delayedCall(2000, () => {
                this.scene.start('GameScene');
            });
        }
    }

    /**
     * Updates the loading progress bar visual.
     * @param {number} percentage - Progress percentage (0-100)
     */
    updateProgressBar(percentage) {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Clear previous progress bar
        this.progressBar.clear();

        // Draw new progress bar
        this.progressBar.fillStyle(0x00ff00, 1);
        this.progressBar.fillRect(
            width / 2 - 160,
            height / 2 - 10,
            (320 * percentage) / 100,
            20
        );

        // Update progress text
        this.progressText.setText(`Loading: ${Math.floor(percentage)}%`);
    }

    /**
     * Creates simple animations for player and enemies.
     */
    createSimpleAnimations() {
        // Player animations - using single frame for simple shapes
        this.anims.create({
            key: 'player-idle',
            frames: [{ key: 'player', frame: 0 }],
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'player-walk',
            frames: [{ key: 'player', frame: 0 }],
            frameRate: 10,
            repeat: -1
        });

        // Enemy animations
        this.anims.create({
            key: 'slime-idle',
            frames: [{ key: 'slime', frame: 0 }],
            frameRate: 6,
            repeat: -1
        });

        this.anims.create({
            key: 'goblin-idle',
            frames: [{ key: 'goblin', frame: 0 }],
            frameRate: 6,
            repeat: -1
        });
    }
}

// Make PreloadScene globally available
window.PreloadScene = PreloadScene;
