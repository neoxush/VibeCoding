/**
 * 3D Blockout Toolkit
 * A web-based tool for rapid 3D prototyping and level design
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

class BlockoutToolkit {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.transformControls = null;
        this.raycaster = null;
        this.mouse = null;
        this.grid = null;
        this.objects = [];
        this.selectedObject = null;
        this.objectCounter = 0;
        this.currentMode = 'translate';
        this.gridVisible = true;
        this.snapToGrid = false;
        this.gridSize = 1;

        // Initialize the toolkit
        this.init();
        this.setupEventListeners();
        this.animate();
    }

    init() {
        const canvas = document.getElementById('viewport3d');
        const container = canvas.parentElement;

        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a);

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(
            75,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(10, 10, 10);
        this.camera.lookAt(0, 0, 0);

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Lighting setup
        this.setupLighting();

        // Controls setup
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 100;
        this.controls.maxPolarAngle = Math.PI / 2;

        // Transform controls setup
        this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
        this.transformControls.addEventListener('change', () => {
            if (this.snapToGrid && this.selectedObject) {
                this.snapObjectToGrid(this.selectedObject);
            }
            this.render();
        });
        this.transformControls.addEventListener('dragging-changed', (event) => {
            this.controls.enabled = !event.value;
        });
        this.scene.add(this.transformControls);

        // Raycaster for object selection
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Grid setup
        this.setupGrid();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -20;
        directionalLight.shadow.camera.right = 20;
        directionalLight.shadow.camera.top = 20;
        directionalLight.shadow.camera.bottom = -20;
        this.scene.add(directionalLight);

        // Fill light
        const fillLight = new THREE.DirectionalLight(0x4CAF50, 0.2);
        fillLight.position.set(-5, 5, -5);
        this.scene.add(fillLight);
    }

    setupGrid() {
        this.grid = new THREE.GridHelper(20, 20, 0x444444, 0x444444);
        this.scene.add(this.grid);
    }

    snapObjectToGrid(object) {
        if (!this.snapToGrid) return;
        
        // Snap position to grid
        object.position.x = Math.round(object.position.x / this.gridSize) * this.gridSize;
        object.position.z = Math.round(object.position.z / this.gridSize) * this.gridSize;
        
        // Update property panel if this is the selected object
        if (object === this.selectedObject) {
            const posXInput = document.getElementById('posX');
            const posZInput = document.getElementById('posZ');
            if (posXInput) posXInput.value = object.position.x.toFixed(2);
            if (posZInput) posZInput.value = object.position.z.toFixed(2);
        }
    }

    toggleSnapToGrid() {
        this.snapToGrid = !this.snapToGrid;
        
        const snapBtn = document.getElementById('snapToGrid');
        if (snapBtn) {
            if (this.snapToGrid) {
                snapBtn.classList.add('active');
            } else {
                snapBtn.classList.remove('active');
            }
        }
        
        // If snap is enabled and there's a selected object, snap it now
        if (this.snapToGrid && this.selectedObject) {
            this.snapObjectToGrid(this.selectedObject);
        }
    }

    setupEventListeners() {
        // Primitive creation buttons
        document.getElementById('addCube').addEventListener('click', () => this.addPrimitive('cube'));
        document.getElementById('addSphere').addEventListener('click', () => this.addPrimitive('sphere'));
        document.getElementById('addCylinder').addEventListener('click', () => this.addPrimitive('cylinder'));
        document.getElementById('addPlane').addEventListener('click', () => this.addPrimitive('plane'));

        // Transform mode buttons
        document.getElementById('moveMode').addEventListener('click', () => this.setTransformMode('translate'));
        document.getElementById('rotateMode').addEventListener('click', () => this.setTransformMode('rotate'));
        document.getElementById('scaleMode').addEventListener('click', () => this.setTransformMode('scale'));

        // View controls
        document.getElementById('toggleGrid').addEventListener('click', () => this.toggleGrid());
        document.getElementById('resetCamera').addEventListener('click', () => this.resetCamera());
        
        // Add snap to grid toggle (we'll add this button to the UI)
        if (document.getElementById('snapToGrid')) {
            document.getElementById('snapToGrid').addEventListener('click', () => this.toggleSnapToGrid());
        }

        // Scene operations
        document.getElementById('exportBtn').addEventListener('click', () => this.exportScene());
        document.getElementById('importBtn').addEventListener('click', () => this.importScene());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearScene());

        // Mouse events for object selection
        this.renderer.domElement.addEventListener('click', (event) => this.onMouseClick(event));
        this.renderer.domElement.addEventListener('keydown', (event) => this.onKeyDown(event));

        // File input for import
        document.getElementById('fileInput').addEventListener('change', (event) => this.handleFileLoad(event));

        // Focus canvas for keyboard events
        this.renderer.domElement.setAttribute('tabindex', '0');
    }

    addPrimitive(type) {
        let geometry, material, mesh;

        // Create geometry based on type
        switch (type) {
            case 'cube':
                geometry = new THREE.BoxGeometry(1, 1, 1);
                break;
            case 'sphere':
                geometry = new THREE.SphereGeometry(0.5, 16, 12);
                break;
            case 'cylinder':
                geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
                break;
            case 'plane':
                geometry = new THREE.PlaneGeometry(1, 1);
                break;
        }

        // Create material
        material = new THREE.MeshLambertMaterial({
            color: this.getRandomColor()
        });

        // Create mesh
        mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Set metadata
        mesh.userData = {
            type: type,
            name: `${type}_${++this.objectCounter}`,
            id: this.generateId()
        };

        // Position randomly
        mesh.position.set(
            (Math.random() - 0.5) * 5,
            type === 'plane' ? 0 : 0.5,
            (Math.random() - 0.5) * 5
        );

        // Add to scene and track
        this.scene.add(mesh);
        this.objects.push(mesh);
        this.updateObjectCount();

        // Select the new object
        this.selectObject(mesh);
    }

    selectObject(object) {
        // Deselect previous object
        if (this.selectedObject) {
            this.selectedObject.material.emissive.setHex(0x000000);
        }

        // Select new object
        this.selectedObject = object;
        if (object) {
            object.material.emissive.setHex(0x333333);
            this.transformControls.attach(object);
            this.updatePropertiesPanel(object);
        } else {
            this.transformControls.detach();
            this.updatePropertiesPanel(null);
        }

        this.updateSelectedObjectInfo();
    }

    setTransformMode(mode) {
        this.currentMode = mode;
        this.transformControls.setMode(mode);

        // Update UI
        document.querySelectorAll('#moveMode, #rotateMode, #scaleMode').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = mode === 'translate' ? 'moveMode' : mode === 'rotate' ? 'rotateMode' : 'scaleMode';
        document.getElementById(activeBtn).classList.add('active');
    }

    onMouseClick(event) {
        event.preventDefault();

        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.objects);

        if (intersects.length > 0) {
            this.selectObject(intersects[0].object);
        } else {
            this.selectObject(null);
        }
    }

    onKeyDown(event) {
        if (event.code === 'Delete' && this.selectedObject) {
            this.deleteObject(this.selectedObject);
        }
    }

    deleteObject(object) {
        const index = this.objects.indexOf(object);
        if (index > -1) {
            this.scene.remove(object);
            this.objects.splice(index, 1);
            
            if (this.selectedObject === object) {
                this.selectObject(null);
            }
            
            this.updateObjectCount();
            
            // Dispose geometry and material to free memory
            object.geometry.dispose();
            object.material.dispose();
        }
    }

    toggleGrid() {
        this.gridVisible = !this.gridVisible;
        this.grid.visible = this.gridVisible;
        
        const gridBtn = document.getElementById('toggleGrid');
        if (this.gridVisible) {
            gridBtn.classList.add('active');
        } else {
            gridBtn.classList.remove('active');
        }
    }

    resetCamera() {
        this.camera.position.set(10, 10, 10);
        this.camera.lookAt(0, 0, 0);
        this.controls.reset();
    }

    clearScene() {
        if (confirm('Are you sure you want to clear all objects?')) {
            // Remove all objects
            this.objects.forEach(object => {
                this.scene.remove(object);
                object.geometry.dispose();
                object.material.dispose();
            });
            
            this.objects = [];
            this.selectedObject = null;
            this.objectCounter = 0;
            this.transformControls.detach();
            
            this.updateObjectCount();
            this.updateSelectedObjectInfo();
            this.updatePropertiesPanel(null);
        }
    }

    exportScene() {
        const sceneData = {
            objects: this.objects.map(object => ({
                type: object.userData.type,
                name: object.userData.name,
                id: object.userData.id,
                position: object.position.toArray(),
                rotation: object.rotation.toArray(),
                scale: object.scale.toArray(),
                color: object.material.color.getHex()
            })),
            camera: {
                position: this.camera.position.toArray(),
                target: this.controls.target.toArray()
            }
        };

        const dataStr = JSON.stringify(sceneData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'blockout_scene.json';
        link.click();
    }

    importScene() {
        document.getElementById('fileInput').click();
    }

    handleFileLoad(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const sceneData = JSON.parse(e.target.result);
                this.loadScene(sceneData);
            } catch (error) {
                alert('Error loading scene file: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    loadScene(sceneData) {
        // Clear current scene
        this.clearScene();

        // Load objects
        sceneData.objects.forEach(objData => {
            let geometry;
            
            switch (objData.type) {
                case 'cube':
                    geometry = new THREE.BoxGeometry(1, 1, 1);
                    break;
                case 'sphere':
                    geometry = new THREE.SphereGeometry(0.5, 16, 12);
                    break;
                case 'cylinder':
                    geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
                    break;
                case 'plane':
                    geometry = new THREE.PlaneGeometry(1, 1);
                    break;
            }

            const material = new THREE.MeshLambertMaterial({
                color: objData.color
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            
            mesh.userData = {
                type: objData.type,
                name: objData.name,
                id: objData.id
            };

            mesh.position.fromArray(objData.position);
            mesh.rotation.fromArray(objData.rotation);
            mesh.scale.fromArray(objData.scale);

            this.scene.add(mesh);
            this.objects.push(mesh);
        });

        // Restore camera position
        if (sceneData.camera) {
            this.camera.position.fromArray(sceneData.camera.position);
            this.controls.target.fromArray(sceneData.camera.target);
            this.controls.update();
        }

        this.objectCounter = this.objects.length;
        this.updateObjectCount();
    }

    updatePropertiesPanel(object) {
        const content = document.getElementById('propertiesContent');
        
        if (!object) {
            content.innerHTML = `
                <div class="no-selection">
                    <i class="fas fa-mouse-pointer"></i>
                    <p>Select an object to edit properties</p>
                </div>
            `;
            return;
        }

        content.innerHTML = `
            <div class="property-group">
                <label class="property-label">Name</label>
                <input type="text" class="property-input" id="objectName" value="${object.userData.name}">
            </div>
            
            <div class="property-group">
                <label class="property-label">Position</label>
                <div class="property-row">
                    <input type="number" class="property-input" id="posX" value="${object.position.x.toFixed(2)}" step="0.1">
                    <input type="number" class="property-input" id="posY" value="${object.position.y.toFixed(2)}" step="0.1">
                    <input type="number" class="property-input" id="posZ" value="${object.position.z.toFixed(2)}" step="0.1">
                </div>
            </div>
            
            <div class="property-group">
                <label class="property-label">Rotation (degrees)</label>
                <div class="property-row">
                    <input type="number" class="property-input" id="rotX" value="${(object.rotation.x * 180 / Math.PI).toFixed(1)}" step="1">
                    <input type="number" class="property-input" id="rotY" value="${(object.rotation.y * 180 / Math.PI).toFixed(1)}" step="1">
                    <input type="number" class="property-input" id="rotZ" value="${(object.rotation.z * 180 / Math.PI).toFixed(1)}" step="1">
                </div>
            </div>
            
            <div class="property-group">
                <label class="property-label">Scale</label>
                <div class="property-row">
                    <input type="number" class="property-input" id="scaleX" value="${object.scale.x.toFixed(2)}" step="0.1" min="0.1">
                    <input type="number" class="property-input" id="scaleY" value="${object.scale.y.toFixed(2)}" step="0.1" min="0.1">
                    <input type="number" class="property-input" id="scaleZ" value="${object.scale.z.toFixed(2)}" step="0.1" min="0.1">
                </div>
            </div>
            
            <div class="property-group">
                <label class="property-label">Color</label>
                <input type="color" class="color-input" id="objectColor" value="#${object.material.color.getHexString()}">
            </div>
            
            <button class="delete-btn" id="deleteObject">
                <i class="fas fa-trash"></i> Delete Object
            </button>
        `;

        // Add event listeners for property changes
        this.setupPropertyListeners(object);
    }

    setupPropertyListeners(object) {
        // Name change
        document.getElementById('objectName').addEventListener('change', (e) => {
            object.userData.name = e.target.value;
            this.updateSelectedObjectInfo();
        });

        // Position changes
        ['posX', 'posY', 'posZ'].forEach((id, index) => {
            document.getElementById(id).addEventListener('change', (e) => {
                const axes = ['x', 'y', 'z'];
                object.position[axes[index]] = parseFloat(e.target.value);
            });
        });

        // Rotation changes
        ['rotX', 'rotY', 'rotZ'].forEach((id, index) => {
            document.getElementById(id).addEventListener('change', (e) => {
                const axes = ['x', 'y', 'z'];
                object.rotation[axes[index]] = parseFloat(e.target.value) * Math.PI / 180;
            });
        });

        // Scale changes
        ['scaleX', 'scaleY', 'scaleZ'].forEach((id, index) => {
            document.getElementById(id).addEventListener('change', (e) => {
                const axes = ['x', 'y', 'z'];
                const value = Math.max(0.1, parseFloat(e.target.value));
                object.scale[axes[index]] = value;
            });
        });

        // Color change
        document.getElementById('objectColor').addEventListener('change', (e) => {
            object.material.color.setHex(parseInt(e.target.value.substring(1), 16));
        });

        // Delete button
        document.getElementById('deleteObject').addEventListener('click', () => {
            this.deleteObject(object);
        });
    }

    updateObjectCount() {
        document.getElementById('objectCount').textContent = this.objects.length;
    }

    updateSelectedObjectInfo() {
        const selectedSpan = document.getElementById('selectedObject');
        if (this.selectedObject) {
            selectedSpan.textContent = this.selectedObject.userData.name;
        } else {
            selectedSpan.textContent = 'None';
        }
    }

    getRandomColor() {
        const colors = [0x4CAF50, 0x2196F3, 0xFF9800, 0xE91E63, 0x9C27B0, 0x00BCD4, 0x8BC34A, 0xFFEB3B];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    generateId() {
        return 'obj_' + Math.random().toString(36).substr(2, 9);
    }

    onWindowResize() {
        const container = this.renderer.domElement.parentElement;
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.render();
    }
}

// Initialize the toolkit when the page loads
window.addEventListener('load', () => {
    new BlockoutToolkit();
});