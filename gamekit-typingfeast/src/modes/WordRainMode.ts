import * as THREE from 'three';
import { TextRenderer } from '../core/TextRenderer';
import { InputHandler } from '../core/InputHandler';
import { PerformanceTracker } from '../core/PerformanceTracker';

interface FallingWord {
  id: string;
  text: string;
  mesh: THREE.Group;
  fallSpeed: number;
  timeLimit: number;
  isActive: boolean;
}

export class WordRainMode {
  private words: FallingWord[] = [];
  private currentWord: FallingWord | null = null;
  private textRenderer: TextRenderer;
  private wordList: string[] = [
    'hello', 'world', 'typing', 'game', 'three', 'webgl', 'javascript',
    'code', 'fast', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy',
    'dog', 'pack', 'quiz', 'just', 'vex', 'bold', 'gym', 'fizz',
    'when', 'zombies', 'arrive', 'quickly', 'fax', 'judge', 'power'
  ];
  private spawnTimer: number = 0;
  private spawnInterval: number = 3000; // 3 seconds
  private groundY: number = -5;
  private nextWordId: number = 0;

  constructor(
    private scene: THREE.Scene,
    private inputHandler: InputHandler,
    private performanceTracker: PerformanceTracker,
    groundY: number = -5
  ) {
    this.textRenderer = new TextRenderer();
    this.groundY = groundY;
    this.setupInputHandlers();
  }

  public async initialize(): Promise<void> {
    console.log('Initializing WordRainMode...');
    await this.textRenderer.initialize();
    console.log('TextRenderer initialized, spawning first word...');
    this.spawnWord();
    console.log('WordRainMode initialization complete');
  }

  private setupInputHandlers(): void {
    this.inputHandler.onWordCompleteCallback((word: string, accuracy: number) => {
      this.handleWordComplete(word, accuracy);
    });

    this.inputHandler.onErrorCallback(() => {
      this.performanceTracker.recordError();
    });
  }

  private spawnWord(): void {
    const word = this.getRandomWord();
    const wordId = `word_${this.nextWordId++}`;
    
    console.log(`Spawning word: "${word}"`);
    
    // Random X position
    const x = (Math.random() - 0.5) * 20;
    const startY = 10;
    const z = (Math.random() - 0.5) * 5;
    
    const position = new THREE.Vector3(x, startY, z);
    const mesh = this.textRenderer.createTextMesh(word, position, 1.0);
    
    this.scene.add(mesh);
    this.textRenderer.animateTextEntry(mesh);
    
    const fallingWord: FallingWord = {
      id: wordId,
      text: word,
      mesh,
      fallSpeed: 1 + Math.random() * 0.5, // Random fall speed
      timeLimit: 8000 + word.length * 500, // Time based on word length
      isActive: true
    };
    
    this.words.push(fallingWord);
    
    // Set as current word if none is active
    if (!this.currentWord) {
      this.setCurrentWord(fallingWord);
    }
    
    console.log(`Word "${word}" spawned at position:`, position);
  }

  private getRandomWord(): string {
    return this.wordList[Math.floor(Math.random() * this.wordList.length)];
  }

  private setCurrentWord(word: FallingWord): void {
    this.currentWord = word;
    this.inputHandler.setCurrentWord(word.text);
    
    // Highlight current word
    this.highlightWord(word, true);
    
    // Add visual indicator (arrow) to show current word
    this.addCurrentWordIndicator(word);
  }

  private highlightWord(word: FallingWord, highlight: boolean): void {
    const children = word.mesh.children as THREE.Group[];
    children.forEach(charGroup => {
      // Each character is now a Group containing a Mesh
      const charMesh = charGroup.children[0] as THREE.Mesh;
      if (charMesh && charMesh.material) {
        const material = charMesh.material as THREE.MeshBasicMaterial;
        
        if (highlight) {
          // Make the word slightly brighter and bigger when highlighted
          material.color.multiplyScalar(1.3); // Brighten
          word.mesh.scale.setScalar(1.2);
        } else {
          // Reset to normal brightness and size
          material.color.setHex(0xffffff); // Reset to white
          word.mesh.scale.setScalar(1.0);
        }
      }
    });
  }

  private addCurrentWordIndicator(word: FallingWord): void {
    // Remove existing indicator if any
    this.removeCurrentWordIndicator();
    
    // Create arrow indicator using LetterGeometry
    const arrowGroup = this.textRenderer.createTextMesh('>', new THREE.Vector3(0, 0, 0), 1.0);
    
    // Position the arrow to the left of the word (relative to word position)
    const wordBounds = this.getWordBounds(word.mesh);
    arrowGroup.position.set(
      wordBounds.left - 1.2, // Left of the word (relative position)
      0, // Same Y as word
      0  // Same Z as word
    );
    
    // Make the arrow yellow/orange for visibility
    const arrowMesh = arrowGroup.children[0] as THREE.Group;
    if (arrowMesh && arrowMesh.children[0]) {
      const mesh = arrowMesh.children[0] as THREE.Mesh;
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.color.setHex(0xffaa00); // Orange color
      
      // Add blinking animation data
      arrowGroup.userData.blinkTimer = 0;
      arrowGroup.userData.isVisible = true;
    }
    
    // Add arrow as a child of the word group so it moves together
    word.mesh.add(arrowGroup);
    word.mesh.userData.indicator = arrowGroup;
  }

