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
        
        // Show enemy waiting/taunting dialogue
        this.time.delayedCall(500, () => {
            this.showEnemyDialogue('waiting');
        });
    }

    /**
     * Starts the enemy's turn and executes enemy AI.
     */
    startEnemyTurn() {
        this.isPlayerTurn = false;
        this.battleText.setText("Enemy's turn!");

        // Hide action buttons
        this.scene.get('UIScene').hideActionButtons();

        // Show enemy dialogue before attack
        this.showEnemyDialogue();

        // Enemy AI - simple random attack
        this.time.delayedCall(2000, () => {
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
            this.soundManager.playAttack();
        }

        // Create orange glow effect on player
        const playerGlow = this.add.circle(this.playerSprite.x, this.playerSprite.y, 60, 0xff6600, 0.6);
        this.tweens.add({
            targets: playerGlow,
            alpha: 0,
            scale: 1.5,
            duration: 300,
            onComplete: () => playerGlow.destroy()
        });

        // Play attack animation with screen shake
        this.cameras.main.shake(100, 0.005);
        
        // Create dust trail during movement
        const dustInterval = this.time.addEvent({
            delay: 30,
            callback: () => {
                this.createDustParticles(this.playerSprite.x, this.playerSprite.y + 70);
            },
            repeat: 6
        });
        
        this.tweens.add({
            targets: this.playerSprite,
            x: 450,
            duration: 200,
            yoyo: true,
            onYoyo: () => {
                dustInterval.remove();
            },
            onComplete: () => {
                dustInterval.remove();
                
                // Create impact particles at enemy position
                this.createImpactParticles(this.enemySprite.x, this.enemySprite.y, 0xff0000);
                
                // Apply damage to enemy
                this.enemy.health -= damage;
                this.enemyHealthText.setText(`HP: ${this.enemy.health}`);

                // Play hurt sound
                if (this.soundManager) {
                    this.soundManager.playHurt();
                }

                // Play hurt animation with red flash
                const enemyFlash = this.add.rectangle(this.enemySprite.x, this.enemySprite.y, 100, 100, 0xff0000, 0.5);
                this.tweens.add({
                    targets: enemyFlash,
                    alpha: 0,
                    duration: 200,
                    onComplete: () => enemyFlash.destroy()
                });

                this.tweens.add({
                    targets: this.enemySprite,
                    alpha: 0.5,
                    duration: 100,
                    yoyo: true,
                    repeat: 3
                });

                // Display damage text with floating animation
                this.showFloatingDamage(this.enemySprite.x, this.enemySprite.y - 50, damage, 0xff0000);
                this.battleText.setText(`You dealt ${damage} damage!`);
                
                // Show enemy hurt reaction
                this.showEnemyDialogue('hurt');

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

        // Play defend sound
        if (this.soundManager) {
            this.soundManager.playDefend();
        }

        // Create blue shield glow effect
        const shieldGlow = this.add.circle(this.playerSprite.x, this.playerSprite.y, 80, 0x00aaff, 0.7);
        
        // Pulsing shield animation
        this.tweens.add({
            targets: shieldGlow,
            scale: 1.3,
            alpha: 0,
            duration: 600,
            ease: 'Power2',
            repeat: 2,
            onComplete: () => shieldGlow.destroy()
        });

        // Create shield ring particles
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const x = this.playerSprite.x + Math.cos(angle) * 60;
            const y = this.playerSprite.y + Math.sin(angle) * 60;
            const particle = this.add.circle(x, y, 4, 0x00ffff, 0.8);
            
            this.tweens.add({
                targets: particle,
                x: this.playerSprite.x + Math.cos(angle) * 90,
                y: this.playerSprite.y + Math.sin(angle) * 90,
                alpha: 0,
                duration: 500,
                onComplete: () => particle.destroy()
            });
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
            this.soundManager.playSpecial();
        }

        // Create massive golden/yellow energy glow
        const specialGlow = this.add.circle(this.playerSprite.x, this.playerSprite.y, 100, 0xffff00, 0.8);
        this.tweens.add({
            targets: specialGlow,
            alpha: 0,
            scale: 2,
            duration: 400,
            onComplete: () => specialGlow.destroy()
        });

        // Create energy ring particles
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            const x = this.playerSprite.x + Math.cos(angle) * 80;
            const y = this.playerSprite.y + Math.sin(angle) * 80;
            const particle = this.add.circle(x, y, 5, 0xffaa00, 1);
            
            this.tweens.add({
                targets: particle,
                x: this.playerSprite.x,
                y: this.playerSprite.y,
                alpha: 0,
                duration: 300,
                onComplete: () => particle.destroy()
            });
        }

        // Stronger screen shake for special
        this.cameras.main.shake(200, 0.01);

        // Play special attack animation
        this.tweens.add({
            targets: this.playerSprite,
            scale: 3.5,
            duration: 200,
            yoyo: true,
            onComplete: () => {
                // Create massive impact explosion
                const explosion = this.add.circle(this.enemySprite.x, this.enemySprite.y, 20, 0xffff00, 1);
                this.tweens.add({
                    targets: explosion,
                    scale: 5,
                    alpha: 0,
                    duration: 500,
                    onComplete: () => explosion.destroy()
                });

                // Create more intense impact particles
                for (let i = 0; i < 16; i++) {
                    const angle = (i / 16) * Math.PI * 2;
                    const speed = 80 + Math.random() * 40;
                    const particle = this.add.circle(this.enemySprite.x, this.enemySprite.y, 4, 0xff0000, 1);
                    
                    this.tweens.add({
                        targets: particle,
                        x: this.enemySprite.x + Math.cos(angle) * speed,
                        y: this.enemySprite.y + Math.sin(angle) * speed,
                        alpha: 0,
                        duration: 600,
                        onComplete: () => particle.destroy()
                    });
                }
                
                // Apply damage to enemy
                this.enemy.health -= damage;
                this.enemyHealthText.setText(`HP: ${this.enemy.health}`);

                // Play hurt sound
                if (this.soundManager) {
                    this.soundManager.playHurt();
                }

                // Intense flash effect
                const enemyFlash = this.add.rectangle(this.enemySprite.x, this.enemySprite.y, 120, 120, 0xffff00, 0.8);
                this.tweens.add({
                    targets: enemyFlash,
                    alpha: 0,
                    duration: 300,
                    onComplete: () => enemyFlash.destroy()
                });

                // Play hurt animation
                this.tweens.add({
                    targets: this.enemySprite,
                    alpha: 0.3,
                    scale: 2.8,
                    duration: 150,
                    yoyo: true,
                    repeat: 2
                });

                // Display larger damage text for special
                this.showFloatingDamage(this.enemySprite.x, this.enemySprite.y - 50, damage, 0xffff00);
                this.battleText.setText(`Special attack! ${damage} damage dealt!`);
                
                // Show enemy hurt reaction
                this.showEnemyDialogue('hurt');

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
            this.soundManager.playAttack();
        }

        // Create red/purple glow effect on enemy
        const enemyGlow = this.add.circle(this.enemySprite.x, this.enemySprite.y, 60, 0xcc0000, 0.6);
        this.tweens.add({
            targets: enemyGlow,
            alpha: 0,
            scale: 1.5,
            duration: 300,
            onComplete: () => enemyGlow.destroy()
        });

        // Play attack animation with screen shake
        this.cameras.main.shake(100, 0.005);
        
        // Create dust trail during movement
        const dustInterval = this.time.addEvent({
            delay: 30,
            callback: () => {
                this.createDustParticles(this.enemySprite.x, this.enemySprite.y + 50);
            },
            repeat: 6
        });
        
        this.tweens.add({
            targets: this.enemySprite,
            x: 350,
            duration: 200,
            yoyo: true,
            onYoyo: () => {
                dustInterval.remove();
            },
            onComplete: () => {
                dustInterval.remove();
                
                // Create impact particles at player position
                this.createImpactParticles(this.playerSprite.x, this.playerSprite.y, 0xff6600);
                
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
                    this.soundManager.playHurt();
                }

                // Play hurt animation with orange flash
                const playerFlash = this.add.rectangle(this.playerSprite.x, this.playerSprite.y, 100, 100, 0xff6600, 0.5);
                this.tweens.add({
                    targets: playerFlash,
                    alpha: 0,
                    duration: 200,
                    onComplete: () => playerFlash.destroy()
                });

                this.tweens.add({
                    targets: this.playerSprite,
                    alpha: 0.5,
                    duration: 100,
                    yoyo: true,
                    repeat: 3
                });

                // Display damage text with floating animation
                this.showFloatingDamage(this.playerSprite.x, this.playerSprite.y - 50, damage, 0xff6600);
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
     * Creates impact particle effects at a position
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} color - Particle color
     */
    createImpactParticles(x, y, color) {
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const speed = 50 + Math.random() * 50;
            const particle = this.add.circle(x, y, 3, color, 0.8);
            
            this.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed,
                alpha: 0,
                duration: 400,
                onComplete: () => particle.destroy()
            });
        }
    }

    /**
     * Shows floating damage number
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} damage - Damage amount
     * @param {number} color - Text color
     */
    showFloatingDamage(x, y, damage, color) {
        const damageText = this.add.text(x, y, `-${damage}`, {
            fontSize: '32px',
            fill: `#${color.toString(16).padStart(6, '0')}`,
            stroke: '#000',
            strokeThickness: 4,
            fontFamily: 'monospace',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: damageText,
            y: y - 60,
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => damageText.destroy()
        });
    }

    /**
     * Creates dust particles at character's feet during movement
     * @param {number} x - X position
     * @param {number} y - Y position (at feet level)
     */
    createDustParticles(x, y) {
        // Create 3-4 dust particles for better visibility
        for (let i = 0; i < 4; i++) {
            const offsetX = (Math.random() - 0.5) * 25;
            const size = 4 + Math.random() * 3;
            const particle = this.add.circle(x + offsetX, y, size, 0xdddddd, 0.8);
            
            this.tweens.add({
                targets: particle,
                y: y - 15 - Math.random() * 15,
                x: x + offsetX + (Math.random() - 0.5) * 20,
                alpha: 0,
                scale: 1.8,
                duration: 400 + Math.random() * 200,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
    }

    /**
     * Shows a comic-style dialogue box with enemy taunts
     * @param {string} type - Type of dialogue: 'waiting', 'attacking', or 'hurt'
     */
    showEnemyDialogue(type = 'attacking') {
        // Destroy existing dialogue if any
        if (this.currentDialogueBubble) {
            this.currentDialogueBubble.destroy();
        }
        if (this.currentDialogueText) {
            this.currentDialogueText.destroy();
        }
        
        // Different dialogue based on context
        const slimeWaiting = ["What's taking so long?", "Come on!", "Hurry up!", "I'm waiting...", "Boring!"];
        const slimeAttacking = ["You're toast!", "Prepare to lose!", "I'm gonna squish you!", "Time to bounce!", "Slime time!"];
        const slimeHurt = ["Ow!", "That hurt!", "No fair!", "Ouch!", "You'll pay!"];
        
        const goblinWaiting = ["Make your move!", "Scared?", "Coward!", "I'm ready!", "Waiting..."];
        const goblinAttacking = ["You'll regret this!", "Feel my wrath!", "I'll crush you!", "Pathetic human!", "Your doom awaits!", "Hahaha!"];
        const goblinHurt = ["Argh!", "You dare?!", "Impossible!", "Grr!", "I'll get you!"];
        
        let taunts;
        if (this.enemy.type === 'slime') {
            taunts = type === 'waiting' ? slimeWaiting : (type === 'hurt' ? slimeHurt : slimeAttacking);
        } else {
            taunts = type === 'waiting' ? goblinWaiting : (type === 'hurt' ? goblinHurt : goblinAttacking);
        }
        
        const taunt = taunts[Math.floor(Math.random() * taunts.length)];
        
        // Create comic dialogue bubble
        const bubbleWidth = 150;
        const bubbleHeight = 50;
        const bubbleX = this.enemySprite.x + 80;
        const bubbleY = this.enemySprite.y - 80;
        
        // Bubble background (white rounded rectangle)
        const bubble = this.add.graphics();
        bubble.fillStyle(0xffffff, 1);
        bubble.fillRoundedRect(bubbleX - bubbleWidth/2, bubbleY - bubbleHeight/2, bubbleWidth, bubbleHeight, 10);
        
        // Bubble border (black outline)
        bubble.lineStyle(3, 0x000000, 1);
        bubble.strokeRoundedRect(bubbleX - bubbleWidth/2, bubbleY - bubbleHeight/2, bubbleWidth, bubbleHeight, 10);
        
        // Bubble tail (triangle pointing to enemy)
        bubble.fillStyle(0xffffff, 1);
        bubble.fillTriangle(
            bubbleX - 20, bubbleY + bubbleHeight/2,
            bubbleX - 10, bubbleY + bubbleHeight/2,
            this.enemySprite.x + 20, this.enemySprite.y - 30
        );
        bubble.lineStyle(3, 0x000000, 1);
        bubble.strokeTriangle(
            bubbleX - 20, bubbleY + bubbleHeight/2,
            bubbleX - 10, bubbleY + bubbleHeight/2,
            this.enemySprite.x + 20, this.enemySprite.y - 30
        );
        
        // Dialogue text
        const dialogueText = this.add.text(bubbleX, bubbleY, taunt, {
            fontSize: '16px',
            fill: '#000',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            align: 'center',
            wordWrap: { width: bubbleWidth - 20 }
        }).setOrigin(0.5);
        
        // Store references for cleanup
        this.currentDialogueBubble = bubble;
        this.currentDialogueText = dialogueText;
        
        // Pop-in animation
        bubble.setAlpha(0);
        dialogueText.setAlpha(0);
        bubble.setScale(0.5);
        dialogueText.setScale(0.5);
        
        this.tweens.add({
            targets: [bubble, dialogueText],
            alpha: 1,
            scale: 1,
            duration: 200,
            ease: 'Back.easeOut'
        });
        
        // Fade out after duration (longer for waiting dialogue)
        const duration = type === 'waiting' ? 3000 : 1500;
        this.time.delayedCall(duration, () => {
            if (bubble && dialogueText) {
                this.tweens.add({
                    targets: [bubble, dialogueText],
                    alpha: 0,
                    duration: 200,
                    onComplete: () => {
                        if (bubble) bubble.destroy();
                        if (dialogueText) dialogueText.destroy();
                        this.currentDialogueBubble = null;
                        this.currentDialogueText = null;
                    }
                });
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

