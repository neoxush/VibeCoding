import * as THREE from 'three';
import { SceneManager } from './SceneManager';
import { InputHandler } from './InputHandler';
import { PerformanceTracker } from './PerformanceTracker';
import { WordRainMode } from '../modes/WordRainMode';

export class GameEngine {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  
  private sceneManager: SceneManager;
  private inputHandler: InputHandler;
  private performanceTracker: PerformanceTracker;
  private wordRainMode: WordRainMode | null = null;
  private isRunning: boolean = false;
  private animationId: number | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    
    this.sceneManager = new SceneManager(this.scene, this.camera);
    this.inputHandler = new InputHandler();
    this.performanceTracker = new PerformanceTracker();
    
    this.setupRenderer();
    this.setupEventListeners();
  }

  private setupRenderer(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public async initialize(): Promise<void> {
    try {
      await this.sceneManager.initialize();
      this.inputHandler.initialize();
      this.performanceTracker.initialize();
      
      // Initialize Word Rain mode
      this.wordRainMode = new WordRainMode(
        this.scene,
        this.inputHandler,
        this.performanceTracker,
        this.sceneManager.getGroundY()
      );
      await this.wordRainMode.initialize();
      
      console.log('GameEngine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize GameEngine:', error);
      throw error;
    }
  }

  public startGame(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.performanceTracker.startSession();
    this.gameLoop();
    
    console.log('Game started');
  }

  public pauseGame(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public endGame(): void {
    this.pauseGame();
    this.performanceTracker.endSession();
    console.log('Game ended');
  }

  private gameLoop(): void {
    if (!this.isRunning) return;

    const deltaTime = this.performanceTracker.update();
    
    this.sceneManager.update(deltaTime);
    this.inputHandler.update();
    this.wordRainMode?.update(deltaTime);
    this.updateUI();
    
    this.renderer.render(this.scene, this.camera);
    
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private updateUI(): void {
    const stats = this.performanceTracker.getCurrentStats();
    
    const wpmElement = document.getElementById('wpm');
    const accuracyElement = document.getElementById('accuracy');
    const scoreElement = document.getElementById('score');
    
    if (wpmElement) wpmElement.textContent = Math.round(stats.wpm).toString();
    if (accuracyElement) accuracyElement.textContent = Math.round(stats.accuracy).toString();
    if (scoreElement) scoreElement.textContent = stats.score.toString();
  }

  public dispose(): void {
    this.endGame();
    this.wordRainMode?.dispose();
    this.sceneManager.dispose();
    this.renderer.dispose();
    window.removeEventListener('resize', this.handleResize.bind(this));
  }
}