  private removeCurrentWordIndicator(): void {
    // Remove indicator from previous current word
    this.words.forEach(word => {
      if (word.mesh.userData.indicator) {
        // Remove from word group (not scene, since it's a child)
        word.mesh.remove(word.mesh.userData.indicator);
        this.disposeWordMesh(word.mesh.userData.indicator);
        word.mesh.userData.indicator = null;
      }
    });
  }

  private getWordBounds(wordMesh: THREE.Group): { left: number; right: number } {
    const children = wordMesh.children as THREE.Group[];
    if (children.length === 0) return { left: 0, right: 0 };
    
    const firstChar = children[0];
    const lastChar = children[children.length - 1];
    
    return {
      left: firstChar.position.x - 0.4, // Half character width
      right: lastChar.position.x + 0.4
    };
  }

  private updateIndicatorBlink(deltaTime: number): void {
    if (!this.currentWord || !this.currentWord.mesh.userData.indicator) return;
    
    const indicator = this.currentWord.mesh.userData.indicator as THREE.Group;
    
    // Update blink timer
    indicator.userData.blinkTimer += deltaTime;
    
    // Blink every 0.5 seconds (like a typical cursor)
    const blinkInterval = 0.5;
    
    if (indicator.userData.blinkTimer >= blinkInterval) {
      indicator.userData.blinkTimer = 0;
      indicator.userData.isVisible = !indicator.userData.isVisible;
      
      // Toggle visibility
      indicator.visible = indicator.userData.isVisible;
    }
  }

  private handleWordComplete(word: string, accuracy: number): void {
    if (!this.currentWord || this.currentWord.text !== word) return;
    
    this.performanceTracker.recordWordCompletion(word, accuracy);
    
    // Remove completed word
    this.removeWord(this.currentWord);
    
    // Find next word to target
    this.selectNextWord();
    
    // Spawn new word
    this.spawnWord();
  }

  private removeWord(word: FallingWord): void {
    // Remove indicator if this word has one
    if (word.mesh.userData.indicator) {
      this.scene.remove(word.mesh.userData.indicator);
      this.disposeWordMesh(word.mesh.userData.indicator);
      word.mesh.userData.indicator = null;
    }
    
    this.textRenderer.animateTextExit(word.mesh, () => {
      this.scene.remove(word.mesh);
      this.disposeWordMesh(word.mesh);
    });
    
    const index = this.words.indexOf(word);
    if (index > -1) {
      this.words.splice(index, 1);
    }
    
    if (this.currentWord === word) {
      this.currentWord = null;
    }
  }

  private selectNextWord(): void {
    const availableWords = this.words.filter(w => w.isActive && w !== this.currentWord);
    
    if (availableWords.length > 0) {
      // Select the lowest word (closest to ground)
      const lowestWord = availableWords.reduce((lowest, current) => 
        current.mesh.position.y < lowest.mesh.position.y ? current : lowest
      );
      
      this.setCurrentWord(lowestWord);
    }
  }

  public update(deltaTime: number): void {
    this.updateWordPositions(deltaTime);
    this.updateSpawning(deltaTime);
    this.checkCollisions();
    this.updateCurrentWordVisual();
    this.updateIndicatorBlink(deltaTime);
  }

  private updateWordPositions(deltaTime: number): void {
    this.words.forEach(word => {
      if (!word.isActive) return;
      
      // Move word down
      word.mesh.position.y -= word.fallSpeed * deltaTime;
      
      // Keep letters facing the camera (no rotation)
      // Removed rotation for better readability
    });
  }

  private updateSpawning(deltaTime: number): void {
    this.spawnTimer += deltaTime * 1000;
    
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnWord();
      this.spawnTimer = 0;
      
      // Gradually decrease spawn interval (increase difficulty)
      this.spawnInterval = Math.max(1500, this.spawnInterval - 50);
    }
  }

  private checkCollisions(): void {
    const wordsToRemove: FallingWord[] = [];
    
    this.words.forEach(word => {
      if (word.mesh.position.y <= this.groundY) {
        wordsToRemove.push(word);
        
        // Penalty for missed word
        if (word === this.currentWord) {
          this.performanceTracker.recordError();
        }
      }
    });
    
    wordsToRemove.forEach(word => {
      this.removeWord(word);
    });
    
    // Select new current word if needed
    if (!this.currentWord && this.words.length > 0) {
      this.selectNextWord();
    }
  }

  private updateCurrentWordVisual(): void {
    if (!this.currentWord) return;
    
    const typingState = this.inputHandler.getCurrentState();
    this.textRenderer.updateTextState(
      this.currentWord.mesh,
      typingState.position,
      typingState.hasError
    );
  }

  private disposeWordMesh(mesh: THREE.Group): void {
    mesh.children.forEach(child => {
      if (child instanceof THREE.Group) {
        // Each character is now a Group containing a Mesh
        child.children.forEach(grandChild => {
          if (grandChild instanceof THREE.Mesh) {
            grandChild.geometry.dispose();
            if (Array.isArray(grandChild.material)) {
              grandChild.material.forEach(mat => mat.dispose());
            } else {
              grandChild.material.dispose();
            }
          }
        });
      } else if (child instanceof THREE.Mesh) {
        // Fallback for direct meshes
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }

  public dispose(): void {
    this.words.forEach(word => {
      this.scene.remove(word.mesh);
      this.disposeWordMesh(word.mesh);
    });
    
    this.words = [];
    this.currentWord = null;
    this.textRenderer.dispose();
  }
}