/**
 * Constants
 * Named constants to replace magic numbers throughout the codebase
 */

const Constants = {
    // Color constants (from art style guide)
    COLORS: {
        // Player colors
        PLAYER_SHIRT: 0x3498db,
        PLAYER_SKIN: 0xf5d7b4,
        PLAYER_HAIR: 0x8b4513,
        PLAYER_PANTS: 0x2c3e50,
        
        // Slime enemy colors
        SLIME_BODY: 0xe74c3c,
        SLIME_SHADING: 0xc0392b,
        SLIME_HIGHLIGHT: 0xf39c12,
        
        // Goblin enemy colors
        GOBLIN_BODY: 0x8e44ad,
        GOBLIN_SKIN: 0x27ae60,
        GOBLIN_PANTS: 0x4a235a,
        GOBLIN_EYES: 0xff0000,
        
        // Environment colors
        SKY_BLUE: 0x87ceeb,
        SKY_LIGHT: 0xadd8e6,
        MOUNTAIN_GRAY: 0x6a8caf,
        PLATFORM_BROWN: 0x8b4513,
        PLATFORM_DARK: 0x6e4a1c,
        GRASS_GREEN: 0x2ecc71,
        GRASS_DARK: 0x27ae60,
        GRASS_LIGHT: 0x3ce681,
        GROUND_DARK: 0x34495e,
        
        // UI colors
        WHITE: 0xffffff,
        BLACK: 0x000000,
        BUTTON_GRAY: 0x444444,
        BUTTON_HOVER: 0x666666,
        BATTLE_BG_DARK: 0x000033,
        BATTLE_BG_LIGHT: 0x0a1a3f,
        MOUNTAIN_DARK: 0x2c3e50,
        
        // Danger colors
        LAVA_RED: 0xff0000,
        LAVA_ORANGE: 0xff6600,
        
        // Health bar colors
        HEALTH_PLAYER: 0x3498db,
        HEALTH_ENEMY: 0xff0000,
        HEALTH_BG: 0x333333,
        HEALTH_BORDER: 0xffffff
    },
    
    // Dimension constants
    DIMENSIONS: {
        GAME_WIDTH: 800,
        GAME_HEIGHT: 600,
        WORLD_WIDTH: 2400,
        WORLD_HEIGHT: 600,
        
        PLAYER_WIDTH: 32,
        PLAYER_HEIGHT: 48,
        
        SLIME_WIDTH: 32,
        SLIME_HEIGHT: 32,
        
        GOBLIN_WIDTH: 32,
        GOBLIN_HEIGHT: 48,
        
        PLATFORM_WIDTH: 100,
        PLATFORM_HEIGHT: 32,
        
        GRASS_WIDTH: 60,
        GRASS_HEIGHT: 40,
        
        BUTTON_WIDTH: 150,
        BUTTON_HEIGHT: 50,
        
        HEALTH_BAR_WIDTH: 200,
        HEALTH_BAR_HEIGHT: 20
    },
    
    // Physics constants
    PHYSICS: {
        GRAVITY: 300,
        PLAYER_MOVE_SPEED: 160,
        PLAYER_JUMP_SPEED: -330,
        ENEMY_JUMP_SPEED: -300,
        AIR_SPEED_MULTIPLIER: 0.8
    },
    
    // Battle constants
    BATTLE: {
        SPECIAL_MULTIPLIER: 1.5,
        SPECIAL_HEALTH_COST: 10,
        DEFEND_BONUS: 5,
        MIN_DAMAGE: 1,
        SCORE_PER_ENEMY: 100,
        SCORE_PER_LEVEL: 500
    },
    
    // Animation duration constants (in milliseconds)
    ANIMATION_DURATIONS: {
        IDLE_BREATHING: 1500,
        SLIME_PULSE: 1000,
        GOBLIN_BREATHING: 1200,
        WALKING_BOB: 150,
        JUMP_SQUASH: 100,
        LAND_SQUASH: 100,
        GRASS_RUSTLE: 200,
        FADE_IN: 300,
        FADE_OUT: 300,
        ATTACK_MOVE: 200,
        DAMAGE_FLASH: 100,
        DEATH_FADE: 1000,
        BATTLE_TEXT_DELAY: 1500,
        LAVA_PULSE: 1500
    },
    
    // Scale constants
    SCALES: {
        IDLE_BREATHING: 1.03,
        SLIME_PULSE_X: 1.1,
        SLIME_PULSE_Y: 0.9,
        JUMP_SQUASH_X: 0.8,
        JUMP_SQUASH_Y: 1.2,
        LAND_SQUASH_X: 1.2,
        LAND_SQUASH_Y: 0.8,
        GRASS_RUSTLE_X: 1.1,
        GRASS_RUSTLE_Y: 0.95,
        BATTLE_SPRITE: 3,
        SPECIAL_ATTACK: 3.5
    },
    
    // Alpha/transparency constants
    ALPHA: {
        PLAYER_IN_GRASS: 0.2,
        ENEMY_IN_GRASS: 0.6,
        DAMAGE_FLASH: 0.5,
        DAMAGE_FLASH_MIN: 0.3,
        DEFEND_FLASH: 0.7,
        LAVA_MIN: 0.6,
        LAVA_MAX: 0.8
    },
    
    // Depth/layer constants
    DEPTH: {
        BACKGROUND: -1,
        MOUNTAINS: 0,
        PLATFORMS: 1,
        GRASS: 10,
        ENEMY_IN_GRASS: 5,
        ENTITIES: 20,
        UI: 100
    },
    
    // Enemy AI constants
    AI: {
        MAX_FALL_TIME: 60,
        EDGE_CHECK_DISTANCE: 10,
        DIRECTION_CHANGE_INTERVAL: 180,
        PAUSE_CHANCE: 0.02,
        PAUSE_DURATION: 60,
        JUMP_COOLDOWN: 30
    },
    
    // Level constants
    LEVEL: {
        GROUND_Y: 550,
        KILLZONE_Y: 590,
        KILLZONE_HEIGHT: 60,
        KILLZONE_COLLISION_Y: 620,
        HEALTH_RESTORE_PERCENT: 0.3,
        ENEMY_HEALTH_SCALING: 1.2,
        ENEMY_ATTACK_SCALING: 1.15
    },
    
    // Text style constants
    TEXT_STYLES: {
        TITLE: {
            fontSize: '32px',
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 4,
            fontFamily: 'Arial'
        },
        BATTLE_TEXT: {
            fontSize: '24px',
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 3,
            fontFamily: 'monospace'
        },
        UI_TEXT: {
            fontSize: '18px',
            fill: '#fff',
            fontFamily: 'monospace'
        },
        BUTTON_TEXT: {
            fontSize: '24px',
            fill: '#fff',
            fontFamily: 'Arial'
        },
        INSTRUCTION_TEXT: {
            fontSize: '18px',
            fill: '#000',
            backgroundColor: '#fff'
        }
    },
    
    // Scene names
    SCENES: {
        BOOT: 'BootScene',
        PRELOAD: 'PreloadScene',
        GAME: 'GameScene',
        BATTLE: 'BattleScene',
        UI: 'UIScene',
        GAME_OVER: 'GameOverScene'
    },
    
    // Texture names
    TEXTURES: {
        PLAYER: 'player',
        SLIME: 'slime',
        GOBLIN: 'goblin',
        PLATFORM: 'platform',
        GRASS: 'grass',
        BATTLE_BG: 'battle-bg',
        BUTTON: 'button'
    },
    
    // Event names
    EVENTS: {
        BATTLE_END: 'battle-end',
        LEVEL_COMPLETE: 'level-complete',
        PLAYER_DEATH: 'player-death',
        ENEMY_DEFEATED: 'enemy-defeated'
    },
    
    // Battle results
    BATTLE_RESULTS: {
        VICTORY: 'victory',
        DEFEAT: 'defeat'
    },
    
    // Battle actions
    BATTLE_ACTIONS: {
        ATTACK: 'attack',
        DEFEND: 'defend',
        SPECIAL: 'special'
    },
    
    // Enemy states
    ENEMY_STATES: {
        MOVING: 'moving',
        PAUSED: 'paused',
        JUMPING: 'jumping',
        FALLING: 'falling'
    },
    
    // Numeric constants
    NUMBERS: {
        CLOUD_COUNT: 20,
        STAR_COUNT: 100,
        PLATFORM_COUNT: 30,
        REPEAT_FOREVER: -1,
        ZERO: 0,
        ONE: 1,
        HALF: 0.5
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Constants;
}
