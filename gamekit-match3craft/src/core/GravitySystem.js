import * as THREE from 'three';

export class GravitySystem {
    constructor(scene) {
        this.scene = scene;
        this.gridSize = 8;
        this.spacing = 1.0;
        this.gemSize = 0.8;
        
        // Gem type definitions
        this.gemTypes = [
            { name: 'Fire', color: 0xe74c3c },
            { name: 'Water', color: 0x3498db },
            { name: 'Nature', color: 0x2ecc71 },
            { name: 'Light', color: 0xf1c40f },
            { name: 'Shadow', color: 0x9b59b6 }
        ];
    }
    
    // Remove matched gems with particle effects
    removeGems(gemsToRemove) {
        console.log(`Removing ${gemsToRemove.length} matched gems`);
        
        gemsToRemove.forEach(gem => {
            // Create collapse particle effect
            this.createCollapseEffect(gem);
            
            // Remove from scene
            this.scene.remove(gem);
            
            // Clean up geometry and materials
            if (gem.geometry) gem.geometry.dispose();
            if (gem.material) gem.material.dispose();
            
            // Remove selection ring if it exists
            if (gem.userData.selectionRing) {
                this.scene.remove(gem.userData.selectionRing);
                gem.userData.selectionRing.geometry.dispose();
                gem.userData.selectionRing.material.dispose();
            }
        });
    }
    
