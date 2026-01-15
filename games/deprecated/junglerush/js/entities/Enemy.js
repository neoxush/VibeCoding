/**
 * Enhanced Enemy entity with sophisticated AI behavior including:
 * - Intelligent wandering with distance-based movement
 * - Idle and casual patrol states
 * - Level boundary awareness
 * - Platform navigation and jumping (for slimes)
 * - Smooth movement transitions
 * - Individual personality traits
 */
class Enemy extends Phaser.Physics.Arcade.Sprite {
    /**
     * Creates an Enemy instance with enhanced AI capabilities
     * @param {Phaser.Scene} scene - The scene this enemy belongs to
     * @param {number} x - Initial x position
     * @param {number} y - Initial y position
     * @param {string} type - Enemy type ('slime' or 'goblin')
     */
    constructor(scene, x, y, type) {
        // Use pre-generated textures from AssetManager instead of creating inline
        const textureName = type === 'slime' ? 'slime' : 'goblin';
        super(scene, x, y, textureName);

        // Add enemy to the scene
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Set up physics properties
        this.body.setCollideWorldBounds(false); // Allow free movement for better AI

        // Basic enemy properties
        this.type = type;
        this.setupEnemyType();

        // Home position and wandering system
        this.homePosition = { x: x, y: y };
        this.calculateWanderDistance();
        this.currentWanderTarget = x;

        // AI State system
        this.aiState = 'idle'; // 'idle', 'casual_patrol', 'pursuing', 'searching'
        this.stateTimer = 0;
        this.wanderCyclesCompleted = 0;

        // Movement properties
        this.currentSpeed = 0; // For smooth acceleration
        this.direction = Math.random() < 0.5 ? -1 : 1; // Random initial direction

        // Timing and behavior
        this.idleDuration = this.getRandomIdleDuration();
        this.pauseTimer = 0;
        this.jumpCooldown = 0;

        // Level boundaries (will be set by GameScene)
        this.levelBounds = { left: 0, right: 2400, top: 0, bottom: 800 };

        // Detection and combat (for future use)
        this.detectionRange = this.type === 'slime' ? 150 : 200;
        this.searchTimer = 0;
        this.lastKnownPlayerX = null;

        // Generate individual personality traits
        this.generatePersonalityTraits();

        // Mood system
        this.initializeMoodSystem();

        console.log(`Enhanced ${type} created at (${x}, ${y}) with wanderiness: ${this.personalityTraits.wanderiness.toFixed(2)}`);
    }

    /**
     * Sets up enemy type-specific properties including wandering behavior
     */
    setupEnemyType() {
        switch (this.type) {
            case 'slime':
                // Basic stats
                this.health = 30;
                this.attack = 10;
                this.body.setSize(24, 16);
                this.body.setOffset(4, 16);

                // Wandering behavior
                this.minWanderDistance = 100;
                this.maxWanderDistance = 300;
                this.wanderVariance = 0.2;
                this.moveSpeed = 80;
                this.casualSpeedMultiplier = 0.25;

                // Jumping capabilities
                this.canJump = true;
                this.jumpHeight = 80;
                this.jumpProbability = 0.3;
                this.jumpCooldownTime = 2000;
                this.respectsPlatformEdges = false; // Slimes can jump off platforms

                // Timing - Less frequent wandering
                this.idleTimeMin = 4000;  // Longer idle periods
                this.idleTimeMax = 8000;
                this.pauseChance = 0.1;
                this.wanderCyclesBeforeIdle = 1;
                this.wanderCooldown = 10000; // 10 seconds between wander sessions
                break;

            case 'goblin':
                // Basic stats
                this.health = 50;
                this.attack = 15;
                this.body.setSize(20, 40);
                this.body.setOffset(6, 8);

                // Wandering behavior
                this.minWanderDistance = 150;
                this.maxWanderDistance = 400;
                this.wanderVariance = 0.15;
                this.moveSpeed = 100;
                this.casualSpeedMultiplier = 0.3;

                // Jumping capabilities
                this.canJump = true;
                this.jumpHeight = 40;
                this.jumpProbability = 0.1;
                this.jumpCooldownTime = 3000;
                this.respectsPlatformEdges = true; // Goblins are more cautious

                // Timing - Less frequent wandering
                this.idleTimeMin = 5000;  // Longer idle periods
                this.idleTimeMax = 10000;
                this.pauseChance = 0.08;
                this.wanderCyclesBeforeIdle = 2;
                this.wanderCooldown = 15000; // 15 seconds between wander sessions
                break;

            default:
                // Default to slime behavior
                this.health = 30;
                this.attack = 10;
                this.minWanderDistance = 100;
                this.maxWanderDistance = 200;
                this.moveSpeed = 60;
                break;
        }

        // Common properties
        this.acceleration = 0.1; // Speed change rate for smooth movement
        this.searchDuration = 8000; // Time to search when player lost
    }

