/**
 * 3D Blockout Toolkit - Fixed Implementation
 * A web-based tool for rapid 3D prototyping and level design
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

/**
 * Command Pattern for Undo/Redo
 */
class Command {
    constructor(description = 'Unknown Command') {
        this.description = description;
    }

    execute() {
        throw new Error('execute() method must be implemented');
    }

    undo() {
        throw new Error('undo() method must be implemented');
    }
}

class CreateObjectCommand extends Command {
    constructor(toolkit, objectType, position = null) {
        super(`Create ${objectType}`);
        this.toolkit = toolkit;
        this.objectType = objectType;
        this.position = position;
        this.createdObject = null;
    }

    execute() {
        this.createdObject = this.toolkit.createPrimitiveObject(this.objectType, this.position);
        this.toolkit.scene.add(this.createdObject);
        this.toolkit.objects.push(this.createdObject);
        this.toolkit.updateObjectCount();
        this.toolkit.selectObject(this.createdObject);
        return this.createdObject;
    }

    undo() {
        if (this.createdObject) {
            this.toolkit.scene.remove(this.createdObject);
            const index = this.toolkit.objects.indexOf(this.createdObject);
            if (index > -1) {
                this.toolkit.objects.splice(index, 1);
            }
            if (this.toolkit.selectedObject === this.createdObject) {
                this.toolkit.selectObject(null);
            }
            this.createdObject.geometry.dispose();
            this.createdObject.material.dispose();
            this.toolkit.updateObjectCount();
        }
    }
}

class CommandHistory {
    constructor(maxSize = 50, toolkit = null) {
        this.history = [];
        this.currentIndex = -1;
        this.maxSize = maxSize;
        this.toolkit = toolkit;
    }

    execute(command) {
        const result = command.execute();
        if (this.currentIndex < this.history.length - 1) {
            this.history.splice(this.currentIndex + 1);
        }
        this.history.push(command);
        this.currentIndex++;
        if (this.history.length > this.maxSize) {
            this.history.shift();
            this.currentIndex--;
        }
        this.updateUI();
        return result;
    }

    undo() {
        if (this.canUndo()) {
            const command = this.history[this.currentIndex];
            command.undo();
            this.currentIndex--;
            this.updateUI();
            return command;
        }
        return null;
    }

    redo() {
        if (this.canRedo()) {
            this.currentIndex++;
            const command = this.history[this.currentIndex];
            command.execute();
            this.updateUI();
            return command;
        }
        return null;
    }

    canUndo() {
        return this.currentIndex >= 0;
    }

    canRedo() {
        return this.currentIndex < this.history.length - 1;
    }

    updateUI() {
        if (this.toolkit && this.toolkit.updateUndoRedoButtons) {
            this.toolkit.updateUndoRedoButtons();
        }
    }
}

/**
 * Multi-Camera System
 */
class MultiCameraSystem {
    constructor(renderer, scene) {
        this.renderer = renderer;
        this.scene = scene;
        this.cameras = {};
        this.currentView = 'perspective';
        this.controls = null;
        
        this.setupCameras();
    }

    setupCameras() {
        const canvas = this.renderer.domElement;
        const aspect = canvas.clientWidth / canvas.clientHeight;
        const frustumSize = 20;
        
        // Perspective camera
        this.cameras.perspective = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        this.cameras.perspective.position.set(5, 5, 5);
        this.cameras.perspective.lookAt(0, 0, 0);
        
        // Orthographic cameras
        this.cameras.top = new THREE.OrthographicCamera(
            -frustumSize * aspect / 2, frustumSize * aspect / 2,
            frustumSize / 2, -frustumSize / 2, 0.1, 1000
        );
        this.cameras.top.position.set(0, 20, 0);
        this.cameras.top.lookAt(0, 0, 0);
        this.cameras.top.up.set(0, 0, -1);
        
        this.cameras.front = new THREE.OrthographicCamera(
            -frustumSize * aspect / 2, frustumSize * aspect / 2,
            frustumSize / 2, -frustumSize / 2, 0.1, 1000
        );
        this.cameras.front.position.set(0, 0, 20);
        this.cameras.front.lookAt(0, 0, 0);
        
        this.cameras.left = new THREE.OrthographicCamera(
            -frustumSize * aspect / 2, frustumSize * aspect / 2,
            frustumSize / 2, -frustumSize / 2, 0.1, 1000
        );
        this.cameras.left.position.set(-20, 0, 0);
        this.cameras.left.lookAt(0, 0, 0);
        
        this.cameras.right = new THREE.OrthographicCamera(
            -frustumSize * aspect / 2, frustumSize * aspect / 2,
            frustumSize / 2, -frustumSize / 2, 0.1, 1000
        );
        this.cameras.right.position.set(20, 0, 0);
        this.cameras.right.lookAt(0, 0, 0);
    }

    setView(viewName) {
        if (this.cameras[viewName]) {
            this.currentView = viewName;
            if (viewName === 'perspective' && this.controls) {
                this.controls.enabled = true;
            } else if (this.controls) {
                this.controls.enabled = false;
            }
            return this.cameras[viewName];
        }
        return this.cameras.perspective;
    }

    getCurrentCamera() {
        return this.cameras[this.currentView];
    }

    isTopView() {
        return this.currentView === 'top';
    }

    updateAspect(aspect) {
        this.cameras.perspective.aspect = aspect;
        this.cameras.perspective.updateProjectionMatrix();
        
        const frustumSize = 20;
        ['top', 'front', 'left', 'right'].forEach(viewName => {
            const camera = this.cameras[viewName];
            camera.left = -frustumSize * aspect / 2;
            camera.right = frustumSize * aspect / 2;
            camera.top = frustumSize / 2;
            camera.bottom = -frustumSize / 2;
            camera.updateProjectionMatrix();
        });
    }
}

/**
 * Drawing Toolkit
 */
class IntegratedDrawingToolkit {
    constructor(toolkit) {
        this.toolkit = toolkit;
        this.isActive = false;
        this.selectedBlockoutType = 'cube';
        this.isDrawing = false;
        this.drawingPath = [];
        this.previewObjects = [];
        this.pathLine = null; // Visual path line
        this.pathPoints = []; // Path visualization points
        this.cursorIndicator = null; // Cursor position indicator
        this.drawingMode = 'freehand'; // 'freehand' or 'line'
        this.lineStartPoint = null; // For line mode
        this.tempLine = null; // Temporary line preview
    }

