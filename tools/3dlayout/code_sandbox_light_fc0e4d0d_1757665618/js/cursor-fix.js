/**
 * Cursor Position Fix
 * Fixes the cursor offset issue in drawing mode
 */

class CursorPositionFixer {
    constructor(canvas) {
        this.canvas = canvas;
    }

    /**
     * Get accurate mouse position relative to canvas
     * Accounts for canvas position, padding, borders, and scaling
     */
    getCanvasMousePosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        
        // Get the actual canvas size vs display size
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        // Calculate position relative to canvas
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;
        
        return { x, y };
    }

    /**
     * Get normalized device coordinates (-1 to 1) for Three.js raycasting
     */
    getNormalizedMousePosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        return { x, y };
    }

    /**
     * Convert screen coordinates to world coordinates for drawing
     * This is specifically for the drawing toolkit
     */
    screenToWorld(screenX, screenY, camera, frustumSize = 10) {
        const rect = this.canvas.getBoundingClientRect();
        
        // Normalize to -1 to 1 range
        const normalizedX = ((screenX - rect.left) / rect.width) * 2 - 1;
        const normalizedY = -((screenY - rect.top) / rect.height) * 2 + 1;
        
        // For orthographic top view, map directly to world coordinates
        const aspect = rect.width / rect.height;
        const worldX = normalizedX * frustumSize * aspect;
        const worldZ = normalizedY * frustumSize;
        const worldY = 0.5; // Default height for placed objects
        
        return { x: worldX, y: worldY, z: worldZ };
    }

    /**
     * Update canvas size to match display size
     * Call this on window resize
     */
    updateCanvasSize() {
        const rect = this.canvas.getBoundingClientRect();
        
        // Set internal canvas size to match display size
        // This prevents scaling issues
        if (this.canvas.width !== rect.width || this.canvas.height !== rect.height) {
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
            return true; // Size changed
        }
        return false; // No change
    }
}

/**
 * Patch for IntegratedDrawingToolkit
 * Replace the screenToWorld method with accurate calculation
 */
function patchDrawingToolkit(toolkit) {
    if (!toolkit.drawingToolkit) {
        console.warn('Drawing toolkit not found');
        return;
    }

    const canvas = toolkit.renderer.domElement;
    const fixer = new CursorPositionFixer(canvas);

    // Replace the screenToWorld method
    toolkit.drawingToolkit.screenToWorld = function(screenX, screenY) {
        return fixer.screenToWorld(screenX, screenY, toolkit.cameraSystem.getCurrentCamera());
    };

    // Update cursor indicator position method
    const originalUpdateCursor = toolkit.drawingToolkit.updateCursorIndicator.bind(toolkit.drawingToolkit);
    toolkit.drawingToolkit.updateCursorIndicator = function(screenX, screenY) {
        if (!this.cursorIndicator || !this.isActive) return;
        
        const worldPos = fixer.screenToWorld(screenX, screenY, toolkit.cameraSystem.getCurrentCamera());
        this.cursorIndicator.position.x = worldPos.x;
        this.cursorIndicator.position.z = worldPos.z;
        this.cursorIndicator.visible = true;
        
        // Update color based on selected blockout type
        const colors = {
            'cube': 0x4CAF50,
            'sphere': 0x2196F3,
            'cylinder': 0xFF9800,
            'plane': 0x9C27B0,
            'cone': 0xF44336,
            'torus': 0x00BCD4
        };
        
        this.cursorIndicator.material.color.setHex(colors[this.selectedBlockoutType] || 0x4CAF50);
    };

    console.log('✅ Drawing toolkit cursor position fixed');
}

/**
 * Patch for raycasting (object selection)
 */
function patchRaycasting(toolkit) {
    const canvas = toolkit.renderer.domElement;
    const fixer = new CursorPositionFixer(canvas);

    // Store original mouse event handler
    const originalOnMouseMove = toolkit.onMouseMove;
    
    // Replace with fixed version
    toolkit.onMouseMove = function(event) {
        const normalized = fixer.getNormalizedMousePosition(event);
        this.mouse.x = normalized.x;
        this.mouse.y = normalized.y;
        
        // Update drawing toolkit cursor if active
        if (this.drawingToolkit && this.drawingToolkit.isActive) {
            this.drawingToolkit.updateCursorIndicator(event.clientX, event.clientY);
            
            // Update temp line in line mode
            if (this.drawingToolkit.drawingMode === 'line' && this.drawingToolkit.lineStartPoint) {
                const rect = canvas.getBoundingClientRect();
                const currentPos = {
                    x: event.clientX - rect.left,
                    y: event.clientY - rect.top
                };
                this.drawingToolkit.updateTempLine(currentPos);
            }
        }
    };

    console.log('✅ Raycasting cursor position fixed');
}

/**
 * Main fix function - call this after toolkit initialization
 */
function fixCursorPosition(toolkit) {
    console.log('🔧 Applying cursor position fixes...');
    
    try {
        patchDrawingToolkit(toolkit);
        patchRaycasting(toolkit);
        
        // Add window resize handler to keep canvas size in sync
        const canvas = toolkit.renderer.domElement;
        const fixer = new CursorPositionFixer(canvas);
        
        window.addEventListener('resize', () => {
            if (fixer.updateCanvasSize()) {
                console.log('Canvas size updated to match display');
                toolkit.onWindowResize();
            }
        });
        
        console.log('✅ All cursor position fixes applied successfully');
        return true;
    } catch (error) {
        console.error('❌ Error applying cursor fixes:', error);
        return false;
    }
}

// Export for use in main app
export { CursorPositionFixer, fixCursorPosition };
