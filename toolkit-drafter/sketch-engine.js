class Entity {
    constructor(id, type, data) {
        this.id = id;
        this.type = type;
        this.data = data;
        this.transform = {
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            rotation: 0,
            scaleX: 1,
            scaleY: 1
        };
        this.selected = false;
        this.visible = true;
        this.layerId = 'default';
        this.extrudeDepth = 0.5;
        this.entityHeight = 0; // Individual entity height offset
    }

    getBounds() {
        return {
            x: this.transform.x,
            y: this.transform.y,
            width: this.transform.width * this.transform.scaleX,
            height: this.transform.height * this.transform.scaleY
        };
    }

    containsPoint(x, y) {
        const bounds = this.getBounds();
        return x >= bounds.x && x <= bounds.x + bounds.width &&
            y >= bounds.y && y <= bounds.y + bounds.height;
    }
}

class Layer {
    constructor(id, name, order = 0) {
        this.id = id;
        this.name = name;
        this.visible = true;
        this.locked = false;
        this.order = order; // Layer stacking order (0 = bottom, higher = top)
        this.entities = [];
    }
}

class SketchEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.currentTool = 'select';
        this.isDrawing = false;
        this.isDragging = false;
        this.isResizing = false;

        // Entity and layer management
        this.entities = new Map();
        this.layers = new Map();
        this.selectedEntities = new Set();
        this.currentLayerId = 'default';
        this.entityIdCounter = 0;

        // Drawing state
        this.startPoint = null;
        this.currentPath = [];
        this.dragStart = null;
        this.resizeHandle = null;

        // View state
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;

        this.setupCanvas();
        this.createDefaultLayer();
        this.bindEvents();
    }

    setupCanvas() {
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.lineWidth = 2;
        this.updateCanvasSize();
    }

    updateCanvasSize() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.redraw();
    }

    createDefaultLayer() {
        // Create default drawing layer
        const defaultLayer = new Layer('default', 'Layer 1', 0);
        this.layers.set('default', defaultLayer);
    }

    bindEvents() {
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.onWheel.bind(this));
        this.canvas.addEventListener('contextmenu', this.onRightClick.bind(this));
        this.canvas.addEventListener('dblclick', this.onDoubleClick.bind(this));
        window.addEventListener('resize', this.updateCanvasSize.bind(this));
    }

    onMouseDown(e) {
        const point = this.getMousePoint(e);

        if (this.currentTool === 'select') {
            this.handleSelection(point, e.shiftKey);
        } else if (this.currentTool === 'line') {
            this.handleLineDrawing(point);
        } else {
            this.startDrawing(point);
        }
    }

    onMouseMove(e) {
        const point = this.getMousePoint(e);

        if (this.isDrawing) {
            this.continueDrawing(point);
        } else if (this.isDragging) {
            this.handleDrag(point);
        } else if (this.currentTool === 'select') {
            this.updateCursor(point);
        } else if (this.currentTool === 'line' && this.currentPath.length > 0) {
            // Show preview line to cursor when in line mode
            this.currentMousePoint = point;
            this.redraw();
            this.drawLinePreview(point);
        }
    }

    onMouseUp(e) {
        if (this.isDrawing && this.currentTool !== 'line') {
            this.finishDrawing();
        }
        this.isDragging = false;
        this.isResizing = false;
        this.dragStart = null;
        this.resizeHandle = null;
    }

    onWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.zoom *= delta;
        this.zoom = Math.max(0.1, Math.min(5, this.zoom));
        this.redraw();
    }

    onRightClick(e) {
        e.preventDefault();

        if (this.currentTool === 'line' && this.isDrawing) {
            // Right-click finishes line drawing
            this.finishLineDrawing();
        }
    }

    onDoubleClick(e) {
        if (this.currentTool === 'line' && this.isDrawing) {
            // Double-click also finishes line drawing
            this.finishLineDrawing();
        }
    }

    getMousePoint(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - this.panX) / this.zoom,
            y: (e.clientY - rect.top - this.panY) / this.zoom
        };
    }

    handleSelection(point, addToSelection) {
        const clickedEntity = this.getEntityAtPoint(point);

        if (clickedEntity) {
            if (addToSelection) {
                if (this.selectedEntities.has(clickedEntity.id)) {
                    this.selectedEntities.delete(clickedEntity.id);
                } else {
                    this.selectedEntities.add(clickedEntity.id);
                }
            } else {
                this.selectedEntities.clear();
                this.selectedEntities.add(clickedEntity.id);
            }

            this.dragStart = point;
            this.isDragging = true;
        } else if (!addToSelection) {
            this.selectedEntities.clear();
        }

        this.updateSelection();
        this.redraw();
    }

    handleDrag(point) {
        if (!this.dragStart) return;

        const dx = point.x - this.dragStart.x;
        const dy = point.y - this.dragStart.y;

        this.selectedEntities.forEach(entityId => {
            const entity = this.entities.get(entityId);
            if (entity) {
                entity.transform.x += dx;
                entity.transform.y += dy;
            }
        });

        this.dragStart = point;
        this.redraw();
        this.updatePropertiesPanel();
    }

    handleLineDrawing(point) {
        // Check if clicking near an existing point to close the line
        if (this.currentPath.length > 2) {
            const firstPoint = this.currentPath[0];
            const distance = Math.sqrt(
                Math.pow(point.x - firstPoint.x, 2) + Math.pow(point.y - firstPoint.y, 2)
            );

            if (distance < 10 / this.zoom) { // Close threshold
                this.finishLineDrawing();
                return;
            }
        }

        if (!this.isDrawing) {
            // Start new line
            this.isDrawing = true;
            this.startPoint = point;
            this.currentPath = [point];
            this.updateLineStatus(`Drawing line - ${this.currentPath.length} points`);
        } else {
            // Add point to current line
            this.currentPath.push(point);
            this.updateLineStatus(`Drawing line - ${this.currentPath.length} points`);
        }

        this.redraw();
        this.drawCurrentLine();
    }

    startDrawing(point) {
        this.isDrawing = true;
        this.startPoint = point;
        this.currentPath = [point];

        if (this.currentTool === 'pen') {
            // Start pen drawing
            this.ctx.beginPath();
            this.ctx.moveTo(point.x * this.zoom + this.panX, point.y * this.zoom + this.panY);
        }
    }

    drawPenStroke(fromPoint, toPoint) {
        if (!fromPoint || !toPoint) return;

        this.ctx.strokeStyle = '#2c3e50';
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.ctx.lineTo(toPoint.x * this.zoom + this.panX, toPoint.y * this.zoom + this.panY);
        this.ctx.stroke();
    }

    continueDrawing(point) {
        if (this.currentTool === 'pen') {
            this.currentPath.push(point);
            // For pen tool, draw directly without full redraw for better performance
            this.drawPenStroke(this.currentPath[this.currentPath.length - 2], point);
        } else {
            // For other tools, update the current end point
            this.currentPath = [this.startPoint, point];
            this.redraw();
            this.drawPreview(point);
        }
    }

    finishDrawing() {
        if (!this.startPoint) return;

        const entity = this.createEntityFromPath();
        if (entity) {
            this.addEntity(entity);
            if (window.app) {
                window.app.updateLayersPanel();
            }
        }

        this.isDrawing = false;
        this.currentPath = [];
        this.startPoint = null;
        this.redraw();
    }

    createEntityFromPath() {
        const entityId = `entity_${this.entityIdCounter++}`;
        let entityData;

        let endPoint = this.currentPath.length > 1 ? this.currentPath[1] : this.startPoint;

        switch (this.currentTool) {
            case 'pen':
                if (this.currentPath.length < 2) return null;
                entityData = { points: [...this.currentPath] };
                break;
            case 'line':
                if (this.currentPath.length < 2) return null;
                entityData = { points: [...this.currentPath] };
                break;
            case 'rectangle':
                if (!endPoint || (endPoint.x === this.startPoint.x && endPoint.y === this.startPoint.y)) return null;
                const width = Math.abs(endPoint.x - this.startPoint.x);
                const height = Math.abs(endPoint.y - this.startPoint.y);
                if (width < 5 || height < 5) return null; // Minimum size

                entityData = {
                    x: Math.min(this.startPoint.x, endPoint.x),
                    y: Math.min(this.startPoint.y, endPoint.y),
                    width: width,
                    height: height
                };
                break;
            case 'circle':
                if (!endPoint) return null;
                const radius = Math.sqrt(
                    Math.pow(endPoint.x - this.startPoint.x, 2) +
                    Math.pow(endPoint.y - this.startPoint.y, 2)
                );
                if (radius < 5) return null; // Minimum radius

                entityData = {
                    center: this.startPoint,
                    radius: radius
                };
                break;
            default:
                return null;
        }

        const entity = new Entity(entityId, this.currentTool, entityData);

        // Set initial transform based on shape
        if (this.currentTool === 'rectangle') {
            entity.transform.x = entityData.x;
            entity.transform.y = entityData.y;
            entity.transform.width = entityData.width;
            entity.transform.height = entityData.height;
        } else if (this.currentTool === 'circle') {
            entity.transform.x = entityData.center.x - entityData.radius;
            entity.transform.y = entityData.center.y - entityData.radius;
            entity.transform.width = entityData.radius * 2;
            entity.transform.height = entityData.radius * 2;
        } else if (this.currentTool === 'line') {
            // Calculate bounding box for line path
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            entityData.points.forEach(point => {
                minX = Math.min(minX, point.x);
                minY = Math.min(minY, point.y);
                maxX = Math.max(maxX, point.x);
                maxY = Math.max(maxY, point.y);
            });
            entity.transform.x = minX;
            entity.transform.y = minY;
            entity.transform.width = maxX - minX;
            entity.transform.height = maxY - minY;
        } else if (this.currentTool === 'pen') {
            // Calculate bounding box for pen path
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            entityData.points.forEach(point => {
                minX = Math.min(minX, point.x);
                minY = Math.min(minY, point.y);
                maxX = Math.max(maxX, point.x);
                maxY = Math.max(maxY, point.y);
            });
            entity.transform.x = minX;
            entity.transform.y = minY;
            entity.transform.width = maxX - minX;
            entity.transform.height = maxY - minY;
        }

        entity.layerId = this.currentLayerId;
        return entity;
    }

    addEntity(entity) {
        this.entities.set(entity.id, entity);
        const layer = this.layers.get(entity.layerId);
        if (layer) {
            layer.entities.push(entity.id);
        }
    }

    getEntityAtPoint(point) {
        // Check entities in reverse order (top to bottom)
        const allEntities = Array.from(this.entities.values()).reverse();

        for (const entity of allEntities) {
            const layer = this.layers.get(entity.layerId);
            if (entity.visible && layer && layer.visible && !layer.locked && entity.containsPoint(point.x, point.y)) {
                return entity;
            }
        }
        return null;
    }

    drawCurrentLine() {
        if (this.currentPath.length === 0) return;

        this.ctx.save();

        // Draw the line segments
        if (this.currentPath.length > 1) {
            this.ctx.strokeStyle = '#3498db';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();

            const firstPoint = this.currentPath[0];
            this.ctx.moveTo(firstPoint.x * this.zoom + this.panX, firstPoint.y * this.zoom + this.panY);

            for (let i = 1; i < this.currentPath.length; i++) {
                const point = this.currentPath[i];
                this.ctx.lineTo(point.x * this.zoom + this.panX, point.y * this.zoom + this.panY);
            }

            this.ctx.stroke();
        }

        // Draw points with different styles
        this.currentPath.forEach((point, index) => {
            const x = point.x * this.zoom + this.panX;
            const y = point.y * this.zoom + this.panY;

            this.ctx.beginPath();

            if (index === 0) {
                // Start point - green and larger
                this.ctx.fillStyle = '#27ae60';
                this.ctx.arc(x, y, 6, 0, 2 * Math.PI);
                this.ctx.fill();
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            } else if (index === this.currentPath.length - 1) {
                // End point - red
                this.ctx.fillStyle = '#e74c3c';
                this.ctx.arc(x, y, 5, 0, 2 * Math.PI);
                this.ctx.fill();
            } else {
                // Middle points - blue
                this.ctx.fillStyle = '#3498db';
                this.ctx.arc(x, y, 4, 0, 2 * Math.PI);
                this.ctx.fill();
            }
        });

        // Draw close indicator if near start point
        if (this.currentPath.length > 2 && this.currentMousePoint) {
            const firstPoint = this.currentPath[0];
            const distance = Math.sqrt(
                Math.pow(this.currentMousePoint.x - firstPoint.x, 2) +
                Math.pow(this.currentMousePoint.y - firstPoint.y, 2)
            );

            if (distance < 10 / this.zoom) {
                this.ctx.strokeStyle = '#f39c12';
                this.ctx.lineWidth = 3;
                this.ctx.setLineDash([5, 5]);
                this.ctx.beginPath();
                this.ctx.arc(
                    firstPoint.x * this.zoom + this.panX,
                    firstPoint.y * this.zoom + this.panY,
                    12, 0, 2 * Math.PI
                );
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        }

        this.ctx.restore();
    }

    drawLinePreview(currentPoint) {
        if (this.currentPath.length === 0) return;

        this.ctx.save();
        this.ctx.strokeStyle = '#95a5a6';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([3, 3]);
        this.ctx.beginPath();

        const lastPoint = this.currentPath[this.currentPath.length - 1];
        this.ctx.moveTo(lastPoint.x * this.zoom + this.panX, lastPoint.y * this.zoom + this.panY);
        this.ctx.lineTo(currentPoint.x * this.zoom + this.panX, currentPoint.y * this.zoom + this.panY);

        this.ctx.stroke();
        this.ctx.restore();
    }

    drawPreview(currentPoint) {
        if (!this.startPoint) return;

        this.ctx.save();
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeStyle = '#3498db';
        this.ctx.beginPath();

        switch (this.currentTool) {
            case 'rectangle':
                const x = Math.min(this.startPoint.x, currentPoint.x) * this.zoom + this.panX;
                const y = Math.min(this.startPoint.y, currentPoint.y) * this.zoom + this.panY;
                const w = Math.abs(currentPoint.x - this.startPoint.x) * this.zoom;
                const h = Math.abs(currentPoint.y - this.startPoint.y) * this.zoom;
                this.ctx.rect(x, y, w, h);
                break;
            case 'circle':
                const radius = Math.sqrt(
                    Math.pow(currentPoint.x - this.startPoint.x, 2) +
                    Math.pow(currentPoint.y - this.startPoint.y, 2)
                ) * this.zoom;
                this.ctx.arc(
                    this.startPoint.x * this.zoom + this.panX,
                    this.startPoint.y * this.zoom + this.panY,
                    radius, 0, 2 * Math.PI
                );
                break;
        }

        this.ctx.stroke();
        this.ctx.restore();
    }

    redraw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid
        this.drawGrid();

        // Draw entities by layer
        this.layers.forEach(layer => {
            if (!layer.visible) return;

            layer.entities.forEach(entityId => {
                const entity = this.entities.get(entityId);
                if (entity && entity.visible) {
                    this.drawEntity(entity);
                }
            });
        });

        // Draw selection handles
        this.drawSelectionHandles();
    }

    drawGrid() {
        const gridSize = 50 * this.zoom;
        this.ctx.save();
        this.ctx.strokeStyle = '#f0f0f0';
        this.ctx.lineWidth = 1;

        for (let x = this.panX % gridSize; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        for (let y = this.panY % gridSize; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    drawEntity(entity) {
        this.ctx.save();
        this.ctx.strokeStyle = entity.selected ? '#3498db' : '#2c3e50';
        this.ctx.lineWidth = 2;

        const transform = entity.transform;
        this.ctx.translate(
            transform.x * this.zoom + this.panX,
            transform.y * this.zoom + this.panY
        );
        this.ctx.rotate(transform.rotation * Math.PI / 180);
        this.ctx.scale(transform.scaleX * this.zoom, transform.scaleY * this.zoom);

        this.ctx.beginPath();

        switch (entity.type) {
            case 'pen':
                if (entity.data.points.length > 0) {
                    // Draw pen path relative to entity's transform origin
                    const firstPoint = entity.data.points[0];
                    this.ctx.moveTo(
                        (firstPoint.x - transform.x) * transform.scaleX,
                        (firstPoint.y - transform.y) * transform.scaleY
                    );
                    entity.data.points.slice(1).forEach(point => {
                        this.ctx.lineTo(
                            (point.x - transform.x) * transform.scaleX,
                            (point.y - transform.y) * transform.scaleY
                        );
                    });
                }
                break;
            case 'line':
                if (entity.data.points && entity.data.points.length > 1) {
                    // Draw line relative to entity's transform origin
                    const firstPoint = entity.data.points[0];
                    this.ctx.moveTo(
                        (firstPoint.x - transform.x) * transform.scaleX,
                        (firstPoint.y - transform.y) * transform.scaleY
                    );
                    for (let i = 1; i < entity.data.points.length; i++) {
                        const point = entity.data.points[i];
                        this.ctx.lineTo(
                            (point.x - transform.x) * transform.scaleX,
                            (point.y - transform.y) * transform.scaleY
                        );
                    }
                }
                break;
            case 'rectangle':
                this.ctx.rect(0, 0, transform.width, transform.height);
                break;
            case 'circle':
                this.ctx.arc(
                    transform.width / 2,
                    transform.height / 2,
                    Math.min(transform.width, transform.height) / 2,
                    0, 2 * Math.PI
                );
                break;
        }

        this.ctx.stroke();
        this.ctx.restore();
    }

    drawSelectionHandles() {
        this.selectedEntities.forEach(entityId => {
            const entity = this.entities.get(entityId);
            if (!entity) return;

            const bounds = entity.getBounds();
            const x = bounds.x * this.zoom + this.panX;
            const y = bounds.y * this.zoom + this.panY;
            const w = bounds.width * this.zoom;
            const h = bounds.height * this.zoom;

            this.ctx.save();
            this.ctx.strokeStyle = '#3498db';
            this.ctx.fillStyle = '#3498db';
            this.ctx.lineWidth = 1;

            // Selection rectangle
            this.ctx.strokeRect(x, y, w, h);

            // Resize handles
            const handleSize = 8;
            const handles = [
                { x: x - handleSize / 2, y: y - handleSize / 2 }, // top-left
                { x: x + w - handleSize / 2, y: y - handleSize / 2 }, // top-right
                { x: x - handleSize / 2, y: y + h - handleSize / 2 }, // bottom-left
                { x: x + w - handleSize / 2, y: y + h - handleSize / 2 } // bottom-right
            ];

            handles.forEach(handle => {
                this.ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
            });

            this.ctx.restore();
        });
    }

    updateCursor(point) {
        // Update cursor based on what's under the mouse
        const entity = this.getEntityAtPoint(point);
        this.canvas.style.cursor = entity ? 'move' : 'default';
    }

    updateSelection() {
        this.entities.forEach(entity => {
            entity.selected = this.selectedEntities.has(entity.id);
        });
    }

    updatePropertiesPanel() {
        if (this.selectedEntities.size === 1) {
            const entityId = Array.from(this.selectedEntities)[0];
            const entity = this.entities.get(entityId);
            if (entity && window.app) {
                window.app.updatePropertiesPanel(entity);
            }
        }
    }

    // Public methods
    finishLineDrawing() {
        if (this.currentTool === 'line' && this.currentPath.length >= 2) {
            const entity = this.createEntityFromPath();
            if (entity) {
                this.addEntity(entity);
                if (window.app) {
                    window.app.updateLayersPanel();
                }
            }
            this.updateLineStatus('Line completed! Click to start new line');
        }

        // Reset line drawing state
        this.isDrawing = false;
        this.currentPath = [];
        this.startPoint = null;
        this.currentMousePoint = null;
        this.redraw();
    }

    undoLastLinePoint() {
        if (this.currentTool === 'line' && this.currentPath.length > 1) {
            this.currentPath.pop();
            this.updateLineStatus(`Drawing line - ${this.currentPath.length} points`);
            this.redraw();
            this.drawCurrentLine();
            return true;
        }
        return false;
    }

    cancelLineDrawing() {
        if (this.currentTool === 'line' && this.isDrawing) {
            this.isDrawing = false;
            this.currentPath = [];
            this.startPoint = null;
            this.currentMousePoint = null;
            this.updateLineStatus('Line cancelled. Click to start new line');
            this.redraw();
            return true;
        }
        return false;
    }

    updateLineStatus(message) {
        const statusElement = document.getElementById('line-status');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    setTool(tool) {
        // Finish any ongoing line drawing when switching tools
        if (this.currentTool === 'line' && this.isDrawing) {
            this.finishLineDrawing();
        }

        this.currentTool = tool;
        this.canvas.style.cursor = tool === 'select' ? 'default' : 'crosshair';

        // Update line status visibility
        const statusElement = document.getElementById('line-status');
        if (statusElement) {
            if (tool === 'line') {
                statusElement.style.display = 'block';
                this.updateLineStatus('Click to start drawing line');
            } else {
                statusElement.style.display = 'none';
            }
        }
    }

    deleteSelected() {
        this.selectedEntities.forEach(entityId => {
            const entity = this.entities.get(entityId);
            if (entity) {
                const layer = this.layers.get(entity.layerId);
                if (layer) {
                    layer.entities = layer.entities.filter(id => id !== entityId);
                }
                this.entities.delete(entityId);
            }
        });
        this.selectedEntities.clear();
        this.redraw();
    }

    duplicateSelected() {
        const newEntities = [];
        this.selectedEntities.forEach(entityId => {
            const entity = this.entities.get(entityId);
            if (entity) {
                const newEntity = new Entity(
                    `entity_${this.entityIdCounter++}`,
                    entity.type,
                    JSON.parse(JSON.stringify(entity.data))
                );
                newEntity.transform = { ...entity.transform };
                newEntity.transform.x += 20;
                newEntity.transform.y += 20;
                newEntity.layerId = entity.layerId;
                newEntity.extrudeDepth = entity.extrudeDepth;

                this.addEntity(newEntity);
                newEntities.push(newEntity.id);
            }
        });

        this.selectedEntities.clear();
        newEntities.forEach(id => this.selectedEntities.add(id));
        this.updateSelection();
        this.redraw();
    }

    clearAll() {
        this.entities.clear();
        this.selectedEntities.clear();
        this.layers.forEach(layer => {
            layer.entities = [];
        });
        this.redraw();
    }

    zoomIn() {
        this.zoom *= 1.2;
        this.redraw();
    }

    zoomOut() {
        this.zoom /= 1.2;
        this.redraw();
    }

    fitView() {
        // Calculate bounds of all entities
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        this.entities.forEach(entity => {
            const bounds = entity.getBounds();
            minX = Math.min(minX, bounds.x);
            minY = Math.min(minY, bounds.y);
            maxX = Math.max(maxX, bounds.x + bounds.width);
            maxY = Math.max(maxY, bounds.y + bounds.height);
        });

        if (minX !== Infinity) {
            const padding = 50;
            const contentWidth = maxX - minX;
            const contentHeight = maxY - minY;

            const scaleX = (this.canvas.width - padding * 2) / contentWidth;
            const scaleY = (this.canvas.height - padding * 2) / contentHeight;

            this.zoom = Math.min(scaleX, scaleY, 2);
            this.panX = (this.canvas.width - contentWidth * this.zoom) / 2 - minX * this.zoom;
            this.panY = (this.canvas.height - contentHeight * this.zoom) / 2 - minY * this.zoom;

            this.redraw();
        }
    }

    // Layer management
    addLayer(name) {
        const layerId = `layer_${Date.now()}`;
        const maxOrder = Math.max(...Array.from(this.layers.values()).map(l => l.order), -1);
        const layer = new Layer(layerId, name, maxOrder + 1);
        this.layers.set(layerId, layer);
        return layer;
    }

    moveLayerUp(layerId) {
        const layer = this.layers.get(layerId);
        if (!layer) return false;

        // Find layer with next higher order
        const layersArray = Array.from(this.layers.values())
            .sort((a, b) => a.order - b.order);
        const currentIndex = layersArray.findIndex(l => l.id === layerId);

        if (currentIndex < layersArray.length - 1) {
            const nextLayer = layersArray[currentIndex + 1];
            // Swap orders
            const tempOrder = layer.order;
            layer.order = nextLayer.order;
            nextLayer.order = tempOrder;
            return true;
        }
        return false;
    }

    moveLayerDown(layerId) {
        const layer = this.layers.get(layerId);
        if (!layer) return false;

        // Find layer with next lower order
        const layersArray = Array.from(this.layers.values())
            .sort((a, b) => a.order - b.order);
        const currentIndex = layersArray.findIndex(l => l.id === layerId);

        if (currentIndex > 0) {
            const prevLayer = layersArray[currentIndex - 1];
            // Swap orders
            const tempOrder = layer.order;
            layer.order = prevLayer.order;
            prevLayer.order = tempOrder;
            return true;
        }
        return false;
    }

    getLayerHeight(layerId) {
        const layer = this.layers.get(layerId);
        if (!layer) return 0;

        // Calculate height based on layer order (each layer is 1 unit high)
        return layer.order * 1.0;
    }

    getOrderedLayers() {
        return Array.from(this.layers.values()).sort((a, b) => a.order - b.order);
    }

    setCurrentLayer(layerId) {
        if (this.layers.has(layerId)) {
            this.currentLayerId = layerId;
        }
    }

    toggleLayerVisibility(layerId) {
        const layer = this.layers.get(layerId);
        if (layer) {
            layer.visible = !layer.visible;
            this.redraw();
        }
    }

    toggleLayerLock(layerId) {
        const layer = this.layers.get(layerId);
        if (layer) {
            layer.locked = !layer.locked;
            // If locking the current layer, deselect entities in it
            if (layer.locked) {
                layer.entities.forEach(entityId => {
                    this.selectedEntities.delete(entityId);
                });
                this.updateSelection();
                this.redraw();
            }
        }
    }

    deleteLayer(layerId) {
        if (layerId === 'default') return; // Can't delete default layer

        const layer = this.layers.get(layerId);
        if (layer && !layer.isSpecial) { // Can't delete special layers
            // Delete all entities in the layer
            layer.entities.forEach(entityId => {
                this.entities.delete(entityId);
                this.selectedEntities.delete(entityId);
            });

            // Remove the layer
            this.layers.delete(layerId);

            // If this was the current layer, switch to default
            if (this.currentLayerId === layerId) {
                this.currentLayerId = 'default';
            }

            this.redraw();
        }
    }

    canDeleteLayer(layerId) {
        return layerId !== 'default';
    }

    canLockLayer(layerId) {
        return true;
    }

    canMoveLayer(layerId) {
        return true;
    }

    getAllEntities() {
        return Array.from(this.entities.values());
    }

    getVisibleEntities() {
        return this.getAllEntities().filter(entity => {
            const layer = this.layers.get(entity.layerId);
            return entity.visible && layer && layer.visible;
        });
    }
}