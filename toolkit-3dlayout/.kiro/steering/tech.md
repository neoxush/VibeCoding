# Technology Stack & Build System

## Core Technologies

### Frontend Stack
- **Three.js** (v0.158.0) - 3D graphics library for WebGL rendering
- **Vanilla JavaScript** - ES6+ modules, no framework dependencies
- **HTML5** - Semantic structure with Canvas API
- **CSS3** - Modern styling with flexbox layout and CSS Grid

### External Dependencies
- **Font Awesome** (v6.4.0) - UI icons via CDN
- **Google Fonts** (Inter) - Typography via CDN
- **Three.js Add-ons**: OrbitControls, TransformControls

### Three.js Architecture
- **Scene Management**: THREE.Scene for object hierarchy
- **Camera System**: PerspectiveCamera with OrbitControls
- **Lighting**: AmbientLight, DirectionalLight with shadow mapping
- **Geometry**: BoxGeometry, SphereGeometry, CylinderGeometry, PlaneGeometry
- **Materials**: MeshLambertMaterial with color customization
- **Raycasting**: Mouse-based object selection system

## Build System

### Development Setup
This is a static web application with no build process required:
- Serve files directly from any HTTP server
- No compilation or bundling needed
- ES6 modules loaded natively by browser

### Common Commands
```bash
# Local development server (Python)
python -m http.server 8000

# Local development server (Node.js)
npx serve .

# Local development server (PHP)
php -S localhost:8000
```

### File Structure Requirements
- All external dependencies loaded via CDN
- ES6 modules must be served over HTTP (not file://)
- Import maps used for Three.js module resolution

### Performance Considerations
- Optimized for hundreds of 3D objects
- Shadow rendering enabled by default
- Mobile performance may be limited on complex scenes