    activate() {
        this.isActive = true;
        this.toolkit.cameraSystem.setView('top');
        this.createCursorIndicator();
        this.updateUI();
    }

    deactivate() {
        this.isActive = false;
        this.finishCurrentDrawing();
        this.clearPreview();
        this.clearPathVisualization();
        this.clearCursorIndicator();
        this.clearTempLine();
        this.updateUI();
    }

    setBlockoutType(type) {
        this.selectedBlockoutType = type;
        this.updateUI();
        
        // Update cursor indicator color
        if (this.cursorIndicator) {
            const colors = {
                'cube': 0x4CAF50,
                'sphere': 0x2196F3,
                'cylinder': 0xFF9800,
                'plane': 0x9C27B0,
                'cone': 0xF44336,
                'torus': 0x00BCD4
            };
            this.cursorIndicator.material.color.setHex(colors[type] || 0x4CAF50);
        }
    }

    startDrawing(position) {
        if (!this.isActive) return;
        
        if (this.drawingMode === 'line') {
            this.startLineDrawing(position);
        } else {
            this.startFreehandDrawing(position);
        }
    }
    
    startFreehandDrawing(position) {
        this.isDrawing = true;
        this.drawingPath = [position];
        this.clearPreview();
        this.clearPathVisualization();
        this.createPathVisualization();
    }
    
    startLineDrawing(position) {
        if (!this.lineStartPoint) {
            // First click - set start point
            this.lineStartPoint = position;
            this.drawingPath = [position];
            this.clearPreview();
            this.clearPathVisualization();
            this.createPathVisualization();
            this.createTempLine();
        } else {
            // Second click - complete the line
            this.drawingPath.push(position);
            this.updatePathVisualization();
            this.generateBlockoutFromPath();
            this.clearPreview();
            this.clearPathVisualization();
            this.clearTempLine();
            
            // Start new line from this point
            this.lineStartPoint = position;
            this.drawingPath = [position];
            this.createPathVisualization();
            this.createTempLine();
        }
    }
    
    // Helper method to convert canvas coordinates to screen coordinates
    canvasToScreen(canvasX, canvasY) {
        const canvas = this.toolkit.renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        return {
            x: canvasX + rect.left,
            y: canvasY + rect.top
        };
    }

    addDrawingPoint(position) {
        if (!this.isDrawing) return;
        
        // Add minimum distance threshold for smoother paths
        const lastPoint = this.drawingPath[this.drawingPath.length - 1];
        if (lastPoint) {
            const dx = position.x - lastPoint.x;
            const dy = position.y - lastPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Only add point if it's far enough from the last point
            if (distance < 5) return; // Minimum 5 pixels distance
        }
        
        this.drawingPath.push(position);
        this.updatePathVisualization();
        this.updatePreview();
    }

    finishDrawing() {
        if (this.drawingMode === 'line') {
            // Line mode is handled in startDrawing
            return;
        }
        
        // Freehand mode
        if (!this.isDrawing || this.drawingPath.length < 2) return;
        this.generateBlockoutFromPath();
        this.clearPreview();
        this.clearPathVisualization();
        this.isDrawing = false;
        this.drawingPath = [];
    }

    generateBlockoutFromPath() {
        const pathLength = this.calculatePathLength();
        const segments = Math.max(1, Math.floor(pathLength / 50));
        
        for (let i = 0; i < segments; i++) {
            const t = i / Math.max(1, segments - 1);
            const position = this.interpolatePathPosition(t);
            const screenPos = this.canvasToScreen(position.x, position.y);
            const worldPos = this.screenToWorld(screenPos.x, screenPos.y);
            
            const command = new CreateObjectCommand(this.toolkit, this.selectedBlockoutType, worldPos);
            this.toolkit.commandHistory.execute(command);
        }
    }

    screenToWorld(screenX, screenY) {
        const canvas = this.toolkit.renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        
        // Convert screen coordinates to canvas-relative coordinates
        const canvasX = screenX - rect.left;
        const canvasY = screenY - rect.top;
        
        // Normalize to -1 to 1 range
        const normalizedX = (canvasX / rect.width) * 2 - 1;
        const normalizedY = -(canvasY / rect.height) * 2 + 1;
        
        // Map to world coordinates (for top view orthographic camera)
        const frustumSize = 10;
        const aspect = rect.width / rect.height;
        const x = normalizedX * frustumSize * aspect;
        const z = -normalizedY * frustumSize;
        const y = 0.5;
        
        return new THREE.Vector3(x, y, z);
    }

    calculatePathLength() {
        let length = 0;
        for (let i = 1; i < this.drawingPath.length; i++) {
            const dx = this.drawingPath[i].x - this.drawingPath[i-1].x;
            const dy = this.drawingPath[i].y - this.drawingPath[i-1].y;
            length += Math.sqrt(dx * dx + dy * dy);
        }
        return length;
    }

    interpolatePathPosition(t) {
        if (this.drawingPath.length < 2) return this.drawingPath[0] || { x: 0, y: 0 };
        
        const totalLength = this.calculatePathLength();
        const targetLength = t * totalLength;
        
        let currentLength = 0;
        for (let i = 1; i < this.drawingPath.length; i++) {
            const dx = this.drawingPath[i].x - this.drawingPath[i-1].x;
            const dy = this.drawingPath[i].y - this.drawingPath[i-1].y;
            const segmentLength = Math.sqrt(dx * dx + dy * dy);
            
            if (currentLength + segmentLength >= targetLength) {
                const segmentT = (targetLength - currentLength) / segmentLength;
                return {
                    x: this.drawingPath[i-1].x + dx * segmentT,
                    y: this.drawingPath[i-1].y + dy * segmentT
                };
            }
            currentLength += segmentLength;
        }
        return this.drawingPath[this.drawingPath.length - 1];
    }

    updatePreview() {
        this.clearPreview();
        if (this.drawingPath.length < 2) return;
        
        const segments = Math.max(1, Math.floor(this.calculatePathLength() / 100));
        for (let i = 0; i < segments; i++) {
            const t = i / Math.max(1, segments - 1);
            const position = this.interpolatePathPosition(t);
            const screenPos = this.canvasToScreen(position.x, position.y);
            const worldPos = this.screenToWorld(screenPos.x, screenPos.y);
            
            const previewObj = this.toolkit.createPrimitiveObject(this.selectedBlockoutType, worldPos);
            previewObj.material.transparent = true;
            previewObj.material.opacity = 0.5;
            previewObj.material.color.setHex(0x00BCD4);
            
            this.toolkit.scene.add(previewObj);
            this.previewObjects.push(previewObj);
        }
    }

