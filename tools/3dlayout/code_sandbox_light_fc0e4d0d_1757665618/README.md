# 3D Blockout Toolkit

A professional web-based 3D modeling tool designed for rapid prototyping and level design. Perfect for game developers, architects, and designers who need to quickly create 3D blockouts with precision and efficiency.

## 🚀 Quick Start

### ⚠️ Web Server Required
**IMPORTANT:** This application uses ES6 modules and must be served over HTTP/HTTPS.

### Launch the Application
1. **Start a web server** in the project directory:
   ```bash
   # Python (recommended)
   python -m http.server 8000
   
   # Node.js
   npx serve .
   
   # PHP
   php -S localhost:8000
   ```
2. **Open browser** and navigate to `http://localhost:8000`
3. **Application initializes automatically** - diagnostic panel shows progress

### System Requirements
- **Web server** (Python, Node.js, PHP, or any HTTP server)
- **Modern web browser** with WebGL support (Chrome, Firefox, Safari, Edge)
- **Hardware acceleration enabled** for optimal performance
- **Internet connection** for CDN resources (Three.js, Font Awesome, Google Fonts)
- **Minimum 4GB RAM** recommended for complex scenes
- **Desktop/laptop recommended** (mobile has basic support)

### Initialization Process
When you first load the application:
1. **Diagnostic panel appears** showing initialization progress
2. **All systems initialize** (WebGL, Three.js, cameras, controls, etc.)
3. **Test cube is created** to verify 3D functionality
4. **Panel auto-hides** after 2 seconds if successful
5. **Ready to use** - start creating with number keys 1-6!

## 🎯 Core Features

### 3D Modeling Tools
- **Six Primitive Types** - Cube, Sphere, Cylinder, Cone, Torus, Plane
- **Transform Controls** - Move (G), Rotate (R), Scale (S) with visual gizmos
- **Multi-Camera System** - Perspective, Top, Front, Left, Right views
- **Object Management** - Selection, duplication, deletion, properties editing
- **Scene Management** - Import/export, clear all, undo/redo system

### Professional Workflow
- **Integrated Drawing Toolkit** - Draw directly on viewport to create 3D objects
- **2D Sketch Mode** - Professional drawing tools with 3D conversion
- **Grid System** - Snap-to-grid for precise alignment
- **Keyboard Shortcuts** - Complete shortcut system for efficient workflow
- **Real-time Feedback** - Live object count, selection status, coordinates

### Advanced Features
- **Command History** - Full undo/redo system with 50-step history
- **Multi-View System** - Switch between orthographic and perspective views
- **Material System** - Color customization and visual properties
- **Export System** - Save scenes as JSON files for later use
- **Responsive Design** - Works on desktop, tablet, and mobile devices

## 📖 User Manual

### Getting Started

#### 1. Basic 3D Workflow
```
1. Open index.html in your browser
2. Use number keys (1-6) to create primitives:
   - 1: Cube    - 4: Plane
   - 2: Sphere  - 5: Cone  
   - 3: Cylinder - 6: Torus
3. Click objects to select them
4. Use transform tools (G/R/S) to manipulate
5. Edit properties in the right panel
6. Export your scene when finished
```

#### 2. Integrated Drawing Workflow
```
1. Click "Draw" button in header
2. Select blockout type from sidebar
3. Draw directly on viewport (top view)
4. Objects appear instantly along your path
5. Switch to perspective view to refine
6. Use traditional 3D tools for fine-tuning
```

#### 3. 2D Sketch Workflow (Legacy)
```
1. Click "2D Sketch" mode (if visible)
2. Use drawing tools (L/R/C) to sketch
3. Add annotations (A) to mark object types
4. Click "Generate 3D" to convert
5. Switch to 3D mode to see results
6. Refine with 3D manipulation tools
```

### Camera Controls

#### View Switching
- **3D Button** - Perspective view with orbit controls
- **Top Button** - Orthographic top-down view
- **Front Button** - Orthographic front view
- **Left/Right Buttons** - Orthographic side views
- **Space Key** - Reset camera to default position

#### Navigation
- **Mouse Drag** - Orbit camera (perspective view only)
- **Mouse Wheel** - Zoom in/out
- **Middle Mouse** - Pan camera
- **Arrow Keys** - Fine camera movement

