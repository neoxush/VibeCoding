import { GameEngine } from './core/GameEngine';

// Initialize the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing game...');
  
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }
  
  console.log('Canvas found, creating game engine...');
  const game = new GameEngine(canvas);
  
  game.initialize().then(() => {
    console.log('Game initialized successfully, starting game...');
    game.startGame();
  }).catch((error) => {
    console.error('Failed to initialize game:', error);
  });
});