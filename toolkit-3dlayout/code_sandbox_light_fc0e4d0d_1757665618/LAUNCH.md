# 🚀 Quick Launch Guide

## ⚠️ IMPORTANT: Web Server Required
**This application MUST be served over HTTP/HTTPS - it cannot run from file:// URLs**

## Quick Start
1. **Start a web server** in the project folder:
   ```bash
   python -m http.server 8000
   ```
2. **Open browser** and go to: `http://localhost:8000`
3. **Start creating** - Application will initialize automatically!

## Essential Controls
- **1-6 Keys** - Create primitives (Cube, Sphere, Cylinder, Plane, Cone, Torus)
- **G/R/S Keys** - Move, Rotate, Scale tools
- **Click "Draw"** - Activate drawing toolkit for direct viewport drawing
- **View Buttons** - Switch between 3D, Top, Front, Left, Right views

## Quick Workflows

### 🎯 Rapid 3D Blockout
```
1. Press "1" to create a cube
2. Press "G" to move it
3. Press "2" to create a sphere
4. Click objects to select and edit properties
5. Press Ctrl+S to save (Export button)
```

### ✏️ Drawing to 3D
```
1. Click "Draw" button in header
2. Select "Cube" from sidebar
3. Draw lines in the viewport
4. Watch 3D objects appear instantly
5. Switch to "3D" view to manipulate
```

### 📐 Professional 2D Sketch
```
1. Enable 2D mode (if visible)
2. Press "L" for line tool
3. Draw your layout
4. Press "A" to add annotations
5. Click "Generate 3D" to convert
```

## Keyboard Shortcuts
| Key | Action |
|-----|--------|
| **1-6** | Create primitives |
| **G** | Move tool |
| **R** | Rotate tool |
| **S** | Scale tool |
| **H** | Toggle grid |
| **Space** | Reset camera |
| **Ctrl+Z** | Undo |
| **Ctrl+Y** | Redo |
| **Delete** | Delete selected |
| **F1** | Help |

## System Requirements
- **Web server** (Python, Node.js, PHP, or any HTTP server)
- Modern web browser (Chrome, Firefox, Safari, Edge)
- WebGL support enabled
- 4GB+ RAM recommended
- **Internet connection** (for CDN resources)

## Troubleshooting

### If Application Won't Load
1. **Check WebGL support** at [webglreport.com](https://webglreport.com)
2. **Enable hardware acceleration** in browser settings
3. **Use HTTP server** (not file://) - try `python -m http.server 8000`
4. **Check browser console** (F12) for error messages
5. **Try different browser** - Chrome recommended

### If Stuck on Initialization Screen
1. **Wait 10 seconds** for CDN resources to load
2. **Hard refresh** with Ctrl+F5
3. **Check internet connection** for CDN access
4. **Disable browser extensions** that might block scripts

### If Performance is Poor
1. **Close other browser tabs**
2. **Reduce browser window size**
3. **Check system memory usage**
4. **Try incognito/private mode**

### Quick Diagnostic
Open browser console (F12) and check for:
- Red error messages
- Network failures (failed to load resources)
- WebGL context errors

**Need more help?** See TROUBLESHOOTING.md for detailed solutions.

---
**Ready to create? Open index.html and start building!**