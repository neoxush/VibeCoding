import * as THREE from 'three';

export class InputManager {
    constructor(canvas, camera, scene) {
        this.canvas = canvas;
        this.camera = camera;
        this.scene = scene;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.selectedGem = null;
        this.dragTarget = null;
        
        // Touch/mouse state
        this.isPointerDown = false;
        this.lastPointerPosition = { x: 0, y: 0 };
        
        // Callback for when gems are swapped
        this.onGemSwapped = null;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.onPointerDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onPointerMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onPointerUp(e));
        
        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
        
        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    getPointerPosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        const clientX = event.clientX || (event.touches && event.touches[0].clientX);
        const clientY = event.clientY || (event.touches && event.touches[0].clientY);
        
        return {
            x: ((clientX - rect.left) / rect.width) * 2 - 1,
            y: -((clientY - rect.top) / rect.height) * 2 + 1
        };
    }
    
    onPointerDown(event) {
        event.preventDefault();
        this.isPointerDown = true;
        
        const pointer = this.getPointerPosition(event);
        this.lastPointerPosition = pointer;
        
        this.handleGemClick(pointer);
    }
    
    onPointerMove(event) {
        if (!this.isPointerDown) return;
        
        const pointer = this.getPointerPosition(event);
        
        // Check for drag to adjacent gem for swapping
        if (this.selectedGem) {
            this.handleGemDrag(pointer);
        }
    }
    
    onPointerUp(event) {
        this.isPointerDown = false;
        
        // If we were dragging, finalize the swap
        if (this.selectedGem && this.dragTarget) {
            this.performGemSwap(this.selectedGem, this.dragTarget);
            this.dragTarget = null;
        }
    }
    
    onTouchStart(event) {
        event.preventDefault();
        this.onPointerDown(event);
    }
    
    onTouchMove(event) {
        event.preventDefault();
        this.onPointerMove(event);
    }
    
    onTouchEnd(event) {
        event.preventDefault();
        this.onPointerUp(event);
    }
    
    handleGemClick(pointer) {
        // Update raycaster
        this.mouse.set(pointer.x, pointer.y);
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Find intersected objects (gems)
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        
        if (intersects.length > 0) {
            const clickedObject = intersects[0].object;
            
            // Check if it's a gem (has userData indicating it's a gem)
            if (clickedObject.userData && clickedObject.userData.floatOffset !== undefined) {
                this.selectGem(clickedObject);
            }
        } else {
            // Clicked empty space, deselect
            this.deselectGem();
        }
    }
    
    selectGem(gem) {
        // Deselect previous gem
        this.deselectGem();
        
        // Select new gem
        this.selectedGem = gem;
        
        // Visual feedback - make it glow and slightly larger
        gem.material.emissive.setHex(0x444444);
        gem.scale.set(1.2, 1.2, 1.2);
        
        // Add selection ring
        const ringGeometry = new THREE.RingGeometry(0.6, 0.8, 16);
        const ringMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffff, 
            transparent: true, 
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(gem.position);
        ring.position.y += 0.01; // Slightly above the gem
        ring.rotation.x = -Math.PI / 2;
        ring.name = 'selectionRing';
        this.scene.add(ring);
        
        // Store reference to ring for cleanup
        gem.userData.selectionRing = ring;
        
        console.log('Gem selected at position:', gem.position);
    }
    
    deselectGem() {
        if (this.selectedGem) {
            // Reset visual state
            this.selectedGem.material.emissive.setHex(0x000000);
            this.selectedGem.scale.set(1, 1, 1);
            
            // Remove selection ring
            if (this.selectedGem.userData.selectionRing) {
                this.scene.remove(this.selectedGem.userData.selectionRing);
                this.selectedGem.userData.selectionRing.geometry.dispose();
                this.selectedGem.userData.selectionRing.material.dispose();
                delete this.selectedGem.userData.selectionRing;
            }
            
            this.selectedGem = null;
        }
    }
    
    handleGemDrag(pointer) {
        // Update raycaster for drag detection
        this.mouse.set(pointer.x, pointer.y);
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Find what we're dragging over
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        
        if (intersects.length > 0) {
            const hoveredObject = intersects[0].object;
            
            // Check if it's a different gem and adjacent
            if (hoveredObject.userData && hoveredObject.userData.isGem && 
                hoveredObject !== this.selectedGem) {
                
                if (this.areAdjacent(this.selectedGem, hoveredObject)) {
                    // Highlight potential swap target
                    if (this.dragTarget !== hoveredObject) {
                        this.clearDragTarget();
                        this.dragTarget = hoveredObject;
                        this.highlightDragTarget(hoveredObject);
                    }
                } else {
                    this.clearDragTarget();
                }
            }
        } else {
            this.clearDragTarget();
        }
    }
    
    areAdjacent(gem1, gem2) {
        const dx = Math.abs(gem1.userData.gridX - gem2.userData.gridX);
        const dy = Math.abs(gem1.userData.gridY - gem2.userData.gridY);
        
        // Adjacent means exactly 1 step in one direction, 0 in the other
        return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
    }
    
    highlightDragTarget(gem) {
        // Add a different visual effect for drag target
        gem.material.emissive.setHex(0x222222);
        gem.scale.set(1.1, 1.1, 1.1);
    }
    
    clearDragTarget() {
        if (this.dragTarget) {
            // Reset drag target appearance
            this.dragTarget.material.emissive.setHex(0x000000);
            this.dragTarget.scale.set(1, 1, 1);
            this.dragTarget = null;
        }
    }
    
    performGemSwap(gem1, gem2) {
        if (!gem1 || !gem2 || !this.areAdjacent(gem1, gem2)) {
            console.log('Invalid swap attempt');
            return;
        }
        
        console.log(`Swapping ${gem1.userData.gemType} at (${gem1.userData.gridX},${gem1.userData.gridY}) with ${gem2.userData.gemType} at (${gem2.userData.gridX},${gem2.userData.gridY})`);
        
        // Swap positions visually
        const pos1 = gem1.position.clone();
        const pos2 = gem2.position.clone();
        
        // Animate the swap
        this.animateGemSwap(gem1, pos2, gem2, pos1);
        
        // Swap grid data
        const tempGridX = gem1.userData.gridX;
        const tempGridY = gem1.userData.gridY;
        gem1.userData.gridX = gem2.userData.gridX;
        gem1.userData.gridY = gem2.userData.gridY;
        gem2.userData.gridX = tempGridX;
        gem2.userData.gridY = tempGridY;
        
        // Update original Y positions for floating animation
        gem1.userData.originalY = pos2.y;
        gem2.userData.originalY = pos1.y;
        
        // Clear selection after swap
        this.deselectGem();
        this.clearDragTarget();
        
        // Trigger match processing
        if (this.onGemSwapped) {
            this.onGemSwapped();
        }
    }
    
    animateGemSwap(gem1, targetPos1, gem2, targetPos2) {
        // Simple immediate swap for now - could add smooth animation later
        gem1.position.copy(targetPos1);
        gem2.position.copy(targetPos2);
        
        // Add a brief flash effect to show the swap happened
        const originalEmissive1 = gem1.material.emissive.getHex();
        const originalEmissive2 = gem2.material.emissive.getHex();
        
        gem1.material.emissive.setHex(0x444444);
        gem2.material.emissive.setHex(0x444444);
        
        setTimeout(() => {
            gem1.material.emissive.setHex(originalEmissive1);
            gem2.material.emissive.setHex(originalEmissive2);
        }, 200);
    }
    
    getSelectedGem() {
        return this.selectedGem;
    }
    
    dispose() {
        // Remove event listeners
        this.canvas.removeEventListener('mousedown', this.onPointerDown);
        this.canvas.removeEventListener('mousemove', this.onPointerMove);
        this.canvas.removeEventListener('mouseup', this.onPointerUp);
        this.canvas.removeEventListener('touchstart', this.onTouchStart);
        this.canvas.removeEventListener('touchmove', this.onTouchMove);
        this.canvas.removeEventListener('touchend', this.onTouchEnd);
        
        this.deselectGem();
        this.clearDragTarget();
    }
}