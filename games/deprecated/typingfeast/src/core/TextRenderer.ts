import * as THREE from 'three';
import { LetterGeometry } from './LetterGeometry';

export class TextRenderer {
  private defaultMaterial: THREE.MeshPhongMaterial;
  private correctMaterial: THREE.MeshPhongMaterial;
  private errorMaterial: THREE.MeshPhongMaterial;

  constructor() {
    // Create materials for different text states
    this.defaultMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xffffff,
      transparent: false,
      opacity: 1.0
    });
    
    this.correctMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x4CAF50,
      transparent: false,
      opacity: 1.0
    });
    
    this.errorMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xf44336,
      transparent: false,
      opacity: 1.0
    });
  }

  public async initialize(): Promise<void> {
    // For this prototype, we'll use simple geometry-based text
    // No font loading needed for the basic version
    return Promise.resolve();
  }

  public createTextMesh(
    text: string, 
    position: THREE.Vector3, 
    size: number = 1,
    state: 'default' | 'correct' | 'error' = 'default'
  ): THREE.Group {
    const group = new THREE.Group();
    
    // Create text with proper letter spacing
    const chars = text.split('');
    const charWidth = size * 1.0; // Increased spacing for better readability
    const startX = -(chars.length * charWidth) / 2;
    
    chars.forEach((char, index) => {
      const charGroup = this.createCharacterMesh(char, size, state);
      charGroup.position.x = startX + (index * charWidth);
      
      // Ensure letters face the camera
      charGroup.rotation.set(0, 0, 0);
      
      group.add(charGroup);
    });
    
    group.position.copy(position);
    group.castShadow = true;
    
    // Make sure the entire word group faces the camera
    group.lookAt(group.position.x, group.position.y, group.position.z + 10);
    
    return group;
  }

  private createCharacterMesh(
    char: string, 
    size: number, 
    state: 'default' | 'correct' | 'error'
  ): THREE.Group {
    // Create the letter mesh using the new canvas-based system
    // Note: We pass null as material since LetterGeometry creates its own
    const letterGroup = LetterGeometry.createLetterMesh(char, this.defaultMaterial);
    letterGroup.scale.setScalar(size);
    
    // Apply color tinting based on state
    const mesh = letterGroup.children[0] as THREE.Mesh;
    if (mesh && mesh.material) {
      const material = mesh.material as THREE.MeshBasicMaterial;
      
      switch (state) {
        case 'correct':
          material.color.setHex(0x4CAF50); // Green
          break;
        case 'error':
          material.color.setHex(0xf44336); // Red
          break;
        default:
          material.color.setHex(0xffffff); // White
      }
    }
    
    // Ensure the letter faces forward (towards camera)
    letterGroup.rotation.set(0, 0, 0);
    
    // Store character data for reference
    letterGroup.userData = { character: char, state: state };
    
    return letterGroup;
  }

  public updateTextState(
    textMesh: THREE.Group, 
    typedLength: number, 
    hasError: boolean = false
  ): void {
    const children = textMesh.children as THREE.Group[];
    
    children.forEach((charGroup, index) => {
      const charMesh = charGroup.children[0] as THREE.Mesh;
      if (charMesh && charMesh.material) {
        const material = charMesh.material as THREE.MeshBasicMaterial;
        
        if (index < typedLength) {
          // Typed characters
          if (hasError && index === typedLength - 1) {
            material.color.setHex(0xf44336); // Red for error
          } else {
            material.color.setHex(0x4CAF50); // Green for correct
          }
        } else {
          // Untyped characters
          material.color.setHex(0xffffff); // White for default
        }
        
        // Update the character's state in userData
        charGroup.userData.state = index < typedLength 
          ? (hasError && index === typedLength - 1 ? 'error' : 'correct')
          : 'default';
      }
    });
  }

  public animateTextEntry(textMesh: THREE.Group): void {
    // Simple scale animation for text appearance
    textMesh.scale.set(0, 0, 0);
    
    const animate = () => {
      const targetScale = 1;
      const currentScale = textMesh.scale.x;
      const newScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.1);
      
      textMesh.scale.set(newScale, newScale, newScale);
      
      if (Math.abs(newScale - targetScale) > 0.01) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }

  public animateTextExit(textMesh: THREE.Group, onComplete?: () => void): void {
    const animate = () => {
      const targetScale = 0;
      const currentScale = textMesh.scale.x;
      const newScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.15);
      
      textMesh.scale.set(newScale, newScale, newScale);
      
      if (newScale > 0.01) {
        requestAnimationFrame(animate);
      } else {
        onComplete?.();
      }
    };
    
    animate();
  }

  public dispose(): void {
    this.defaultMaterial.dispose();
    this.correctMaterial.dispose();
    this.errorMaterial.dispose();
  }
}