### Object Management

#### Selection
- **Left Click** - Select single object
- **Escape** - Deselect all objects
- **Click Empty Space** - Deselect current selection

#### Creation
- **Number Keys 1-6** - Create primitives
- **Toolbar Buttons** - Click primitive buttons
- **Drawing Mode** - Draw to create objects along path

#### Transformation
- **G Key** - Move/Grab tool
- **R Key** - Rotate tool  
- **S Key** - Scale tool
- **Tab Key** - Cycle through transform modes
- **X/Y/Z Keys** - Constrain to axis (during transform)
- **Shift** - Fine adjustment mode
- **Ctrl** - Coarse adjustment mode

#### Properties
- **Right Panel** - Edit position, rotation, scale, color, name
- **Color Picker** - Change object material color
- **Numeric Input** - Precise value entry
- **Real-time Updates** - Changes apply immediately

### File Operations

#### Export Scene
```
1. Click "Export" button in header
2. Scene saves as "blockout_scene.json"
3. Contains all objects, camera state, settings
4. Compatible with future imports
```

#### Import Scene
```
1. Click "Import" button in header
2. Select previously exported JSON file
3. Scene loads with all objects and settings
4. Replaces current scene content
```

#### Clear Scene
```
1. Click "Clear All" button (red)
2. Confirms before deleting everything
3. Removes all objects from scene
4. Resets counters and selection
```

### Keyboard Shortcuts Reference

#### Essential Shortcuts
| Key | Action | Mode |
|-----|--------|------|
| **1-6** | Create primitives | 3D |
| **G** | Move tool | 3D |
| **R** | Rotate tool | 3D |
| **S** | Scale tool | 3D |
| **H** | Toggle grid | All |
| **Space** | Reset camera | All |
| **Delete** | Delete selected | 3D |
| **Escape** | Deselect | All |
| **Ctrl+Z** | Undo | All |
| **Ctrl+Y** | Redo | All |
| **Ctrl+D** | Duplicate | 3D |
| **F1** | Show help | All |

#### 2D Mode Shortcuts
| Key | Action |
|-----|--------|
| **L** | Line tool |
| **R** | Rectangle tool |
| **C** | Circle tool |
| **A** | Annotation tool |
| **E** | Eraser tool |
| **G** | Toggle grid |

#### Transform Constraints
| Key | Constraint |
|-----|------------|
| **X** | Lock to X-axis |
| **Y** | Lock to Y-axis |
| **Z** | Lock to Z-axis |
| **Shift** | Fine adjustment |
| **Ctrl** | Coarse adjustment |

## 🛠 Technical Information

### Project Structure
```
3d-blockout-toolkit/
├── index.html          # Main application entry point
├── css/
│   └── style.css      # Complete styling and responsive design
├── js/
│   └── app.js         # Core application logic and Three.js integration
└── README.md          # This documentation
```

### Technology Stack
- **Three.js v0.158.0** - 3D graphics engine
- **WebGL** - Hardware-accelerated rendering
- **Vanilla JavaScript** - No framework dependencies
- **HTML5 Canvas** - 2D drawing capabilities
- **CSS3** - Modern responsive styling
- **Font Awesome 6.4.0** - UI icons
- **Google Fonts (Inter)** - Typography

### Browser Compatibility
- **Chrome 90+** ✅ Fully supported
- **Firefox 88+** ✅ Fully supported  
- **Safari 14+** ✅ Fully supported
- **Edge 90+** ✅ Fully supported
- **Mobile browsers** ⚠️ Basic support

### Performance Guidelines
- **Recommended object limit** - 100 objects for smooth performance
- **Memory usage** - Approximately 50MB for typical scenes
- **Frame rate target** - 60 FPS on modern hardware
- **WebGL requirement** - Hardware acceleration must be enabled

## 🎯 Use Cases & Workflows

### Game Development
**Level Design Blockouts**
1. Use top view to plan level layout
2. Create walls with cube primitives
3. Add gameplay elements with various shapes
4. Export for use in game engine

**Collision Volume Design**
1. Import existing level geometry
2. Create invisible collision shapes
3. Test player movement paths
4. Export collision data