    createCollapseEffect(gem) {
        // Create particle burst effect
        const particleCount = 8;
        const particles = new THREE.Group();
        
        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.05, 8, 8);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: gem.material.color,
                transparent: true,
                opacity: 0.8
            });
            
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(gem.position);
            
            // Random direction for particle
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 2 + Math.random() * 2;
            particle.userData = {
                velocity: new THREE.Vector3(
                    Math.cos(angle) * speed,
                    Math.random() * 3 + 1,
                    Math.sin(angle) * speed
                ),
                life: 1.0,
                decay: 0.02
            };
            
            particles.add(particle);
        }
        
        this.scene.add(particles);
        
        // Animate particles
        this.animateParticles(particles);
    }
    
    animateParticles(particles) {
        const animate = () => {
            let allDead = true;
            
            particles.children.forEach(particle => {
                if (particle.userData.life > 0) {
                    allDead = false;
                    
                    // Update position
                    particle.position.add(particle.userData.velocity.clone().multiplyScalar(0.016));
                    
                    // Apply gravity
                    particle.userData.velocity.y -= 9.8 * 0.016;
                    
                    // Fade out
                    particle.userData.life -= particle.userData.decay;
                    particle.material.opacity = particle.userData.life;
                }
            });
            
            if (allDead) {
                // Clean up particles
                particles.children.forEach(particle => {
                    particle.geometry.dispose();
                    particle.material.dispose();
                });
                this.scene.remove(particles);
            } else {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    
    // Apply gravity to remaining gems
    applyGravity(gems) {
        console.log('Applying gravity to remaining gems');
        
        const grid = this.createGrid(gems);
        const movedGems = [];
        
        // Process each column from bottom to top
        for (let x = 0; x < this.gridSize; x++) {
            let writeIndex = this.gridSize - 1; // Start from bottom
            
            // Collect non-null gems from bottom to top
            for (let y = this.gridSize - 1; y >= 0; y--) {
                if (grid[y][x] !== null) {
                    if (y !== writeIndex) {
                        // Gem needs to fall
                        const gem = grid[y][x];
                        const oldY = gem.userData.gridY;
                        const newY = writeIndex;
                        
                        // Update gem data
                        gem.userData.gridY = newY;
                        gem.userData.originalY = 0; // Reset for floating animation
                        
                        // Update visual position
                        const newPosition = new THREE.Vector3(
                            (x - this.gridSize / 2) * this.spacing,
                            0,
                            (newY - this.gridSize / 2) * this.spacing
                        );
                        
                        // Animate the fall
                        this.animateGemFall(gem, newPosition);
                        
                        movedGems.push({
                            gem: gem,
                            oldY: oldY,
                            newY: newY
                        });
                        
                        // Update grid
                        grid[y][x] = null;
                        grid[newY][x] = gem;
                    }
                    writeIndex--;
                }
            }
        }
        
        return movedGems;
    }
    
    animateGemFall(gem, targetPosition) {
        // Simple immediate positioning for now - could add smooth animation
        gem.position.copy(targetPosition);
        
        // Add a brief bounce effect
        const originalScale = gem.scale.clone();
        gem.scale.set(1.1, 0.9, 1.1);
        
        setTimeout(() => {
            gem.scale.copy(originalScale);
        }, 100);
    }
    
    // Fill empty spaces with new gems
    fillEmptySpaces(gems) {
        console.log('Filling empty spaces with new gems');
        
        const grid = this.createGrid(gems);
        const newGems = [];
        
        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize; y++) {
                if (grid[y][x] === null) {
                    const newGem = this.createNewGem(x, y, true, gems);
                    newGems.push(newGem);
                    gems.push(newGem);
                    this.scene.add(newGem);
                    
                    // Animate gem falling from above
                    newGem.position.y = 10; // Start above screen
                    this.animateGemFall(newGem, new THREE.Vector3(
                        (x - this.gridSize / 2) * this.spacing,
                        0,
                        (y - this.gridSize / 2) * this.spacing
                    ));
                }
            }
        }
        
        return newGems;
    }
    
    createNewGem(gridX, gridY, avoidMatches = false, existingGems = []) {
        const geometry = new THREE.SphereGeometry(this.gemSize * 0.4, 16, 16);
        
        let gemType;
        
        if (avoidMatches && existingGems.length > 0) {
            // Get safe gem type that won't create matches
            gemType = this.getSafeGemType(gridX, gridY, existingGems);
        } else {
            // Random gem type
            gemType = this.gemTypes[Math.floor(Math.random() * this.gemTypes.length)];
        }
        
        const material = new THREE.MeshPhongMaterial({
            color: gemType.color,
            shininess: 100,
            transparent: true,
            opacity: 0.9
        });
        
        const gem = new THREE.Mesh(geometry, material);
        gem.castShadow = true;
        gem.receiveShadow = true;
        
        // Set gem data
        gem.userData = {
            gridX: gridX,
            gridY: gridY,
            gemType: gemType.name,
            originalY: 0,
            floatOffset: Math.random() * Math.PI * 2,
            floatSpeed: 0.5 + Math.random() * 0.5,
            isGem: true
        };
        
        return gem;
    }
    
    getSafeGemType(gridX, gridY, existingGems) {
        const grid = this.createGrid(existingGems);
        
        // Try each gem type and see which ones are safe
        const safeTypes = [];
        
        for (const gemType of this.gemTypes) {
            if (this.isSafeGemType(gridX, gridY, gemType.name, grid)) {
                safeTypes.push(gemType);
            }
        }
        
        // If no safe types (shouldn't happen), return random
        if (safeTypes.length === 0) {
            return this.gemTypes[Math.floor(Math.random() * this.gemTypes.length)];
        }
        
        // Return random safe type
        return safeTypes[Math.floor(Math.random() * safeTypes.length)];
    }
    
    isSafeGemType(gridX, gridY, gemType, grid) {
        // Check horizontal matches (left and right)
        let horizontalCount = 1;
        
        // Count matching gems to the left
        for (let x = gridX - 1; x >= 0; x--) {
            const gem = grid[gridY] && grid[gridY][x];
            if (gem && gem.userData && gem.userData.gemType === gemType) {
                horizontalCount++;
            } else {
                break;
            }
        }
        
        // Count matching gems to the right
        for (let x = gridX + 1; x < this.gridSize; x++) {
            const gem = grid[gridY] && grid[gridY][x];
            if (gem && gem.userData && gem.userData.gemType === gemType) {
                horizontalCount++;
            } else {
                break;
            }
        }
        
        // Check vertical matches (up and down)
        let verticalCount = 1;
        
        // Count matching gems above
        for (let y = gridY - 1; y >= 0; y--) {
            const gem = grid[y] && grid[y][gridX];
            if (gem && gem.userData && gem.userData.gemType === gemType) {
                verticalCount++;
            } else {
                break;
            }
        }
        
        // Count matching gems below
        for (let y = gridY + 1; y < this.gridSize; y++) {
            const gem = grid[y] && grid[y][gridX];
            if (gem && gem.userData && gem.userData.gemType === gemType) {
                verticalCount++;
            } else {
                break;
            }
        }
        
        // Safe if neither horizontal nor vertical would create a match of 3+
        return horizontalCount < 3 && verticalCount < 3;
    }
    
    createGrid(gems) {
        const grid = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(null));
        
        gems.forEach(gem => {
            if (gem.userData && gem.userData.gridX !== undefined && gem.userData.gridY !== undefined) {
                grid[gem.userData.gridY][gem.userData.gridX] = gem;
            }
        });
        
        return grid;
    }
}