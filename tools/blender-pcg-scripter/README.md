# PCG Level Blockout Toolkit for Blender

A procedural **blockout map generator** for game development. The addon turns a
single spline into a grid-aligned blockout populated with **floors, walls,
half-walls (cover), doorways, ramps, stairs and pillars** — the same vocabulary
used by Unreal modular kits, Houdini Labs Level Blockout, Synty POLYGON
Prototype packs and Unity ProBuilder. Designers iterate level flow by editing
the spline; the addon rebuilds the geometry in a deterministic multi-pass
pipeline.

---

## How a blockout is built

Every `Generate` produces output by running six passes in order:

| Pass | Stage | What it does |
|---|---|---|
| P1 | **Layout — Rasterize** | Snap each spline sample to the global grid → centerline cells |
| P2 | **Layout — Corridor** | Expand the corridor sideways by `Path Width (cells)`; in Road Mode the centre row becomes the road |
| P3 | **Layout — Laterals** | Spawn lateral pockets controlled by `Lateral Density` & `Lateral Depth (cells)` |
| P4 | **Elevation** | Assign integer elevation steps per cell from the chosen source, smooth across neighbours |
| P5 | **Blockout — Floor / Wall / Traversal** | Place a floor tile per cell; wall, half-wall or doorway on every edge; ramp/stairs across elevation breaks |
| P6 | **Decoration** | Run the user-defined Layer system (Edge Loop / Fill Grid / Scatter / Center Line) on top of the blockout |

The pipeline is driven by one master switch — **Blockout Style** — which changes
how every later pass interprets its parameters.

---

## Blockout Styles

### Outdoor / Open (default)
- Cells become **open platforms**, not enclosed rooms
- Walls only appear at world boundaries; elevation drops get **cover half-walls** (`Cover Density`)
- Doorways are not emitted (open boundaries between connected cells)
- Best for **parkour, urban streets, outdoor combat zones**
- Default elevation source: **Follow Spline Z** — terrain follows the curve you draw

### Indoor / Dungeon
- Cells become **enclosed rooms** with **full perimeter walls**
- Where two connected cells share elevation, the wall is replaced by a **Doorway** piece
- Where elevation differs, a **Ramp** (or **Stairs** if enabled) spans the gap
- `Lateral Density` controls how many neighbour pairs stay sealed
- Best for **dungeons, interiors, base layouts**
- Default elevation source: **Random + Smooth** — produces varied vertical interiors

---

## Placeholder piece library

| Piece | Role | Default primitive |
|---|---|---|
| `FLOOR` | One per cell, sits at the cell's elevated Z | Thin tile, `grid_size × grid_size` |
| `WALL` | Full-height solid on a missing or sealed edge | `grid_size` long × thin × `wall_height` |
| `WALL_HALF` | Cover / parapet on drop edges (Outdoor) | ~45% wall height |
| `DOORWAY` | Frame with cut-out opening (Indoor connections) | Two posts + lintel |
| `RAMP` | Wedge across an elevation step | Width = `grid_size`, run = `ramp_slope_cells × grid_size`, rise = step delta |
| `STAIRS` | Stepped variant of ramp | Configurable step count |
| `PILLAR` | Optional corner column | Slim square column |

Each piece type has a **Collection override** slot in the *Blockout Pieces*
panel — drop a Blender Collection containing your custom modular assets and
the addon spawns those instead of the primitive. Mix and match: override walls
with your modular wall kit while keeping primitive floors, etc.

---

## Viewport Panel Guide

All controls live in `View3D > Sidebar > PCG Blockout` (`N` panel).

### 1. Spline Path
Defines the level's path. Use **Create Default Spline** for a flat, twist-protected 2-point Bezier optimised for linear layouts.

### 2. Blockout Style
The top-level switch between **Outdoor / Open** and **Indoor / Dungeon** styles described above. Every downstream pass branches on this value.

### 3. Layout Grid
* **Grid Size**: footprint of a single cell (default 4m). All pieces snap to this grid.
* **Spacing**: spline sample interval (smaller = denser corridor).
* **Path Width (cells)** / **Lateral Depth (cells)**: integer cell counts that control corridor breadth and how far lateral pockets reach.
* **Lateral Density** / **Size Variation**: control random pocket spawn frequency and depth variance.
* **Road Mode**: clears the centerline so the spline becomes a road and cells appear only on the sides (`Left`/`Right`/`Both`/`Alternating`).

### 4. Elevation
* **Source**: `Flat`, `Random + Smooth`, or `Follow Spline Z`.
* **Step Height**: vertical size of one step.
* **Max Steps**: cap on how many steps a cell can rise.
* **Smoothing Passes**: neighbour-averaging iterations (0 = jagged).
* Where neighbouring cells differ by ≥ 1 step a **Ramp / Stairs** is automatically inserted.

### 5. Blockout Pieces
* **Wall Height**, **Ramp Length**, **Cover Density** sliders.
* **Use Stairs Instead of Ramps**, **Generate Pillars** toggles.
* **Piece Library** grid: per-piece **enable toggle + asset collection override** slot.

### 6. Decoration Layers (post-blockout)
The classic layer system from v1 — runs **after** the blockout is built so user-supplied props are layered on top of the structural pieces.
* **Rule**: `Edge Loop` / `Fill Grid` / `Scatter` / `Center Line`.
* **Asset Collection**: where to source mesh instances (falls back to cubes).
* **Density / Offset / Random Rotation / Random Scale**: per-layer randomisers.

### 7. Terrain
Procedural ground mesh under and around the level. Reads each cell's elevated Z so the terrain plates correctly under multi-tier blockouts.

### 8. Road Mesh
Standalone road geometry, generated independently of the terrain.

### 9. Controls & Utilities
* **Generate**: clears old output and runs the full pipeline.
* **Preview**: spawns wireframe cell tiles + edge dots (red=wall, green=open/doorway, yellow=ramp) so you can see the planned blockout before committing.
* **Remix Parameters**: randomizes the subset of parameters configured via the gear popover.
* **History popover**: stores up to 10 previous generations + named snapshots.

### 10. Presets
Save/load configurations as JSON in `presets/`. Two presets ship out of the box:
* `outdoor_street.json` — open street blockout (Outdoor style, road mode, cover walls)
* `indoor_dungeon.json` — enclosed dungeon (Indoor style, doorways + stairs + pillars)

Legacy v1 presets are auto-migrated to the v2 schema on load.
