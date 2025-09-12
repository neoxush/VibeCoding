# 3D Blockout Toolkit

A powerful web-based 3D modeling tool designed for rapid prototyping and level design. Perfect for game developers, architects, and designers who need to quickly sketch out 3D layouts and concepts.

## 🚀 Features

### ✅ Currently Implemented Features

#### Core 3D Functionality
- **Real-time 3D viewport** powered by Three.js
- **Orbit camera controls** with smooth movement and zooming
- **Professional lighting setup** with ambient, directional, and fill lights
- **Shadow rendering** for realistic depth perception

#### Primitive Creation Tools
- **Cube** - Standard box geometry for walls, platforms, and structures
- **Sphere** - Perfect spheres for decorative elements and collision volumes
- **Cylinder** - Pillars, pipes, and circular structures
- **Plane** - Floors, walls, and flat surfaces

#### Transform Controls
- **Move Tool** - Translate objects in 3D space with visual gizmos
- **Rotate Tool** - Rotate objects around all three axes
- **Scale Tool** - Resize objects proportionally or per-axis
- **Snap to Grid** - Align objects perfectly to grid intersections
- **Interactive Gizmos** - Visual transform handles for precise manipulation

#### Object Management
- **Click Selection** - Select objects by clicking in the viewport
- **Multiple Object Support** - Work with unlimited objects in your scene
- **Object Properties Panel** - Edit position, rotation, scale, and color
- **Object Naming** - Custom names for better organization
- **Delete Objects** - Remove objects with Delete key or UI button

#### Visual Features
- **Grid Display** - Toggle-able reference grid for alignment
- **Material Colors** - Customizable colors for each object
- **Object Highlighting** - Selected objects are visually highlighted
- **Real-time Shadows** - Dynamic shadow casting and receiving

#### Scene Management
- **Export Scenes** - Save your work as JSON files
- **Import Scenes** - Load previously saved scenes
- **Clear All** - Start fresh with one click
- **Auto-save State** - Object counter and selection persistence

#### User Interface
- **Modern Dark Theme** - Professional appearance with high contrast
- **Responsive Design** - Works on desktop, tablet, and mobile devices
- **Intuitive Toolbar** - Easy access to all creation and editing tools
- **Properties Panel** - Real-time editing of object attributes
- **Status Display** - Live object count and selection information

## 🎯 Main Entry Points

### Primary Interface
- **`/` (index.html)** - Main application interface
  - 3D viewport for scene manipulation
  - Left toolbar for tool selection and primitive creation
  - Right properties panel for object editing
  - Top header with scene management controls

### Core Interactions
- **Left Click** - Select objects in the 3D viewport
- **Mouse Drag** - Orbit camera around the scene
- **Mouse Wheel** - Zoom in and out of the scene
- **Delete Key** - Remove selected objects
- **Transform Gizmos** - Click and drag to move/rotate/scale objects

### Tool Categories
1. **Primitives Section** - Create basic 3D shapes
2. **Transform Section** - Switch between move, rotate, and scale modes
3. **View Section** - Control grid display and camera position
4. **Scene Management** - Export, import, and clear operations

## 🛠 Technology Stack

### Core Technologies
- **Three.js** (v0.158.0) - 3D graphics library
- **WebGL** - Hardware-accelerated 3D rendering
- **Vanilla JavaScript** - No framework dependencies for maximum performance
- **CSS3** - Modern styling with flexbox layout
- **HTML5** - Semantic structure and Canvas API

### Three.js Components Used
- **Scene Management** - THREE.Scene for object hierarchy
- **Camera System** - PerspectiveCamera with OrbitControls
- **Lighting** - AmbientLight, DirectionalLight with shadows
- **Geometry** - BoxGeometry, SphereGeometry, CylinderGeometry, PlaneGeometry
- **Materials** - MeshLambertMaterial with color customization
- **Transform Controls** - Interactive manipulation gizmos
- **Raycasting** - Mouse-based object selection
- **Grid Helper** - Reference grid for spatial alignment

### External Dependencies
- **Font Awesome** (v6.4.0) - UI icons via CDN
- **Google Fonts** (Inter) - Typography via CDN
- **Three.js Controls** - OrbitControls and TransformControls

