class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        // Create a simple player sprite - we'll use a placeholder texture that we'll create here
        const graphics = scene.make.graphics();
        graphics.fillStyle(0x00ff00); // Green color
        graphics.fillRect(0, 0, 32, 48); // Player size
        graphics.generateTexture('player-texture', 32, 48);

        super(scene, x, y, 'player-texture');

        // Add player to the scene
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Set up physics properties
        this.body.setSize(32, 48);
        this.body.setCollideWorldBounds(true);

        // Set up player properties
        this.moveSpeed = 160;
        this.jumpSpeed = -330;
        this.isJumping = false;

        console.log('Player created with physics body:', this.body);
    }

    update(cursors) {
        // Handle horizontal movement
        if (cursors.left.isDown) {
            this.setVelocityX(-this.moveSpeed);
            this.setFlipX(true);
        } else if (cursors.right.isDown) {
            this.setVelocityX(this.moveSpeed);
            this.setFlipX(false);
        } else {
            this.setVelocityX(0);
        }

        // Handle jumping
        if (cursors.up.isDown && this.body.onFloor()) {
            this.setVelocityY(this.jumpSpeed);
            this.isJumping = true;
        }

        // Reset jumping state when landing
        if (this.body.onFloor()) {
            this.isJumping = false;
        }
    }
}
