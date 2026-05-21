# PCG Level Blockout Toolkit for Blender

A procedural level blockout generator for game development. This spline-based tool helps level designers and developers rapidly iterate and build gray-box level layouts, modular buildings, roads, and landscape terrain.

---

## Viewport Panel Guide

The main controls are located in the 3D Viewport sidebar under the **PCG Blockout** tab (`N` panel).

### 1. Spline Path
Defines the main route/corridor for the level generation.
* **Spline**: Select a Curve object in the scene.
* **Create Default Spline**: Spawns a straight, flat 2-point Bezier curve with `'AUTO'` handles lying flat along the X-axis. This is optimized for linear layouts and is fully protected against twisted handle loops ("bowties") when extruding in Edit Mode.

### 2. Road Mode
Determines how building spaces are layed out relative to the spline.
* **Road Mode (ON/OFF)**:
  * **OFF (Standard Mode)**: Generates spatial structures centered directly on the spline curve.
  * **ON (Road Mode)**: Clears the center path to act as a roadway and places buildings/spaces on the sides of the path.
* **Side**: Choose which side to place buildings on:
  * `Left` / `Right`: Restricts building placement strictly to one side of the road.
  * `Both`: Places buildings on both sides of the road.
  * `Alternating`: Alternates placing buildings left and right as the road progresses.

### 3. Layout Parameters
Tweaks the spatial density and size variation of generated rooms and spaces.
* **Spacing**: Distance (in meters) between consecutive space nodes along the spline.
* **Path Width**: The base width of the level generation corridor around the spline.
* **Lateral Density**: The density ($0.0$ to $1.0$) of branching lateral rooms that fork off the main road.
* **Space Size Variation**: Size variance ($0.0$ to $1.0$) of rooms. Higher values create organic, asymmetrical structures, while lower values keep rooms uniform.

### 4. Generation Layers
A flexible, rule-based layer system to populate room nodes with modular assets or blockout primitives.
* **Layer List**: Manage layers (Add, Remove, Move Up/Down).
* **Layer Properties**:
  * **Enabled**: Toggle spawning on/off for the active layer.
  * **Rule**: Choose the placement algorithm:
    * `Edge Loop`: Places assets along the outer perimeter walls.
    * `Fill Grid`: Fills the interior room space using a aligned grid layout.
    * `Scatter`: Scatters assets randomly inside the room boundaries.
    * `Center Line`: Places assets along the center spline segment.
  * **Asset Collection**: Name of the target Blender collection containing custom modular meshes. If left blank, spawns fallback prototyping cubes.
  * **Density**: Density multiplier for spawned assets.
  * **Offset / Z Offset**: Locational offsets to lift or shift spawned meshes.
  * **Random Rotation / Scale**: Transform randomizers with customizable min/max scale limits.

### 5. Terrain
Generates procedural landscape grid geometry surrounding your level.
* **Enable Terrain**: Toggles terrain mesh generation.
* **Height Variation**: Maximum vertical elevation variance of hills and valleys.
* **Smoothness**: Iterations of smoothing filters applied to heightmap (higher values = rolling hills, lower = rugged peaks).
* **Terrain Width**: Overall boundary width of terrain generated on both sides of the spline.

### 6. Road Mesh
Generates actual road geometry independently of terrain options.
* **Enable Road Mesh**: Toggles standalone road geometry generation.
* **Road Width**: Total width of the generated road surface.
* **Road Z Offset**: Shifts the road mesh vertically (default `0.05m`) above spline/terrain to prevent Z-fighting.
* **Road Color**: Base color applied to the road's procedural material.

### 7. Controls & Utilities
* **Generate**: Deletes old geometry and generates new level layout, buildings, terrain, and roads.
* **History Popover (Clock Icon)**: Stores up to 10 previous generations. Save Snapshots to bookmark nice seeds, and restore them instantly.
* **Remix Parameters**: Randomizes selected configurations (configured in configuration popover) to easily iterate design variations.
* **Presets**: Save current settings as custom JSON presets in the `presets/` folder, or load existing presets.
