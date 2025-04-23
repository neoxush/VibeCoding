class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.player = null;
        this.enemies = null;
        this.cursors = null;
        this.isPlayerTurn = true;
        this.enemyEncountered = false;
        this.platforms = null;
    }

    create() {
        console.log('GameScene started');

        // Create a simple level with platforms
        this.createSimpleLevel();

        // Create the player
        this.createPlayer();

        // Create enemies
        this.createEnemies();

        // Set up camera to follow player
        this.cameras.main.setBounds(0, 0, 800 * 3, 600);
        this.cameras.main.startFollow(this.player, true, 0.5, 0.5);

        // Set up keyboard input
        this.cursors = this.input.keyboard.createCursorKeys();

        // Add collision detection
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.enemies, this.platforms);

        // Add overlap detection between player and enemies
        this.physics.add.overlap(this.player, this.enemies, this.encounterEnemy, null, this);

        // Add debug text to show controls
        this.add.text(16, 16, 'Arrow keys to move and jump', {
            fontSize: '18px',
            fill: '#000',
            backgroundColor: '#fff'
        }).setScrollFactor(0);

        console.log('Player created at:', this.player.x, this.player.y);
        console.log('Platforms created:', this.platforms.getChildren().length);
    }

    createSimpleLevel() {
        // Create a blue sky background
        this.add.rectangle(0, 0, 800 * 3, 600, 0x87ceeb).setOrigin(0, 0).setDepth(-1);

        // Create a static group for platforms
        this.platforms = this.physics.add.staticGroup();

        // Create the ground - a series of platforms across the bottom
        for (let i = 0; i < 30; i++) {
            // Skip some sections to create gaps
            if (i === 8 || i === 9 || i === 18 || i === 19) continue;

            // Create a rectangle for the platform
            const platform = this.add.rectangle(i * 100, 550, 100, 32, 0x8b4513);
            this.platforms.add(platform);
            platform.refreshBody();
        }

        // Add some floating platforms
        const platform1 = this.add.rectangle(600, 400, 200, 32, 0x8b4513);
        this.platforms.add(platform1);

        const platform2 = this.add.rectangle(50, 250, 200, 32, 0x8b4513);
        this.platforms.add(platform2);

        const platform3 = this.add.rectangle(750, 220, 200, 32, 0x8b4513);
        this.platforms.add(platform3);
    }

    createPlayer() {
        // Create player at a fixed position
        this.player = new Player(this, 100, 450);
    }

    createEnemies() {
        // Create enemy group
        this.enemies = this.physics.add.group();

        // Create enemies at fixed positions
        const enemyPositions = [
            { x: 300, y: 450, type: 'slime' },
            { x: 600, y: 300, type: 'goblin' },
            { x: 900, y: 450, type: 'slime' },
            { x: 1200, y: 450, type: 'goblin' },
            { x: 1500, y: 450, type: 'slime' }
        ];

        enemyPositions.forEach(pos => {
            const enemy = new Enemy(this, pos.x, pos.y, pos.type);
            this.enemies.add(enemy);
        });
    }

    update() {
        // Skip updates if in battle
        if (this.enemyEncountered) return;

        // Update player
        this.player.update(this.cursors);

        // Update enemies
        this.enemies.getChildren().forEach(enemy => {
            enemy.update();
        });

        // Debug info
        if (this.player) {
            console.log(`Player position: x=${this.player.x}, y=${this.player.y}`);
        }
    }

    encounterEnemy(player, enemy) {
        // Prevent multiple encounters
        if (this.enemyEncountered) return;

        this.enemyEncountered = true;

        // Stop player and enemy movement
        player.body.setVelocity(0);
        enemy.body.setVelocity(0);

        // Start battle scene
        this.scene.pause();
        this.scene.launch('BattleScene', {
            player: this.player,
            enemy: enemy
        });
        this.scene.launch('UIScene');

        // Listen for battle end event
        this.events.once('battle-end', (result) => {
            this.scene.resume();
            this.enemyEncountered = false;

            if (result === 'victory') {
                // Remove defeated enemy
                enemy.destroy();

                // Update game data
                gameData.enemiesDefeated++;
                gameData.score += 100;
            }
        });
    }
}