    /**
     * Generates individual personality traits for this enemy
     */
    generatePersonalityTraits() {
        this.personalityTraits = {
            wanderiness: 0.5 + Math.random(), // 0.5-1.5 multiplier for wander distance
            jumpiness: 0.5 + Math.random(),   // 0.5-1.5 multiplier for jump probability
            cautiousness: 0.5 + Math.random(), // 0.5-1.5 multiplier for edge awareness
            moodiness: 0.3 + Math.random() * 0.7 // 0.3-1.0 how often mood changes
        };
    }

    /**
     * Initializes the mood system for this enemy
     */
    initializeMoodSystem() {
        // Mood library - different moods with emoji representations
        this.moodLibrary = {
            happy: { emoji: '😊', color: 0xffff00, duration: 3000 },
            content: { emoji: '😌', color: 0x90ee90, duration: 4000 },
            curious: { emoji: '🤔', color: 0x87ceeb, duration: 2500 },
            sleepy: { emoji: '😴', color: 0xdda0dd, duration: 5000 },
            confused: { emoji: '😕', color: 0xffa500, duration: 3500 },
            grumpy: { emoji: '😠', color: 0xff6b6b, duration: 2000 },
            excited: { emoji: '😃', color: 0xff69b4, duration: 2000 },
            bored: { emoji: '😑', color: 0x808080, duration: 6000 }
        };

        // Current mood state
        this.currentMood = 'content'; // Default mood
        this.moodTimer = 0;
        this.moodBubble = null;
        this.moodChangeTimer = 0;
        this.lastWanderTime = 0;

        // Set initial mood
        this.changeMood(this.getRandomMood());
    }

    /**
     * Gets a random mood based on enemy type and personality
     * @returns {string} Mood name
     */
    getRandomMood() {
        const moodWeights = {
            slime: {
                happy: 0.25,
                content: 0.20,
                curious: 0.15,
                sleepy: 0.10,
                excited: 0.15,
                confused: 0.10,
                grumpy: 0.03,
                bored: 0.02
            },
            goblin: {
                grumpy: 0.20,
                content: 0.15,
                curious: 0.15,
                confused: 0.15,
                bored: 0.15,
                happy: 0.10,
                sleepy: 0.05,
                excited: 0.05
            }
        };

        const weights = moodWeights[this.type] || moodWeights.slime;
        const random = Math.random();
        let cumulative = 0;

        for (const [mood, weight] of Object.entries(weights)) {
            cumulative += weight;
            if (random <= cumulative) {
                return mood;
            }
        }

        return 'content'; // Fallback
    }

    /**
     * Changes the enemy's mood and displays mood bubble
     * @param {string} newMood - The new mood to set
     */
    changeMood(newMood) {
        if (!this.moodLibrary[newMood]) return;

        this.currentMood = newMood;
        const moodData = this.moodLibrary[newMood];
        this.moodTimer = moodData.duration;

        // Remove existing mood bubble
        if (this.moodBubble) {
            this.moodBubble.destroy();
        }

        // Create mood bubble with emoji
        this.createMoodBubble(moodData.emoji, moodData.color);

        console.log(`${this.type} is now ${newMood} ${moodData.emoji}`);
    }