    clearPreview() {
        this.previewObjects.forEach(obj => {
            this.toolkit.scene.remove(obj);
            obj.geometry.dispose();
            obj.material.dispose();
        });
        this.previewObjects = [];
    }

    createPathVisualization() {
        // Create a line geometry for the drawing path
        const geometry = new THREE.BufferGeometry();
        const material = new THREE.LineBasicMaterial({ 
            color: 0x00BCD4, 
            linewidth: 3,
            transparent: true,
            opacity: 0.8
        });
        
        this.pathLine = new THREE.Line(geometry, material);
        this.toolkit.scene.add(this.pathLine);
    }

    updatePathVisualization() {
        if (!this.pathLine || this.drawingPath.length < 2) return;
        
        // Convert canvas coordinates to screen coordinates, then to world coordinates
        const points = this.drawingPath.map(point => {
            const screenPos = this.canvasToScreen(point.x, point.y);
            const worldPos = this.screenToWorld(screenPos.x, screenPos.y);
            // Slightly elevate the line above the ground plane
            return new THREE.Vector3(worldPos.x, worldPos.y + 0.1, worldPos.z);
        });
        
        // Update the line geometry
        this.pathLine.geometry.setFromPoints(points);
        this.pathLine.geometry.attributes.position.needsUpdate = true;
        
        // Add visual indicators at path points
        this.updatePathPoints(points);
    }

    updatePathPoints(points) {
        // Clear existing path points
        this.pathPoints.forEach(point => {
            this.toolkit.scene.remove(point);
            point.geometry.dispose();
            point.material.dispose();
        });
        this.pathPoints = [];
        
        // Add small spheres at each path point
        points.forEach((point, index) => {
            const geometry = new THREE.SphereGeometry(0.1, 8, 8);
            const material = new THREE.MeshBasicMaterial({ 
                color: index === 0 ? 0x4CAF50 : (index === points.length - 1 ? 0xf44336 : 0x00BCD4),
                transparent: true,
                opacity: 0.7
            });
            
            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.copy(point);
            sphere.position.y += 0.05; // Slightly higher than the line
            
            this.toolkit.scene.add(sphere);
            this.pathPoints.push(sphere);
        });
    }

    clearPathVisualization() {
        // Remove the path line
        if (this.pathLine) {
            this.toolkit.scene.remove(this.pathLine);
            this.pathLine.geometry.dispose();
            this.pathLine.material.dispose();
            this.pathLine = null;
        }
        
        // Remove path points
        this.pathPoints.forEach(point => {
            this.toolkit.scene.remove(point);
            point.geometry.dispose();
            point.material.dispose();
        });
        this.pathPoints = [];
    }

    createCursorIndicator() {
        // Create a small indicator to show where the user will draw
        const geometry = new THREE.RingGeometry(0.2, 0.3, 8);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x4CAF50,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        
        this.cursorIndicator = new THREE.Mesh(geometry, material);
        this.cursorIndicator.rotation.x = -Math.PI / 2; // Lay flat on ground
        this.cursorIndicator.position.y = 0.01; // Slightly above ground
        this.cursorIndicator.visible = false; // Hidden until mouse moves
        
        this.toolkit.scene.add(this.cursorIndicator);
    }

    updateCursorIndicator(canvasX, canvasY) {
        if (!this.cursorIndicator || !this.isActive) return;
        
        // Convert canvas-relative coordinates to screen coordinates for screenToWorld
        const canvas = this.toolkit.renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        const screenX = canvasX + rect.left;
        const screenY = canvasY + rect.top;
        
        const worldPos = this.screenToWorld(screenX, screenY);
        this.cursorIndicator.position.x = worldPos.x;
        this.cursorIndicator.position.z = worldPos.z;
        this.cursorIndicator.visible = true;
        
        // Change color based on selected blockout type
        const colors = {
            'cube': 0x4CAF50,
            'sphere': 0x2196F3,
            'cylinder': 0xFF9800,
            'plane': 0x9C27B0,
            'cone': 0xF44336,
            'torus': 0x00BCD4
        };
        
        this.cursorIndicator.material.color.setHex(colors[this.selectedBlockoutType] || 0x4CAF50);
    }

    clearCursorIndicator() {
        if (this.cursorIndicator) {
            this.toolkit.scene.remove(this.cursorIndicator);
            this.cursorIndicator.geometry.dispose();
            this.cursorIndicator.material.dispose();
            this.cursorIndicator = null;
        }
    }
    
    createTempLine() {
        if (!this.lineStartPoint) return;
        
        const geometry = new THREE.BufferGeometry();
        const material = new THREE.LineBasicMaterial({ 
            color: 0xFFFF00, // Yellow for temp line
            linewidth: 2,
            transparent: true,
            opacity: 0.6,
            linecap: 'round'
        });
        
        this.tempLine = new THREE.Line(geometry, material);
        this.toolkit.scene.add(this.tempLine);
    }
    
    updateTempLine(currentPosition) {
        if (!this.tempLine || !this.lineStartPoint) return;
        
        // Convert canvas coordinates to screen coordinates
        const startScreen = this.canvasToScreen(this.lineStartPoint.x, this.lineStartPoint.y);
        const endScreen = this.canvasToScreen(currentPosition.x, currentPosition.y);
        
        const startWorld = this.screenToWorld(startScreen.x, startScreen.y);
        const endWorld = this.screenToWorld(endScreen.x, endScreen.y);
        
        const points = [
            new THREE.Vector3(startWorld.x, startWorld.y + 0.15, startWorld.z),
            new THREE.Vector3(endWorld.x, endWorld.y + 0.15, endWorld.z)
        ];
        
        this.tempLine.geometry.setFromPoints(points);
        this.tempLine.geometry.attributes.position.needsUpdate = true;
    }
    
    clearTempLine() {
        if (this.tempLine) {
            this.toolkit.scene.remove(this.tempLine);
            this.tempLine.geometry.dispose();
            this.tempLine.material.dispose();
            this.tempLine = null;
        }
    }
    
    setDrawingMode(mode) {
        this.drawingMode = mode;
        this.finishCurrentDrawing();
        this.updateUI();
    }
    
