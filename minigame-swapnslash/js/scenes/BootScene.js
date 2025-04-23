class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    create() {
        console.log('BootScene started');

        // Add a loading text
        this.add.text(400, 300, 'Loading...', {
            fontSize: '32px',
            fill: '#fff'
        }).setOrigin(0.5);

        // Go directly to the game scene to skip asset loading
        this.scene.start('GameScene');
    }
}
