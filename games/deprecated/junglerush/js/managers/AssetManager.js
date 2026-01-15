/**
 * AssetManager
 * Handles procedural generation of all game textures
 * Static class that generates textures using Phaser's graphics API
 */
class AssetManager {
    /**
     * Generates the player character texture
     * Creates a Lego-style blocky character with studs and defined edges
     * @param {Phaser.Scene} scene - The scene to generate the texture in
     */
    static generatePlayerTexture(scene) {
        const graphics = scene.make.graphics();

        // === HEAD BLOCK ===
        // Head base - yellow Lego brick
        graphics.fillStyle(0xffd700); // Bright yellow
        graphics.fillRect(8, 2, 16, 14);
        
        // Head highlight (top-left edge for 3D effect)
        graphics.fillStyle(0xffed4e); // Lighter yellow
        graphics.fillRect(8, 2, 14, 2); // Top edge
        graphics.fillRect(8, 2, 2, 12); // Left edge
        
        // Head shadow (bottom-right for depth)
        graphics.fillStyle(0xccaa00); // Darker yellow
        graphics.fillRect(22, 4, 2, 12); // Right edge
        graphics.fillRect(10, 14, 14, 2); // Bottom edge
        
        // Head studs (classic Lego bumps on top)
        graphics.fillStyle(0xffed4e); // Light yellow
        graphics.fillRect(11, 3, 3, 2); // Left stud
        graphics.fillRect(18, 3, 3, 2); // Right stud
        
        // Face - simple smiley
        graphics.fillStyle(0x000000); // Black
        graphics.fillRect(11, 7, 2, 2); // Left eye
        graphics.fillRect(19, 7, 2, 2); // Right eye
        graphics.fillRect(13, 11, 6, 2); // Smile

        // === BODY BLOCK ===
        // Body base - blue brick
        graphics.fillStyle(0x0066cc); // Bright blue
        graphics.fillRect(8, 16, 16, 12);
        
        // Body highlight (3D effect)
        graphics.fillStyle(0x3399ff); // Lighter blue
        graphics.fillRect(8, 16, 14, 2); // Top edge
        graphics.fillRect(8, 16, 2, 10); // Left edge
        
        // Body shadow
        graphics.fillStyle(0x004499); // Darker blue
        graphics.fillRect(22, 18, 2, 10); // Right edge
        graphics.fillRect(10, 26, 14, 2); // Bottom edge
        
        // Body studs
        graphics.fillStyle(0x3399ff); // Light blue
        graphics.fillRect(11, 17, 3, 2); // Left stud
        graphics.fillRect(18, 17, 3, 2); // Right stud

        // === ARMS (as separate blocks) ===
        // Left arm
        graphics.fillStyle(0x0066cc); // Blue
        graphics.fillRect(4, 18, 4, 10);
        graphics.fillStyle(0x3399ff); // Highlight
        graphics.fillRect(4, 18, 3, 2);
        graphics.fillStyle(0x004499); // Shadow
        graphics.fillRect(7, 20, 1, 8);
        
        // Right arm
        graphics.fillStyle(0x0066cc); // Blue
        graphics.fillRect(24, 18, 4, 10);
        graphics.fillStyle(0x3399ff); // Highlight
        graphics.fillRect(24, 18, 3, 2);
        graphics.fillStyle(0x004499); // Shadow
        graphics.fillRect(27, 20, 1, 8);

        // === HANDS (yellow blocks) ===
        // Left hand
        graphics.fillStyle(0xffd700); // Yellow
        graphics.fillRect(4, 28, 4, 4);
        graphics.fillStyle(0xffed4e); // Highlight
        graphics.fillRect(4, 28, 3, 1);
        
        // Right hand
        graphics.fillStyle(0xffd700); // Yellow
        graphics.fillRect(24, 28, 4, 4);
        graphics.fillStyle(0xffed4e); // Highlight
        graphics.fillRect(24, 28, 3, 1);

        // === LEGS (as separate blocks) ===
        // Left leg
        graphics.fillStyle(0x003366); // Dark blue
        graphics.fillRect(10, 28, 6, 16);
        graphics.fillStyle(0x004499); // Highlight
        graphics.fillRect(10, 28, 5, 2);
        graphics.fillStyle(0x001a33); // Shadow
        graphics.fillRect(15, 30, 1, 14);
        
        // Right leg
        graphics.fillStyle(0x003366); // Dark blue
        graphics.fillRect(16, 28, 6, 16);
        graphics.fillStyle(0x004499); // Highlight
        graphics.fillRect(16, 28, 5, 2);
        graphics.fillStyle(0x001a33); // Shadow
        graphics.fillRect(21, 30, 1, 14);
        
        // Leg studs
        graphics.fillStyle(0x004499); // Light blue
        graphics.fillRect(11, 29, 2, 2); // Left leg stud
        graphics.fillRect(17, 29, 2, 2); // Right leg stud

        // === FEET (black blocks) ===
        // Left foot
        graphics.fillStyle(0x000000); // Black
        graphics.fillRect(10, 44, 6, 4);
        graphics.fillStyle(0x333333); // Highlight
        graphics.fillRect(10, 44, 5, 1);
        
        // Right foot
        graphics.fillStyle(0x000000); // Black
        graphics.fillRect(16, 44, 6, 4);
        graphics.fillStyle(0x333333); // Highlight
        graphics.fillRect(16, 44, 5, 1);

        // Generate the texture
        graphics.generateTexture(
            Constants.TEXTURES.PLAYER,
            Constants.DIMENSIONS.PLAYER_WIDTH,
            Constants.DIMENSIONS.PLAYER_HEIGHT
        );
        graphics.destroy();
    }

