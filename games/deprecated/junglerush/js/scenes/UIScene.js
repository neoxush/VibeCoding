class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene');
        this.actionButtons = [];
    }

    create() {
        // Create action buttons for battle
        this.createActionButtons();

        // Initially hide the buttons
        this.hideActionButtons();
        
        // Flag to track if buttons are visible
        this.buttonsVisible = false;
    }
    
    update() {
        // Only check for keyboard input when buttons are visible
        if (!this.buttonsVisible) return;
        
        // Check for keyboard shortcuts
        if (Phaser.Input.Keyboard.JustDown(this.aKey)) {
            this.handleActionClick('attack');
        } else if (Phaser.Input.Keyboard.JustDown(this.dKey)) {
            this.handleActionClick('defend');
        } else if (Phaser.Input.Keyboard.JustDown(this.sKey)) {
            this.handleActionClick('special');
        }
    }

    createActionButtons() {
        const actions = [
            { name: 'Attack', key: 'A' },
            { name: 'Defend', key: 'D' },
            { name: 'Special', key: 'S' }
        ];
        const buttonY = 500;

        actions.forEach((action, index) => {
            // Create button background - simple rectangle
            const button = this.add.rectangle(200 + (index * 200), buttonY, 150, 50, 0x444444);
            button.setInteractive();

            // Add button text with keyboard shortcut hint
            const displayText = `(${action.key.toLowerCase()})${action.name.substring(1)}`;
            const text = this.add.text(button.x, button.y, displayText, {
                fontSize: '24px',
                fill: '#fff',
                fontFamily: 'monospace'
            }).setOrigin(0.5);

            // Add hover effect
            button.on('pointerover', () => {
                button.setFillStyle(0x666666);
            });

            button.on('pointerout', () => {
                button.setFillStyle(0x444444);
            });

            // Add click handler
            button.on('pointerdown', () => {
                this.handleActionClick(action.name.toLowerCase());
            });

            // Store button reference
            this.actionButtons.push({ button, text });
        });

        // Set up keyboard shortcuts
        this.aKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.dKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.sKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    }

    showActionButtons() {
        this.buttonsVisible = true;
        this.actionButtons.forEach(({ button, text }) => {
            button.setVisible(true);
            text.setVisible(true);
        });
    }

    hideActionButtons() {
        this.buttonsVisible = false;
        this.actionButtons.forEach(({ button, text }) => {
            button.setVisible(false);
            text.setVisible(false);
        });
    }

    handleActionClick(action) {
        const battleScene = this.scene.get('BattleScene');

        // Execute the corresponding action in the battle scene
        switch (action) {
            case 'attack':
                battleScene.playerAttack();
                break;
            case 'defend':
                battleScene.playerDefend();
                break;
            case 'special':
                battleScene.playerSpecial();
                break;
        }

        // Hide buttons after action is selected
        this.hideActionButtons();
    }
}

// Make UIScene globally available
window.UIScene = UIScene;
