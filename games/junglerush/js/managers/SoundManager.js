/**
 * SoundManager
 * Handles procedural sound generation using Web Audio API
 * Creates simple sound effects for game actions
 */
class SoundManager {
    /**
     * Creates a new SoundManager instance
     * Initializes the Web Audio API context
     */
    constructor() {
        this.audioContext = null;
        this.enabled = false;
        this.initialize();
    }

    /**
     * Initializes the Web Audio API context
     * Handles browser compatibility and user interaction requirements
     */
    initialize() {
        try {
            // Create audio context (with browser prefixes for compatibility)
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.audioContext = new AudioContext();
                this.enabled = true;
                console.log('SoundManager: Web Audio API initialized successfully');
            } else {
                console.warn('SoundManager: Web Audio API not supported');
                this.enabled = false;
            }
        } catch (error) {
            console.error('SoundManager: Error initializing Web Audio API:', error);
            this.enabled = false;
        }
    }

    /**
     * Resumes the audio context if it's suspended
     * Required for browsers that suspend audio context until user interaction
     */
    async resumeContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
                console.log('SoundManager: Audio context resumed');
            } catch (error) {
                console.error('SoundManager: Error resuming audio context:', error);
            }
        }
    }

    /**
     * Creates an oscillator node with specified parameters
     * @param {number} frequency - The frequency in Hz
     * @param {string} type - The oscillator type ('sine', 'square', 'sawtooth', 'triangle')
     * @param {number} duration - The duration in seconds
     * @returns {OscillatorNode} The created oscillator node
     * @private
     */
    _createOscillator(frequency, type, duration) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        
        // Connect oscillator to gain node to audio context destination
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Set up envelope (attack, decay, sustain, release)
        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01); // Attack
        gainNode.gain.linearRampToValueAtTime(0.1, now + duration * 0.5); // Decay
        gainNode.gain.linearRampToValueAtTime(0, now + duration); // Release
        
        return { oscillator, gainNode };
    }

    /**
     * Plays the attack sound effect
     * Creates a swoosh/hit sound using frequency sweep
     */
    playAttack() {
        if (!this.enabled) return;
        
        this.resumeContext();
        
        try {
            const { oscillator, gainNode } = this._createOscillator(200, 'sawtooth', 0.2);
            
            // Frequency sweep for swoosh effect
            oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.2);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.2);
        } catch (error) {
            console.error('SoundManager: Error playing attack sound:', error);
        }
    }

    /**
     * Plays the hurt/damage sound effect
     * Creates a descending tone to indicate taking damage
     */
    playHurt() {
        if (!this.enabled) return;
        
        this.resumeContext();
        
        try {
            const { oscillator, gainNode } = this._createOscillator(400, 'square', 0.15);
            
            // Descending frequency for hurt effect
            oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.15);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.15);
        } catch (error) {
            console.error('SoundManager: Error playing hurt sound:', error);
        }
    }

    /**
     * Plays the jump sound effect
     * Creates an ascending tone for jumping action
     */
    playJump() {
        if (!this.enabled) return;
        
        this.resumeContext();
        
        try {
            const { oscillator, gainNode } = this._createOscillator(200, 'sine', 0.1);
            
            // Ascending frequency for jump effect
            oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.1);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.1);
        } catch (error) {
            console.error('SoundManager: Error playing jump sound:', error);
        }
    }

    /**
     * Plays the victory sound effect
     * Creates an ascending arpeggio for victory
     */
    playVictory() {
        if (!this.enabled) return;
        
        this.resumeContext();
        
        try {
            // Play three notes in sequence (C, E, G major chord)
            const notes = [261.63, 329.63, 392.00]; // C4, E4, G4
            
            notes.forEach((frequency, index) => {
                const { oscillator, gainNode } = this._createOscillator(frequency, 'sine', 0.2);
                const startTime = this.audioContext.currentTime + (index * 0.1);
                
                oscillator.start(startTime);
                oscillator.stop(startTime + 0.2);
            });
        } catch (error) {
            console.error('SoundManager: Error playing victory sound:', error);
        }
    }

    /**
     * Plays the death/defeat sound effect
     * Creates a descending tone sequence for defeat
     */
    playDeath() {
        if (!this.enabled) return;
        
        this.resumeContext();
        
        try {
            const { oscillator, gainNode } = this._createOscillator(300, 'triangle', 0.5);
            
            // Descending frequency for death effect
            oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.5);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.5);
        } catch (error) {
            console.error('SoundManager: Error playing death sound:', error);
        }
    }

    /**
     * Plays the defend sound effect
     * Creates a shield-like sound using low frequency
     */
    playDefend() {
        if (!this.enabled) return;
        
        this.resumeContext();
        
        try {
            const { oscillator, gainNode } = this._createOscillator(150, 'square', 0.15);
            
            // Stable low frequency for defend effect
            oscillator.frequency.setValueAtTime(150, this.audioContext.currentTime);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.15);
        } catch (error) {
            console.error('SoundManager: Error playing defend sound:', error);
        }
    }

    /**
     * Plays the special attack sound effect
     * Creates a more dramatic sound with multiple frequencies
     */
    playSpecial() {
        if (!this.enabled) return;
        
        this.resumeContext();
        
        try {
            // Play two oscillators simultaneously for richer sound
            const { oscillator: osc1, gainNode: gain1 } = this._createOscillator(300, 'sawtooth', 0.3);
            const { oscillator: osc2, gainNode: gain2 } = this._createOscillator(450, 'square', 0.3);
            
            // Frequency sweeps for dramatic effect
            osc1.frequency.exponentialRampToValueAtTime(150, this.audioContext.currentTime + 0.3);
            osc2.frequency.exponentialRampToValueAtTime(225, this.audioContext.currentTime + 0.3);
            
            // Reduce volume of second oscillator
            gain2.gain.setValueAtTime(0, this.audioContext.currentTime);
            gain2.gain.linearRampToValueAtTime(0.15, this.audioContext.currentTime + 0.01);
            gain2.gain.linearRampToValueAtTime(0.05, this.audioContext.currentTime + 0.15);
            gain2.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.3);
            
            osc1.start(this.audioContext.currentTime);
            osc1.stop(this.audioContext.currentTime + 0.3);
            osc2.start(this.audioContext.currentTime);
            osc2.stop(this.audioContext.currentTime + 0.3);
        } catch (error) {
            console.error('SoundManager: Error playing special sound:', error);
        }
    }

    /**
     * Enables sound playback
     */
    enable() {
        this.enabled = true;
        console.log('SoundManager: Sound enabled');
    }

    /**
     * Disables sound playback
     */
    disable() {
        this.enabled = false;
        console.log('SoundManager: Sound disabled');
    }

    /**
     * Checks if sound is enabled
     * @returns {boolean} True if sound is enabled
     */
    isEnabled() {
        return this.enabled;
    }
}

// Create a singleton instance for global access
const soundManager = new SoundManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SoundManager, soundManager };
}