## 📁 Project Structure

```
3d-blockout-toolkit/
├── index.html              # Main application HTML
├── css/
│   └── style.css          # Application styling and responsive design
├── js/
│   └── app.js             # Core application logic and Three.js integration
└── README.md              # Project documentation
```

## 🎮 How to Use

### Getting Started
1. **Create Objects** - Click any primitive button (Cube, Sphere, Cylinder, Plane)
2. **Select Objects** - Click on objects in the 3D viewport
3. **Transform Objects** - Use Move, Rotate, or Scale tools with the gizmos
4. **Edit Properties** - Modify position, rotation, scale, and color in the properties panel
5. **Save Your Work** - Export your scene to a JSON file

### Advanced Features
- **Snap to Grid** - Enable for precise alignment to grid intersections
- **Camera Reset** - Return to the default camera position
- **Grid Toggle** - Show/hide the reference grid
- **Keyboard Shortcuts** - Delete key removes selected objects

### File Management
- **Export** - Saves scene as `blockout_scene.json` with all object data
- **Import** - Load previously exported scenes to continue work
- **Clear All** - Remove all objects to start a new scene

## 🚧 Features Not Yet Implemented

### Planned Enhancements
- **Texture Support** - Apply textures and materials to objects
- **Advanced Primitives** - Cones, toruses, and custom shapes
- **Duplication Tools** - Copy and paste objects
- **Layer System** - Organize objects into layers
- **Measurement Tools** - Distance and angle measurements
- **Camera Bookmarks** - Save and restore camera positions
- **Undo/Redo System** - Action history for safer editing

### Advanced Features for Future Versions
- **Custom Geometry Import** - Load OBJ/GLTF models
- **Animation Support** - Basic object animations
- **Lighting Controls** - Adjustable light positions and intensity
- **Multiple Material Support** - Different materials per object face
- **Group Operations** - Select and manipulate multiple objects
- **Scene Hierarchy** - Parent-child object relationships

## 🎯 Recommended Next Steps

### Immediate Improvements (High Priority)
1. **Add Undo/Redo System** - Essential for professional workflow
2. **Implement Object Duplication** - Copy selected objects with Ctrl+D
3. **Add Texture Support** - Basic texture mapping for more realistic scenes
4. **Create Advanced Primitives** - Cone, torus, and wedge shapes

### Medium-term Enhancements
1. **Layer Management** - Organize complex scenes better
2. **Camera Bookmarks** - Save multiple viewpoints
3. **Measurement Tools** - For precise architectural work
4. **Lighting Controls** - Adjustable light setup

### Long-term Vision
1. **Custom Model Import** - Support for GLTF/OBJ files
2. **Collaboration Features** - Multi-user editing capabilities
3. **Plugin System** - Extensible architecture for custom tools
4. **Export to Other Formats** - OBJ, GLTF, or game engine formats

## 🌟 Use Cases

### Game Development
- **Level Blockouts** - Quickly prototype game levels and environments
- **Collision Volumes** - Design invisible collision boundaries
- **Gameplay Areas** - Define player movement and interaction zones

### Architecture & Design
- **Space Planning** - Rough building layouts and room arrangements
- **Conceptual Models** - Early-stage architectural concepts
- **Site Planning** - Landscape and building placement

### Education & Training
- **3D Modeling Introduction** - Learn basic 3D concepts
- **Spatial Reasoning** - Develop 3D thinking skills
- **Design Process** - Understand iterative design workflow

## 💡 Tips for Effective Use

### Best Practices
- Start with basic shapes and refine iteratively
- Use the grid for consistent alignment and proportions
- Save your work frequently with descriptive filenames
- Use consistent naming for objects to maintain organization

### Performance Notes
- The toolkit is optimized for hundreds of objects
- Complex scenes with thousands of objects may affect performance
- Use the Clear All function to reset for new projects
- Mobile devices have reduced performance compared to desktop

## 🚀 Deployment

To deploy your website and make it live, please go to the **Publish tab** where you can publish your project with one click. The Publish tab will handle all deployment processes automatically and provide you with the live website URL.

## 📄 License

This project is open source and available under standard web development practices. Feel free to modify and extend for your specific needs.

---

**Built with ❤️ using Three.js and modern web technologies**