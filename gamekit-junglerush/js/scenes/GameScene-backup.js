/**
 * Minimal GameScene for testing
 */
class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    create() {
        console.log('Minimal GameScene started');
        this.add.text(600, 400, 'GameScene Working!', {
            fontSize: '32px',
            fill: '#fff'
        }).setOrigin(0.5);
    }
}

// Make GameScene globally available
window.GameScene = GameScene;