    finishCurrentDrawing() {
        if (this.drawingMode === 'line') {
            this.lineStartPoint = null;
            this.clearTempLine();
        }
        this.isDrawing = false;
        this.drawingPath = [];
        this.clearPreview();
        this.clearPathVisualization();
    }

    updateUI() {
        const drawingToolkit = document.getElementById('drawingToolkit');
        if (drawingToolkit) {
            drawingToolkit.style.display = this.isActive ? 'block' : 'none';
        }
        
        // Update cursor style for drawing mode
        const appContainer = document.querySelector('.app-container');
        if (appContainer) {
            if (this.isActive) {
                appContainer.classList.add('drawing-mode-active');
            } else {
                appContainer.classList.remove('drawing-mode-active');
            }
        }
        
        // Update drawing mode buttons
        document.querySelectorAll('.drawing-mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeModeBtn = document.getElementById(`${this.drawingMode}Mode`);
        if (activeModeBtn) {
            activeModeBtn.classList.add('active');
        }
        
        // Update blockout type buttons
        document.querySelectorAll('.blockout-type-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.getElementById(`blockout-${this.selectedBlockoutType}`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // Update instructions based on drawing mode
        const freehandInstructions = document.getElementById('freehandInstructions');
        const lineInstructions = document.getElementById('lineInstructions');
        const drawingModeInfo = document.getElementById('drawingModeInfo');
        
        if (freehandInstructions && lineInstructions) {
            if (this.drawingMode === 'line') {
                freehandInstructions.style.display = 'none';
                lineInstructions.style.display = 'block';
                if (drawingModeInfo) {
                    drawingModeInfo.textContent = 'Click points to create precise line segments.';
                }
            } else {
                freehandInstructions.style.display = 'block';
                lineInstructions.style.display = 'none';
                if (drawingModeInfo) {
                    drawingModeInfo.textContent = 'Draw freely by clicking and dragging in the viewport.';
                }
            }
        }
    }
}

/**
 * Diagnostic System for Tracking Initialization
 */
class DiagnosticSystem {
    constructor() {
        this.steps = [
            'dom', 'canvas', 'scene', 'renderer', 'camera', 
            'controls', 'lighting', 'grid', 'events', 'render', 'complete'
        ];
        this.currentStep = 0;
        this.errors = [];
        this.isVisible = true;
        
        this.setupToggle();
    }

    setupToggle() {
        const toggleBtn = document.getElementById('toggleDiagnostic');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.isVisible = !this.isVisible;
                const console = document.getElementById('diagnosticConsole');
                if (console) {
                    console.style.display = this.isVisible ? 'block' : 'none';
                    toggleBtn.textContent = this.isVisible ? 'Hide' : 'Show';
                }
            });
        }
    }
    
    hide() {
        this.isVisible = false;
        const console = document.getElementById('diagnosticConsole');
        const toggleBtn = document.getElementById('toggleDiagnostic');
        if (console) {
            console.style.display = 'none';
        }
        if (toggleBtn) {
            toggleBtn.textContent = 'Show';
        }
    }

    updateStep(stepName, status, message = '') {
        const stepElement = document.getElementById(`step-${stepName}`);
        if (!stepElement) return;

        const icon = stepElement.querySelector('.step-icon');
        const text = stepElement.querySelector('.step-text');
        
        stepElement.classList.remove('pending', 'success', 'error');
        
        switch (status) {
            case 'pending':
                stepElement.classList.add('pending');
                icon.textContent = '⏳';
                text.textContent = message || `${stepName} loading...`;
                break;
            case 'success':
                stepElement.classList.add('success');
                icon.textContent = '✅';
                text.textContent = message || `${stepName} initialized successfully`;
                break;
            case 'error':
                stepElement.classList.add('error');
                icon.textContent = '❌';
                text.textContent = message || `${stepName} failed to initialize`;
                this.errors.push({ step: stepName, message });
                break;
        }
        
        console.log(`🔍 Diagnostic: ${stepName} - ${status} - ${message}`);
    }

    startStep(stepName, message = '') {
        this.updateStep(stepName, 'pending', message);
    }

    completeStep(stepName, message = '') {
        this.updateStep(stepName, 'success', message);
    }

    errorStep(stepName, error, message = '') {
        const errorMsg = message || error.message || 'Unknown error';
        this.updateStep(stepName, 'error', errorMsg);
        console.error(`❌ Diagnostic Error in ${stepName}:`, error);
    }

    getErrorSummary() {
        if (this.errors.length === 0) return 'No errors detected';
        return this.errors.map(e => `${e.step}: ${e.message}`).join('\n');
    }

    isComplete() {
        return this.errors.length === 0 && this.currentStep >= this.steps.length;
    }
}

/**
 * Main BlockoutToolkit Class
 */
class BlockoutToolkit {
    constructor() {
        console.log('🚀 Initializing BlockoutToolkit...');
        
        // Diagnostic system
        this.diagnostic = new DiagnosticSystem();
        
        // Core Three.js components
        this.scene = null;
        this.renderer = null;
        this.cameraSystem = null;
        this.controls = null;
        this.transformControls = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Object management
        this.objects = [];
        this.selectedObject = null;
        this.objectCounter = 0;
        
        // Grid and helpers
        this.grid = null;
        this.gridVisible = true;
        
        // Transform modes
        this.currentMode = 'translate';
        
        // Systems
        this.commandHistory = new CommandHistory(50, this);
        this.drawingToolkit = null;
        
        this.init();
    }

