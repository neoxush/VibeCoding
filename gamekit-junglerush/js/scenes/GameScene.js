/**
 * GameScene - Main platformer gameplay scene with side-scrolling and enemy encounters.
 * 
 * This scene handles the core platformer gameplay including player movement,
 * enemy AI, grass interactions, level generation, and battle transitions.
 * Integrates with GameStateManager for state management and AssetManager for assets.
 */
class GameScene extends Phaser.Scene {
    /**
     * Creates a new GameScene instance.
     */
    constructor() {
        super('GameScene');
        this.player = null;
        this.enemies = null;
        this.platforms = null;
        this.cursors = null;
        this.enemyEncountered = false;
        this.playerDied = false;
        this.grassPatches = null;
        this.killZone = null;
        this.leftBoundary = null;
        this.rightBoundary = null;
    }

    /**
     * Creates the game scene with all elements.
     */
    create() {
        console.log('GameScene started');

        // Reset flags
        this.enemyEncountered = false;
        this.playerDied = false;

        // Create detailed background
        this.createBackground();

        // Create platforms
        this.createPlatforms();

        // Create grass patches
        this.createGrassPatches();

        // Create player
        this.createPlayer();

        // Create enemies
        this.createEnemies();

        // Create killzone
        this.createKillZone();

        // Set up camera to follow player - updated for new height
        this.cameras.main.setBounds(0, 0, 2400, 800);
        this.cameras.main.startFollow(this.player, true, 0.5, 0.5);

        // Set up keyboard input
        this.cursors = this.input.keyboard.createCursorKeys();

        // Add collision detection
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.enemies, this.platforms);

        // Add overlap detection between player and enemies
        this.physics.add.overlap(this.player, this.enemies, this.encounterEnemy, null, this);

