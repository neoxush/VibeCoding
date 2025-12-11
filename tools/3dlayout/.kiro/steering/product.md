---
inclusion: always
---

# 3D Blockout Toolkit - Product Guidelines

## Core Product Principles

### Primary Use Cases
- **Level Design Blockouts**: Quick spatial layouts for game environments
- **Architectural Space Planning**: Early-stage room and building layouts
- **3D Concept Sketching**: Rapid ideation with primitive shapes

### Design Philosophy
- **Simplicity First**: Prioritize ease of use over advanced features
- **Immediate Feedback**: Real-time 3D manipulation without delays
- **No Learning Curve**: Intuitive controls that work immediately
- **Browser-Native**: Zero installation, works everywhere

## Feature Priorities

### Essential Features (Must Have)
- Primitive shape creation (cube, sphere, cylinder, plane)
- Object selection and transformation (move, rotate, scale)
- Real-time 3D viewport with orbit controls
- Basic material/color assignment
- Scene persistence (save/load)

### Secondary Features (Should Have)
- Object duplication and deletion
- Grid snapping for precise placement
- Basic lighting controls
- Export capabilities (OBJ, glTF)

### Avoid These Features
- Complex mesh editing or subdivision
- Advanced material systems or texturing
- Animation or rigging tools
- Scripting or programming interfaces

## User Experience Guidelines

### Interaction Patterns
- **Single-click selection**: Clear visual feedback on selected objects
- **Drag-to-transform**: Direct manipulation without mode switching
- **Right-click context**: Quick access to common actions
- **Keyboard shortcuts**: Power user efficiency for common operations

### Visual Design Principles
- **Dark theme default**: Reduces eye strain during long sessions
- **High contrast UI**: Clear distinction between tools and viewport
- **Minimal chrome**: Maximize 3D viewport space
- **Consistent iconography**: Use Font Awesome for all UI icons

### Performance Expectations
- **Smooth interaction**: 60fps viewport manipulation
- **Responsive selection**: Immediate visual feedback
- **Scalable scenes**: Handle 100+ objects without performance degradation
- **Mobile consideration**: Basic functionality on tablets

## Content and Messaging

### Terminology
- Use "blockout" not "prototype" or "mockup"
- "Primitive shapes" not "basic geometry"
- "Transform" not "modify" or "edit"
- "Viewport" not "canvas" or "view"

### Error Handling
- Graceful degradation for WebGL issues
- Clear error messages for user actions
- Automatic recovery from invalid states
- No technical jargon in user-facing messages