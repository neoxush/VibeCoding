# 2D/3D Mode Integration Design

## Overview

This document outlines the design for seamless integration between 2D professional drawing mode and 3D blockout mode in the 3D Blockout Toolkit. The design focuses on creating a unified user experience where designers can fluidly move between 2D sketching and 3D manipulation while maintaining spatial relationships and workflow continuity.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    BlockoutToolkit                          │
│  ┌─────────────────────┐    ┌─────────────────────────────┐ │
│  │    3D Mode          │    │         2D Mode             │ │
│  │                     │    │                             │ │
│  │  ┌───────────────┐  │    │  ┌───────────────────────┐  │ │
│  │  │ Three.js      │  │    │  │ Professional2D        │  │ │
│  │  │ Scene         │  │◄───┤  │ DrawingEngine         │  │ │
│  │  │               │  │    │  │                       │  │ │
│  │  │ - Objects     │  │    │  │ - Drawing Tools       │  │ │
│  │  │ - Camera      │  │    │  │ - Annotations         │  │ │
│  │  │ - Controls    │  │    │  │ - Canvas Management   │  │ │
│  │  └───────────────┘  │    │  └───────────────────────┘  │ │
│  └─────────────────────┘    └─────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Coordinate Transformation                  │ │
│  │                                                         │ │
│  │  2D Canvas (pixels) ◄──────────► 3D World (units)     │ │
│  │  - Center mapping                                       │ │
│  │  - Axis transformation                                  │ │
│  │  - Scaling factors                                      │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Component Relationships

1. **BlockoutToolkit (Main Controller)**
   - Manages mode switching
   - Coordinates between 2D and 3D systems
   - Handles UI state management

2. **Professional2DDrawingEngine**
   - Manages 2D canvas and drawing operations
   - Handles professional drawing tools
   - Manages annotations and elements

3. **CoordinateTransformer**
   - Handles 2D ↔ 3D coordinate conversion
   - Manages scaling and positioning logic

4. **AnnotationManager**
   - Processes text annotations for object type recognition
   - Manages annotation metadata and lifecycle

## Components and Interfaces

### 1. Mode Management System

```javascript
class ModeManager {
    constructor(toolkit) {
        this.toolkit = toolkit;
        this.currentMode = '3D';
        this.transitionInProgress = false;
    }

    async switchTo3D() {
        if (this.transitionInProgress) return;
        
        this.transitionInProgress = true;
        try {
            // Hide 2D interface
            this.hide2DInterface();
            
            // Show 3D interface
            this.show3DInterface();
            
            // Update mode state
            this.currentMode = '3D';
            
            // Resize 3D viewport
            this.toolkit.onWindowResize();
            
        } finally {
            this.transitionInProgress = false;
        }
    }

    async switchTo2D() {
        if (this.transitionInProgress) return;
        
        this.transitionInProgress = true;
        try {
            // Initialize 2D engine if needed
            if (!this.toolkit.sketchMode) {
                this.toolkit.sketchMode = new Professional2DDrawingEngine(this.toolkit);
            }
            
            // Hide 3D interface
            this.hide3DInterface();
            
            // Show 2D interface
            this.show2DInterface();
            
            // Update mode state
            this.currentMode = '2D';
            
            // Resize 2D canvas
            setTimeout(() => this.toolkit.sketchMode.resize(), 100);
            
        } finally {
            this.transitionInProgress = false;
        }
    }
}
```

### 2. Professional Drawing Tools Architecture

