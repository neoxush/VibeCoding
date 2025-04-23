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
    }

    createActionButtons() {
        const actions = ['Attack', 'Defend', 'Special'];
        const buttonY = 500;

        actions.forEach((action, index) => {
            // Create button background - simple rectangle
            const button = this.add.rectangle(200 + (index * 200), buttonY, 150, 50, 0x444444);
            button.setInteractive();

            // Add button text
            const text = this.add.text(button.x, button.y, action, {
                fontSize: '24px',
                fill: '#fff'
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
                this.handleActionClick(action.toLowerCase());
            });

            // Store button reference
            this.actionButtons.push({ button, text });
        });
    }

    showActionButtons() {
        this.actionButtons.forEach(({ button, text }) => {
            button.setVisible(true);
            text.setVisible(true);
        });
    }

    hideActionButtons() {
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