### Architecture & Design
**Space Planning**
1. Sketch floor plan in 2D mode
2. Generate 3D walls and rooms
3. Add furniture with primitives
4. Present to clients in 3D view

**Conceptual Modeling**
1. Rapid ideation with drawing toolkit
2. Convert sketches to 3D instantly
3. Iterate between 2D and 3D views
4. Export for detailed modeling

### Education & Training
**3D Modeling Basics**
1. Learn primitive creation
2. Practice transform operations
3. Understand 3D coordinate systems
4. Build spatial reasoning skills

**Design Process Training**
1. Concept to 3D workflow
2. Professional tool usage
3. Keyboard shortcut efficiency
4. File management practices

## 🔧 Troubleshooting

### Common Issues

#### Application Won't Load
- **Check WebGL support** - Visit webglreport.com
- **Enable hardware acceleration** - Browser settings
- **Clear browser cache** - Force refresh with Ctrl+F5
- **Try different browser** - Chrome recommended

#### Poor Performance
- **Reduce object count** - Delete unnecessary objects
- **Close other browser tabs** - Free up memory
- **Lower screen resolution** - Reduce rendering load
- **Check system resources** - Task manager

#### Objects Not Appearing
- **Check camera position** - Press Space to reset
- **Verify object creation** - Check object counter
- **Look for error messages** - Open browser console
- **Try different primitive type** - Test with cube

#### Transform Tools Not Working
- **Select an object first** - Click to select
- **Check transform mode** - Press G/R/S
- **Verify gizmo visibility** - Should see colored handles
- **Try different camera view** - Switch to perspective

#### Export/Import Issues
- **Check file format** - Must be JSON
- **Verify file permissions** - Browser download settings
- **File size limits** - Large scenes may fail
- **Try smaller test scene** - Isolate the issue

### Getting Help
- **F1 Key** - Built-in help modal
- **Browser Console** - Check for error messages
- **Diagnostic Panel** - Shows initialization status
- **Performance Monitor** - Check frame rate and memory

## 🚀 Deployment Options

### Local Development
```bash
# Simple HTTP server (Python)
python -m http.server 8000

# Node.js serve
npx serve .

# PHP development server
php -S localhost:8000
```

### Web Hosting
1. **Upload all files** to web server
2. **Ensure HTTPS** for WebGL compatibility
3. **Configure MIME types** for .js and .json files
4. **Test on target domain** before going live

### CDN Considerations
- **Three.js** - Loaded from CDN, requires internet
- **Font Awesome** - Loaded from CDN
- **Google Fonts** - Loaded from CDN
- **Offline mode** - Download and host dependencies locally

## 📈 Performance Optimization

### Best Practices
- **Limit object count** - Stay under 100 objects
- **Use efficient primitives** - Cubes are fastest
- **Minimize material changes** - Reuse colors when possible
- **Regular cleanup** - Delete unused objects
- **Monitor memory usage** - Check browser task manager

### Advanced Settings
- **Shadow quality** - Reduce for better performance
- **Anti-aliasing** - Disable on low-end devices
- **Pixel ratio** - Limit to 2x maximum
- **Render distance** - Adjust camera far plane

## 🔮 Future Enhancements

### Planned Features
- **Multi-object selection** - Ctrl+click selection
- **Advanced materials** - Opacity, wireframe modes
- **OBJ export** - Industry-standard format
- **Measurement tools** - Distance and alignment
- **Performance monitoring** - FPS counter and warnings
- **Mobile touch improvements** - Better gesture support

### Potential Additions
- **Texture support** - Image-based materials
- **Animation system** - Basic object animations
- **Collaboration tools** - Multi-user editing
- **Plugin system** - Extensible architecture
- **Advanced 2D tools** - Bezier curves, splines
- **Template library** - Pre-built scene templates

---

## 📞 Support & Resources

### Documentation
- **This README** - Complete user manual
- **Inline Help** - F1 key for shortcuts
- **Code Comments** - Detailed technical documentation
- **Browser Console** - Debugging information

### Community
- **GitHub Issues** - Bug reports and feature requests
- **Discussions** - Community support and tips
- **Examples** - Sample scenes and workflows
- **Tutorials** - Step-by-step guides

---

**Built with ❤️ using Three.js and modern web technologies**

*Professional 3D blockout toolkit for rapid prototyping and design*