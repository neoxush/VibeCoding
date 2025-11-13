import * as THREE from 'three';
import { GameEngine } from './core/GameEngine.js';
import './styles/main.css';

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const loadingScreen = document.getElementById('loadingScreen');
    
    // Create game engine instance
    const gameEngine = new GameEngine(canvas);
    
    // Initialize the game
    gameEngine.initialize().then(() => {
        // Hide loading screen
        loadingScreen.style.display = 'none';
        
        // Start the game loop
        gameEngine.start();
        
        console.log('Match-3 Tower Defense initialized successfully!');
    }).catch((error) => {
        console.error('Failed to initialize game:', error);
        loadingScreen.innerHTML = '<div style="color: #ff6b6b;">Failed to load game. Please refresh the page.</div>';
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        gameEngine.handleResize();
    });
    
    // Prevent context menu on right click
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
});