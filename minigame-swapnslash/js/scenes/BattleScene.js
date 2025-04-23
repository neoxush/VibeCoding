class BattleScene extends Phaser.Scene {
    constructor() {
        super('BattleScene');
        this.player = null;
        this.enemy = null;
        this.isPlayerTurn = true;
        this.battleActions = ['attack', 'defend', 'special'];
        this.selectedAction = 0;
    }

    init(data) {
        this.player = data.player;
        this.enemy = data.enemy;
    }

    create() {
        // Add battle background - simple dark rectangle
        this.add.rectangle(0, 0, 800, 600, 0x000033).setOrigin(0, 0);

        // Create battle sprites - simple colored rectangles
        this.playerSprite = this.add.rectangle(250, 350, 32, 48, 0x00ff00);
        this.playerSprite.setScale(3);

        const enemyColor = this.enemy.type === 'slime' ? 0xff0000 : 0xff00ff;
        const enemyHeight = this.enemy.type === 'slime' ? 32 : 48;
        this.enemySprite = this.add.rectangle(550, 300, 32, enemyHeight, enemyColor);
        this.enemySprite.setScale(3);

        // Add battle text
        this.battleText = this.add.text(400, 100, 'Battle Start!', {
            fontSize: '32px',
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Add player health display
        this.playerHealthText = this.add.text(250, 400, `HP: ${gameData.playerHealth}`, {
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

        // Start battle
        this.time.delayedCall(1000, () => {
            this.startPlayerTurn();
        });

        // Create dummy sound objects to avoid errors
        this.attackSound = { play: function() {} };
        this.hurtSound = { play: function() {} };
    }

    startPlayerTurn() {
        this.isPlayerTurn = true;
        this.battleText.setText("Your turn! Choose an action.");

        // Signal to UI scene to show action buttons
        this.scene.get('UIScene').showActionButtons();
    }

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

    playerAttack() {
        // Calculate damage
        const damage = gameData.playerAttack;

        // Play attack animation and sound
        this.attackSound.play();
        this.tweens.add({
            targets: this.playerSprite,
            x: 450,
            duration: 200,
            yoyo: true,
            onComplete: () => {
                // Apply damage to enemy
                this.enemy.health -= damage;
                this.enemyHealthText.setText(`HP: ${this.enemy.health}`);

                // Play hurt animation
                this.hurtSound.play();
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

    playerDefend() {
        // Increase defense temporarily
        const defenseBoost = 5;
        gameData.playerDefense += defenseBoost;

        this.battleText.setText(`Defense increased by ${defenseBoost}!`);

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

    playerSpecial() {
        // Special attack with higher damage but costs health
        const damage = gameData.playerAttack * 1.5;
        const healthCost = 10;

        // Reduce player health
        gameData.playerHealth -= healthCost;
        this.playerHealthText.setText(`HP: ${gameData.playerHealth}`);

        // Play special attack animation and sound
        this.attackSound.play();
        this.tweens.add({
            targets: this.playerSprite,
            scale: 3.5,
            duration: 200,
            yoyo: true,
            onComplete: () => {
                // Apply damage to enemy
                this.enemy.health -= damage;
                this.enemyHealthText.setText(`HP: ${this.enemy.health}`);

                // Play hurt animation
                this.hurtSound.play();
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

    enemyAttack() {
        // Calculate damage (reduced by player defense)
        const baseDamage = this.enemy.attack;
        const damage = Math.max(1, baseDamage - gameData.playerDefense);

        // Play attack animation and sound
        this.attackSound.play();
        this.tweens.add({
            targets: this.enemySprite,
            x: 350,
            duration: 200,
            yoyo: true,
            onComplete: () => {
                // Apply damage to player
                gameData.playerHealth -= damage;
                this.playerHealthText.setText(`HP: ${gameData.playerHealth}`);

                // Play hurt animation
                this.hurtSound.play();
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
                gameData.playerDefense = 10;

                // Check if player is defeated
                if (gameData.playerHealth <= 0) {
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

    enemyDefeated() {
        this.battleText.setText('Enemy defeated!');

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

    playerDefeated() {
        this.battleText.setText('You were defeated!');

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

    endBattle(result) {
        // Emit battle end event to game scene
        this.scene.get('GameScene').events.emit('battle-end', result);

        // Close battle scenes
        this.scene.stop('UIScene');
        this.scene.stop();
    }
}
