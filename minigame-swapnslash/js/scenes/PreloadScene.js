class PreloadScene extends Phaser.Scene {
    constructor() {
        super('PreloadScene');
    }

    preload() {
        // Create loading bar
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Loading bar background
        const bgBar = this.add.image(width/2, height/2, 'loading-background');

        // Loading bar
        const progressBar = this.add.image(width/2, height/2, 'loading-bar');
        progressBar.setOrigin(0, 0.5);
        progressBar.setPosition(width/2 - progressBar.width/2, height/2);

        // Update the loading bar as assets are loaded
        this.load.on('progress', (value) => {
            progressBar.setScale(value, 1);
        });

        // Create simple assets instead of loading external files
        this.createSimpleAssets();

        // Load the tilemap JSON
        this.load.tilemapTiledJSON('map', 'assets/maps/level1.json');
    }

    createSimpleAssets() {
        // Create a simple player texture
        const playerGraphics = this.make.graphics();
        playerGraphics.fillStyle(0x00ff00); // Green player
        playerGraphics.fillRect(0, 0, 32, 48);
        playerGraphics.generateTexture('player', 32, 48);

        // Create simple enemy textures
        const slimeGraphics = this.make.graphics();
        slimeGraphics.fillStyle(0xff0000); // Red slime
        slimeGraphics.fillRect(0, 0, 32, 32);
        slimeGraphics.generateTexture('slime', 32, 32);

        const goblinGraphics = this.make.graphics();
        goblinGraphics.fillStyle(0xff00ff); // Purple goblin
        goblinGraphics.fillRect(0, 0, 32, 48);
        goblinGraphics.generateTexture('goblin', 32, 48);

        // Create a simple tileset texture
        const tileGraphics = this.make.graphics();
        // Background tile
        tileGraphics.fillStyle(0x87ceeb); // Sky blue
        tileGraphics.fillRect(0, 0, 32, 32);
        // Ground tile
        tileGraphics.fillStyle(0x8b4513); // Brown
        tileGraphics.fillRect(32, 0, 32, 32);
        // Decoration tile
        tileGraphics.fillStyle(0x00ff00); // Green
        tileGraphics.fillRect(64, 0, 32, 32);
        tileGraphics.generateTexture('tiles', 96, 32);

        // Create UI elements
        const bgGraphics = this.make.graphics();
        bgGraphics.fillStyle(0x000033); // Dark blue
        bgGraphics.fillRect(0, 0, 800, 600);
        bgGraphics.generateTexture('battle-background', 800, 600);

        const buttonGraphics = this.make.graphics();
        buttonGraphics.fillStyle(0x444444); // Dark gray
        buttonGraphics.fillRect(0, 0, 100, 50);
        buttonGraphics.generateTexture('button', 100, 50);

        // Create dummy audio
        this.cache.audio.add('bgm', { src: '' });
        this.cache.audio.add('attack', { src: '' });
        this.cache.audio.add('hurt', { src: '' });
    }

    create() {
        // Create simple animations
        this.createSimpleAnimations();

        // Start the game scene
        this.scene.start('GameScene');
    }

    createSimpleAnimations() {
        // Player animations - just use the same frame since we're using simple shapes
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