    /**
     * Creates a visual mood bubble above the enemy
     * @param {string} emoji - Emoji to display
     * @param {number} color - Bubble background color
     */
    createMoodBubble(emoji, color) {
        // Create bubble background
        const bubbleGraphics = this.scene.add.graphics();
        bubbleGraphics.fillStyle(color, 0.8);
        bubbleGraphics.lineStyle(2, 0xffffff, 1);

        // Draw bubble shape
        bubbleGraphics.fillCircle(0, 0, 20);
        bubbleGraphics.strokeCircle(0, 0, 20);

        // Draw bubble tail
        bubbleGraphics.fillTriangle(-8, 15, 0, 25, 8, 15);
        bubbleGraphics.strokeTriangle(-8, 15, 0, 25, 8, 15);

        // Create emoji text
        const emojiText = this.scene.add.text(0, 0, emoji, {
            fontSize: '24px',
            align: 'center'
        });
        emojiText.setOrigin(0.5, 0.5);

        // Create container for bubble
        this.moodBubble = this.scene.add.container(this.x, this.y - 60, [bubbleGraphics, emojiText]);
        this.moodBubble.setDepth(100); // Always on top

        // Animate bubble appearance
        this.moodBubble.setScale(0);
        this.scene.tweens.add({
            targets: this.moodBubble,
            scaleX: 1,
            scaleY: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });

        // Auto-hide bubble after duration
        this.scene.time.delayedCall(this.moodLibrary[this.currentMood].duration, () => {
            if (this.moodBubble) {
                this.scene.tweens.add({
                    targets: this.moodBubble,
                    alpha: 0,
                    scaleX: 0.5,
                    scaleY: 0.5,
                    duration: 200,
                    onComplete: () => {
                        if (this.moodBubble) {
                            this.moodBubble.destroy();
                            this.moodBubble = null;
                        }
                    }
                });
            }
        });
    }

    /**
     * Updates mood bubble position to follow enemy
     */
    updateMoodBubble() {
        if (this.moodBubble) {
            this.moodBubble.x = this.x;
            this.moodBubble.y = this.y - 60;
        }
    }

    /**
     * Calculates a new random wander distance for this cycle
     */
    calculateWanderDistance() {
        const baseDistance = this.minWanderDistance +
            Math.random() * (this.maxWanderDistance - this.minWanderDistance);
        const variance = baseDistance * this.wanderVariance * (Math.random() * 2 - 1);
        const personalityFactor = this.personalityTraits ? this.personalityTraits.wanderiness : 1;

        this.wanderDistance = Math.max(50, (baseDistance + variance) * personalityFactor);
    }

    /**
     * Gets a random idle duration based on enemy type
     * @returns {number} Idle duration in milliseconds
     */
    getRandomIdleDuration() {
        return this.idleTimeMin + Math.random() * (this.idleTimeMax - this.idleTimeMin);
    }

    /**
     * Chooses a new wander direction and target position
     */
    chooseWanderDirection() {
        const distanceFromHome = Math.abs(this.x - this.homePosition.x);
        const maxAllowedDistance = Math.min(this.wanderDistance, this.maxWanderDistance);

        // Bias toward home if too far away
        if (distanceFromHome > maxAllowedDistance * 0.8) {
            this.direction = (this.x > this.homePosition.x) ? -1 : 1; // toward home
        } else {
            // 60% chance to continue current direction, 40% to reverse
            this.direction = Math.random() < 0.6 ? this.direction : -this.direction;
        }

        // Calculate target position
        this.currentWanderTarget = this.x + (this.direction * this.wanderDistance);

        // Ensure target is within level bounds
        this.currentWanderTarget = Math.max(
            this.levelBounds.left + 50,
            Math.min(this.levelBounds.right - 50, this.currentWanderTarget)
        );
    }

    /**
     * Checks if the enemy can reach the target position safely
     * @param {number} targetX - Target x position
     * @returns {boolean} Whether the target is reachable
     */
    checkLevelBoundaries(targetX) {
        return targetX >= this.levelBounds.left + 20 &&
            targetX <= this.levelBounds.right - 20;
    }