    init() {
        try {
            this.diagnostic.startStep('scene', 'Setting up 3D scene...');
            this.setupScene();
            this.diagnostic.completeStep('scene', 'Scene created successfully');
            
            this.diagnostic.startStep('renderer', 'Setting up WebGL renderer...');
            this.setupRenderer();
            this.diagnostic.completeStep('renderer', 'Renderer initialized');
            
            this.diagnostic.startStep('camera', 'Setting up camera system...');
            this.setupCamera();
            this.diagnostic.completeStep('camera', 'Multi-camera system ready');
            
            this.diagnostic.startStep('controls', 'Setting up controls...');
            this.setupControls();
            this.diagnostic.completeStep('controls', 'Controls and drawing toolkit ready');
            
            this.diagnostic.startStep('lighting', 'Setting up lighting...');
            this.setupLighting();
            this.diagnostic.completeStep('lighting', 'Lighting system active');
            
            this.diagnostic.startStep('grid', 'Setting up grid...');
            this.setupGrid();
            this.diagnostic.completeStep('grid', 'Grid helper visible');
            
            this.diagnostic.startStep('events', 'Setting up event listeners...');
            this.setupEventListeners();
            this.diagnostic.completeStep('events', 'All interactions ready');
            
            this.diagnostic.startStep('render', 'Starting render loop...');
            // Render loop is started in setupEventListeners
            this.diagnostic.completeStep('render', 'Render loop active');
            
            this.updateObjectCount();
            this.updateUndoRedoButtons();
            
            this.diagnostic.startStep('complete', 'Finalizing initialization...');
            
            // Test by adding a cube after a delay
            setTimeout(() => {
                try {
                    console.log('🧪 Adding test cube...');
                    this.addPrimitive('cube');
                    this.diagnostic.completeStep('complete', 'Toolkit ready - Test cube added');
                    
                    // Auto-hide diagnostic after successful initialization
                    setTimeout(() => {
                        if (this.diagnostic.isComplete()) {
                            console.log('🎉 Auto-hiding diagnostic panel after successful initialization');
                            this.diagnostic.hide();
                        }
                    }, 2000);
                    
                } catch (error) {
                    this.diagnostic.errorStep('complete', error, 'Test cube creation failed');
                }
            }, 1000);
            
            console.log('✅ BlockoutToolkit initialization sequence complete!');
            
        } catch (error) {
            console.error('❌ Failed to initialize BlockoutToolkit:', error);
            console.error('❌ Error stack:', error.stack);
            
            // Determine which step failed
            const currentStepName = this.diagnostic.steps[this.diagnostic.currentStep] || 'unknown';
            this.diagnostic.errorStep(currentStepName, error, error.message);
            
            // Show detailed error information
            const errorMessage = `Initialization failed at step: ${currentStepName}\nError: ${error.message}\n\nCheck browser console for details.`;
            this.showError(errorMessage);
            
            // Also log to diagnostic console
            console.log('🔍 Diagnostic errors:', this.diagnostic.getErrorSummary());
            
            // Try a minimal fallback initialization
            this.initializeFallback();
        }
    }
    
