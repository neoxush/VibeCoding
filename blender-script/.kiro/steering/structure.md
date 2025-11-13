# Project Structure

## Directory Layout

```
.
├── .kiro/
│   ├── specs/
│   │   └── pcg-level-blockout/    # Feature specification documents
│   └── steering/                   # AI assistant guidance documents
├── .vscode/
│   └── settings.json               # VSCode configuration
└── [addon code to be implemented]
```

## Planned Addon Structure

When implemented, the Blender addon will follow this structure:

```
pcg_blockout/                       # Main addon directory
├── __init__.py                     # Addon registration, bl_info metadata
├── ui_panel.py                     # UI panels for 3D viewport sidebar
├── generators/
│   ├── __init__.py
│   ├── layout_generator.py        # Space network generation along spline
│   ├── building_generator.py      # Building block creation
│   └── terrain_generator.py       # Terrain mesh generation along spline
├── core/
│   ├── __init__.py
│   ├── spline_sampler.py          # Spline curve sampling
│   ├── seed_manager.py            # Random seed management
│   ├── parameters.py              # Parameter validation and defaults
│   ├── preset_manager.py          # Preset save/load functionality
│   └── scene_manager.py           # Collection organization
└── presets/                        # JSON preset files
    ├── dense_urban.json
    ├── open_wilderness.json
    └── mixed_environment.json
```

## Module Organization

- **UI Layer**: All UI code in `ui_panel.py`, organized as Blender panel classes
- **Generators**: Separate modules for each content type (layout, building, terrain)
- **Core Systems**: Shared functionality (seed, parameters, presets, scene management)
- **Data Models**: Dataclasses defined in respective generator modules

## Naming Conventions

- **Files**: Snake_case (e.g., `layout_generator.py`)
- **Classes**: PascalCase (e.g., `LayoutGenerator`, `PCG_PT_MainPanel`)
- **Functions**: Snake_case (e.g., `generate_heightmap()`)
- **Blender Operators**: `PCG_OT_` prefix (e.g., `PCG_OT_Generate`)
- **Blender Panels**: `PCG_PT_` prefix (e.g., `PCG_PT_MainPanel`)
- **Generated Objects**: `{Type}_{SpaceID}_{Index}` (e.g., `Wall_001_003`)
- **Collections**: `PCG_Generation_{timestamp}` with subcollections

## Scene Organization

Generated content is organized into Blender collections:

```
PCG_Generation_{timestamp}/
├── Structures/          # Building blocks
├── Terrain/            # Terrain meshes
└── Connections/        # Pathway indicators
```

## Configuration Storage

- **Presets**: `{BLENDER_USER_SCRIPTS}/addons/pcg_blockout/presets/` as JSON files
- **Scene Parameters**: Stored in Blender scene custom properties
- **Metadata**: Stored in collection custom properties for reproducibility
