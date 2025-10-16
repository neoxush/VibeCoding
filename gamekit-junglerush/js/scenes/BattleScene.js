/**
 * BattleScene - Turn-based combat system with damage calculation.
 * 
 * This scene handles turn-based battles between the player and enemies,
 * including damage calculation, action handling, and battle resolution.
 * Integrates with GameStateManager for state management and SoundManager for audio.
 */
class BattleScene extends Phaser.Scene {
    /**
     * Creates a new BattleScene instance.
     */
    constructor() {
        super('BattleScene');
        this.player = null;
        this.enemy = null;
        this.isPlayerTurn = true;
        this.battleActions = ['attack', 'defend', 'special'];
        this.selectedAction = 0;
        this.defendActive = false;
        this.tempDefenseBoost = 0;
    }

    /**
     * Initializes the battle with player and enemy data.
     * @param {Object} data - Battle initialization data
     * @param {Phaser.GameObjects.Sprite} data.player - Player sprite
     * @param {Phaser.GameObjects.Sprite} data.enemy - Enemy sprite
     */
    init(data) {
        this.player = data.player;
        this.enemy = data.enemy;
        this.defendActive = false;
        this.tempDefenseBoost = 0;
    }

    /**
     * Creates the battle scene with background, sprites, and UI.
     */
    create() {
        // Add battle background
        this.add.image(400, 300, 'battle-bg');

        // Create battle sprites
        this.playerSprite = this.add.sprite(250, 350, 'player');
        this.playerSprite.setScale(3);

        this.enemySprite = this.add.sprite(550, 300, this.enemy.type);
        this.enemySprite.setScale(3);

        // Add battle text
        this.battleText = this.add.text(400, 100, 'Battle Start!', {
            fontSize: '32px',
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Get player health from GameStateManager or gameData
        const playerHealth = window.gameStateManager ? 
            gameStateManager.getPlayerHealth() : gameData.playerHealth;

        // Add player health display
        this.playerHealthText = this.add.text(250, 450, `HP: ${playerHealth}`, {
            fontSize: '24px',
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5);

        // Add enemy health display
        this.enemyHealthText = this.add.text(550, 200, `HP: ${this.enemy.health}`, {
            fontSize: '24px',
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5);

        // Initialize SoundManager if available
        if (!this.soundManager && window.SoundManager) {
            this.soundManager = new SoundManager(this);
        }

        // Start battle
        this.time.delayedCall(1000, () => {
            this.startPlayerTurn();
        });
    }

    /**
     * Starts the player's turn and shows action buttons.
     */
    startPlayerTurn() {
        this.isPlayerTurn = true;
        this.battleText.setText("Your turn! Choose an action.");

        // Signal to UI scene to show action buttons
        this.scene.get('UIScene').showActionButtons();
    }

    /**
     * Starts the enemy's turn and executes enemy AI.
     */
    startEnemyTurn() {
        this.isPlayerTurn = false;
        this.battleText.setText("Enemy's turn!");

        // Hide action buttons
        this.scene.get('UIScene').hideActionButtons();

        // Enemy AI - simple random attack
        this.time.delayedCall(1500, () => {
            this.enemyAttack();
        });
    }

    /**
     * Calculates damage based on attacker and defender stats.
     * Formula: damage = max(1, attack - defense)
     * @param {number} attack - Attacker's attack stat
     * @param {number} defense - Defender's defense stat
     * @param {boolean} isSpecial - Whether this is a special attack (1.5x multiplier)
     * @returns {number} Calculated damage
     */
    calculateDamage(attack, defense, isSpecial = false) {
        let damage = attack - defense;
        
        // Apply special attack multiplier
        if (isSpecial) {
            damage = Math.floor(attack * 1.5) - defense;
        }
        
        // Ensure minimum damage of 1
        return Math.max(1, damage);
    }

    /**
     * Executes player attack action with damage calculation.
     */
    playerAttack() {
        // Get player attack stat
        const playerAttack = window.gameStateManager ? 
            gameStateManager.getPlayerAttack() : gameData.playerAttack;

        // Calculate damage (enemy has no defense stat, so use 0)
        const damage = this.calculateDamage(playerAttack, 0, false);

        // Play attack sound
        if (this.soundManager) {
            this.soundManager.playAttackSound();
        }

        // Play attack animation
        this.tweens.add({
            targets: this.playerSprite,
            x: 450,
            duration: 200,
            yoyo: true,
            onComplete: () => {
                // Apply damage to enemy
                this.enemy.health -= damage;
                this.enemyHealthText.setText(`HP: ${this.enemy.health}`);

                // Play hurt sound
                if (this.soundManager) {
                    this.soundManager.playHurtSound();
                }

                // Play hurt animation
                this.tweens.add({
                    targets: this.enemySprite,
                    alpha: 0.5,
                    duration: 100,
                    yoyo: true,
                    repeat: 3
                });

                // Display damage text
                this.battleText.setText(`You dealt ${damage} damage!`);

                // Check if enemy is defeated
                if (this.enemy.health <= 0) {
                    this.enemyDefeated();
                } else {
                    // Start enemy turn after a delay
                    this.time.delayedCall(1500, () => {
                        this.startEnemyTurn();
                    });
                }
            }
        });
    }

    /**
     * Executes player defend action, temporarily boosting defense.
     */
    playerDefend() {
        // Increase defense temporarily for next enemy attack
        const defenseBoost = 5;
        this.defendActive = true;
        this.tempDefenseBoost = defenseBoost;

        // Update defense in state manager
        if (window.gameStateManager) {
            const currentDefense = gameStateManager.getPlayerDefense();
            gameStateManager.setPlayerDefense(currentDefense + defenseBoost);
        } else {
            gameData.playerDefense += defenseBoost;
        }

        this.battleText.setText(`Defense increased by ${defenseBoost}!`);

        // Play defend sound (using attack sound as placeholder)
        if (this.soundManager) {
            this.soundManager.playAttackSound();
        }

        // Visual effect for defense
        this.tweens.add({
            targets: this.playerSprite,
            alpha: 0.7,
            duration: 200,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
                // Start enemy turn after a delay
                this.time.delayedCall(1500, () => {
                    this.startEnemyTurn();
                });
            }
        });
    }

    /**
     * Executes player special attack - high damage but costs health.
     * Deals 1.5x damage and costs 10 HP.
     */
    playerSpecial() {
        const healthCost = 10;

        // Get player attack stat
        const playerAttack = window.gameStateManager ? 
            gameStateManager.getPlayerAttack() : gameData.playerAttack;

        // Calculate special damage (1.5x multiplier, no enemy defense)
        const damage = this.calculateDamage(playerAttack, 0, true);

        // Reduce player health
        if (window.gameStateManager) {
            const currentHealth = gameStateManager.getPlayerHealth();
            gameStateManager.setPlayerHealth(currentHealth - healthCost);
            this.playerHealthText.setText(`HP: ${gameStateManager.getPlayerHealth()}`);
        } else {
            gameData.playerHealth -= healthCost;
            this.playerHealthText.setText(`HP: ${gameData.playerHealth}`);
        }

        // Play special attack sound
        if (this.soundManager) {
            this.soundManager.playAttackSound();
        }

        // Play special attack animation
        this.tweens.add({
            targets: this.playerSprite,
            scale: 3.5,
            duration: 200,
            yoyo: true,
            onComplete: () => {
                // Apply damage to enemy
                this.enemy.health -= damage;
                this.enemyHealthText.setText(`HP: ${this.enemy.health}`);

                // Play hurt sound
                if (this.soundManager) {
                    this.soundManager.playHurtSound();
                }

                // Play hurt animation
                this.tweens.add({
                    targets: this.enemySprite,
                    alpha: 0.3,
                    scale: 2.8,
                    duration: 150,
                    yoyo: true,
                    repeat: 2
                });

                // Display damage text
                this.battleText.setText(`Special attack! ${damage} damage dealt!`);

                // Check if enemy is defeated
                if (this.enemy.health <= 0) {
                    this.enemyDefeated();
                } else {
                    // Start enemy turn after a delay
                    this.time.delayedCall(1500, () => {
                        this.startEnemyTurn();
                    });
                }
            }
        });
    }

    /**
     * Executes enemy attack with damage calculation.
     * Damage is reduced by player defense.
     */
    enemyAttack() {
        // Get player defense stat
        const playerDefense = window.gameStateManager ? 
            gameStateManager.getPlayerDefense() : gameData.playerDefense;

        // Calculate damage using proper formula
        const damage = this.calculateDamage(this.enemy.attack, playerDefense, false);

        // Play attack sound
        if (this.soundManager) {
            this.soundManager.playAttackSound();
        }

        // Play attack animation
        this.tweens.add({
            targets: this.enemySprite,
            x: 350,
            duration: 200,
            yoyo: true,
            onComplete: () => {
                // Apply damage to player
                if (window.gameStateManager) {
                    const currentHealth = gameStateManager.getPlayerHealth();
                    gameStateManager.setPlayerHealth(currentHealth - damage);
                    this.playerHealthText.setText(`HP: ${gameStateManager.getPlayerHealth()}`);
                } else {
                    gameData.playerHealth -= damage;
                    this.playerHealthText.setText(`HP: ${gameData.playerHealth}`);
                }

                // Play hurt sound
                if (this.soundManager) {
                    this.soundManager.playHurtSound();
                }

                // Play hurt animation
                this.tweens.add({
                    targets: this.playerSprite,
                    alpha: 0.5,
                    duration: 100,
                    yoyo: true,
                    repeat: 3
                });

                // Display damage text
                this.battleText.setText(`Enemy dealt ${damage} damage!`);

                // Reset defense boost from defend action
                if (this.defendActive) {
                    if (window.gameStateManager) {
                        const currentDefense = gameStateManager.getPlayerDefense();
                        gameStateManager.setPlayerDefense(currentDefense - this.tempDefenseBoost);
                    } else {
                        gameData.playerDefense -= this.tempDefenseBoost;
                    }
                    this.defendActive = false;
                    this.tempDefenseBoost = 0;
                }

                // Check if player is defeated
                const playerHealth = window.gameStateManager ? 
                    gameStateManager.getPlayerHealth() : gameData.playerHealth;

                if (playerHealth <= 0) {
                    this.playerDefeated();
                } else {
                    // Start player turn after a delay
                    this.time.delayedCall(1500, () => {
                        this.startPlayerTurn();
                    });
                }
            }
        });
    }

    /**
     * Handles enemy defeat with victory animation and sound.
     */
    enemyDefeated() {
        this.battleText.setText('Enemy defeated!');

        // Play victory sound
        if (this.soundManager) {
            this.soundManager.playVictorySound();
        }

        // Fade out enemy sprite
        this.tweens.add({
            targets: this.enemySprite,
            alpha: 0,
            y: this.enemySprite.y - 50,
            duration: 1000,
            onComplete: () => {
                // End battle with victory
                this.endBattle('victory');
            }
        });
    }

    /**
     * Handles player defeat with game over animation and sound.
     */
    playerDefeated() {
        this.battleText.setText('You were defeated!');

        // Play death sound
        if (this.soundManager) {
            this.soundManager.playDeathSound();
        }

        // Fade out player sprite
        this.tweens.add({
            targets: this.playerSprite,
            alpha: 0,
            y: this.playerSprite.y + 50,
            duration: 1000,
            onComplete: () => {
                // End battle with defeat
                this.endBattle('defeat');
            }
        });
    }

    /**
     * Ends the battle and emits result to GameScene.
     * @param {string} result - Battle result ('victory' or 'defeat')
     */
    endBattle(result) {
        // Emit battle end event to game scene
        this.scene.get('GameScene').events.emit('battle-end', result);

        // Close battle scenes
        this.scene.stop('UIScene');
        this.scene.stop();
    }
}