    /**
     * Updates AI state machine and behavior
     * @param {number} delta - Time delta from game loop
     */
    updateAIState(delta) {
        this.stateTimer += delta;
        this.jumpCooldown = Math.max(0, this.jumpCooldown - delta);
        this.moodChangeTimer += delta;

        // Update mood system
        this.updateMoodSystem(delta);

        switch (this.aiState) {
            case 'idle':
                this.handleIdleState(delta);
                break;
            case 'casual_patrol':
                this.handleCasualPatrolState(delta);
                break;
            case 'pursuing':
                // Future: implement player pursuit
                break;
            case 'searching':
                // Future: implement player searching
                break;
        }
    }

    /**
     * Updates the mood system
     * @param {number} delta - Time delta
     */
    updateMoodSystem(delta) {
        // Random mood changes based on personality
        const moodChangeChance = this.personalityTraits.moodiness * 0.0001; // Very low base chance

        if (this.moodChangeTimer > 5000 && Math.random() < moodChangeChance) {
            this.changeMood(this.getRandomMood());
            this.moodChangeTimer = 0;
        }

        // Update mood bubble position
        this.updateMoodBubble();
    }

    /**
     * Handles idle state behavior with mood-based actions
     * @param {number} delta - Time delta
     */
    handleIdleState(delta) {
        // Stop movement
        this.currentSpeed = 0;
        this.setVelocityX(0);

        // Mood-based idle behaviors
        this.handleMoodBasedIdleBehavior();

        // Occasional look around (flip sprite) - less frequent
        if (Math.random() < 0.005) { // 0.5% chance per frame
            this.setFlipX(!this.flipX);

            // Sometimes show curious mood when looking around
            if (Math.random() < 0.3) {
                this.changeMood('curious');
            }
        }

        // Check if idle time is complete and enough time has passed since last wander
        const timeSinceLastWander = Date.now() - this.lastWanderTime;
        const canWander = timeSinceLastWander > this.wanderCooldown;

        if (this.stateTimer >= this.idleDuration && canWander) {
            // Lower chance to enter patrol - less frequent wandering
            const patrolChance = this.type === 'slime' ? 0.15 : 0.12;
            if (Math.random() < patrolChance) {
                this.enterCasualPatrolState();
            } else {
                // Stay idle longer and maybe change mood
                this.stateTimer = 0;
                this.idleDuration = this.getRandomIdleDuration();

                // Chance to show bored or sleepy mood during extended idle
                if (Math.random() < 0.4) {
                    const extendedIdleMoods = ['bored', 'sleepy', 'content'];
                    const randomMood = extendedIdleMoods[Math.floor(Math.random() * extendedIdleMoods.length)];
                    this.changeMood(randomMood);
                }
            }
        }
    }

    /**
     * Handles mood-based idle behaviors
     */
    handleMoodBasedIdleBehavior() {
        switch (this.currentMood) {
            case 'sleepy':
                // Slow breathing animation
                if (Math.random() < 0.02) {
                    this.scene.tweens.add({
                        targets: this,
                        scaleY: 0.95,
                        duration: 1000,
                        yoyo: true,
                        ease: 'Sine.easeInOut'
                    });
                }
                break;

            case 'excited':
                // Small bouncing
                if (Math.random() < 0.03) {
                    this.scene.tweens.add({
                        targets: this,
                        y: this.y - 5,
                        duration: 200,
                        yoyo: true,
                        ease: 'Quad.easeOut'
                    });
                }
                break;

            case 'grumpy':
                // Occasional angry shake
                if (Math.random() < 0.01) {
                    this.scene.tweens.add({
                        targets: this,
                        x: this.x + 2,
                        duration: 50,
                        yoyo: true,
                        repeat: 3
                    });
                }
                break;

            case 'curious':
                // Look around more frequently
                if (Math.random() < 0.02) {
                    this.setFlipX(!this.flipX);
                }
                break;
        }
    }

