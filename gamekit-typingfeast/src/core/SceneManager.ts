import * as THREE from 'three';

export class SceneManager {
  private groundPlane: THREE.Mesh | null = null;
  private ambientLight: THREE.AmbientLight | null = null;
  private directionalLight: THREE.DirectionalLight | null = null;

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera
  ) {}

  public async initialize(): Promise<void> {
    this.setupLighting();
    this.setupEnvironment();
    this.setupCamera();
  }

  private setupLighting(): void {
    // Ambient light for overall illumination
    this.ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(this.ambientLight);

    // Directional light for shadows and depth
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(10, 10, 5);
    this.directionalLight.castShadow = true;
    
    // Configure shadow properties
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 50;
    this.directionalLight.shadow.camera.left = -20;
    this.directionalLight.shadow.camera.right = 20;
    this.directionalLight.shadow.camera.top = 20;
    this.directionalLight.shadow.camera.bottom = -20;
    
    this.scene.add(this.directionalLight);
  }

  private setupEnvironment(): void {
    // Create ground plane
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x1a1a2e,
      transparent: true,
      opacity: 0.8
    });
    
    this.groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.position.y = -5;
    this.groundPlane.receiveShadow = true;
    
    this.scene.add(this.groundPlane);

    // Test cube removed - no longer needed

    // Add some atmospheric fog
    this.scene.fog = new THREE.Fog(0x0f0f23, 20, 50);
    
    // Set background color
    this.scene.background = new THREE.Color(0x0f0f23);
    
    console.log('Scene environment setup complete');
  }

  private setupCamera(): void {
    this.camera.position.set(0, 5, 15);
    this.camera.lookAt(0, 0, 0);
  }

  public update(deltaTime: number): void {
    // Subtle camera movement for dynamic feel
    const time = Date.now() * 0.001;
    this.camera.position.x = Math.sin(time * 0.1) * 0.5;
    this.camera.position.y = 5 + Math.sin(time * 0.15) * 0.3;
  }

  public getGroundY(): number {
    return this.groundPlane ? this.groundPlane.position.y : -5;
  }

  public dispose(): void {
    if (this.groundPlane) {
      this.scene.remove(this.groundPlane);
      this.groundPlane.geometry.dispose();
      (this.groundPlane.material as THREE.Material).dispose();
    }
    
    if (this.ambientLight) {
      this.scene.remove(this.ambientLight);
    }
    
    if (this.directionalLight) {
      this.scene.remove(this.directionalLight);
    }
  }
}