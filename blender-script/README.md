# PCG Level Blockout - Blender Addon

A procedural content generation (PCG) tool for Blender 3.6.22 that automates the creation of semi-open world level blockouts for game development.

## Features

- **Spline-driven layout**: Draw curves to control level path and direction
- **Modular building blocks**: Automatic generation of walls, floors, platforms, and ramps
- **Terrain generation**: Procedural terrain with elevation variation following spline paths
- **Seed-based reproducibility**: Generate identical results with the same seed
- **Parameter presets**: Save and load configurations for different scenarios
- **Organized scene management**: Automatic collection organization

## Installation

### Method 1: Install from ZIP (Recommended)

1. Download or create a ZIP file of the `pcg_blockout` folder
2. Open Blender 3.6.22
3. Go to `Edit > Preferences > Add-ons`
4. Click `Install...` button
5. Navigate to the ZIP file and select it
6. Enable the addon by checking the checkbox next to "PCG Level Blockout"

### Method 2: Manual Installation

1. Locate your Blender addons directory:
   - **Windows**: `C:\Users\{YourUsername}\AppData\Roaming\Blender Foundation\Blender\3.6\scripts\addons\`
   - **macOS**: `/Users/{YourUsername}/Library/Application Support/Blender/3.6/scripts/addons/`
   - **Linux**: `~/.config/blender/3.6/scripts/addons/`

2. Copy the entire `pcg_blockout` folder to the addons directory
3. Restart Blender
4. Go to `Edit > Preferences > Add-ons`
5. Search for "PCG Level Blockout"
6. Enable the addon by checking the checkbox

### Method 3: Development Mode (Symlink)

For active development, create a symbolic link:

**Windows (run as Administrator):**
```cmd
mklink /D "C:\Users\{YourUsername}\AppData\Roaming\Blender Foundation\Blender\3.6\scripts\addons\pcg_blockout" "D:\path\to\your\pcg_blockout"
```

**macOS/Linux:**
```bash
ln -s /path/to/your/pcg_blockout ~/.config/blender/3.6/scripts/addons/pcg_blockout
```

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

## Workflow

```
Draw Spline → Adjust Parameters → Generate → Review → Iterate
     ↑                                                    ↓
     └────────────────────────────────────────────────────┘
```

## Tips

1. **Start simple**: Use default parameters first
2. **Shape your spline**: The curve defines your level's flow
3. **Use seeds**: Note the seed number to recreate good results
4. **Iterate quickly**: The tool is designed for rapid iteration
5. **Clean up**: Previous generations are kept in separate collections

## Troubleshooting

### Panel doesn't appear
- Make sure the addon is enabled in Preferences > Add-ons
- Try restarting Blender
- Check the system console for errors

### Generation fails
- Ensure a valid curve object is selected
- Check that the curve has at least 2 points
- Verify parameters are within valid ranges
- Check the system console for error messages

### Performance issues
- Reduce spacing to create fewer spaces
- Disable terrain generation for faster results
- Lower lateral density to reduce complexity

## Development

To reload the addon after code changes:
1. Disable the addon in Preferences
2. Enable it again
3. Or restart Blender

To view error logs:
- **Windows**: `Window > Toggle System Console`
- **macOS/Linux**: Run Blender from terminal

## Requirements

- Blender 3.6.22
- Python 3.10+ (included with Blender)

## License

[Add your license here]

## Credits

Created with Kiro AI Assistant