    initializeFallback() {
        console.log('🔄 Attempting fallback initialization...');
        try {
            // Try to at least show the diagnostic with error info
            const diagnosticConsole = document.getElementById('diagnosticConsole');
            if (diagnosticConsole) {
                diagnosticConsole.style.display = 'block';
                diagnosticConsole.style.position = 'fixed';
                diagnosticConsole.style.top = '50%';
                diagnosticConsole.style.left = '50%';
                diagnosticConsole.style.transform = 'translate(-50%, -50%)';
                diagnosticConsole.style.zIndex = '10000';
            }
            
            // Update diagnostic header to show error state
            const diagnosticHeader = diagnosticConsole?.querySelector('.diagnostic-header h4');
            if (diagnosticHeader) {
                diagnosticHeader.textContent = '❌ Initialization Failed';
                diagnosticHeader.style.color = '#f44336';
            }
            
            console.log('✅ Fallback initialization completed');
        } catch (fallbackError) {
            console.error('❌ Even fallback initialization failed:', fallbackError);
        }
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a);
        console.log('✅ Scene created');
    }

    setupRenderer() {
        this.diagnostic.startStep('canvas', 'Looking for canvas element...');
        
        const canvas = document.getElementById('viewport3d');
        if (!canvas) {
            throw new Error('Canvas element #viewport3d not found in DOM!');
        }
        
        // Force layout calculation and set minimum dimensions if needed
        const container = canvas.parentElement;
        if (container) {
            // Ensure container has dimensions
            const containerRect = container.getBoundingClientRect();
            console.log('📐 Container dimensions:', containerRect);
        }
        
        // Wait a moment for CSS to apply and get proper dimensions
        let canvasWidth = canvas.clientWidth || canvas.offsetWidth || 800;
        let canvasHeight = canvas.clientHeight || canvas.offsetHeight || 600;
        
        // Fallback to minimum dimensions if still zero
        if (canvasWidth === 0) canvasWidth = 800;
        if (canvasHeight === 0) canvasHeight = 600;
        
        this.diagnostic.completeStep('canvas', `Canvas found: ${canvasWidth}x${canvasHeight}`);
        
        console.log('📐 Canvas element details:', {
            width: canvasWidth,
            height: canvasHeight,
            clientWidth: canvas.clientWidth,
            offsetWidth: canvas.offsetWidth,
            style: canvas.style.cssText
        });
        
        try {
            this.renderer = new THREE.WebGLRenderer({ 
                canvas: canvas,
                antialias: true,
                alpha: false,
                premultipliedAlpha: false
            });
            
            this.renderer.setSize(canvasWidth, canvasHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.renderer.outputColorSpace = THREE.SRGBColorSpace;
            
            // Test render to ensure WebGL is working
            this.renderer.setClearColor(0x1a1a1a, 1.0);
            this.renderer.clear();
            
            console.log('✅ WebGL Renderer created successfully');
            console.log('📊 Renderer info:', {
                capabilities: this.renderer.capabilities,
                context: this.renderer.getContext()
            });
            
        } catch (error) {
            throw new Error(`WebGL initialization failed: ${error.message}`);
        }
    }

    setupCamera() {
        this.cameraSystem = new MultiCameraSystem(this.renderer, this.scene);
        console.log('✅ Camera system created');
    }

    setupControls() {
        this.controls = new OrbitControls(this.cameraSystem.cameras.perspective, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 100;
        this.controls.maxPolarAngle = Math.PI / 2;
        
        this.cameraSystem.controls = this.controls;
        
        this.transformControls = new TransformControls(this.cameraSystem.getCurrentCamera(), this.renderer.domElement);
        this.transformControls.addEventListener('change', () => this.render());
        this.transformControls.addEventListener('dragging-changed', (event) => {
            if (this.controls) {
                this.controls.enabled = !event.value;
            }
        });
        this.scene.add(this.transformControls);
        
        this.drawingToolkit = new IntegratedDrawingToolkit(this);
        
        console.log('✅ Controls created');
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
        this.scene.add(directionalLight);
        
        console.log('✅ Lighting created');
    }

    setupGrid() {
        this.grid = new THREE.GridHelper(20, 20, 0x444444, 0x444444);
        this.scene.add(this.grid);
        console.log('✅ Grid created');
    }

    setupEventListeners() {
        // Camera view switching
        document.getElementById('viewPerspective')?.addEventListener('click', () => this.setView('perspective'));
        document.getElementById('viewTop')?.addEventListener('click', () => this.setView('top'));
        document.getElementById('viewFront')?.addEventListener('click', () => this.setView('front'));
        document.getElementById('viewLeft')?.addEventListener('click', () => this.setView('left'));
        document.getElementById('viewRight')?.addEventListener('click', () => this.setView('right'));
        
        // Drawing toolkit
        document.getElementById('toggleDrawing')?.addEventListener('click', () => this.toggleDrawingToolkit());
        
        // Drawing mode selection
        document.getElementById('freehandMode')?.addEventListener('click', () => this.drawingToolkit.setDrawingMode('freehand'));
        document.getElementById('lineMode')?.addEventListener('click', () => this.drawingToolkit.setDrawingMode('line'));
        
        // Blockout type selection
        document.getElementById('blockout-cube')?.addEventListener('click', () => this.drawingToolkit.setBlockoutType('cube'));
        document.getElementById('blockout-sphere')?.addEventListener('click', () => this.drawingToolkit.setBlockoutType('sphere'));
        document.getElementById('blockout-cylinder')?.addEventListener('click', () => this.drawingToolkit.setBlockoutType('cylinder'));
        document.getElementById('blockout-plane')?.addEventListener('click', () => this.drawingToolkit.setBlockoutType('plane'));
        document.getElementById('blockout-cone')?.addEventListener('click', () => this.drawingToolkit.setBlockoutType('cone'));
        document.getElementById('blockout-torus')?.addEventListener('click', () => this.drawingToolkit.setBlockoutType('torus'));
        
        // 3D primitive creation
        document.getElementById('addCube')?.addEventListener('click', () => this.addPrimitive('cube'));
        document.getElementById('addSphere')?.addEventListener('click', () => this.addPrimitive('sphere'));
        document.getElementById('addCylinder')?.addEventListener('click', () => this.addPrimitive('cylinder'));
        document.getElementById('addPlane')?.addEventListener('click', () => this.addPrimitive('plane'));
        document.getElementById('addCone')?.addEventListener('click', () => this.addPrimitive('cone'));
        document.getElementById('addTorus')?.addEventListener('click', () => this.addPrimitive('torus'));
        
        // Transform modes
        document.getElementById('moveMode')?.addEventListener('click', () => this.setTransformMode('translate'));
        document.getElementById('rotateMode')?.addEventListener('click', () => this.setTransformMode('rotate'));
        document.getElementById('scaleMode')?.addEventListener('click', () => this.setTransformMode('scale'));
        
        // View controls
        document.getElementById('toggleGrid')?.addEventListener('click', () => this.toggleGrid());
        document.getElementById('resetCamera')?.addEventListener('click', () => this.resetCamera());
        
        // Undo/Redo
        document.getElementById('undoBtn')?.addEventListener('click', () => this.undo());
        document.getElementById('redoBtn')?.addEventListener('click', () => this.redo());
        
        // Other controls
        document.getElementById('clearBtn')?.addEventListener('click', () => this.clearScene());
        document.getElementById('helpBtn')?.addEventListener('click', () => this.showHelp());
        
        // Mouse events
        this.renderer.domElement.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.renderer.domElement.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.renderer.domElement.addEventListener('click', (e) => this.onMouseClick(e));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        
        // Window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Start render loop
        this.animate();
        
        console.log('✅ Event listeners created');
    }

    setView(viewName) {
        const camera = this.cameraSystem.setView(viewName);
        this.transformControls.camera = camera;
        
        // Update UI
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.getElementById(`view${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        this.showNotification(`${viewName.charAt(0).toUpperCase() + viewName.slice(1)} View Active`);
        console.log('📷 View changed to:', viewName);
    }

    toggleDrawingToolkit() {
        if (this.drawingToolkit.isActive) {
            this.drawingToolkit.deactivate();
            this.showNotification('Drawing Toolkit Disabled');
        } else {
            this.drawingToolkit.activate();
            this.showNotification('Drawing Toolkit Active - Top View Locked');
        }
    }

    onMouseDown(e) {
        if (this.drawingToolkit.isActive && this.cameraSystem.isTopView()) {
            const rect = this.renderer.domElement.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.drawingToolkit.startDrawing({ x, y });
            e.preventDefault();
            return;
        }
    }

    onMouseMove(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        if (this.drawingToolkit.isActive && this.cameraSystem.isTopView()) {
            // Update cursor indicator
            this.drawingToolkit.updateCursorIndicator(x, y);
            
            if (this.drawingToolkit.drawingMode === 'line') {
                // Line mode: update temp line preview
                if (this.drawingToolkit.lineStartPoint) {
                    this.drawingToolkit.updateTempLine({ x, y });
                }
            } else {
                // Freehand mode: add points while drawing
                if (this.drawingToolkit.isDrawing) {
                    this.drawingToolkit.addDrawingPoint({ x, y });
                }
            }
            return;
        }
        
        // Regular mouse tracking for object selection
        this.mouse.x = ((x / rect.width) * 2 - 1);
        this.mouse.y = -((y / rect.height) * 2 + 1);
    }

    onMouseUp(e) {
        if (this.drawingToolkit.isActive && this.drawingToolkit.isDrawing) {
            this.drawingToolkit.finishDrawing();
            e.preventDefault();
            return;
        }
    }

    onMouseClick(event) {
        if (this.drawingToolkit.isActive) return;
        
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.cameraSystem.getCurrentCamera());
        const intersects = this.raycaster.intersectObjects(this.objects);
        
        if (intersects.length > 0) {
            this.selectObject(intersects[0].object);
            console.log('🎯 Object selected:', intersects[0].object.userData.name);
        } else {
            this.selectObject(null);
            console.log('🎯 Object deselected');
        }
    }

    addPrimitive(type) {
        console.log('➕ Adding primitive:', type);
        const command = new CreateObjectCommand(this, type);
        this.commandHistory.execute(command);
    }

    createPrimitiveObject(type, position = null) {
        let geometry, material;
        
        switch (type) {
            case 'cube':
                geometry = new THREE.BoxGeometry(1, 1, 1);
                break;
            case 'sphere':
                geometry = new THREE.SphereGeometry(0.5, 32, 32);
                break;
            case 'cylinder':
                geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
                break;
            case 'plane':
                geometry = new THREE.PlaneGeometry(2, 2);
                break;
            case 'cone':
                geometry = new THREE.ConeGeometry(0.5, 1, 32);
                break;
            case 'torus':
                geometry = new THREE.TorusGeometry(0.5, 0.2, 16, 100);
                break;
            default:
                geometry = new THREE.BoxGeometry(1, 1, 1);
        }
        
        material = new THREE.MeshLambertMaterial({ 
            color: this.getRandomColor() 
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        if (position) {
            mesh.position.copy(position);
        } else {
            mesh.position.set(
                (Math.random() - 0.5) * 4,
                0.5,
                (Math.random() - 0.5) * 4
            );
        }
        
        this.objectCounter++;
        mesh.userData = {
            type: type,
            name: `${type}_${this.objectCounter}`,
            id: this.objectCounter
        };
        
        console.log('✅ Created object:', mesh.userData.name);
        return mesh;
    }

    getRandomColor() {
        const colors = [0x4CAF50, 0x2196F3, 0xFF9800, 0x9C27B0, 0xF44336, 0x00BCD4];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    setTransformMode(mode) {
        this.currentMode = mode;
        this.transformControls.setMode(mode);
        
        document.querySelectorAll('#tools3D .tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const modeButtons = {
            'translate': 'moveMode',
            'rotate': 'rotateMode',
            'scale': 'scaleMode'
        };
        
        const activeBtn = document.getElementById(modeButtons[mode]);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        console.log('🔧 Transform mode:', mode);
    }

    selectObject(object) {
        this.selectedObject = object;
        
        if (object) {
            this.transformControls.attach(object);
            this.updatePropertiesPanel(object);
        } else {
            this.transformControls.detach();
            this.clearPropertiesPanel();
        }
        
        this.updateSelectedObjectInfo();
    }

    updatePropertiesPanel(object) {
        const content = document.getElementById('propertiesContent');
        if (!content) return;
        
        content.innerHTML = `
            <div class="property-group">
                <label class="property-label">Object Name</label>
                <input type="text" class="property-input" value="${object.userData.name}" 
                       onchange="toolkit.updateObjectName('${object.userData.id}', this.value)">
            </div>
            
            <div class="property-group">
                <label class="property-label">Position</label>
                <div class="property-row">
                    <input type="number" class="property-input" placeholder="X" 
                           value="${object.position.x.toFixed(2)}" step="0.1"
                           onchange="toolkit.updateObjectPosition('${object.userData.id}', 'x', parseFloat(this.value))">
                    <input type="number" class="property-input" placeholder="Y" 
                           value="${object.position.y.toFixed(2)}" step="0.1"
                           onchange="toolkit.updateObjectPosition('${object.userData.id}', 'y', parseFloat(this.value))">
                    <input type="number" class="property-input" placeholder="Z" 
                           value="${object.position.z.toFixed(2)}" step="0.1"
                           onchange="toolkit.updateObjectPosition('${object.userData.id}', 'z', parseFloat(this.value))">
                </div>
            </div>
            
            <div class="property-group">
                <label class="property-label">Color</label>
                <input type="color" class="color-input" 
                       value="#${object.material.color.getHexString()}"
                       onchange="toolkit.updateObjectColor('${object.userData.id}', this.value)">
            </div>
            
            <div class="property-actions">
                <button class="duplicate-btn" onclick="toolkit.duplicateObject('${object.userData.id}')">
                    <i class="fas fa-copy"></i> Duplicate
                </button>
                <button class="delete-btn" onclick="toolkit.deleteObject('${object.userData.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
    }

    clearPropertiesPanel() {
        const content = document.getElementById('propertiesContent');
        if (content) {
            content.innerHTML = `
                <div class="no-selection">
                    <i class="fas fa-mouse-pointer"></i>
                    <p>Select an object to edit properties</p>
                </div>
            `;
        }
    }

    updateSelectedObjectInfo() {
        const selectedInfo = document.getElementById('selectedObject');
        if (selectedInfo) {
            selectedInfo.textContent = this.selectedObject ? 
                this.selectedObject.userData.name : 'None';
        }
    }

    updateObjectCount() {
        const countElement = document.getElementById('objectCount');
        if (countElement) {
            countElement.textContent = this.objects.length;
        }
    }

    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        
        if (undoBtn) {
            undoBtn.disabled = !this.commandHistory.canUndo();
        }
        if (redoBtn) {
            redoBtn.disabled = !this.commandHistory.canRedo();
        }
    }

    undo() {
        const command = this.commandHistory.undo();
        if (command) {
            console.log('↶ Undo:', command.description);
            this.showNotification('Undo: ' + command.description);
        }
    }

    redo() {
        const command = this.commandHistory.redo();
        if (command) {
            console.log('↷ Redo:', command.description);
            this.showNotification('Redo: ' + command.description);
        }
    }

    updateObjectName(id, newName) {
        const object = this.objects.find(obj => obj.userData.id == id);
        if (object) {
            object.userData.name = newName;
            this.updateSelectedObjectInfo();
        }
    }

    updateObjectPosition(id, axis, value) {
        const object = this.objects.find(obj => obj.userData.id == id);
        if (object) {
            object.position[axis] = value;
        }
    }

    updateObjectColor(id, color) {
        const object = this.objects.find(obj => obj.userData.id == id);
        if (object) {
            object.material.color.setStyle(color);
        }
    }

    duplicateObject(id) {
        const original = this.objects.find(obj => obj.userData.id == id);
        if (original) {
            const duplicate = original.clone();
            duplicate.material = original.material.clone();
            duplicate.position.x += 1;
            
            this.objectCounter++;
            duplicate.userData = {
                ...original.userData,
                id: this.objectCounter,
                name: `${original.userData.type}_${this.objectCounter}`
            };
            
            this.scene.add(duplicate);
            this.objects.push(duplicate);
            this.updateObjectCount();
            this.selectObject(duplicate);
            console.log('📋 Duplicated object:', duplicate.userData.name);
        }
    }

    deleteObject(id) {
        const object = this.objects.find(obj => obj.userData.id == id);
        if (object) {
            this.scene.remove(object);
            const index = this.objects.indexOf(object);
            if (index > -1) {
                this.objects.splice(index, 1);
            }
            
            if (this.selectedObject === object) {
                this.selectObject(null);
            }
            
            object.geometry.dispose();
            object.material.dispose();
            this.updateObjectCount();
            console.log('🗑️ Deleted object:', object.userData.name);
        }
    }

    toggleGrid() {
        this.gridVisible = !this.gridVisible;
        this.grid.visible = this.gridVisible;
        
        const gridBtn = document.getElementById('toggleGrid');
        if (gridBtn) {
            gridBtn.classList.toggle('active', this.gridVisible);
        }
        console.log('📐 Grid:', this.gridVisible ? 'visible' : 'hidden');
    }

    resetCamera() {
        if (this.cameraSystem.currentView === 'perspective') {
            this.cameraSystem.cameras.perspective.position.set(5, 5, 5);
            this.cameraSystem.cameras.perspective.lookAt(0, 0, 0);
            if (this.controls) {
                this.controls.reset();
            }
        } else {
            this.cameraSystem.setupCameras();
        }
        console.log('📷 Camera reset');
    }

    clearScene() {
        if (confirm('Clear all objects? This cannot be undone.')) {
            this.objects.forEach(obj => {
                this.scene.remove(obj);
                obj.geometry.dispose();
                obj.material.dispose();
            });
            this.objects = [];
            this.selectObject(null);
            this.updateObjectCount();
            this.commandHistory = new CommandHistory(50, this);
            this.updateUndoRedoButtons();
            console.log('🗑️ Scene cleared');
        }
    }

    showHelp() {
        const modal = document.getElementById('helpModal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    onKeyDown(event) {
        if (event.target.tagName === 'INPUT') return;
        
        // Drawing toolkit shortcuts
        if (this.drawingToolkit.isActive) {
            switch (event.key) {
                case '1': this.drawingToolkit.setBlockoutType('cube'); break;
                case '2': this.drawingToolkit.setBlockoutType('sphere'); break;
                case '3': this.drawingToolkit.setBlockoutType('cylinder'); break;
                case '4': this.drawingToolkit.setBlockoutType('plane'); break;
                case '5': this.drawingToolkit.setBlockoutType('cone'); break;
                case '6': this.drawingToolkit.setBlockoutType('torus'); break;
                case 'f': case 'F': this.drawingToolkit.setDrawingMode('freehand'); break;
                case 'l': case 'L': this.drawingToolkit.setDrawingMode('line'); break;
                case 'Escape': this.drawingToolkit.finishCurrentDrawing(); break;
            }
            return;
        }
        
        // Regular shortcuts
        switch (event.key) {
            case '1': this.addPrimitive('cube'); break;
            case '2': this.addPrimitive('sphere'); break;
            case '3': this.addPrimitive('cylinder'); break;
            case '4': this.addPrimitive('plane'); break;
            case '5': this.addPrimitive('cone'); break;
            case '6': this.addPrimitive('torus'); break;
            case 'g': case 'G': this.setTransformMode('translate'); break;
            case 'r': case 'R': this.setTransformMode('rotate'); break;
            case 's': case 'S': this.setTransformMode('scale'); break;
            case 'h': case 'H': this.toggleGrid(); break;
            case ' ': event.preventDefault(); this.resetCamera(); break;
            case 'Delete': 
                if (this.selectedObject) {
                    this.deleteObject(this.selectedObject.userData.id);
                }
                break;
            case 'Escape': this.selectObject(null); break;
            case 'd':
                if (event.ctrlKey && this.selectedObject) {
                    event.preventDefault();
                    this.duplicateObject(this.selectedObject.userData.id);
                }
                break;
            case 'z':
                if (event.ctrlKey) {
                    event.preventDefault();
                    if (event.shiftKey) {
                        this.redo();
                    } else {
                        this.undo();
                    }
                }
                break;
            case 'y':
                if (event.ctrlKey) {
                    event.preventDefault();
                    this.redo();
                }
                break;
        }
    }

    onWindowResize() {
        const canvas = document.getElementById('viewport3d');
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const aspect = width / height;
        
        this.cameraSystem.updateAspect(aspect);
        this.renderer.setSize(width, height);
        console.log('📐 Window resized:', width, 'x', height);
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'mode-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 2000);
    }

    showError(message) {
        const notification = document.createElement('div');
        notification.className = 'mode-notification';
        notification.style.background = 'rgba(244, 67, 54, 0.9)';
        notification.textContent = '❌ ' + message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.cameraSystem.currentView === 'perspective' && this.controls) {
            this.controls.update();
        }
        
        this.render();
    }

    render() {
        if (this.renderer && this.scene && this.cameraSystem) {
            this.renderer.render(this.scene, this.cameraSystem.getCurrentCamera());
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌐 DOM loaded, starting initialization...');
    
    // Update diagnostic for DOM step
    const domStep = document.getElementById('step-dom');
    if (domStep) {
        domStep.classList.add('success');
        domStep.querySelector('.step-icon').textContent = '✅';
        domStep.querySelector('.step-text').textContent = 'DOM loaded successfully';
    }
    
    try {
        // Check for required elements before initializing
        const requiredElements = [
            'viewport3d', 'diagnosticConsole', 'objectCount', 
            'selectedObject', 'propertiesContent'
        ];
        
        const missingElements = requiredElements.filter(id => !document.getElementById(id));
        
        if (missingElements.length > 0) {
            throw new Error(`Missing required DOM elements: ${missingElements.join(', ')}`);
        }
        
        console.log('✅ All required DOM elements found');
        
        window.toolkit = new BlockoutToolkit();
        
        // Setup help modal
        const helpModal = document.getElementById('helpModal');
        const closeHelp = document.getElementById('closeHelp');
        
        if (closeHelp && helpModal) {
            closeHelp.addEventListener('click', () => {
                helpModal.style.display = 'none';
            });
            
            window.addEventListener('click', (event) => {
                if (event.target === helpModal) {
                    helpModal.style.display = 'none';
                }
            });
        }
        
        console.log('🎉 Toolkit initialization sequence started!');
        
    } catch (error) {
        console.error('💥 Failed to initialize toolkit:', error);
        
        // Update diagnostic with error
        const errorStep = document.getElementById('step-dom');
        if (errorStep) {
            errorStep.classList.add('error');
            errorStep.querySelector('.step-icon').textContent = '❌';
            errorStep.querySelector('.step-text').textContent = `DOM Error: ${error.message}`;
        }
        
        // Show user-friendly error
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #f44336;
            color: white;
            padding: 20px;
            border-radius: 8px;
            z-index: 10000;
            max-width: 400px;
            text-align: center;
        `;
        errorDiv.innerHTML = `
            <h3>❌ Initialization Failed</h3>
            <p>${error.message}</p>
            <button onclick="location.reload()" style="
                background: white;
                color: #f44336;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 10px;
            ">Reload Page</button>
        `;
        document.body.appendChild(errorDiv);
    }
});