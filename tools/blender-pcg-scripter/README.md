# PCG Level Blockout - Blender Addon

A procedural content generation (PCG) tool for Blender 3.6.22 that automates the creation of semi-open world level blockouts for game development.

## Features

- **Spline-driven layout**: Draw curves to control level path and direction
- **Modular building blocks**: Automatic generation of walls, floors, platforms, and ramps
- **Terrain generation**: Procedural terrain with elevation variation following spline paths
- **Seed-based reproducibility**: Generate identical results with the same seed
- **Parameter presets**: Save and load configurations for different scenarios
- **Organized scene management**: Automatic collection organization

## Quick Start

1. **Open the Panel**: In the 3D Viewport, press `N` to open the sidebar, then click the "PCG Blockout" tab

2. **Create a Spline**: 
   - Click "Create Default Spline" button, OR
   - Create your own curve: `Shift + A > Curve > Bezier`

3. **Adjust Parameters**:
   - **Spacing**: Distance between spaces along the spline (default: 10m)
   - **Path Width**: Width of generation area (default: 20m)
   - **Lateral Density**: How many spaces branch off (0.0-1.0)
   - **Block Types**: Select which building blocks to generate
   - **Terrain**: Enable/disable and adjust terrain parameters

4. **Generate**: Click the "Generate" button

5. **Iterate**: Modify your spline or parameters and regenerate as needed

## Parameters Guide

### Layout Parameters
- **Spacing**: Distance between spaces along spline path
- **Path Width**: Width of the generation area around the spline
- **Lateral Density**: Controls branching (0.0 = no branches, 1.0 = maximum)
- **Space Size Variation**: Amount of size variation in spaces (0.0-1.0)
- **Seed**: Random seed for reproducibility (0 = random)

### Building Block Parameters
- **Grid Size**: Alignment grid for blocks (default: 2m)
- **Wall Height**: Default height for walls (default: 3m)
- **Block Types**: Toggle walls, floors, platforms, and ramps

### Terrain Parameters
- **Enable Terrain**: Toggle terrain generation
- **Height Variation**: Maximum terrain elevation change
- **Smoothness**: Terrain smoothness (0.0 = rough, 1.0 = smooth)
- **Terrain Width**: Width of terrain around spline

## Tips

1. **Start simple**: Use default parameters first
2. **Shape your spline**: The curve defines your level's flow
3. **Use seeds**: Note the seed number to recreate good results
4. **Iterate quickly**: The tool is designed for rapid iteration
5. **Clean up**: Previous generations are kept in separate collections

## Requirements

- Blender 3.6.22
- Python 3.10+ (included with Blender)

## License

[Add your license here]

## Credits

Created with Kiro AI Assistant
