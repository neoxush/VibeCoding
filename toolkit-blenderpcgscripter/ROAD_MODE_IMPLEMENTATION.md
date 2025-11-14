# Road Mode Implementation

## Overview
Road mode has been successfully implemented! This feature allows you to generate building blocks on the sides of a path rather than centered on the spline.

## What Was Implemented

### 1. Parameters Added (`pcg_blockout/core/parameters.py`)

**GenerationParams dataclass:**
- `road_mode_enabled: bool = False` - Toggle road mode on/off
- `road_width: float = 10.0` - Width of the clear path (2-50m)
- `side_placement: str = "both"` - Where to place buildings

**PCG_PropertyGroup (Blender properties):**
- `road_mode_enabled` - Boolean checkbox
- `road_width` - Float slider (2-50m)
- `side_placement` - Enum dropdown with options:
  - "Left" - Buildings only on left side
  - "Right" - Buildings only on right side
  - "Both" - Buildings on both sides (mirrored)
  - "Alternating" - Alternate left-right-left-right

### 2. UI Panel Updated (`pcg_blockout/ui_panel.py`)

Added new "Road Mode" section after Preview section:
```
🛣 Road Mode
├─ ☐ Road Mode                    ← Checkbox toggle
│  (when checked:)
├─   Road Width: [10.0]           ← Slider
├─   Side: [Both ▼]               ← Dropdown
└─   → Buildings on path sides    ← Hint
```

### 3. Layout Generator Enhanced (`pcg_blockout/generators/layout_generator.py`)

**New Methods:**
- `_create_centered_space()` - Creates space centered on spline (standard mode)
- `_create_road_side_spaces()` - Creates spaces on sides of path (road mode)
- `_get_sides_for_index()` - Determines which sides to use based on placement setting

**Modified Methods:**
- `create_spaces_along_path()` - Now checks `road_mode_enabled` and routes to appropriate method

## How to Use

### In Blender:

1. **Open PCG Blockout panel** in 3D viewport sidebar
2. **Create or select a spline** curve
3. **Enable Road Mode:**
   - Check the "Road Mode" checkbox
   - Set "Road Width" (default 10m works well for streets)
   - Choose "Side" placement:
     - **Both** - For streets with buildings on both sides
     - **Left** - For one-sided development
     - **Right** - For one-sided development
     - **Alternating** - For varied, asymmetric layouts
4. **Click "Show Preview"** to see the layout
5. **Click "Generate"** to create the level

### Example Use Cases:

**Urban Street (Both Sides):**
```
Road Width: 10m
Side: Both
Spacing: 15m
→ Creates a street with buildings lining both sides
```

**Highway with Rest Stops (Alternating):**
```
Road Width: 15m
Side: Alternating
Spacing: 30m
→ Creates rest stops alternating on left and right
```

**Cliff-side Road (Left or Right):**
```
Road Width: 8m
Side: Left (or Right)
Spacing: 20m
→ Creates buildings on one side only
```

**Dungeon Corridor (Both Sides):**
```
Road Width: 5m
Side: Both
Spacing: 10m
Wall Height: 4m
→ Creates rooms on both sides of a corridor
```

## Visual Comparison

### Standard Mode (Before):
```
    [Building]
        |
    [Building]
        |
    [Building]
```

### Road Mode - Both Sides:
```
[Building]  ====road====  [Building]
                |
[Building]  ====road====  [Building]
                |
[Building]  ====road====  [Building]
```

### Road Mode - Alternating:
```
[Building]  ====road====
                |
            ====road====  [Building]
                |
[Building]  ====road====
```

## Technical Details

### Space Positioning Logic:

1. **Calculate perpendicular offset:**
   - Get right vector from spline orientation
   - Offset distance = `road_width / 2 + path_width / 4`

2. **Determine sides:**
   - "left": Negative right vector
   - "right": Positive right vector
   - "both": Create spaces on both sides
   - "alternating": Use index % 2 to alternate

3. **Space size:**
   - Base size = `path_width * 0.4` (slightly smaller than standard)
   - Apply size variation as normal

### Connectivity:

- Spaces are connected sequentially along the path
- In "both" mode, left and right spaces at same index are NOT automatically connected
- Lateral spaces still work in road mode (branch off from road-side spaces)

## Testing

To test the implementation:

1. Create a simple curved spline
2. Enable Road Mode with "Both" sides
3. Generate and verify:
   - Buildings appear on both sides of the path
   - Clear path exists in the center
   - Spacing is consistent
4. Try different side placements
5. Test with preview to ensure it matches generation

## Road Surface Feature

### Terrain Integration
When road mode is enabled AND terrain is enabled, the system now:

1. **Flattens the terrain** along the spline path to the road width
2. **Creates smooth edges** that blend into surrounding terrain
3. **Follows spline elevation** so the road goes up/down hills
4. **Creates a road mesh** (dark gray surface) along the path

### How It Works:
- The `create_road_surface()` method in TerrainGenerator flattens the heightmap
- For each terrain cell, it calculates distance to nearest spline point
- If within `road_width / 2`: Completely flat at spline elevation
- If within `road_width`: Smooth blend from flat to terrain
- Beyond `road_width`: Normal terrain

### Visual Result:
```
[Building]  ====FLAT ROAD====  [Building]
                  |
[Building]  ====FLAT ROAD====  [Building]
                  |
[Building]  ====FLAT ROAD====  [Building]
```

## Next Steps (Optional Enhancements)

- [x] Add road surface visualization in terrain ✅ DONE
- [ ] Add crosswalks/connections between opposite sides
- [ ] Add road markings or lane lines
- [ ] Create "urban_street.json" preset
- [ ] Update preview to show road centerline

## Files Modified

1. `pcg_blockout/core/parameters.py` - Added road mode parameters
2. `pcg_blockout/ui_panel.py` - Added road mode UI section
3. `pcg_blockout/generators/layout_generator.py` - Added road mode generation logic
4. `pcg_blockout/generators/terrain_generator.py` - Added road surface creation

## Compatibility

- Fully backward compatible - existing scenes work unchanged
- Road mode is OFF by default
- All existing parameters work the same way
- Preview system automatically supports road mode

---

**Status:** ✅ IMPLEMENTED AND READY TO TEST

**Implementation Date:** 2025-11-14
