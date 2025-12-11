import * as THREE from 'three';
import { InputManager } from './InputManager.js';
import { MatchDetector } from './MatchDetector.js';
import { GravitySystem } from './GravitySystem.js';

export class GameEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.inputManager = null;
        this.matchDetector = null;
        this.gravitySystem = null;
        this.isRunning = false;
        this.lastTime = 0;
        this.gems = []; // Store gem references
        this.isProcessingMatches = false;
        
        // WebGL support detection
        this.hasWebGL = this.detectWebGL();
        
        console.log(`WebGL Support: ${this.hasWebGL ? 'Yes' : 'No - falling back to Canvas'}`);
    }
    
    detectWebGL() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && 
                     (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    }
    
    async initialize() {
        try {
            // Initialize Three.js components
            this.initializeScene();
            this.initializeCamera();
            this.initializeRenderer();
            this.initializeLighting();
            
            // Add some demo content
            this.createDemoScene();
            
            // Initialize core systems first
            this.matchDetector = new MatchDetector();
            this.gravitySystem = new GravitySystem(this.scene);
            
            // Handle initial resize
            this.handleResize();
            
            return Promise.resolve();
        } catch (error) {
            console.error('GameEngine initialization failed:', error);
            return Promise.reject(error);
        }
    }
    
    initializeScene() {
        this.scene = new THREE.Scene();
        
        // Warmer, more comfortable background gradient
        this.scene.background = new THREE.Color(0x1e293b);
        
        // Subtle fog for depth without being too heavy
        this.scene.fog = new THREE.Fog(0x1e293b, 15, 40);
    }
    
    initializeCamera() {
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        
        // More comfortable isometric-style view for match-3 gameplay
        // Higher and more angled for better grid visibility
        this.camera.position.set(0, 12, 8);
        this.camera.lookAt(0, 0, 0);
        
        console.log('Camera positioned for comfortable gameplay view');
    }
    
    initializeRenderer() {
        const rendererOptions = {
            canvas: this.canvas,
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
        };
        
        if (this.hasWebGL) {
            this.renderer = new THREE.WebGLRenderer(rendererOptions);
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        } else {
            // Fallback to basic renderer for older devices
            this.renderer = new THREE.WebGLRenderer(rendererOptions);
            console.warn('Using fallback renderer');
        }
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    
    initializeLighting() {
        // Warmer ambient light for better gem visibility
        const ambientLight = new THREE.AmbientLight(0x6b7280, 0.4);
        this.scene.add(ambientLight);
        
        // Main directional light from top-right for clear shadows
        const mainLight = new THREE.DirectionalLight(0xffffff, 0.7);
        mainLight.position.set(8, 15, 6);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.1;
        mainLight.shadow.camera.far = 50;
        mainLight.shadow.camera.left = -15;
        mainLight.shadow.camera.right = 15;
        mainLight.shadow.camera.top = 15;
        mainLight.shadow.camera.bottom = -15;
        this.scene.add(mainLight);
        
        // Secondary fill light from opposite side for softer shadows
        const fillLight = new THREE.DirectionalLight(0xb8c5d6, 0.3);
        fillLight.position.set(-5, 8, -3);
        this.scene.add(fillLight);
        
        // Subtle magical atmosphere light with warmer tone
        const atmosphereLight = new THREE.PointLight(0xffd700, 0.2, 25);
        atmosphereLight.position.set(0, 8, 0);
        this.scene.add(atmosphereLight);
        
        console.log('Balanced lighting setup complete');
    }
    
    createDemoScene() {
        // Create a simple demo grid to visualize the foundation
        const gridSize = 8;
        const gemSize = 0.8;
        const spacing = 1.0;
        
        // Gem type definitions with colors
        const gemTypes = [
            { name: 'Fire', color: 0xe74c3c },      // Red
            { name: 'Water', color: 0x3498db },     // Blue  
            { name: 'Nature', color: 0x2ecc71 },    // Green
            { name: 'Light', color: 0xf1c40f },     // Yellow
            { name: 'Shadow', color: 0x9b59b6 }     // Purple
        ];
        
        // Create gem placeholder objects with simple safe generation
        for (let x = 0; x < gridSize; x++) {
            for (let y = 0; y < gridSize; y++) {
                const geometry = new THREE.SphereGeometry(gemSize * 0.4, 16, 16);
                
                // Simple safe gem type selection
                let gemType;
                let attempts = 0;
                do {
                    gemType = gemTypes[Math.floor(Math.random() * gemTypes.length)];
                    attempts++;
                } while (attempts < 10 && this.wouldCreateMatch(x, y, gemType.name));
                
                const material = new THREE.MeshPhongMaterial({ 
                    color: gemType.color,
                    shininess: 100,
                    transparent: true,
                    opacity: 0.9
                });
                
                const gem = new THREE.Mesh(geometry, material);
                gem.position.set(
                    (x - gridSize / 2) * spacing,
                    0,
                    (y - gridSize / 2) * spacing
                );
                gem.castShadow = true;
                gem.receiveShadow = true;
                
                // Add gem data for gameplay
                gem.userData = {
                    gridX: x,
                    gridY: y,
                    gemType: gemType.name,
                    originalY: gem.position.y,
                    floatOffset: Math.random() * Math.PI * 2,
                    floatSpeed: 0.5 + Math.random() * 0.5,
                    isGem: true
                };
                
                this.gems.push(gem);
                this.scene.add(gem);
            }
        }
        
        // Add a more subtle ground plane with better material
        const groundGeometry = new THREE.PlaneGeometry(18, 18);
        const groundMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x2c3e50,
            transparent: true,
            opacity: 0.6,
            shininess: 30
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -1.5;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        // Initialize input management after scene is created
        this.inputManager = new InputManager(this.canvas, this.camera, this.scene);
        
        // Set up match processing callback
        this.inputManager.onGemSwapped = () => this.processMatches();
        
        // Add UI text overlay
        this.addDemoUI();
        
        console.log('Interactive demo scene created with 8x8 gem grid');
        console.log('Click on gems to select them!');
    }
    
    addDemoUI() {
        // Create a simple HTML overlay for instructions
        const uiOverlay = document.createElement('div');
        uiOverlay.id = 'demoUI';
        uiOverlay.innerHTML = `
            <div style="
                position: absolute;
                top: 20px;
                left: 20px;
                color: white;
                font-family: Arial, sans-serif;
                font-size: 16px;
                background: rgba(0,0,0,0.7);
                padding: 15px;
                border-radius: 8px;
                max-width: 300px;
                z-index: 100;
            ">
                <h3 style="margin: 0 0 10px 0; color: #f1c40f;">Match-3 Tower Defense Demo</h3>
                <p style="margin: 5px 0;">🎮 Click to select, drag to adjacent gem to swap</p>
                <p style="margin: 5px 0;">💎 5 gem types: Fire, Water, Nature, Light, Shadow</p>
                <p style="margin: 5px 0;">🔄 Only adjacent gems can be swapped</p>
                <p style="margin: 5px 0;">🎯 This is the foundation for our match-3 grid</p>
                <div id="selectedGemInfo" style="margin-top: 10px; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; min-height: 20px;">
                    <em>Select a gem to see its info...</em>
                </div>
            </div>
        `;
        document.body.appendChild(uiOverlay);
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop();
        
        console.log('Game loop started');
    }
    
    stop() {
        this.isRunning = false;
    }
    
    gameLoop() {
        if (!this.isRunning) return;
        
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // Update game systems
        this.update(deltaTime);
        
        // Render the scene
        this.render();
        
        // Continue the loop
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update(deltaTime) {
        // Animate demo gems with floating effect
        this.gems.forEach((gem) => {
            if (gem.userData && gem.userData.floatOffset !== undefined) {
                const time = performance.now() * 0.001;
                gem.position.y = gem.userData.originalY + 
                    Math.sin(time * gem.userData.floatSpeed + gem.userData.floatOffset) * 0.1;
            }
        });
        
        // Update UI with selected gem info
        this.updateSelectedGemUI();
    }
    
    async processMatches() {
        if (this.isProcessingMatches) return;
        
        this.isProcessingMatches = true;
        let totalMatches = 0;
        
        // Keep processing matches until no more are found (cascading)
        while (true) {
            const matches = this.matchDetector.findMatches(this.gems);
            
            if (matches.length === 0) {
                break; // No more matches found
            }
            
            totalMatches += matches.length;
            console.log(`Found ${matches.length} matches:`, matches);
            
            // Get unique gems to remove
            const gemsToRemove = this.matchDetector.getUniqueMatchedGems(matches);
            
            // Remove matched gems from our gems array
            gemsToRemove.forEach(gemToRemove => {
                const index = this.gems.indexOf(gemToRemove);
                if (index > -1) {
                    this.gems.splice(index, 1);
                }
            });
            
            // Remove gems with effects
            this.gravitySystem.removeGems(gemsToRemove);
            
            // Wait a bit for the collapse effect
            await this.delay(300);
            
            // Apply gravity to remaining gems
            this.gravitySystem.applyGravity(this.gems);
            
            // Wait for gravity animation
            await this.delay(200);
            
            // Fill empty spaces with new gems
            const newGems = this.gravitySystem.fillEmptySpaces(this.gems);
            
            // Wait for new gems to settle
            await this.delay(300);
            
            // Update UI to show match count
            this.updateMatchUI(totalMatches);
        }
        
        this.isProcessingMatches = false;
        console.log(`Match processing complete. Total matches: ${totalMatches}`);
    }
    
    wouldCreateMatch(x, y, gemType) {
        // Simple check for horizontal matches
        let horizontalCount = 1;
        
        // Check left
        for (let i = x - 1; i >= 0; i--) {
            const leftGem = this.gems.find(g => g.userData.gridX === i && g.userData.gridY === y);
            if (leftGem && leftGem.userData.gemType === gemType) {
                horizontalCount++;
            } else {
                break;
            }
        }
        
        // Check right
        for (let i = x + 1; i < 8; i++) {
            const rightGem = this.gems.find(g => g.userData.gridX === i && g.userData.gridY === y);
            if (rightGem && rightGem.userData.gemType === gemType) {
                horizontalCount++;
            } else {
                break;
            }
        }
        
        // Simple check for vertical matches
        let verticalCount = 1;
        
        // Check up
        for (let i = y - 1; i >= 0; i--) {
            const upGem = this.gems.find(g => g.userData.gridX === x && g.userData.gridY === i);
            if (upGem && upGem.userData.gemType === gemType) {
                verticalCount++;
            } else {
                break;
            }
        }
        
        // Check down
        for (let i = y + 1; i < 8; i++) {
            const downGem = this.gems.find(g => g.userData.gridX === x && g.userData.gridY === i);
            if (downGem && downGem.userData.gemType === gemType) {
                verticalCount++;
            } else {
                break;
            }
        }
        
        return horizontalCount >= 3 || verticalCount >= 3;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    updateMatchUI(matchCount) {
        const selectedGemInfo = document.getElementById('selectedGemInfo');
        if (selectedGemInfo && matchCount > 0) {
            selectedGemInfo.innerHTML = `
                <strong>🎉 Matches Found!</strong><br>
                Total matches processed: ${matchCount}<br>
                <span style="color: #2ecc71;">✓ Cascade complete!</span>
            `;
            
            // Reset after a few seconds
            setTimeout(() => {
                selectedGemInfo.innerHTML = '<em>Select a gem to see its info...</em>';
            }, 3000);
        }
    }
    
    updateSelectedGemUI() {
        const selectedGemInfo = document.getElementById('selectedGemInfo');
        if (selectedGemInfo && this.inputManager) {
            const selectedGem = this.inputManager.getSelectedGem();
            if (selectedGem && selectedGem.userData) {
                const data = selectedGem.userData;
                selectedGemInfo.innerHTML = `
                    <strong>Selected Gem:</strong><br>
                    Type: ${data.gemType}<br>
                    Grid Position: (${data.gridX}, ${data.gridY})<br>
                    <span style="color: #2ecc71;">✓ Ready for match-3 mechanics!</span>
                `;
            } else {
                selectedGemInfo.innerHTML = '<em>Select a gem to see its info...</em>';
            }
        }
    }
    
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    
    handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Update camera aspect ratio
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        // Update renderer size
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        console.log(`Resized to ${width}x${height}`);
    }
    
    dispose() {
        this.stop();
        
        // Clean up input manager
        if (this.inputManager) {
            this.inputManager.dispose();
        }
        
        // Clean up UI
        const demoUI = document.getElementById('demoUI');
        if (demoUI) {
            demoUI.remove();
        }
        
        // Clean up Three.js resources
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        // Clean up scene objects
        if (this.scene) {
            this.scene.traverse((object) => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
        }
    }
}