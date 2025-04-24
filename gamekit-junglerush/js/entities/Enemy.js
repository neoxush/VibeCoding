class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, type) {
        // Create enemy texture based on type
        const graphics = scene.make.graphics();

        if (type === 'slime') {
            graphics.fillStyle(0xff0000); // Red for slime
            graphics.fillRect(0, 0, 32, 32); // Slime size
            graphics.generateTexture('slime-texture', 32, 32);
        } else {
            graphics.fillStyle(0xff00ff); // Purple for goblin
            graphics.fillRect(0, 0, 32, 48); // Goblin size
            graphics.generateTexture('goblin-texture', 32, 48);
        }

        const textureName = type === 'slime' ? 'slime-texture' : 'goblin-texture';
        super(scene, x, y, textureName);

        // Add enemy to the scene
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Set up physics properties
        this.body.setCollideWorldBounds(true);

        // Set up enemy properties based on type
        this.type = type;
        this.setupEnemyType();

        // Set up patrol behavior
        this.patrolDistance = 100;
        this.startX = x;
        this.direction = 1; // 1 = right, -1 = left
        this.moveSpeed = 50;

        console.log('Enemy created:', type, 'at', x, y);
    }

    setupEnemyType() {
        switch (this.type) {
            case 'slime':
                this.health = 30;
                this.attack = 10;
                this.body.setSize(24, 16);
                this.body.setOffset(4, 16);
                break;
            case 'goblin':
                this.health = 50;
                this.attack = 15;
                this.body.setSize(20, 40);
                this.body.setOffset(6, 8);
                break;
            default:
                this.health = 30;
                this.attack = 10;
                break;
        }
    }

    update() {
        // Simple patrol behavior
        if (Math.abs(this.x - this.startX) > this.patrolDistance) {
            this.direction *= -1;
        }

        // Move in current direction
        this.setVelocityX(this.moveSpeed * this.direction);

        // Flip sprite based on direction
        if (this.direction < 0) {
            this.setFlipX(true);
        } else {
            this.setFlipX(false);
        }
    }
}
