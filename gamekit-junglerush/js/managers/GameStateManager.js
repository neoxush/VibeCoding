/**
 * GameStateManager
 * Manages the global game state including player stats, level, score, and enemies defeated
 */
class GameStateManager {
    /**
     * Creates a new GameStateManager instance
     * Initializes all game state variables to their default values
     */
    constructor() {
        this.reset();
    }
    
    /**
     * Resets all game state to initial values
     * Used when starting a new game or restarting after game over
     */
    reset() {
        // Use GameConfig if available, otherwise use default values
        const config = (typeof GameConfig !== 'undefined') ? GameConfig : {
            player: { health: 100, maxHealth: 100, attack: 20, defense: 10 }
        };
        
        this._playerHealth = config.player.health;
        this._playerMaxHealth = config.player.maxHealth;
        this._playerAttack = config.player.attack;
        this._playerDefense = config.player.defense;
        this._level = 1;
        this._score = 0;
        this._enemiesDefeated = 0;
    }
    
    // Player Health Management
    
    /**
     * Gets the current player health
     * @returns {number} Current player health
     */
    getPlayerHealth() {
        return this._playerHealth;
    }
    
    /**
     * Sets the player health to a specific value
     * Clamps the value between 0 and max health
     * @param {number} value - The new health value
     */
    setPlayerHealth(value) {
        this._playerHealth = Math.max(0, Math.min(value, this._playerMaxHealth));
    }
    
    /**
     * Reduces player health by a damage amount
     * @param {number} damage - Amount of damage to apply
     * @returns {number} The new health value after damage
     */
    damagePlayer(damage) {
        this._playerHealth = Math.max(0, this._playerHealth - damage);
        return this._playerHealth;
    }
    
    /**
     * Restores player health by a heal amount
     * Cannot exceed max health
     * @param {number} amount - Amount of health to restore
     * @returns {number} The new health value after healing
     */
    healPlayer(amount) {
        this._playerHealth = Math.min(this._playerMaxHealth, this._playerHealth + amount);
        return this._playerHealth;
    }
    
    /**
     * Checks if the player is alive
     * @returns {boolean} True if player health is greater than 0
     */
    isPlayerAlive() {
        return this._playerHealth > 0;
    }
    
    /**
     * Gets the player's maximum health
     * @returns {number} Maximum player health
     */
    getPlayerMaxHealth() {
        return this._playerMaxHealth;
    }
    
    // Player Attack Management
    
    /**
     * Gets the current player attack value
     * @returns {number} Current player attack
     */
    getPlayerAttack() {
        return this._playerAttack;
    }
    
    /**
     * Sets the player attack to a specific value
     * @param {number} value - The new attack value
     */
    setPlayerAttack(value) {
        this._playerAttack = Math.max(0, value);
    }
    
    /**
     * Increases player attack by a specific amount
     * @param {number} amount - Amount to increase attack by
     * @returns {number} The new attack value
     */
    increasePlayerAttack(amount) {
        this._playerAttack += amount;
        return this._playerAttack;
    }
    
    // Player Defense Management
    
    /**
     * Gets the current player defense value
     * @returns {number} Current player defense
     */
    getPlayerDefense() {
        return this._playerDefense;
    }
    
    /**
     * Sets the player defense to a specific value
     * @param {number} value - The new defense value
     */
    setPlayerDefense(value) {
        this._playerDefense = Math.max(0, value);
    }
    
    /**
     * Temporarily increases player defense (used for defend action)
     * @param {number} amount - Amount to increase defense by
     * @returns {number} The new defense value
     */
    increasePlayerDefense(amount) {
        this._playerDefense += amount;
        return this._playerDefense;
    }
    
    /**
     * Resets player defense to the base value
     * Used after defend bonus expires
     */
    resetPlayerDefense() {
        this._playerDefense = GameConfig.player.defense;
    }
    
    // Level Management
    
    /**
     * Gets the current level
     * @returns {number} Current level number
     */
    getLevel() {
        return this._level;
    }
    
    /**
     * Sets the level to a specific value
     * @param {number} value - The new level number
     */
    setLevel(value) {
        this._level = Math.max(1, value);
    }
    
    /**
     * Advances to the next level
     * @returns {number} The new level number
     */
    nextLevel() {
        this._level++;
        return this._level;
    }
    
    // Score Management
    
    /**
     * Gets the current score
     * @returns {number} Current score
     */
    getScore() {
        return this._score;
    }
    
    /**
     * Sets the score to a specific value
     * @param {number} value - The new score value
     */
    setScore(value) {
        this._score = Math.max(0, value);
    }
    
    /**
     * Adds points to the current score
     * @param {number} points - Points to add
     * @returns {number} The new score value
     */
    addScore(points) {
        this._score += points;
        return this._score;
    }
    
    // Enemies Defeated Management
    
    /**
     * Gets the number of enemies defeated
     * @returns {number} Total enemies defeated
     */
    getEnemiesDefeated() {
        return this._enemiesDefeated;
    }
    
    /**
     * Sets the enemies defeated count to a specific value
     * @param {number} value - The new enemies defeated count
     */
    setEnemiesDefeated(value) {
        this._enemiesDefeated = Math.max(0, value);
    }
    
    /**
     * Increments the enemies defeated counter
     * @returns {number} The new enemies defeated count
     */
    incrementEnemiesDefeated() {
        this._enemiesDefeated++;
        return this._enemiesDefeated;
    }
    
    // Utility Methods
    
    /**
     * Gets all game state as an object
     * Useful for saving or displaying game statistics
     * @returns {Object} Object containing all game state values
     */
    getState() {
        return {
            playerHealth: this._playerHealth,
            playerMaxHealth: this._playerMaxHealth,
            playerAttack: this._playerAttack,
            playerDefense: this._playerDefense,
            level: this._level,
            score: this._score,
            enemiesDefeated: this._enemiesDefeated
        };
    }
    
    /**
     * Restores game state from an object
     * Useful for loading saved games
     * @param {Object} state - Object containing game state values
     */
    setState(state) {
        if (state.playerHealth !== undefined) this._playerHealth = state.playerHealth;
        if (state.playerMaxHealth !== undefined) this._playerMaxHealth = state.playerMaxHealth;
        if (state.playerAttack !== undefined) this._playerAttack = state.playerAttack;
        if (state.playerDefense !== undefined) this._playerDefense = state.playerDefense;
        if (state.level !== undefined) this._level = state.level;
        if (state.score !== undefined) this._score = state.score;
        if (state.enemiesDefeated !== undefined) this._enemiesDefeated = state.enemiesDefeated;
    }
}

// Make GameStateManager globally available
window.GameStateManager = GameStateManager;

// Create a singleton instance for global access
const gameStateManager = new GameStateManager();
window.gameStateManager = gameStateManager;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameStateManager, gameStateManager };
}