```javascript
// Base Tool Interface
class DrawingTool {
    constructor(engine) {
        this.engine = engine;
        this.isActive = false;
    }

    activate() { this.isActive = true; }
    deactivate() { this.isActive = false; }
    
    // Tool lifecycle methods
    startDrawing(position, event) { throw new Error('Must implement'); }
    draw(position, event) { throw new Error('Must implement'); }
    stopDrawing() { throw new Error('Must implement'); }
    
    // Optional methods
    onKeyDown(event) {}
    onKeyUp(event) {}
    getCursor() { return 'crosshair'; }
}

// Tool Registry
class ToolRegistry {
    constructor(engine) {
        this.engine = engine;
        this.tools = new Map();
        this.activeTool = null;
        
        this.registerDefaultTools();
    }

    registerDefaultTools() {
        this.register('precision_line', new PrecisionLineTool(this.engine));
        this.register('smart_rectangle', new SmartRectangleTool(this.engine));
        this.register('intelligent_circle', new IntelligentCircleTool(this.engine));
        this.register('annotation_tool', new AnnotationTool(this.engine));
        this.register('eraser', new EraserTool(this.engine));
    }

    register(name, tool) {
        this.tools.set(name, tool);
    }

    setActiveTool(name) {
        if (this.activeTool) {
            this.activeTool.deactivate();
        }
        
        this.activeTool = this.tools.get(name);
        if (this.activeTool) {
            this.activeTool.activate();
        }
    }
}
```

### 3. Coordinate Transformation System

```javascript
class CoordinateTransformer {
    constructor(canvas2D, scene3D) {
        this.canvas2D = canvas2D;
        this.scene3D = scene3D;
        this.scaleFactor = 50; // 50 pixels = 1 world unit
    }

    // Convert 2D canvas coordinates to 3D world coordinates
    canvas2DToWorld3D(canvasX, canvasY, height = 0.5) {
        const centerX = this.canvas2D.width / 2;
        const centerY = this.canvas2D.height / 2;
        
        // Convert to world coordinates
        const worldX = (canvasX - centerX) / this.scaleFactor;
        const worldZ = -(canvasY - centerY) / this.scaleFactor; // Invert Y to Z
        const worldY = height;
        
        return new THREE.Vector3(worldX, worldY, worldZ);
    }

    // Convert 3D world coordinates to 2D canvas coordinates
    world3DToCanvas2D(worldX, worldY, worldZ) {
        const centerX = this.canvas2D.width / 2;
        const centerY = this.canvas2D.height / 2;
        
        const canvasX = centerX + (worldX * this.scaleFactor);
        const canvasY = centerY - (worldZ * this.scaleFactor); // Invert Z to Y
        
        return { x: canvasX, y: canvasY };
    }

    // Get appropriate 3D object height based on 2D context
    getObjectHeight(objectType, context = {}) {
        const defaultHeights = {
            'cube': 1.0,
            'sphere': 1.0,
            'cylinder': 1.0,
            'cone': 1.0,
            'torus': 0.4,
            'plane': 0.1
        };
        
        return context.height || defaultHeights[objectType] || 1.0;
    }
}
```

### 4. Annotation Processing System

```javascript
class AnnotationProcessor {
    constructor() {
        this.objectTypePatterns = new Map([
            ['cube', /\b(cube|box|block|square)\b/i],
            ['sphere', /\b(sphere|ball|circle|round)\b/i],
            ['cylinder', /\b(cylinder|pillar|column|tube)\b/i],
            ['cone', /\b(cone|pyramid|triangle)\b/i],
            ['torus', /\b(torus|ring|donut)\b/i],
            ['plane', /\b(plane|wall|floor|surface|flat)\b/i]
        ]);
    }

    processAnnotation(text) {
        const cleanText = text.trim().toLowerCase();
        
        // Determine object type
        let objectType = 'cube'; // default
        let confidence = 0;
        
        for (const [type, pattern] of this.objectTypePatterns) {
            if (pattern.test(cleanText)) {
                objectType = type;
                confidence = 0.9;
                break;
            }
        }
        
        // Extract additional properties
        const properties = this.extractProperties(cleanText);
        
        return {
            objectType,
            confidence,
            properties,
            originalText: text
        };
    }

    extractProperties(text) {
        const properties = {};
        
        // Extract size hints
        const sizePatterns = {
            small: /\b(small|tiny|mini)\b/i,
            large: /\b(large|big|huge|giant)\b/i,
            tall: /\b(tall|high)\b/i,
            wide: /\b(wide|broad)\b/i
        };
        
        for (const [size, pattern] of Object.entries(sizePatterns)) {
            if (pattern.test(text)) {
                properties.size = size;
                break;
            }
        }
        
        // Extract color hints
        const colorPattern = /\b(red|blue|green|yellow|orange|purple|pink|brown|black|white|gray)\b/i;
        const colorMatch = text.match(colorPattern);
        if (colorMatch) {
            properties.color = colorMatch[1].toLowerCase();
        }
        
        return properties;
    }
}
```

