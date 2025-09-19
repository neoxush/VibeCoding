---
inclusion: always
---

# Code Structure & Architecture Guidelines

## Active Implementation
Work within `code_sandbox_light_fc0e4d0d_1757665618/` directory - this is the current active implementation. Ignore the legacy `3d-blockoutKit` file.

## File Structure Rules
```
code_sandbox_light_fc0e4d0d_1757665618/
├── index.html              # Single entry point - all UI structure here
├── css/style.css          # All styling - no inline styles allowed
├── js/app.js              # All JavaScript logic - no inline scripts
└── README.md              # Documentation
```

## Code Organization Requirements

### HTML Patterns
- Single page application structure with semantic sections
- Required sections: `#toolbar`, `#viewport`, `#properties-panel`
- CDN dependencies only - no local library files
- ES6 module imports with import maps for Three.js
- No inline styles or scripts - use external files only

### CSS Architecture
- Component-based organization with clear section separation
- Dark theme with consistent color variables
- Responsive design using flexbox/grid
- BEM-like naming: `.component-element--modifier`
- CSS custom properties for theming consistency

### JavaScript Structure
- ES6 modules with clear separation of concerns
- Event-driven architecture with proper event delegation
- Three.js objects managed in global scope for debugging
- Proper cleanup and disposal of Three.js resources
- Error handling for all user interactions

## Naming Conventions (Strict)

### CSS Classes
- `.tool-btn` for toolbar buttons
- `.properties-panel` for right sidebar
- `.viewport-container` for 3D canvas area
- Use hyphens, not camelCase or underscores

### JavaScript Variables
- `camelCase` for all variables and functions
- `UPPER_CASE` for constants only
- Three.js objects: descriptive names with type context
- Global objects: `scene`, `camera`, `renderer`, `controls`

### File Naming
- Lowercase with hyphens: `style.css`, `app.js`
- No spaces or special characters in filenames

## Architecture Constraints

### Three.js Integration
- Single scene, camera, and renderer instance
- OrbitControls and TransformControls as global objects
- Raycasting for object selection - implement mouse interaction
- Shadow mapping enabled by default
- Proper geometry and material disposal

### Performance Rules
- Minimize DOM queries - cache element references
- Use requestAnimationFrame for animations
- Dispose of Three.js objects when removing from scene
- Limit concurrent shadow-casting lights

### Code Quality Standards
- No global variables except Three.js core objects
- Consistent indentation (2 spaces)
- Clear function names describing actions
- Comments for complex Three.js operations only
- Error boundaries for all user-triggered actions