    /**
     * Handles casual patrol state behavior
     * @param {number} delta - Time delta
     */
    handleCasualPatrolState(delta) {
        // Check for random pauses
        if (this.pauseTimer > 0) {
            this.pauseTimer -= delta;
            this.setVelocityX(0);
            return;
        }

        // Random chance to pause
        if (Math.random() < this.pauseChance / 60) { // Adjust for 60fps
            this.pauseTimer = 500 + Math.random() * 1000; // 0.5-1.5 second pause
            return;
        }

        // Calculate target speed (casual pace)
        const targetSpeed = this.moveSpeed * this.casualSpeedMultiplier * this.direction;

        // Smooth acceleration toward target speed
        this.currentSpeed += (targetSpeed - this.currentSpeed) * this.acceleration;
        this.setVelocityX(this.currentSpeed);

        // Update sprite direction
        this.setFlipX(this.direction < 0);

        // Check if reached wander target or boundary
        const reachedTarget = Math.abs(this.x - this.currentWanderTarget) < 20;
        const hitBoundary = !this.checkLevelBoundaries(this.x + this.direction * 50);

        if (reachedTarget || hitBoundary) {
            this.wanderCyclesCompleted++;

            if (this.wanderCyclesCompleted >= this.wanderCyclesBeforeIdle) {
                this.enterIdleState();
            } else {
                // Choose new direction and continue wandering
                this.chooseWanderDirection();
            }
        }

        // Check for jump opportunities (slimes only)
        if (this.type === 'slime' && this.canJump && this.jumpCooldown <= 0) {
            this.checkJumpOpportunity();
        }
    }

    /**
     * Enters idle state
     */
    enterIdleState() {
        this.aiState = 'idle';
        this.stateTimer = 0;
        this.idleDuration = this.getRandomIdleDuration();
        this.currentSpeed = 0;
        this.setVelocityX(0);
    }

    /**
     * Enters casual patrol state
     */
    enterCasualPatrolState() {
        this.aiState = 'casual_patrol';
        this.stateTimer = 0;
        this.wanderCyclesCompleted = 0;
        this.lastWanderTime = Date.now(); // Record when wandering started
        this.calculateWanderDistance();
        this.chooseWanderDirection();

        // Show appropriate mood for wandering
        const wanderMoods = ['curious', 'content', 'happy'];
        const randomMood = wanderMoods[Math.floor(Math.random() * wanderMoods.length)];
        this.changeMood(randomMood);
    }

    /**
     * Checks for jump opportunities (primarily for slimes)
     */
    checkJumpOpportunity() {
        // Simple jump logic - can be enhanced with platform detection
        const jumpChance = this.jumpProbability * this.personalityTraits.jumpiness;

        if (Math.random() < jumpChance / 60) { // Adjust for 60fps
            // Simple jump - can be enhanced to target specific platforms
            this.setVelocityY(-this.jumpHeight * 4); // Convert to velocity
            this.jumpCooldown = this.jumpCooldownTime;
        }
    }

    /**
     * Applies damage to the enemy
     * @param {number} amount - Damage amount
     */
    takeDamage(amount) {
        this.health -= amount;

        // Visual feedback - flash red
        this.setTint(0xff0000);
        this.scene.time.delayedCall(200, () => {
            this.clearTint();
        });

        if (this.health <= 0) {
            this.destroy();
        }
    }

    /**
     * Sets level boundaries for this enemy
     * @param {Object} bounds - Boundary object with left, right, top, bottom
     */
    setLevelBounds(bounds) {
        this.levelBounds = bounds;
    }

    /**
     * Main update method called each frame
     * @param {number} delta - Time delta since last frame
     */
    update(delta) {
        // Update AI state machine
        this.updateAIState(delta);

        // Apply gravity and physics as normal
        // (Phaser handles this automatically with physics bodies)
    }

    /**
     * Cleanup method called when enemy is destroyed
     */
    destroy() {
        // Clean up mood bubble
        if (this.moodBubble) {
            this.moodBubble.destroy();
            this.moodBubble = null;
        }

        super.destroy();
    }
}
// Make Enemy globally available
window.Enemy = Enemy;