### 5. Canvas Management System

```javascript
class CanvasManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.layers = new Map();
        this.isDirty = false;
        
        this.setupLayers();
    }

    setupLayers() {
        // Create rendering layers
        this.layers.set('background', { elements: [], visible: true, zIndex: 0 });
        this.layers.set('grid', { elements: [], visible: true, zIndex: 1 });
        this.layers.set('drawing', { elements: [], visible: true, zIndex: 2 });
        this.layers.set('annotations', { elements: [], visible: true, zIndex: 3 });
        this.layers.set('ui', { elements: [], visible: true, zIndex: 4 });
    }

    addElement(layerName, element) {
        const layer = this.layers.get(layerName);
        if (layer) {
            layer.elements.push(element);
            this.markDirty();
        }
    }

    removeElement(layerName, elementId) {
        const layer = this.layers.get(layerName);
        if (layer) {
            layer.elements = layer.elements.filter(el => el.id !== elementId);
            this.markDirty();
        }
    }

    markDirty() {
        this.isDirty = true;
        requestAnimationFrame(() => this.render());
    }

    render() {
        if (!this.isDirty) return;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render layers in z-index order
        const sortedLayers = Array.from(this.layers.entries())
            .sort(([,a], [,b]) => a.zIndex - b.zIndex);
        
        for (const [name, layer] of sortedLayers) {
            if (layer.visible) {
                this.renderLayer(layer);
            }
        }
        
        this.isDirty = false;
    }

    renderLayer(layer) {
        for (const element of layer.elements) {
            this.renderElement(element);
        }
    }
}
```

## Data Models

### Drawing Element Model

```javascript
class DrawingElement {
    constructor(type, properties = {}) {
        this.id = this.generateId();
        this.type = type;
        this.timestamp = Date.now();
        this.properties = properties;
        this.style = {
            color: '#212121',
            lineWidth: 2,
            fillColor: null,
            opacity: 1.0
        };
    }

    generateId() {
        return 'elem_' + Math.random().toString(36).substr(2, 9);
    }

    // Serialization
    toJSON() {
        return {
            id: this.id,
            type: this.type,
            timestamp: this.timestamp,
            properties: this.properties,
            style: this.style
        };
    }

    static fromJSON(data) {
        const element = new DrawingElement(data.type, data.properties);
        element.id = data.id;
        element.timestamp = data.timestamp;
        element.style = data.style;
        return element;
    }
}

// Specific element types
class LineElement extends DrawingElement {
    constructor(startX, startY, endX, endY) {
        super('line', { startX, startY, endX, endY });
    }

    getBounds() {
        return {
            minX: Math.min(this.properties.startX, this.properties.endX),
            minY: Math.min(this.properties.startY, this.properties.endY),
            maxX: Math.max(this.properties.startX, this.properties.endX),
            maxY: Math.max(this.properties.startY, this.properties.endY)
        };
    }
}

class RectangleElement extends DrawingElement {
    constructor(x, y, width, height) {
        super('rectangle', { x, y, width, height });
    }

    getBounds() {
        return {
            minX: this.properties.x,
            minY: this.properties.y,
            maxX: this.properties.x + this.properties.width,
            maxY: this.properties.y + this.properties.height
        };
    }
}

class CircleElement extends DrawingElement {
    constructor(centerX, centerY, radius) {
        super('circle', { centerX, centerY, radius });
    }

    getBounds() {
        return {
            minX: this.properties.centerX - this.properties.radius,
            minY: this.properties.centerY - this.properties.radius,
            maxX: this.properties.centerX + this.properties.radius,
            maxY: this.properties.centerY + this.properties.radius
        };
    }
}
```

### Annotation Model

```javascript
class Annotation {
    constructor(x, y, text) {
        this.id = this.generateId();
        this.x = x;
        this.y = y;
        this.text = text;
        this.timestamp = Date.now();
        this.processed = false;
        this.objectType = null;
        this.confidence = 0;
        this.properties = {};
    }

    generateId() {
        return 'ann_' + Math.random().toString(36).substr(2, 9);
    }

    process(processor) {
        const result = processor.processAnnotation(this.text);
        this.objectType = result.objectType;
        this.confidence = result.confidence;
        this.properties = result.properties;
        this.processed = true;
        return result;
    }

    toJSON() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            text: this.text,
            timestamp: this.timestamp,
            processed: this.processed,
            objectType: this.objectType,
            confidence: this.confidence,
            properties: this.properties
        };
    }
}
```

