class ThreeDConverter {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.orthoCamera = null;
        this.currentCamera = null;
        this.renderer = null;
        this.mesh = null;

        this.init();
    }

    init() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(
            75,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 5);
        this.currentCamera = this.camera;  // Start with perspective camera

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);

        // Controls (OrbitControls)
        this.setupControls();

        this.animate();
    }

    setupControls() {
        // Use OrbitControls for better 3D navigation
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enableZoom = true;
        this.controls.enablePan = true;
        this.controls.enableRotate = true;

        // Set some limits
        this.controls.maxPolarAngle = Math.PI;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 100;
    }

    convertEntitiesToScene(entities, layers, canvasWidth = 1200, canvasHeight = 800) {
        // Store canvas dimensions for coordinate conversion
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;

        // Clear existing meshes
        this.clearScene();

        // Add layer planes for visual reference
        if (layers) {
            this.addLayerPlanes(layers);
        }

        entities.forEach((entity, index) => {
            const mesh = this.createMeshFromEntity(entity);
            if (mesh) {
                // Calculate layer height and entity height
                const layer = layers ? layers.get(entity.layerId) : null;
                const layerHeight = layer ? layer.order * 1.0 : 0; // Each layer is 1 unit high
                const entityHeight = entity.entityHeight || 0;
                const totalHeight = layerHeight + entityHeight;

                // Position mesh with calculated height using actual canvas dimensions
                const transform = entity.transform;

                mesh.position.set(
                    this.canvasToThreeCoord(transform.x, canvasWidth, false),  // Canvas X -> 3D X
                    totalHeight, // Layer height + individual entity height -> 3D Y
                    this.canvasToThreeCoord(transform.y, canvasHeight, true)   // Canvas Y -> 3D Z (with proper orientation)
                );
                mesh.rotation.y = transform.rotation * Math.PI / 180;
                mesh.scale.set(transform.scaleX, 1, transform.scaleY);

                this.scene.add(mesh);
            }
        });

        // Center the camera on the scene
        this.centerCamera();
    }

    addLayerPlanes(layers) {
        // No layer planes - just show entities at their heights
        // This keeps the 3D view clean and unobstructed
    }

    clearScene() {
        // Remove all meshes except lights
        const meshesToRemove = [];
        this.scene.traverse((child) => {
            if (child.isMesh) {
                meshesToRemove.push(child);
            }
        });

        meshesToRemove.forEach(mesh => {
            this.scene.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
        });
    }

    createMeshFromEntity(entity) {
        let geometry = null;

        switch (entity.type) {
            case 'rectangle':
                geometry = this.createRectangleGeometry(entity);
                break;
            case 'circle':
                geometry = this.createCircleGeometry(entity);
                break;
            case 'line':
                geometry = this.createLineGeometry(entity);
                break;
            case 'pen':
                geometry = this.createPathGeometry(entity);
                break;
            default:
                return null;
        }

        if (!geometry) return null;

        const material = new THREE.MeshLambertMaterial({
            color: this.getEntityColor(entity),
            transparent: true,
            opacity: 0.8
        });

        const mesh = new THREE.Mesh(geometry, material);
        return mesh;
    }

    createRectangleGeometry(entity) {
        const width = this.canvasToThreeSize(entity.transform.width);
        const height = this.canvasToThreeSize(entity.transform.height);
        const depth = entity.extrudeDepth;

        return new THREE.BoxGeometry(width, depth, height);
    }

    createCircleGeometry(entity) {
        const radius = this.canvasToThreeSize(Math.min(entity.transform.width, entity.transform.height) / 2);
        const depth = entity.extrudeDepth;

        return new THREE.CylinderGeometry(radius, radius, depth, 32);
    }

    createLineGeometry(entity) {
        if (!entity.data.points || entity.data.points.length < 2) return null;

        try {
            // Create a path from the line points (relative to entity transform)
            const points = entity.data.points.map(point =>
                new THREE.Vector3(
                    (point.x - entity.transform.x) / 100,
                    0,
                    (point.y - entity.transform.y) / 100  // No flip for relative coordinates
                )
            );

            // Create a tube geometry along the path
            const curve = new THREE.CatmullRomCurve3(points);
            const geometry = new THREE.TubeGeometry(
                curve,
                points.length * 2, // segments
                entity.extrudeDepth * 0.05, // radius
                8, // radial segments
                false // closed
            );

            return geometry;
        } catch (error) {
            console.warn('Failed to create line geometry:', error);
            // Fallback to simple box
            return new THREE.BoxGeometry(0.1, entity.extrudeDepth, 0.1);
        }
    }

    createPathGeometry(entity) {
        if (!entity.data.points || entity.data.points.length < 2) return null;

        try {
            // Create a shape from the path points
            const shape = new THREE.Shape();
            const points = entity.data.points;

            // Use relative coordinates for the shape (relative to entity transform)
            const transform = entity.transform;
            const firstPoint = points[0];
            shape.moveTo(
                (firstPoint.x - transform.x) / 100,
                (firstPoint.y - transform.y) / 100  // No flip for shape coordinates
            );

            // Add remaining points relative to the first point
            for (let i = 1; i < points.length; i++) {
                const point = points[i];
                shape.lineTo(
                    (point.x - transform.x) / 100,
                    (point.y - transform.y) / 100  // No flip for shape coordinates
                );
            }

            // Extrude the shape
            const extrudeSettings = {
                depth: entity.extrudeDepth,
                bevelEnabled: true,
                bevelSegments: 2,
                steps: 2,
                bevelSize: 0.02,
                bevelThickness: 0.02
            };

            return new THREE.ExtrudeGeometry(shape, extrudeSettings);
        } catch (error) {
            console.warn('Failed to create path geometry:', error);
            return null;
        }
    }

    getEntityColor(entity) {
        // Color entities based on their layer or type
        const colors = {
            'rectangle': 0x3498db,
            'circle': 0xe74c3c,
            'line': 0x2ecc71,
            'pen': 0x9b59b6
        };

        return colors[entity.type] || 0x95a5a6;
    }

    centerCamera() {
        // Calculate bounding box of all meshes
        const box = new THREE.Box3();

        this.scene.traverse((child) => {
            if (child.isMesh) {
                box.expandByObject(child);
            }
        });

        if (!box.isEmpty()) {
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            // Position camera to view the entire scene with better layer visibility
            const maxDim = Math.max(size.x, size.y, size.z);
            const distance = maxDim * 3; // Increased distance for better overview

            // Position camera at an angle that shows layer separation well
            this.camera.position.set(
                center.x + distance * 0.7,  // More to the side
                center.y + distance * 0.8,  // Higher up to see layers
                center.z + distance * 0.7   // More to the front
            );

            this.camera.lookAt(center);
        } else {
            // Default camera position if no entities
            this.camera.position.set(10, 8, 10);
            this.camera.lookAt(0, 0, 0);
        }
    }

    canvasToThreeCoords(canvasPoint, canvasWidth = 1200, canvasHeight = 800) {
        // Convert canvas coordinates to Three.js coordinates (for shapes)
        // Canvas: (0,0) at top-left, positive Y down
        // Three.js: (0,0) at center, positive Z forward
        return {
            x: (canvasPoint.x - canvasWidth / 2) / 100,   // Center X and scale
            y: (canvasPoint.y - canvasHeight / 2) / 100   // Center Y and scale (no flip for shapes)
        };
    }

    canvasToThreeCoord(canvasValue, canvasSize = 1200, isY = false) {
        // Convert single canvas coordinate to Three.js coordinate
        if (isY) {
            // Y coordinate maps to Z: top of canvas (Y=0) -> back of scene (Z=+)
            // Bottom of canvas (Y=max) -> front of scene (Z=-)
            return (canvasSize / 2 - canvasValue) / 100;
        } else {
            // X coordinate: left of canvas (X=0) -> left of scene (X=-)
            // Right of canvas (X=max) -> right of scene (X=+)
            return (canvasValue - canvasSize / 2) / 100;
        }
    }

    canvasToThreeSize(canvasSize) {
        // Convert canvas size to Three.js size
        return Math.max(0.1, canvasSize / 100); // Minimum size to avoid invisible objects
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        // Update controls
        if (this.controls) {
            this.controls.update();
        }

        this.renderer.render(this.scene, this.currentCamera);
    }

    handleResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    set2DView() {
        // Position camera directly above the scene for 2D-like view
        const canvasWidth = this.canvasWidth || 1200;
        const canvasHeight = this.canvasHeight || 800;

        // Calculate the scene bounds to fit the canvas area
        const sceneWidth = canvasWidth / 100;  // Convert to 3D units
        const sceneHeight = canvasHeight / 100;

        // Position camera high above, looking straight down
        this.camera.position.set(0, 20, 0);  // High above the scene
        this.camera.lookAt(0, 0, 0);  // Look at center

        // Adjust camera to fit the scene
        const maxDim = Math.max(sceneWidth, sceneHeight);
        const distance = maxDim * 1.2;  // Add some padding
        this.camera.position.y = distance;

        // Reset camera controls target
        if (this.controls) {
            this.controls.target.set(0, 0, 0);
            this.controls.update();
        }
    }

    set3DView() {
        // Return to standard 3D perspective view
        this.centerCamera();
    }

    setOrthographicView() {
        // Switch to orthographic camera for true 2D view
        const canvasWidth = this.canvasWidth || 1200;
        const canvasHeight = this.canvasHeight || 800;

        const sceneWidth = canvasWidth / 100;
        const sceneHeight = canvasHeight / 100;
        const maxDim = Math.max(sceneWidth, sceneHeight);

        // Create orthographic camera if it doesn't exist
        if (!this.orthoCamera) {
            this.orthoCamera = new THREE.OrthographicCamera(
                -maxDim, maxDim,    // left, right
                maxDim, -maxDim,    // top, bottom
                0.1, 1000           // near, far
            );
        }

        // Update orthographic camera bounds
        this.orthoCamera.left = -maxDim;
        this.orthoCamera.right = maxDim;
        this.orthoCamera.top = maxDim;
        this.orthoCamera.bottom = -maxDim;
        this.orthoCamera.updateProjectionMatrix();

        // Position orthographic camera above the scene
        this.orthoCamera.position.set(0, 10, 0);
        this.orthoCamera.lookAt(0, 0, 0);

        // Switch to orthographic camera
        this.currentCamera = this.orthoCamera;

        // Update controls to use orthographic camera
        if (this.controls) {
            this.controls.object = this.orthoCamera;
            this.controls.enableRotate = false;  // Disable rotation in 2D view
            this.controls.target.set(0, 0, 0);
            this.controls.update();
        }
    }

    setPerspectiveView() {
        // Switch back to perspective camera
        this.currentCamera = this.camera;

        // Update controls to use perspective camera
        if (this.controls) {
            this.controls.object = this.camera;
            this.controls.enableRotate = true;  // Re-enable rotation
            this.controls.update();
        }

        this.set3DView();
    }
}