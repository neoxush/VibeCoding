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

        // Set up camera to follow player
        this.cameras.main.setBounds(0, 0, 2400, 600);
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
     * Creates the background with sky gradient, clouds, and mountains.
     */
    createBackground() {
        // Sky gradient
        const sky = this.add.graphics();
        sky.fillGradientStyle(0x87ceeb, 0x87ceeb, 0xadd8e6, 0xadd8e6, 1);
        sky.fillRect(0, 0, 2400, 600);

        // Add clouds
        for (let i = 0; i < 20; i++) {
            const x = Math.floor(Math.random() * 2400);
            const y = 50 + Math.floor(Math.random() * 150);
            this.createCloud(x, y);
        }

        // Add distant mountains
        const mountains = this.add.graphics();
        mountains.fillStyle(0x6a8caf);
        mountains.beginPath();
        mountains.moveTo(0, 500);

        for (let x = 0; x < 2400; x += 200) {
            const height = 100 + Math.floor(Math.random() * 100);
            mountains.lineTo(x, 500 - height);
            mountains.lineTo(x + 100, 500 - height / 2);
        }

        mountains.lineTo(2400, 500);
        mountains.lineTo(2400, 600);
        mountains.lineTo(0, 600);
        mountains.closePath();
        mountains.fill();
    }

    /**
     * Creates a simple pixel art cloud.
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    createCloud(x, y) {
        const cloud = this.add.graphics();
        cloud.fillStyle(0xffffff, 0.8);

        // Main cloud body
        cloud.fillCircle(x, y, 20);
        cloud.fillCircle(x + 15, y - 10, 15);
        cloud.fillCircle(x + 25, y, 18);
        cloud.fillCircle(x - 15, y - 5, 15);

        return cloud;
    }

    /**
     * Creates all platforms including ground and floating platforms.
     */
    createPlatforms() {
        this.platforms = this.physics.add.staticGroup();

        // Create ground platforms
        for (let i = 0; i < 30; i++) {
            // Skip some sections to create gaps
            if (i === 8 || i === 9 || i === 18 || i === 19) continue;

            const platform = this.add.image(i * 100, 550, 'platform');
            this.platforms.add(platform);
        }

        // Add floating platforms
        const platform1 = this.add.image(600, 400, 'platform');
        this.platforms.add(platform1);

        const platform2 = this.add.image(50, 250, 'platform');
        this.platforms.add(platform2);

        const platform3 = this.add.image(750, 220, 'platform');
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
        // Create lava/spikes visual
        const killZoneVisual = this.add.graphics();

        // Red base for lava
        killZoneVisual.fillStyle(0xff0000, 0.8);
        killZoneVisual.fillRect(0, 590, 2400, 60);

        // Add spike details
        killZoneVisual.fillStyle(0xff6600, 0.9);

        // Create triangular spikes
        for (let x = 0; x < 2400; x += 20) {
            killZoneVisual.beginPath();
            killZoneVisual.moveTo(x, 590);
            killZoneVisual.lineTo(x + 10, 580);
            killZoneVisual.lineTo(x + 20, 590);
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
        this.killZone = this.physics.add.sprite(1200, 620, null);
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
        this.player = this.physics.add.sprite(100, 450, 'player');
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

        // Enemy positions with patrol configurations
        const enemyPositions = [
            // Ground level enemies
            { x: 300, y: 520, type: 'slime', patrolDistance: 350, moveSpeed: 80, jumpProbability: 0, platformBound: true },
            { x: 900, y: 520, type: 'slime', patrolDistance: 400, moveSpeed: 90, jumpProbability: 0, platformBound: true },
            { x: 1500, y: 520, type: 'slime', patrolDistance: 380, moveSpeed: 85, jumpProbability: 0, platformBound: true },
            // Platform enemies
            { x: 600, y: 370, type: 'goblin', patrolDistance: 200, moveSpeed: 100, jumpProbability: 0.005, platformBound: true },
            { x: 750, y: 190, type: 'goblin', patrolDistance: 180, moveSpeed: 110, jumpProbability: 0.01, platformBound: true },
            { x: 1200, y: 520, type: 'goblin', patrolDistance: 420, moveSpeed: 105, jumpProbability: 0.008, platformBound: true },
            { x: 1800, y: 520, type: 'goblin', patrolDistance: 380, moveSpeed: 115, jumpProbability: 0.01, platformBound: true }
        ];

        enemyPositions.forEach(pos => {
            const enemy = this.physics.add.sprite(pos.x, pos.y, pos.type);
            enemy.body.setCollideWorldBounds(false);
            enemy.type = pos.type;
            enemy.health = pos.type === 'slime' ? 30 : 50;
            enemy.attack = pos.type === 'slime' ? 10 : 15;
            enemy.patrolDistance = pos.patrolDistance;
            enemy.startX = pos.x;
            enemy.leftBound = pos.x - pos.patrolDistance / 2;
            enemy.rightBound = pos.x + pos.patrolDistance / 2;
            enemy.direction = Math.random() < 0.5 ? -1 : 1;
            enemy.moveSpeed = pos.moveSpeed;
            enemy.jumpProbability = pos.jumpProbability;
            enemy.jumpSpeed = -300;
            enemy.jumpCooldown = 0;
            enemy.canJump = true;
            enemy.platformBound = pos.platformBound;
            enemy.fallTimer = 0;
            enemy.maxFallTime = 60;
            enemy.directionChangeTimer = 0;
            enemy.edgeCheckCounter = 0;
            enemy.moveTimer = Math.floor(Math.random() * 180);
            enemy.pauseTimer = 0;
            enemy.state = 'moving';

            // Initialize movement
            enemy.setVelocityX(enemy.moveSpeed * enemy.direction);

            // Add idle animations
            if (enemy.type === 'slime') {
                enemy.idleTween = this.tweens.add({
                    targets: enemy,
                    scaleX: 1.1,
                    scaleY: 0.9,
                    duration: 1000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            } else {
                enemy.idleTween = this.tweens.add({
                    targets: enemy,
                    scaleY: 1.03,
                    duration: 1200,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }

            this.enemies.add(enemy);
        });
    }

    /**
     * Main update loop - handles player movement, enemy AI, and grass interactions.
     */
    update() {
        // Skip updates if in battle or player died
        if (this.enemyEncountered || this.playerDied) return;

        // Update player movement
        this.updatePlayerMovement();

        // Update enemies
        this.updateEnemies();

        // Check if player has fallen below screen
        if (this.player.y > 600) {
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

            // Handle direction change timer (brief pause when changing direction)
            if (enemy.directionChangeTimer > 0) {
                enemy.directionChangeTimer--;
                enemy.setVelocityX(0);
                return;
            }

            // Handle paused state
            if (enemy.state === 'paused') {
                enemy.pauseTimer--;
                if (enemy.pauseTimer <= 0) {
                    enemy.state = 'moving';
                    if (Math.random() < 0.5) {
                        enemy.direction *= -1;
                    }
                    enemy.moveTimer = 180 + Math.floor(Math.random() * 120);
                }
                return;
            }

            // Handle moving state
            if (enemy.state === 'moving') {
                enemy.moveTimer--;

                // Randomly pause after moving for a while
                if (enemy.moveTimer <= 0 && Math.random() < 0.2) {
                    enemy.state = 'paused';
                    enemy.pauseTimer = 60 + Math.floor(Math.random() * 60);
                    enemy.setVelocityX(0);
                    return;
                }

                // Check if reached patrol boundary
                if (enemy.x <= enemy.leftBound && enemy.direction < 0) {
                    enemy.direction = 1;
                    enemy.directionChangeTimer = 5;
                    return;
                } else if (enemy.x >= enemy.rightBound && enemy.direction > 0) {
                    enemy.direction = -1;
                    enemy.directionChangeTimer = 5;
                    return;
                }

                // Basic movement
                if (enemy.body.touching.down) {
                    enemy.setVelocityX(enemy.moveSpeed * enemy.direction);
                    enemy.fallTimer = 0;
                    
                    // Create dust particles while moving on ground
                    if (Math.abs(enemy.body.velocity.x) > 10) {
                        this.createDustParticles(enemy.x, enemy.y + 16);
                    }
                } else {
                    enemy.setVelocityX(enemy.moveSpeed * enemy.direction * 0.8);

                    // Track falling time
                    enemy.fallTimer++;
                    if (enemy.fallTimer > enemy.maxFallTime && enemy.platformBound) {
                        // Reset position if fallen for too long
                        enemy.x = enemy.startX;
                        enemy.y = enemy.y - 50;
                        enemy.body.velocity.x = 0;
                        enemy.body.velocity.y = 0;
                        enemy.fallTimer = 0;
                        return;
                    }
                }
            }

            // Flip sprite based on direction
            enemy.setFlipX(enemy.direction < 0);

            // Platform edge detection (only for platform-bound enemies)
            if (enemy.platformBound && enemy.body.touching.down) {
                enemy.edgeCheckCounter = (enemy.edgeCheckCounter || 0) + 1;
                if (enemy.edgeCheckCounter >= 5) {
                    enemy.edgeCheckCounter = 0;

                    // Look ahead for platform edge
                    const lookAheadDistance = enemy.direction * 40;
                    const nextX = enemy.x + lookAheadDistance;
                    const groundBelow = this.physics.overlapRect(nextX, enemy.y + 32, 5, 10);

                    // Check if there's ground ahead
                    let platformAhead = false;
                    for (let i = 0; i < groundBelow.length; i++) {
                        if (groundBelow[i].gameObject && groundBelow[i].gameObject.body &&
                            groundBelow[i].gameObject.body.immovable) {
                            platformAhead = true;
                            break;
                        }
                    }

                    // Turn around if about to walk off edge
                    if (!platformAhead) {
                        enemy.direction *= -1;
                        enemy.directionChangeTimer = 5;
                    }
                }
            }

            // Wall collision detection
            if (enemy.body.touching.left || enemy.body.touching.right) {
                enemy.direction *= -1;
                enemy.directionChangeTimer = 5;
            }

            // Animation handling
            if (Math.abs(enemy.body.velocity.x) > 10 && enemy.body.touching.down) {
                if (!enemy.isMoving) {
                    enemy.isMoving = true;
                    if (enemy.idleTween) enemy.idleTween.pause();

                    enemy.moveTween = this.tweens.add({
                        targets: enemy,
                        y: enemy.y - 5,
                        duration: 150,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });
                }
            } else if (enemy.isMoving) {
                enemy.isMoving = false;
                if (enemy.moveTween) {
                    enemy.moveTween.stop();
                    enemy.moveTween = null;

                    if (enemy.idleTween && enemy.body.touching.down) {
                        enemy.idleTween.resume();
                    }
                }
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