## Error Handling

### Error Categories

1. **Initialization Errors**
   - Canvas not found
   - WebGL context creation failure
   - Tool registration failures

2. **Runtime Errors**
   - Drawing operation failures
   - Coordinate transformation errors
   - Mode switching failures

3. **User Input Errors**
   - Invalid annotation text
   - Unsupported operations
   - Performance limitations exceeded

### Error Handling Strategy

```javascript
class ErrorHandler {
    constructor(toolkit) {
        this.toolkit = toolkit;
        this.errorLog = [];
    }

    handleError(error, context = {}) {
        const errorInfo = {
            timestamp: Date.now(),
            message: error.message,
            stack: error.stack,
            context: context,
            severity: this.determineSeverity(error, context)
        };

        this.errorLog.push(errorInfo);
        
        switch (errorInfo.severity) {
            case 'critical':
                this.handleCriticalError(errorInfo);
                break;
            case 'warning':
                this.handleWarning(errorInfo);
                break;
            case 'info':
                this.handleInfo(errorInfo);
                break;
        }
    }

    handleCriticalError(errorInfo) {
        console.error('Critical error:', errorInfo);
        // Show user notification
        this.showErrorNotification('A critical error occurred. Please refresh the page.', 'error');
        // Attempt graceful degradation
        this.attemptRecovery(errorInfo);
    }

    handleWarning(errorInfo) {
        console.warn('Warning:', errorInfo);
        // Show subtle user notification
        this.showErrorNotification(errorInfo.message, 'warning');
    }

    handleInfo(errorInfo) {
        console.info('Info:', errorInfo);
        // Log only, no user notification
    }
}
```

## Testing Strategy

### Unit Testing

1. **Coordinate Transformation Tests**
   - 2D to 3D conversion accuracy
   - 3D to 2D conversion accuracy
   - Edge cases (canvas boundaries, negative coordinates)

2. **Drawing Tool Tests**
   - Tool activation/deactivation
   - Drawing operation correctness
   - Event handling

3. **Annotation Processing Tests**
   - Object type recognition accuracy
   - Property extraction
   - Edge cases (empty text, special characters)

### Integration Testing

1. **Mode Switching Tests**
   - 2D to 3D transition
   - 3D to 2D transition
   - State preservation during transitions

2. **2D to 3D Conversion Tests**
   - Annotation processing pipeline
   - Object creation accuracy
   - Coordinate mapping verification

### Performance Testing

1. **Canvas Rendering Performance**
   - Large number of drawing elements
   - Complex shapes and annotations
   - Real-time interaction responsiveness

2. **Memory Usage Testing**
   - Drawing element storage efficiency
   - Garbage collection behavior
   - Long-running session stability

## Implementation Phases

### Phase 1: Core Infrastructure
- Mode management system
- Basic coordinate transformation
- Simple drawing tools (line, rectangle, circle)

### Phase 2: Professional Tools
- Advanced drawing tools with constraints
- Professional grid system
- Real-time visual feedback

### Phase 3: Annotation System
- Text annotation processing
- Object type recognition
- 2D to 3D conversion pipeline

### Phase 4: Polish and Optimization
- Performance optimization
- Error handling improvements
- User experience enhancements
- Comprehensive testing

## Success Metrics

### Functional Metrics
- Mode switching success rate: >99%
- Coordinate transformation accuracy: <1% error
- Annotation recognition accuracy: >85%
- Drawing tool responsiveness: <16ms latency

### User Experience Metrics
- Mode transition time: <500ms
- Drawing operation smoothness: 60fps
- User task completion rate: >90%
- User satisfaction score: >4.0/5.0

### Technical Metrics
- Memory usage: <100MB for typical sessions
- CPU usage: <30% during active drawing
- Error rate: <0.1% of operations
- Code coverage: >80%