    /**
     * Generates the slime enemy texture
     * Creates a red blob enemy with eyes to distinguish from green grass
     * @param {Phaser.Scene} scene - The scene to generate the texture in
     */
    static generateSlimeTexture(scene) {
        const graphics = scene.make.graphics();

        // Main body - bright red
        graphics.fillStyle(Constants.COLORS.SLIME_BODY);
        graphics.fillRect(4, 16, 24, 16);
        graphics.fillRect(8, 8, 16, 8);

        // Darker red shading for depth
        graphics.fillStyle(Constants.COLORS.SLIME_SHADING);
        graphics.fillRect(6, 18, 20, 12);

        // Eyes - white
        graphics.fillStyle(Constants.COLORS.WHITE);
        graphics.fillRect(10, 12, 4, 4);
        graphics.fillRect(18, 12, 4, 4);

        // Pupils - black
        graphics.fillStyle(Constants.COLORS.BLACK);
        graphics.fillRect(12, 14, 2, 2);
        graphics.fillRect(20, 14, 2, 2);

        // Shine highlights - orange
        graphics.fillStyle(Constants.COLORS.SLIME_HIGHLIGHT);
        graphics.fillRect(8, 10, 2, 2);
        graphics.fillRect(22, 16, 3, 2);

        // Generate the texture
        graphics.generateTexture(
            Constants.TEXTURES.SLIME,
            Constants.DIMENSIONS.SLIME_WIDTH,
            Constants.DIMENSIONS.SLIME_HEIGHT
        );
        graphics.destroy();
    }

    /**
     * Generates the goblin enemy texture
     * Creates a humanoid enemy with purple body, green skin, and red eyes
     * @param {Phaser.Scene} scene - The scene to generate the texture in
     */
    static generateGoblinTexture(scene) {
        const graphics = scene.make.graphics();

        // Body - purple
        graphics.fillStyle(Constants.COLORS.GOBLIN_BODY);
        graphics.fillRect(8, 16, 16, 16);

        // Head - green skin
        graphics.fillStyle(Constants.COLORS.GOBLIN_SKIN);
        graphics.fillRect(8, 4, 16, 12);

        // Ears - green skin
        graphics.fillStyle(Constants.COLORS.GOBLIN_SKIN);
        graphics.fillRect(4, 8, 4, 8);
        graphics.fillRect(24, 8, 4, 8);

        // Eyes - red
        graphics.fillStyle(Constants.COLORS.GOBLIN_EYES);
        graphics.fillRect(10, 8, 4, 4);
        graphics.fillRect(18, 8, 4, 4);

        // Arms - purple sleeves
        graphics.fillStyle(Constants.COLORS.GOBLIN_BODY);
        graphics.fillRect(4, 16, 4, 12);
        graphics.fillRect(24, 16, 4, 12);

        // Hands - green skin
        graphics.fillStyle(Constants.COLORS.GOBLIN_SKIN);
        graphics.fillRect(4, 28, 4, 4);
        graphics.fillRect(24, 28, 4, 4);

        // Legs - dark purple pants
        graphics.fillStyle(Constants.COLORS.GOBLIN_PANTS);
        graphics.fillRect(8, 32, 6, 16);
        graphics.fillRect(18, 32, 6, 16);

        // Generate the texture
        graphics.generateTexture(
            Constants.TEXTURES.GOBLIN,
            Constants.DIMENSIONS.GOBLIN_WIDTH,
            Constants.DIMENSIONS.GOBLIN_HEIGHT
        );
        graphics.destroy();
    }