        // Set up WASD keys
        this.wasd = {
            up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        };
    }

    /**
     * Creates dynamic background with weather system, moving clouds, and mountains.
     */
    createBackground() {
        // Initialize weather system
        this.initializeWeatherSystem();
        
        // Create sky with dynamic colors based on weather
        this.createDynamicSky();
        
        // Add distant mountains
        this.createMountains();
        
        // Create moving cloud system
        this.createMovingClouds();
        
        // Start weather effects
        this.startWeatherEffects();
    }

    /**
     * Initializes the weather system with different weather states
     */
    initializeWeatherSystem() {
        this.weatherStates = {
            sunny: { 
                skyTop: 0x87ceeb, 
                skyBottom: 0xadd8e6, 
                cloudColor: 0xffffff, 
                cloudAlpha: 0.8,
                rainIntensity: 0 
            },
            cloudy: { 
                skyTop: 0x708090, 
                skyBottom: 0x9acd32, 
                cloudColor: 0xd3d3d3, 
                cloudAlpha: 0.9,
                rainIntensity: 0 
            },
            rainy: { 
                skyTop: 0x2f4f4f, 
                skyBottom: 0x696969, 
                cloudColor: 0x808080, 
                cloudAlpha: 1.0,
                rainIntensity: 0.8 
            }
        };
        
        // Start with rainy weather for testing
        this.currentWeather = 'rainy';
        this.weatherTransitionTimer = 0;
        this.weatherDuration = 15000; // 15 seconds per weather state
    }

    /**
     * Creates dynamic sky that changes based on weather
     */
    createDynamicSky() {
        this.sky = this.add.graphics();
        this.updateSkyColors();
    }

    /**
     * Updates sky colors based on current weather
     */
    updateSkyColors() {
        const weather = this.weatherStates[this.currentWeather];
        this.sky.clear();
        this.sky.fillGradientStyle(weather.skyTop, weather.skyTop, weather.skyBottom, weather.skyBottom, 1);
        this.sky.fillRect(0, 0, 2400, 800); // Updated for new height
    }

    /**
     * Creates distant mountains
     */
    createMountains() {
        const mountains = this.add.graphics();
        mountains.fillStyle(0x6a8caf);
        mountains.beginPath();
        mountains.moveTo(0, 650); // Adjusted for new height

        for (let x = 0; x < 2400; x += 200) {
            const height = 100 + Math.floor(Math.random() * 100);
            mountains.lineTo(x, 650 - height);
            mountains.lineTo(x + 100, 650 - height / 2);
        }

        mountains.lineTo(2400, 650);
        mountains.lineTo(2400, 800);
        mountains.lineTo(0, 800);
        mountains.closePath();
        mountains.fill();
    }

    /**
     * Creates moving cloud system with different layers and speeds
     */
    createMovingClouds() {
        this.cloudLayers = {
            background: [], // Slow moving, far clouds
            midground: [],  // Medium speed clouds
            foreground: []  // Fast moving, close clouds
        };

        // Create background clouds (slowest)
        for (let i = 0; i < 8; i++) {
            const cloud = this.createCloud(
                Math.random() * 2800, // Extend beyond screen for seamless movement
                50 + Math.random() * 100,
                0.6, // Smaller scale
                0.4  // Lower alpha
            );
            this.cloudLayers.background.push({
                sprite: cloud,
                speed: 5 + Math.random() * 10, // 5-15 pixels per second
                resetX: -100
            });
        }

        // Create midground clouds (medium speed)
        for (let i = 0; i < 12; i++) {
            const cloud = this.createCloud(
                Math.random() * 2800,
                80 + Math.random() * 120,
                0.8, // Medium scale
                0.6  // Medium alpha
            );
            this.cloudLayers.midground.push({
                sprite: cloud,
                speed: 15 + Math.random() * 20, // 15-35 pixels per second
                resetX: -150
            });
        }

        // Create foreground clouds (fastest)
        for (let i = 0; i < 6; i++) {
            const cloud = this.createCloud(
                Math.random() * 2800,
                30 + Math.random() * 80,
                1.2, // Larger scale
                0.8  // Higher alpha
            );
            this.cloudLayers.foreground.push({
                sprite: cloud,
                speed: 30 + Math.random() * 30, // 30-60 pixels per second
                resetX: -200
            });
        }
    }

    /**
     * Starts weather effects including rain
     */
    startWeatherEffects() {
        // Create rain particle system
        this.createRainSystem();
        
        // Start weather cycle timer
        this.weatherTimer = this.time.addEvent({
            delay: this.weatherDuration,
            callback: this.cycleWeather,
            callbackScope: this,
            loop: true
        });
    }

    /**
     * Creates rain particle system
     */
    createRainSystem() {
        this.rainDrops = [];
        this.maxRainDrops = 150;
        
        // Pre-create rain drop pool
        for (let i = 0; i < this.maxRainDrops; i++) {
            const drop = this.add.graphics();
            drop.lineStyle(1, 0x4169e1, 0.6);
            drop.lineBetween(0, 0, 0, 8);
            drop.setVisible(false);
            this.rainDrops.push({
                sprite: drop,
                active: false,
                x: 0,
                y: 0,
                speed: 0
            });
        }
    }

    /**
     * Cycles through different weather states
     */
    cycleWeather() {
        const states = Object.keys(this.weatherStates);
        const currentIndex = states.indexOf(this.currentWeather);
        const nextIndex = (currentIndex + 1) % states.length;
        
        this.currentWeather = states[nextIndex];
        this.updateSkyColors();
        
        console.log(`Weather changed to: ${this.currentWeather}`);
    }

    /**
     * Creates a detailed pixel art cloud with weather-appropriate styling.
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} scale - Cloud scale (default 1.0)
     * @param {number} alpha - Cloud transparency (default 0.8)
     */
    createCloud(x, y, scale = 1.0, alpha = 0.8) {
        const weather = this.weatherStates[this.currentWeather];
        const cloud = this.add.graphics();
        
        cloud.fillStyle(weather.cloudColor, alpha);

        // Main cloud body with more detail
        const baseSize = 20 * scale;
        cloud.fillCircle(0, 0, baseSize);
        cloud.fillCircle(15 * scale, -10 * scale, 15 * scale);
        cloud.fillCircle(25 * scale, 0, 18 * scale);
        cloud.fillCircle(-15 * scale, -5 * scale, 15 * scale);
        cloud.fillCircle(-25 * scale, 5 * scale, 12 * scale);
        cloud.fillCircle(35 * scale, -5 * scale, 14 * scale);

        // Add some fluffy details
        cloud.fillCircle(10 * scale, -15 * scale, 8 * scale);
        cloud.fillCircle(-10 * scale, -12 * scale, 10 * scale);
        cloud.fillCircle(20 * scale, 8 * scale, 9 * scale);

        cloud.setPosition(x, y);
        return cloud;
    }

    /**
     * Creates all platforms including ground and floating platforms.
     */
    createPlatforms() {
        this.platforms = this.physics.add.staticGroup();

        // Create ground platforms - adjusted for 800px height
        for (let i = 0; i < 30; i++) {
            // Skip some sections to create gaps (rivers)
            if (i === 8 || i === 9 || i === 18 || i === 19) continue;

            const platform = this.add.image(i * 100, 750, 'platform'); // Moved down from 550 to 750
            this.platforms.add(platform);
        }

        // Add floating platforms - adjusted positions
        const platform1 = this.add.image(600, 600, 'platform'); // Moved down from 400 to 600
        this.platforms.add(platform1);

        const platform2 = this.add.image(50, 450, 'platform'); // Moved down from 250 to 450
        this.platforms.add(platform2);

        const platform3 = this.add.image(750, 420, 'platform'); // Moved down from 220 to 420
        this.platforms.add(platform3);

        // Add invisible left boundary
        this.leftBoundary = this.physics.add.sprite(0, 300, null);
        this.leftBoundary.setVisible(false);
        this.leftBoundary.body.setImmovable(true);
        this.leftBoundary.body.setSize(10, 600);

        // Add invisible right boundary
        this.rightBoundary = this.physics.add.sprite(2400, 300, null);
        this.rightBoundary.setVisible(false);
        this.rightBoundary.body.setImmovable(true);
        this.rightBoundary.body.setSize(10, 600);

        // Add boundaries to platforms group
        this.platforms.add(this.leftBoundary);
        this.platforms.add(this.rightBoundary);
    }

    /**
     * Creates grass patches at strategic positions for hiding mechanics.
     */
    createGrassPatches() {
        this.grassPatches = this.add.group();

        // Ground level bushes - properly aligned with ground
        const grassPositions = [
            // Ground level bushes - adjusted for new height (y: 734 = ground at 750 - 16)
            { x: 150, y: 734, scale: 1.2 },
            { x: 200, y: 734, scale: 1.0 },
            { x: 350, y: 734, scale: 1.3 },
            { x: 450, y: 734, scale: 1.1 },
            { x: 700, y: 734, scale: 1.4 },
            { x: 1000, y: 734, scale: 1.2 },
            { x: 1050, y: 734, scale: 1.0 },
            { x: 1200, y: 734, scale: 1.3 },
            { x: 1400, y: 734, scale: 1.1 },
            { x: 1700, y: 734, scale: 1.2 },
            { x: 2000, y: 734, scale: 1.3 },
            // Bushes on platforms - adjusted positions
            { x: 580, y: 584, scale: 0.8 }, // Platform at y: 600
            { x: 620, y: 584, scale: 0.7 },
            { x: 30, y: 434, scale: 0.8 },  // Platform at y: 450
            { x: 70, y: 434, scale: 0.7 },
            { x: 730, y: 404, scale: 0.8 }, // Platform at y: 420
            { x: 770, y: 404, scale: 0.7 }
        ];

        grassPositions.forEach(pos => {
            const grass = this.add.image(pos.x, pos.y, 'grass');
            grass.setOrigin(0.5, 1.0); // Bottom center origin for proper alignment
            grass.setScale(pos.scale);
            grass.setDepth(10); // Above platforms, below characters
            this.grassPatches.add(grass);
        });
    }

    /**
     * Creates the killzone at the bottom of the level with visual effects.
     */
    createKillZone() {
        // Create lava/spikes visual - adjusted for new height
        const killZoneVisual = this.add.graphics();

        // Red base for lava
        killZoneVisual.fillStyle(0xff0000, 0.8);
        killZoneVisual.fillRect(0, 790, 2400, 60); // Moved down from 590 to 790

        // Add spike details
        killZoneVisual.fillStyle(0xff6600, 0.9);

        // Create triangular spikes
        for (let x = 0; x < 2400; x += 20) {
            killZoneVisual.beginPath();
            killZoneVisual.moveTo(x, 790); // Moved down from 590 to 790
            killZoneVisual.lineTo(x + 10, 780); // Moved down from 580 to 780
            killZoneVisual.lineTo(x + 20, 790); // Moved down from 590 to 790
            killZoneVisual.closePath();
            killZoneVisual.fill();
        }

        // Add pulsing animation
        this.tweens.add({
            targets: killZoneVisual,
            alpha: 0.6,
            duration: 1500,
            yoyo: true,
            repeat: -1
        });

        // Create collision area
        this.killZone = this.physics.add.sprite(1200, 820, null); // Moved down from 620 to 820
        this.killZone.setVisible(false);
        this.killZone.body.setImmovable(true);
        this.killZone.body.setSize(2400, 60);

        // Add collision detection
        this.physics.add.overlap(this.player, this.killZone, this.playerDeath, null, this);
        this.physics.add.overlap(this.enemies, this.killZone, this.enemyDeath, null, this);
    }

    /**
     * Creates the player character with physics and animations.
     */
    createPlayer() {
        this.player = this.physics.add.sprite(100, 650, 'player'); // Moved down from 450 to 650
        this.player.body.setCollideWorldBounds(false);
        this.player.moveSpeed = 160;
        this.player.jumpSpeed = -330;

        // Add idle breathing animation
        this.createIdleAnimation();
    }

    /**
     * Creates a subtle breathing animation for the player's idle state.
     */
    createIdleAnimation() {
        this.player.idleTween = this.tweens.add({
            targets: this.player,
            scaleY: 1.03,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            paused: true
        });

        this.player.idleTween.play();
    }

    /**
     * Creates enemies at strategic positions with AI behavior.
     */
    createEnemies() {
        this.enemies = this.physics.add.group();

        // Enemy positions with patrol configurations - adjusted for 800px height
        const enemyPositions = [
            // Ground level enemies - moved down from y: 520 to y: 720
            { x: 300, y: 720, type: 'slime', patrolDistance: 350, moveSpeed: 80, jumpProbability: 0, platformBound: true },
            { x: 900, y: 720, type: 'slime', patrolDistance: 400, moveSpeed: 90, jumpProbability: 0, platformBound: true },
            { x: 1500, y: 720, type: 'slime', patrolDistance: 380, moveSpeed: 85, jumpProbability: 0, platformBound: true },
            // Platform enemies - adjusted positions
            { x: 600, y: 570, type: 'goblin', patrolDistance: 200, moveSpeed: 100, jumpProbability: 0.005, platformBound: true }, // Platform at y: 600
            { x: 750, y: 390, type: 'goblin', patrolDistance: 180, moveSpeed: 110, jumpProbability: 0.01, platformBound: true }, // Platform at y: 420
            { x: 1200, y: 720, type: 'goblin', patrolDistance: 420, moveSpeed: 105, jumpProbability: 0.008, platformBound: true },
            { x: 1800, y: 720, type: 'goblin', patrolDistance: 380, moveSpeed: 115, jumpProbability: 0.01, platformBound: true }
        ];

        enemyPositions.forEach(pos => {
            // Create enemy using the new Enemy class with mood system
            const enemy = new Enemy(this, pos.x, pos.y, pos.type);

            // Set level boundaries for the enemy AI
            enemy.setLevelBounds({ left: 0, right: 2400, top: 0, bottom: 800 });

            // Add to enemies group
            this.enemies.add(enemy);
        });
    }

    /**
     * Main update loop - handles player movement, enemy AI, weather, and grass interactions.
     */
    update() {
        // Skip updates if in battle or player died
        if (this.enemyEncountered || this.playerDied) return;

        // Update weather system
        this.updateWeatherSystem();

        // Update player movement
        this.updatePlayerMovement();

        // Update enemies
        this.updateEnemies();

        // Check if player has fallen below screen (adjusted for new height)
        if (this.player.y > 800) {
            this.playerDeath(this.player, null);
        }

        // Update grass interactions
        this.updateGrassInteractions();
    }

    /**
     * Handles player movement including walking, jumping, and animations.
     */
    updatePlayerMovement() {
        // Handle horizontal movement (Arrow keys OR WASD)
        if (this.cursors.left.isDown || this.wasd.left.isDown) {
            this.player.setVelocityX(-this.player.moveSpeed);
            this.player.setFlipX(true);
            this.animatePlayerMovement();

            // Create dust particles while moving on ground
            if (this.player.body.touching.down) {
                this.createDustParticles(this.player.x, this.player.y + 24);
            }
        } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
            this.player.setVelocityX(this.player.moveSpeed);
            this.player.setFlipX(false);
            this.animatePlayerMovement();

            // Create dust particles while moving on ground
            if (this.player.body.touching.down) {
                this.createDustParticles(this.player.x, this.player.y + 24);
            }
        } else {
            this.player.setVelocityX(0);
            this.stopPlayerAnimation();
        }

        // Handle jumping (Arrow keys OR WASD)
        if ((this.cursors.up.isDown || this.wasd.up.isDown) && this.player.body.touching.down && !this.player.isJumping) {
            this.player.isJumping = true;
            this.player.setVelocityY(this.player.jumpSpeed);

            // Pause idle animation during jump
            if (this.player.idleTween && this.player.idleTween.isPlaying()) {
                this.player.idleTween.pause();
            }

            // Add jump effect
            this.tweens.add({
                targets: this.player,
                scaleX: 0.8,
                scaleY: 1.2,
                duration: 100,
                yoyo: true,
                onComplete: () => {
                    this.player.setScale(1);
                    this.time.delayedCall(100, () => {
                        this.player.isJumping = false;

                        if (!this.player.isMoving && !this.player.isLanding && this.player.body.touching.down) {
                            if (this.player.idleTween && !this.player.idleTween.isPlaying()) {
                                this.player.idleTween.resume();
                            }
                        }
                    });
                }
            });
        }

        // Check if player landed from a jump
        if (this.player.body.touching.down && this.player.body.prev.y < this.player.y && !this.player.isLanding) {
            this.player.isLanding = true;

            if (this.player.idleTween && this.player.idleTween.isPlaying()) {
                this.player.idleTween.pause();
            }

            // Landing effect
            this.tweens.add({
                targets: this.player,
                scaleX: 1.2,
                scaleY: 0.8,
                duration: 100,
                yoyo: true,
                onComplete: () => {
                    this.player.setScale(1);
                    this.time.delayedCall(100, () => {
                        this.player.isLanding = false;

                        if (!this.player.isMoving && !this.player.isJumping) {
                            if (this.player.idleTween && !this.player.idleTween.isPlaying()) {
                                this.player.idleTween.resume();
                            }
                        }
                    });
                }
            });
        }
    }

    /**
     * Adds bobbing animation when player is moving.
     */
    animatePlayerMovement() {
        if (this.player.body.touching.down && !this.player.isMoving) {
            this.player.isMoving = true;

            if (this.player.idleTween && this.player.idleTween.isPlaying()) {
                this.player.idleTween.pause();
            }

            this.player.setScale(1);

            this.player.moveTween = this.tweens.add({
                targets: this.player,
                y: this.player.y - 5,
                duration: 150,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    /**
     * Stops player movement animation and resumes idle.
     */
    stopPlayerAnimation() {
        if (this.player.isMoving) {
            this.player.isMoving = false;

            if (this.player.moveTween) {
                this.player.moveTween.stop();
                this.player.moveTween = null;
            }

            if (!this.player.isLanding && !this.player.isJumping) {
                this.player.setScale(1);

                if (this.player.idleTween && !this.player.idleTween.isPlaying()) {
                    this.player.idleTween.resume();
                }
            }
        }
    }

    /**
     * Creates dust particles at character's feet during movement
     * @param {number} x - X position
     * @param {number} y - Y position (at feet level)
     */
    createDustParticles(x, y) {
        // Throttle particle creation to avoid too many particles
        const now = this.time.now;
        if (!this.lastDustTime) this.lastDustTime = 0;
        if (now - this.lastDustTime < 100) return; // Only create dust every 100ms
        this.lastDustTime = now;

        // Create 2-3 dust particles for subtle effect
        for (let i = 0; i < 2; i++) {
            const offsetX = (Math.random() - 0.5) * 15;
            const size = 2 + Math.random() * 2;
            const particle = this.add.circle(x + offsetX, y, size, 0xdddddd, 0.6);

            this.tweens.add({
                targets: particle,
                y: y - 8 - Math.random() * 8,
                x: x + offsetX + (Math.random() - 0.5) * 10,
                alpha: 0,
                scale: 1.5,
                duration: 300 + Math.random() * 200,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
    }

    /**
     * Updates all enemies with patrol AI behavior.
     * Handles boundary checking, jumping, platform bounds, and edge detection.
     */
    updateEnemies() {
        this.enemies.getChildren().forEach(enemy => {
            // Skip if enemy is being destroyed
            if (enemy.isBeingDestroyed) return;

            // Check if enemy has fallen below screen
            if (enemy.y > 600) {
                this.enemyDeath(enemy, null);
                return;
            }

            // Update enemy AI using the new Enemy class method with mood system
            if (enemy.update && typeof enemy.update === 'function') {
                enemy.update(this.game.loop.delta);
            }
        });
    }

    /**
     * Updates grass interactions for player and enemies.
     * Player becomes nearly invisible in grass, enemies are partially hidden.
     */
    updateGrassInteractions() {
        // Check player against grass patches
        this.checkEntityGrassOverlap(this.player);

        // Check enemies against grass patches
        this.enemies.getChildren().forEach(enemy => {
            if (!enemy.isBeingDestroyed) {
                this.checkEntityGrassOverlap(enemy);
            }
        });
    }

    /**
     * Checks if an entity overlaps with grass and applies visual effects.
     * @param {Phaser.GameObjects.Sprite} entity - The entity to check
     */
    checkEntityGrassOverlap(entity) {
        // Set default properties if not already set
        if (entity.defaultDepth === undefined) {
            entity.defaultDepth = entity.depth || 0;
            entity.inGrass = false;
            entity.defaultAlpha = entity.alpha || 1;
        }

        // Check if entity is overlapping with any grass patch
        let isInGrass = false;
        let largestGrass = null;

        this.grassPatches.getChildren().forEach(grass => {
            const overlapWidth = 30 * grass.scaleX;
            const overlapHeight = 30 * grass.scaleY;

            // Simple rectangular overlap check
            if (Math.abs(entity.x - grass.x) < overlapWidth &&
                Math.abs(entity.y - (grass.y - grass.height * grass.scaleY / 2)) < overlapHeight) {
                isInGrass = true;

                if (!largestGrass || grass.scaleX > largestGrass.scaleX) {
                    largestGrass = grass;
                }
            }
        });

        // Different behavior for player vs enemies
        if (entity === this.player) {
            // Player becomes invisible in grass
            if (isInGrass && !entity.inGrass) {
                entity.inGrass = true;

                // Create rustling animation
                this.tweens.add({
                    targets: largestGrass,
                    scaleX: largestGrass.scaleX * 1.1,
                    scaleY: largestGrass.scaleY * 0.95,
                    duration: 200,
                    yoyo: true
                });

                // Fade player to nearly invisible
                this.tweens.add({
                    targets: entity,
                    alpha: 0.2,
                    duration: 300
                });
            } else if (!isInGrass && entity.inGrass) {
                entity.inGrass = false;

                // Fade player back to visible
                this.tweens.add({
                    targets: entity,
                    alpha: entity.defaultAlpha,
                    duration: 300
                });
            }
        } else {
            // Enemies are covered by grass but still partially visible
            if (isInGrass && !entity.inGrass) {
                entity.inGrass = true;
                entity.setDepth(5); // Below grass

                // Create rustling animation
                this.tweens.add({
                    targets: largestGrass,
                    scaleX: largestGrass.scaleX * 1.05,
                    scaleY: largestGrass.scaleY * 0.97,
                    duration: 150,
                    yoyo: true
                });

                // Partially hide enemy
                this.tweens.add({
                    targets: entity,
                    alpha: 0.6,
                    duration: 200
                });
            } else if (!isInGrass && entity.inGrass) {
                entity.inGrass = false;
                entity.setDepth(entity.defaultDepth);

                // Make enemy fully visible again
                this.tweens.add({
                    targets: entity,
                    alpha: entity.defaultAlpha,
                    duration: 200
                });
            }
        }
    }

    /**
     * Handles player-enemy collision to trigger battle.
     * @param {Phaser.GameObjects.Sprite} player - The player sprite
     * @param {Phaser.GameObjects.Sprite} enemy - The enemy sprite
     */
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
            player: player,
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

                // Update game state
                if (window.gameStateManager) {
                    gameStateManager.incrementEnemiesDefeated();
                    gameStateManager.addScore(100);
                } else {
                    gameData.enemiesDefeated++;
                    gameData.score += 100;
                }

                // Check level complete
                this.checkLevelComplete();
            } else if (result === 'defeat') {
                // Handle player defeat
                this.handlePlayerDeath();
            }
        });
    }

    /**
     * Checks if all enemies are defeated and triggers level completion.
     */
    checkLevelComplete() {
        const remainingEnemies = this.enemies.getChildren().filter(e => !e.isBeingDestroyed).length;

        if (remainingEnemies === 0) {
            // All enemies defeated - level complete
            const levelCompleteText = this.add.text(400, 300, 'Level Complete!', {
                fontSize: '48px',
                fill: '#00ff00',
                stroke: '#000',
                strokeThickness: 4
            }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

            // Fade out and restart level
            this.time.delayedCall(2000, () => {
                this.tweens.add({
                    targets: levelCompleteText,
                    alpha: 0,
                    duration: 500,
                    onComplete: () => {
                        this.restartLevel();
                    }
                });
            });
        }
    }

    /**
     * Handles player death from battle defeat.
     */
    handlePlayerDeath() {
        if (this.playerDied) return;
        this.playerDied = true;

        // Trigger death sequence
        this.playerDeath(this.player, null);
    }

    /**
     * Handles player death with visual effects and game over screen.
     * @param {Phaser.GameObjects.Sprite} player - The player sprite
     * @param {Phaser.GameObjects.Sprite} killZone - The killzone (can be null)
     */
    playerDeath(player, killZone) {
        // Prevent multiple deaths
        if (this.playerDied) return;
        this.playerDied = true;

        // Stop player movement
        player.body.setVelocity(0);

        // Camera shake effect
        this.cameras.main.shake(500, 0.05);

        // Flash the player red
        this.tweens.add({
            targets: player,
            alpha: 0.3,
            duration: 100,
            yoyo: true,
            repeat: 3
        });

        // Create death particles
        const particles = this.add.particles('player');
        const emitter = particles.createEmitter({
            x: player.x,
            y: player.y,
            speed: { min: 50, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.4, end: 0 },
            lifespan: 800,
            quantity: 30,
            blendMode: 'ADD'
        });

        // Hide the player
        this.tweens.add({
            targets: player,
            alpha: 0,
            duration: 300,
            delay: 400,
            onComplete: () => {
                emitter.stop();

                // Create dark overlay
                const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0)
                    .setScrollFactor(0)
                    .setDepth(100);

                // Fade in overlay
                this.tweens.add({
                    targets: overlay,
                    alpha: 0.8,
                    duration: 1000,
                    onComplete: () => {
                        // Create game over text
                        const gameOverText = this.add.text(400, 250, 'GAME OVER', {
                            fontSize: '64px',
                            fontFamily: 'monospace',
                            fill: '#ff0000',
                            stroke: '#000',
                            strokeThickness: 6
                        }).setOrigin(0.5).setScrollFactor(0).setDepth(101).setAlpha(0);

                        // Add restart instructions
                        const restartText = this.add.text(400, 350, 'Press R to restart', {
                            fontSize: '24px',
                            fontFamily: 'monospace',
                            fill: '#ffffff',
                            stroke: '#000',
                            strokeThickness: 3
                        }).setOrigin(0.5).setScrollFactor(0).setDepth(101).setAlpha(0);

                        // Animate text
                        this.tweens.add({
                            targets: [gameOverText, restartText],
                            alpha: 1,
                            y: '+=20',
                            duration: 800,
                            ease: 'Power2'
                        });

                        // Add restart key
                        this.input.keyboard.once('keydown-R', () => {
                            this.tweens.add({
                                targets: [overlay, gameOverText, restartText],
                                alpha: 0,
                                duration: 500,
                                onComplete: () => {
                                    this.restartLevel();
                                }
                            });
                        });
                    }
                });
            }
        });
    }

    /**
     * Handles enemy death with visual effects.
     * @param {Phaser.GameObjects.Sprite} enemy - The enemy sprite
     * @param {Phaser.GameObjects.Sprite} killZone - The killzone (can be null)
     */
    enemyDeath(enemy, killZone) {
        // Prevent processing if enemy is already being destroyed
        if (enemy.isBeingDestroyed) return;
        enemy.isBeingDestroyed = true;

        // Small camera shake
        this.cameras.main.shake(200, 0.01);

        // Flash the enemy
        this.tweens.add({
            targets: enemy,
            alpha: 0.3,
            duration: 50,
            yoyo: true,
            repeat: 2
        });

        // Create death particles
        const particleColor = enemy.type === 'slime' ? 0xe74c3c : 0x8e44ad;

        const particles = this.add.particles(enemy.type);
        const emitter = particles.createEmitter({
            x: enemy.x,
            y: enemy.y,
            speed: { min: 30, max: 150 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.3, end: 0 },
            lifespan: 600,
            quantity: 20,
            tint: particleColor,
            blendMode: 'ADD'
        });

        // Hide the enemy
        this.tweens.add({
            targets: enemy,
            alpha: 0,
            y: enemy.y + 30,
            duration: 300,
            onComplete: () => {
                this.time.delayedCall(300, () => {
                    emitter.stop();
                    this.time.delayedCall(600, () => {
                        particles.destroy();
                        enemy.destroy();
                    });
                });
            }
        });
    }

    /**
     * Restarts the level by restarting the scene and resetting game state.
     */
    restartLevel() {
        // Reset game state
        if (window.gameStateManager) {
            gameStateManager.resetState();
        } else {
            gameData.playerHealth = 100;
            gameData.playerAttack = 20;
            gameData.playerDefense = 10;
            gameData.level = 1;
            gameData.score = 0;
            gameData.enemiesDefeated = 0;
        }

        // Restart scene
        this.scene.restart();
    }
}
    /**
     * Updates the weather system including moving clouds and rain effects
     */
    updateWeatherSystem() {
        // Update moving clouds
        this.updateMovingClouds();
        
        // Update rain effects
        this.updateRainEffects();
    }

    /**
     * Updates all cloud layers with different movement speeds
     */
    updateMovingClouds() {
        if (!this.cloudLayers) return;

        Object.keys(this.cloudLayers).forEach(layerName => {
            const layer = this.cloudLayers[layerName];
            
            layer.forEach(cloudData => {
                // Move cloud to the right
                cloudData.sprite.x += cloudData.speed * (1/60); // Assuming 60fps
                
                // Reset cloud position when it goes off screen
                if (cloudData.sprite.x > 2500) { // Beyond world width
                    cloudData.sprite.x = cloudData.resetX;
                    cloudData.sprite.y = 30 + Math.random() * 150; // Random new height
                }
            });
        });
    }

    /**
     * Updates rain particle effects based on current weather
     */
    updateRainEffects() {
        if (!this.rainDrops || !this.weatherStates) return;
        
        const weather = this.weatherStates[this.currentWeather];
        const rainIntensity = weather.rainIntensity;
        
        if (rainIntensity > 0) {
            // Spawn new rain drops
            const spawnChance = rainIntensity * 0.3; // 30% max spawn rate
            
            for (let i = 0; i < this.maxRainDrops; i++) {
                const drop = this.rainDrops[i];
                
                if (!drop.active && Math.random() < spawnChance) {
                    // Activate rain drop
                    drop.active = true;
                    drop.x = Math.random() * 2600; // Slightly wider than screen
                    drop.y = -10;
                    drop.speed = 300 + Math.random() * 200; // 300-500 pixels per second
                    
                    drop.sprite.setPosition(drop.x, drop.y);
                    drop.sprite.setVisible(true);
                }
                
                if (drop.active) {
                    // Update rain drop position
                    drop.y += drop.speed * (1/60); // Assuming 60fps
                    drop.x += 20 * (1/60); // Slight horizontal drift
                    
                    drop.sprite.setPosition(drop.x, drop.y);
                    
                    // Deactivate when off screen
                    if (drop.y > 820) { // Below screen
                        drop.active = false;
                        drop.sprite.setVisible(false);
                        
                        // Create splash effect on ground
                        if (drop.y < 800 && Math.random() < 0.3) {
                            this.createRainSplash(drop.x, 750); // Ground level
                        }
                    }
                }
            }
        } else {
            // Hide all rain drops when not raining
            this.rainDrops.forEach(drop => {
                if (drop.active) {
                    drop.active = false;
                    drop.sprite.setVisible(false);
                }
            });
        }
    }

    /**
     * Creates a small splash effect when rain hits the ground
     * @param {number} x - X position of splash
     * @param {number} y - Y position of splash
     */
    createRainSplash(x, y) {
        const splash = this.add.graphics();
        splash.lineStyle(1, 0x4169e1, 0.8);
        
        // Draw small splash lines
        for (let i = 0; i < 3; i++) {
            const angle = (Math.PI / 4) + (Math.random() * Math.PI / 2);
            const length = 3 + Math.random() * 5;
            const endX = Math.cos(angle) * length;
            const endY = -Math.sin(angle) * length;
            
            splash.lineBetween(x, y, x + endX, y + endY);
        }
        
        // Fade out splash
        this.tweens.add({
            targets: splash,
            alpha: 0,
            duration: 200,
            onComplete: () => splash.destroy()
        });
    }
}

// Make GameScene globally available
window.GameScene = GameScene;