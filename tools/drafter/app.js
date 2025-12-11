class App {
    constructor() {
        this.sketchEngine = null;
        this.threeDConverter = null;
        
        this.init();
    }
    
    init() {
        // Make app globally accessible for cross-component communication
        window.app = this;
        
        // Initialize sketch engine
        const canvas = document.getElementById('sketch-canvas');
        this.sketchEngine = new SketchEngine(canvas);
        
        // Initialize 3D converter
        const threeContainer = document.getElementById('three-container');
        this.threeDConverter = new ThreeDConverter(threeContainer);
        
        // Bind UI events
        this.bindUIEvents();
        this.updateLayersPanel();
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.threeDConverter.handleResize();
            this.sketchEngine.updateCanvasSize();
        });
        
        // Initialize view buttons (3D view is default)
        this.updateViewButtons('3d');
    }
    
    bindUIEvents() {
        // Tool buttons
        const toolButtons = document.querySelectorAll('.tool-btn');
        toolButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                toolButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                const tool = e.target.id.replace('-tool', '');
                this.sketchEngine.setTool(tool);
                
                // Show/hide line instructions
                const lineInstructions = document.getElementById('line-instructions');
                if (tool === 'line') {
                    lineInstructions.style.display = 'block';
                } else {
                    lineInstructions.style.display = 'none';
                }
            });
        });
        
        // Action buttons
        document.getElementById('duplicate-btn').addEventListener('click', () => {
            this.sketchEngine.duplicateSelected();
        });
        
        document.getElementById('delete-btn').addEventListener('click', () => {
            this.sketchEngine.deleteSelected();
        });
        
        document.getElementById('clear-btn').addEventListener('click', () => {
            if (confirm('Clear all entities? This cannot be undone.')) {
                this.sketchEngine.clearAll();
                this.updateLayersPanel();
            }
        });
        
        // View buttons
        document.getElementById('zoom-in-btn').addEventListener('click', () => {
            this.sketchEngine.zoomIn();
        });
        
        document.getElementById('zoom-out-btn').addEventListener('click', () => {
            this.sketchEngine.zoomOut();
        });
        
        document.getElementById('fit-view-btn').addEventListener('click', () => {
            this.sketchEngine.fitView();
        });
        
        // Layer management
        document.getElementById('add-layer-btn').addEventListener('click', () => {
            const name = prompt('Layer name:', `Layer ${this.sketchEngine.layers.size + 1}`);
            if (name) {
                this.sketchEngine.addLayer(name);
                this.updateLayersPanel();
            }
        });
        
        document.getElementById('delete-layer-btn').addEventListener('click', () => {
            const currentLayerId = this.sketchEngine.currentLayerId;
            if (currentLayerId === 'default') {
                alert('Cannot delete the default layer');
                return;
            }
            
            const layer = this.sketchEngine.layers.get(currentLayerId);
            if (layer && confirm(`Delete layer "${layer.name}" and all its entities?`)) {
                this.sketchEngine.deleteLayer(currentLayerId);
                this.updateLayersPanel();
            }
        });
        
        // 3D controls
        document.getElementById('update-3d-btn').addEventListener('click', () => {
            this.update3DView();
        });
        
        document.getElementById('clear-3d-btn').addEventListener('click', () => {
            this.threeDConverter.clearScene();
        });
        
        document.getElementById('2d-view-btn').addEventListener('click', () => {
            this.threeDConverter.setOrthographicView();
            this.updateViewButtons('2d');
        });
        
        document.getElementById('3d-view-btn').addEventListener('click', () => {
            this.threeDConverter.setPerspectiveView();
            this.updateViewButtons('3d');
        });
        
        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportScene();
        });
        
        // Property panel inputs
        this.bindPropertyInputs();
        

        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                // If in line mode, try to undo last point first
                if (this.sketchEngine.currentTool === 'line' && this.sketchEngine.isDrawing) {
                    if (!this.sketchEngine.undoLastLinePoint()) {
                        this.sketchEngine.deleteSelected();
                    }
                } else {
                    this.sketchEngine.deleteSelected();
                }
            } else if (e.ctrlKey && e.key === 'd') {
                e.preventDefault();
                this.sketchEngine.duplicateSelected();
            } else if (e.ctrlKey && e.key === 'a') {
                e.preventDefault();
                this.selectAll();
            } else if (e.key === 'Enter') {
                // Finish line drawing
                if (this.sketchEngine.currentTool === 'line' && this.sketchEngine.isDrawing) {
                    this.sketchEngine.finishLineDrawing();
                }
            } else if (e.key === 'Escape') {
                // Cancel line drawing
                if (this.sketchEngine.currentTool === 'line' && this.sketchEngine.isDrawing) {
                    this.sketchEngine.cancelLineDrawing();
                }
            } else if (e.ctrlKey && e.key === 'z') {
                // Undo last line point
                e.preventDefault();
                if (this.sketchEngine.currentTool === 'line' && this.sketchEngine.isDrawing) {
                    this.sketchEngine.undoLastLinePoint();
                }
            }
        });
    }
    
    bindPropertyInputs() {
        const inputs = ['prop-x', 'prop-y', 'prop-width', 'prop-height', 'prop-rotation', 'prop-depth', 'prop-entity-height'];
        
        inputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            input.addEventListener('change', () => {
                this.updateSelectedEntities();
            });
        });
    }
    
    updateSelectedEntities() {
        if (this.sketchEngine.selectedEntities.size !== 1) return;
        
        const entityId = Array.from(this.sketchEngine.selectedEntities)[0];
        const entity = this.sketchEngine.entities.get(entityId);
        if (!entity) return;
        
        const x = parseFloat(document.getElementById('prop-x').value) || 0;
        const y = parseFloat(document.getElementById('prop-y').value) || 0;
        const width = parseFloat(document.getElementById('prop-width').value) || 1;
        const height = parseFloat(document.getElementById('prop-height').value) || 1;
        const rotation = parseFloat(document.getElementById('prop-rotation').value) || 0;
        const depth = parseFloat(document.getElementById('prop-depth').value) || 0.5;
        const entityHeight = parseFloat(document.getElementById('prop-entity-height').value) || 0;
        
        entity.transform.x = x;
        entity.transform.y = y;
        entity.transform.width = Math.max(1, width);
        entity.transform.height = Math.max(1, height);
        entity.transform.rotation = rotation;
        entity.extrudeDepth = Math.max(0.1, depth);
        entity.entityHeight = entityHeight;
        
        this.sketchEngine.redraw();
    }
    
    updatePropertiesPanel(entity) {
        if (!entity) {
            // Clear properties panel
            document.getElementById('prop-x').value = '';
            document.getElementById('prop-y').value = '';
            document.getElementById('prop-width').value = '';
            document.getElementById('prop-height').value = '';
            document.getElementById('prop-rotation').value = '';
            document.getElementById('prop-depth').value = '';
            document.getElementById('prop-entity-height').value = '';
            return;
        }
        
        document.getElementById('prop-x').value = entity.transform.x.toFixed(1);
        document.getElementById('prop-y').value = entity.transform.y.toFixed(1);
        document.getElementById('prop-width').value = entity.transform.width.toFixed(1);
        document.getElementById('prop-height').value = entity.transform.height.toFixed(1);
        document.getElementById('prop-rotation').value = entity.transform.rotation.toFixed(0);
        document.getElementById('prop-depth').value = entity.extrudeDepth.toFixed(1);
        document.getElementById('prop-entity-height').value = entity.entityHeight.toFixed(1);
    }
    
    updateLayersPanel() {
        const layersList = document.getElementById('layers-list');
        layersList.innerHTML = '';
        
        // Get layers in order (top to bottom for display)
        const orderedLayers = this.sketchEngine.getOrderedLayers().reverse();
        
        orderedLayers.forEach((layer, displayIndex) => {
            const layerId = layer.id;
            const layerItem = document.createElement('div');
            layerItem.className = 'layer-item';
            if (layerId === this.sketchEngine.currentLayerId) {
                layerItem.classList.add('active');
            }
            

            
            const canMove = this.sketchEngine.canMoveLayer(layerId);
            const canLock = this.sketchEngine.canLockLayer(layerId);
            const canDelete = this.sketchEngine.canDeleteLayer(layerId);
            
            const isTop = displayIndex === 0;
            const isBottom = displayIndex === orderedLayers.length - 1;
            
            layerItem.innerHTML = `
                <div class="layer-move" ${!canMove ? 'style="visibility: hidden;"' : ''}>
                    <button class="layer-move-btn" ${!canMove || isTop ? 'disabled' : ''} title="Move Up">↑</button>
                    <button class="layer-move-btn" ${!canMove || isBottom ? 'disabled' : ''} title="Move Down">↓</button>
                </div>
                <span class="layer-name">${layer.name} (${layer.entities.length})</span>
                <div class="layer-controls">
                    <div class="layer-visibility ${layer.visible ? '' : 'hidden'}" title="Toggle Visibility">${layer.visible ? '👁️' : '🙈'}</div>
                    <div class="layer-lock ${layer.locked ? 'locked' : ''}" title="${canLock ? 'Toggle Lock' : 'Cannot lock this layer'}" ${!canLock ? 'style="opacity: 0.3; cursor: not-allowed;"' : ''}>${layer.locked ? '🔒' : '🔓'}</div>
                    <div class="layer-delete" title="${canDelete ? 'Delete Layer' : 'Cannot delete this layer'}" ${!canDelete ? 'style="opacity: 0.3; cursor: not-allowed;"' : ''}>🗑️</div>
                </div>
            `;
            
            // Move up button
            const moveUpBtn = layerItem.querySelector('.layer-move-btn:first-child');
            if (canMove && !isTop) {
                moveUpBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.sketchEngine.moveLayerUp(layerId);
                    this.updateLayersPanel();
                });
            }
            
            // Move down button
            const moveDownBtn = layerItem.querySelector('.layer-move-btn:last-child');
            if (canMove && !isBottom) {
                moveDownBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.sketchEngine.moveLayerDown(layerId);
                    this.updateLayersPanel();
                });
            }
            
            // Layer selection
            layerItem.querySelector('.layer-name').addEventListener('click', () => {
                this.sketchEngine.setCurrentLayer(layerId);
                this.updateLayersPanel();
            });
            
            // Visibility toggle
            layerItem.querySelector('.layer-visibility').addEventListener('click', (e) => {
                e.stopPropagation();
                this.sketchEngine.toggleLayerVisibility(layerId);
                this.updateLayersPanel();
            });
            
            // Lock toggle
            if (canLock) {
                layerItem.querySelector('.layer-lock').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.sketchEngine.toggleLayerLock(layerId);
                    this.updateLayersPanel();
                });
            }
            
            // Delete layer
            if (canDelete) {
                layerItem.querySelector('.layer-delete').addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm(`Delete layer "${layer.name}" and all its entities?`)) {
                        this.sketchEngine.deleteLayer(layerId);
                        this.updateLayersPanel();
                    }
                });
            }
            
            layersList.appendChild(layerItem);
        });
    }
    
    update3DView() {
        const entities = this.sketchEngine.getVisibleEntities();
        const layers = this.sketchEngine.layers;
        
        // Get actual canvas dimensions
        const canvas = document.getElementById('sketch-canvas');
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        
        this.threeDConverter.convertEntitiesToScene(entities, layers, canvasWidth, canvasHeight);
    }
    
    exportScene() {
        const entities = this.sketchEngine.getAllEntities();
        const sceneData = {
            entities: entities.map(entity => ({
                id: entity.id,
                type: entity.type,
                data: entity.data,
                transform: entity.transform,
                layerId: entity.layerId,
                extrudeDepth: entity.extrudeDepth,
                entityHeight: entity.entityHeight
            })),
            layers: Array.from(this.sketchEngine.layers.values()).map(layer => ({
                id: layer.id,
                name: layer.name,
                visible: layer.visible,
                locked: layer.locked,
                order: layer.order
            }))
        };
        
        const dataStr = JSON.stringify(sceneData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'scene.json';
        link.click();
    }
    
    selectAll() {
        this.sketchEngine.entities.forEach((entity, id) => {
            this.sketchEngine.selectedEntities.add(id);
        });
        this.sketchEngine.updateSelection();
        this.sketchEngine.redraw();
    }
    
    updateViewButtons(activeView) {
        const btn2D = document.getElementById('2d-view-btn');
        const btn3D = document.getElementById('3d-view-btn');
        
        // Remove active class from both
        btn2D.classList.remove('active');
        btn3D.classList.remove('active');
        
        // Add active class to current view
        if (activeView === '2d') {
            btn2D.classList.add('active');
        } else {
            btn3D.classList.add('active');
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new App();
});