    /**
     * Generates the grass/bush texture
     * Creates varied grass blades growing upward from bottom, designed to align with ground
     * @param {Phaser.Scene} scene - The scene to generate the texture in
     */
    static generateGrassTexture(scene) {
        const graphics = scene.make.graphics();
        const textureWidth = Constants.DIMENSIONS.GRASS_WIDTH;
        const textureHeight = Constants.DIMENSIONS.GRASS_HEIGHT;

        // Main grass blades - bright green
        graphics.fillStyle(Constants.COLORS.GRASS_GREEN);
        
        // Create varied bush shapes - all starting from bottom
        for (let i = 0; i < 12; i++) {
            const x = i * 5 + Math.random() * 2;
            const height = 20 + Math.random() * 15;
            const width = 4 + Math.random() * 3;
            graphics.fillRect(x, textureHeight - height, width, height);
        }

        // Add highlights - lighter green
        graphics.fillStyle(Constants.COLORS.GRASS_LIGHT);
        for (let i = 0; i < 6; i++) {
            const x = i * 10 + Math.random() * 5;
            const height = 15 + Math.random() * 10;
            const width = 2 + Math.random() * 2;
            graphics.fillRect(x, textureHeight - height, width, height);
        }

        // Add darker base layer
        graphics.fillStyle(Constants.COLORS.GRASS_DARK);
        graphics.fillRect(0, textureHeight - 10, textureWidth, 10);

        // Add individual darker grass blades
        for (let i = 0; i < 8; i++) {
            const x = i * 8 + Math.random() * 4;
            const height = 12 + Math.random() * 8;
            const width = 3 + Math.random() * 2;
            graphics.fillRect(x, textureHeight - height, width, height);
        }

        // Generate the texture
        graphics.generateTexture(Constants.TEXTURES.GRASS, textureWidth, textureHeight);
        graphics.destroy();
    }

    /**
     * Generates the platform texture
     * Creates a brown platform with grass on top and dirt details
     * @param {Phaser.Scene} scene - The scene to generate the texture in
     */
    static generatePlatformTexture(scene) {
        const graphics = scene.make.graphics();

        // Main platform body - brown base
        graphics.fillStyle(Constants.COLORS.PLATFORM_BROWN);
        graphics.fillRect(0, 0, Constants.DIMENSIONS.PLATFORM_WIDTH, Constants.DIMENSIONS.PLATFORM_HEIGHT);

        // Top grass layer - green
        graphics.fillStyle(Constants.COLORS.GRASS_GREEN);
        graphics.fillRect(0, 0, Constants.DIMENSIONS.PLATFORM_WIDTH, 6);

        // Dirt details - darker brown
        graphics.fillStyle(Constants.COLORS.PLATFORM_DARK);
        
        // Add pixel details to make it look more natural
        for (let i = 0; i < 10; i++) {
            const x = i * 10 + Math.floor(Math.random() * 5);
            const y = 10 + Math.floor(Math.random() * 15);
            const width = 4 + Math.floor(Math.random() * 6);
            const height = 4 + Math.floor(Math.random() * 6);
            graphics.fillRect(x, y, width, height);
        }

        // Generate the texture
        graphics.generateTexture(
            Constants.TEXTURES.PLATFORM,
            Constants.DIMENSIONS.PLATFORM_WIDTH,
            Constants.DIMENSIONS.PLATFORM_HEIGHT
        );
        graphics.destroy();
    }

