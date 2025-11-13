# Technical Stack

## Platform

- **Target Application**: Blender 3.6.22
- **Language**: Python
- **API**: Blender Python API (bpy)

## Project Type

Blender addon with Python-based procedural generation system

## Architecture

- Spline-based generation: Users draw curves to define level paths
- Modular generator system (spline sampling, layout, building blocks, terrain)
- Seed-based random generation for reproducibility
- UI integration via Blender's 3D viewport sidebar panels
- JSON-based preset storage system

## Key Libraries & APIs

- `bpy` - Blender Python API for mesh creation and scene management
- `random` - Seed-based randomization
- `dataclasses` - Data structure definitions
- `json` - Preset serialization
- `logging` - Error logging to Blender console
- `unittest` - Testing framework

## Development Workflow

Since this is a Blender addon, there are no traditional build commands. Development workflow:

1. **Installation**: Copy addon to Blender's addons directory or install via Blender UI
2. **Testing**: Run unit tests with Python's unittest framework
3. **Manual Testing**: Enable addon in Blender preferences and test in 3D viewport
4. **Debugging**: Use Blender's Python console and system console for logs

## File Organization

- `__init__.py` - Addon registration and metadata
- `ui_panel.py` - UI panel definitions
- `generators/` - Generation modules (layout, building, terrain)
- `core/` - Core systems (seed manager, parameters, presets, scene management)
- `presets/` - JSON preset files

## Performance Targets

- Medium layouts (50-100 objects): < 5 seconds
- Large layouts: Progress indicator required
- Must remain responsive to cancellation
