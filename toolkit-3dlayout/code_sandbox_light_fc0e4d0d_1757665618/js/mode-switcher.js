/**
 * Mode Switcher Enhancement
 * Improves 2D/3D mode switching UX with clear visual feedback
 */

class ModeSwitcher {
    constructor(toolkit) {
        this.toolkit = toolkit;
        this.currentMode = '3d-navigation'; // '3d-navigation' or 'drawing'
        this.modeIndicator = null;
        this.toggleDrawingBtn = null;
        this.exitDrawingBtn = null;
        
        this.init();
    }

    init() {
        // Get UI elements
        this.modeIndicator = document.getElementById('modeIndicator');
        this.toggleDrawingBtn = document.getElementById('toggleDrawing');
        this.exitDrawingBtn = document.getElementById('exitDrawing');
        
        // Set up event listeners
        if (this.toggleDrawingBtn) {
            this.toggleDrawingBtn.addEventListener('click', () => this.enterDrawingMode());
        }
        
        if (this.exitDrawingBtn) {
            this.exitDrawingBtn.addEventListener('click', () => this.exitDrawingMode());
        }
        
        // ESC key to exit drawing mode
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentMode === 'drawing') {
                this.exitDrawingMode();
            }
        });
        
        // Initialize mode indicator
        this.updateModeIndicator();
    }

    enterDrawingMode() {
        if (this.currentMode === 'drawing') return;
        
        this.currentMode = 'drawing';
        
        // Activate drawing toolkit
        if (this.toolkit.drawingToolkit) {
            this.toolkit.drawingToolkit.activate();
        }
        
        // Update UI
        this.updateModeIndicator();
        this.updateButtons();
        this.disableIncompatibleViews();
        this.showModeTransition('Drawing Mode Active', '#FF9800');
        
        // Add visual feedback to viewport
        const viewport = document.getElementById('viewport3DContainer');
        if (viewport) {
            viewport.classList.add('drawing-mode-active');
        }
    }

    exitDrawingMode() {
        if (this.currentMode === '3d-navigation') return;
        
        this.currentMode = '3d-navigation';
        
        // Deactivate drawing toolkit
        if (this.toolkit.drawingToolkit) {
            this.toolkit.drawingToolkit.deactivate();
        }
        
        // Update UI
        this.updateModeIndicator();
        this.updateButtons();
        this.enableAllViews();
        this.showModeTransition('3D Navigation Mode', '#4CAF50');
        
        // Remove visual feedback from viewport
        const viewport = document.getElementById('viewport3DContainer');
        if (viewport) {
            viewport.classList.remove('drawing-mode-active');
        }
    }

    updateModeIndicator() {
        if (!this.modeIndicator) return;
        
        const modeIcon = this.modeIndicator.querySelector('.mode-icon i');
        const modeName = this.modeIndicator.querySelector('.mode-name');
        const modeHint = this.modeIndicator.querySelector('.mode-hint');
        
        if (this.currentMode === 'drawing') {
            this.modeIndicator.classList.add('drawing-mode');
            if (modeIcon) modeIcon.className = 'fas fa-pen';
            if (modeName) modeName.textContent = 'Drawing Mode';
            if (modeHint) modeHint.textContent = 'Draw blockouts • Press ESC to exit';
        } else {
            this.modeIndicator.classList.remove('drawing-mode');
            if (modeIcon) modeIcon.className = 'fas fa-cube';
            if (modeName) modeName.textContent = '3D Navigation';
            if (modeHint) modeHint.textContent = 'Click objects to select • Use mouse to orbit';
        }
    }

    updateButtons() {
        if (this.currentMode === 'drawing') {
            // Hide enter button, show exit button
            if (this.toggleDrawingBtn) {
                this.toggleDrawingBtn.style.display = 'none';
            }
            if (this.exitDrawingBtn) {
                this.exitDrawingBtn.style.display = 'flex';
            }
        } else {
            // Show enter button, hide exit button
            if (this.toggleDrawingBtn) {
                this.toggleDrawingBtn.style.display = 'flex';
                this.toggleDrawingBtn.classList.remove('active');
            }
            if (this.exitDrawingBtn) {
                this.exitDrawingBtn.style.display = 'none';
            }
        }
    }

    disableIncompatibleViews() {
        // Disable Front, Left, Right views when in drawing mode
        const incompatibleViews = ['viewFront', 'viewLeft', 'viewRight'];
        
        incompatibleViews.forEach(viewId => {
            const btn = document.getElementById(viewId);
            if (btn) {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.title = 'Not available in Drawing Mode';
            }
        });
    }

    enableAllViews() {
        // Re-enable all view buttons
        const allViews = ['viewPerspective', 'viewTop', 'viewFront', 'viewLeft', 'viewRight'];
        
        allViews.forEach(viewId => {
            const btn = document.getElementById(viewId);
            if (btn) {
                btn.disabled = false;
                btn.style.opacity = '1';
                // Restore original tooltips
                const tooltips = {
                    'viewPerspective': 'Perspective View',
                    'viewTop': 'Top View',
                    'viewFront': 'Front View',
                    'viewLeft': 'Left View',
                    'viewRight': 'Right View'
                };
                btn.title = tooltips[viewId] || '';
            }
        });
    }

    showModeTransition(message, color) {
        // Create transition notification
        const notification = document.createElement('div');
        notification.className = 'mode-transition-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${color};
            color: white;
            padding: 20px 40px;
            border-radius: 8px;
            font-size: 18px;
            font-weight: 600;
            z-index: 10000;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            animation: modeTransitionFade 1.5s ease-in-out;
            pointer-events: none;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after animation
        setTimeout(() => {
            notification.remove();
        }, 1500);
    }

    getCurrentMode() {
        return this.currentMode;
    }

    isDrawingMode() {
        return this.currentMode === 'drawing';
    }
}

// Add CSS animation for mode transition
const style = document.createElement('style');
style.textContent = `
    @keyframes modeTransitionFade {
        0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
        }
        20% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }
        80% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }
        100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
        }
    }
    
    .drawing-mode-active {
        border: 2px solid #FF9800 !important;
        box-shadow: 0 0 20px rgba(255, 152, 0, 0.3) !important;
    }
`;
document.head.appendChild(style);

// Export for use in main app
export { ModeSwitcher };
