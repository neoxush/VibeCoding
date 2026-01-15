import * as THREE from 'three';

export class LetterGeometry {
    private static canvasCache: Map<string, HTMLCanvasElement> = new Map();
    private static textureCache: Map<string, THREE.CanvasTexture> = new Map();

    public static createLetterMesh(letter: string, material?: THREE.Material): THREE.Group {
        const group = new THREE.Group();
        
        // Create canvas-based letter texture
        const texture = this.getLetterTexture(letter);
        
        // Create material with the letter texture
        const letterMaterial = new THREE.MeshBasicMaterial({ 
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            alphaTest: 0.1,
            color: 0xffffff // Start with white color
        });
        
        // Create geometry (simple plane)
        const geometry = new THREE.PlaneGeometry(0.8, 1.0);
        const mesh = new THREE.Mesh(geometry, letterMaterial);
        
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        group.add(mesh);
        return group;
    }

    private static getLetterTexture(letter: string): THREE.CanvasTexture {
        const upperLetter = letter.toUpperCase();
        
        // Check cache first
        if (this.textureCache.has(upperLetter)) {
            return this.textureCache.get(upperLetter)!;
        }
        
        // Create new texture
        const canvas = this.createLetterCanvas(upperLetter);
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        // Cache the texture
        this.textureCache.set(upperLetter, texture);
        
        return texture;
    }

    private static createLetterCanvas(letter: string): HTMLCanvasElement {
        // Check cache first
        if (this.canvasCache.has(letter)) {
            return this.canvasCache.get(letter)!;
        }
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        
        // Set high resolution for crisp text
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        
        // Clear canvas with transparent background
        context.clearRect(0, 0, size, size);
        
        // Set text style for clean, readable letters
        context.fillStyle = 'white';
        context.font = `bold ${size * 0.7}px Arial, sans-serif`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Remove shadow for now to avoid issues
        context.shadowColor = 'transparent';
        context.shadowBlur = 0;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;
        
        // Draw the letter
        context.fillText(letter, size / 2, size / 2);
        
        // Debug: log that we created a canvas for this letter
        console.log(`Created canvas for letter: ${letter}`);
        
        // Cache the canvas
        this.canvasCache.set(letter, canvas);
        
        return canvas;
    }

    // Clean method to get simple geometry for any letter
    public static getLetterGeometry(letter: string): THREE.BufferGeometry {
        // Return simple plane geometry - texture will handle the letter shape
        return new THREE.PlaneGeometry(0.8, 1.0);
    }

    // Dispose method to clean up cached resources
    public static dispose(): void {
        // Dispose textures
        this.textureCache.forEach(texture => {
            texture.dispose();
        });
        this.textureCache.clear();
        
        // Clear canvas cache
        this.canvasCache.clear();
    }
}