    /**
     * Generates the battle background texture
     * Creates a night sky with stars, mountains, and ground
     * @param {Phaser.Scene} scene - The scene to generate the texture in
     */
    static generateBattleBackground(scene) {
        const graphics = scene.make.graphics();

        // Sky gradient background - dark blue
        graphics.fillGradientStyle(
            Constants.COLORS.BATTLE_BG_DARK,
            Constants.COLORS.BATTLE_BG_DARK,
            Constants.COLORS.BATTLE_BG_LIGHT,
            Constants.COLORS.BATTLE_BG_LIGHT,
            1
        );
        graphics.fillRect(0, 0, Constants.DIMENSIONS.GAME_WIDTH, Constants.DIMENSIONS.GAME_HEIGHT);

        // Add stars - white
        graphics.fillStyle(Constants.COLORS.WHITE);
        for (let i = 0; i < Constants.NUMBERS.STAR_COUNT; i++) {
            const x = Math.floor(Math.random() * Constants.DIMENSIONS.GAME_WIDTH);
            const y = Math.floor(Math.random() * 400);
            const size = Math.random() < 0.8 ? 1 : 2; // Mostly small stars
            graphics.fillRect(x, y, size, size);
        }

        // Add distant mountains - dark gray
        graphics.fillStyle(Constants.COLORS.MOUNTAIN_DARK);
        
        // First mountain range
        graphics.beginPath();
        graphics.moveTo(0, 400);
        for (let x = 0; x < Constants.DIMENSIONS.GAME_WIDTH; x += 100) {
            const height = 50 + Math.floor(Math.random() * 50);
            graphics.lineTo(x, 400 - height);
            graphics.lineTo(x + 50, 400 - height / 2);
        }
        graphics.lineTo(Constants.DIMENSIONS.GAME_WIDTH, 400);
        graphics.closePath();
        graphics.fill();

        // Ground - dark gray
        graphics.fillStyle(Constants.COLORS.GROUND_DARK);
        graphics.fillRect(0, 400, Constants.DIMENSIONS.GAME_WIDTH, 200);

        // Generate the texture
        graphics.generateTexture(
            Constants.TEXTURES.BATTLE_BG,
            Constants.DIMENSIONS.GAME_WIDTH,
            Constants.DIMENSIONS.GAME_HEIGHT
        );
        graphics.destroy();
    }

    /**
     * Generates the button texture
     * Creates a simple dark gray button background
     * @param {Phaser.Scene} scene - The scene to generate the texture in
     */
    static generateButtonTexture(scene) {
        const graphics = scene.make.graphics();
        
        // Dark gray button
        graphics.fillStyle(Constants.COLORS.BUTTON_GRAY);
        graphics.fillRect(0, 0, Constants.DIMENSIONS.BUTTON_WIDTH, Constants.DIMENSIONS.BUTTON_HEIGHT);
        
        // Generate the texture
        graphics.generateTexture(
            Constants.TEXTURES.BUTTON,
            Constants.DIMENSIONS.BUTTON_WIDTH,
            Constants.DIMENSIONS.BUTTON_HEIGHT
        );
        graphics.destroy();
    }

    /**
     * Generates all game textures at once
     * Should be called during the preload phase
     * @param {Phaser.Scene} scene - The scene to generate textures in
     */
    static generateAllTextures(scene) {
        console.log('AssetManager: Generating all textures...');
        
        try {
            this.generatePlayerTexture(scene);
            this.generateSlimeTexture(scene);
            this.generateGoblinTexture(scene);
            this.generateGrassTexture(scene);
            this.generatePlatformTexture(scene);
            this.generateBattleBackground(scene);
            this.generateButtonTexture(scene);
            
            console.log('AssetManager: All textures generated successfully');
            return true;
        } catch (error) {
            console.error('AssetManager: Error generating textures:', error);
            return false;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AssetManager;
}
// Make AssetManager globally available
window.AssetManager = AssetManager;