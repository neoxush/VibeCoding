# PCG Toolkit Reference - Best Practices for Next Version

## Industry-Leading PCG Tools Analysis

### 1. Houdini's Procedural Modeling

**What They Do Well:**
- **Visual Node Graph**: See the entire generation pipeline
- **Live Preview**: Changes update in real-time
- **Attribute Visualization**: Color-code geometry by attributes (height, type, etc.)
- **Procedural Primitives**: Clear relationship between input curves and output
- **Copy to Points**: Explicit "these objects go on these points" workflow

**Lessons for Our Tool:**
- Show sample points visually before generation
- Add a "Preview Mode" with low-poly placeholders
- Color-code the spline based on what will be generated
- Make the spacing parameter visual (show dots on curve)

### 2. Unreal Engine's PCG Framework

**What They Do Well:**
- **Volume-Based Generation**: Clear bounds showing where content appears
- **Density Visualization**: Heatmaps showing generation density
- **Layer System**: Separate layers for different content types
- **Debug Visualization**: Toggle visibility of generation logic
- **Incremental Updates**: Regenerate only changed parts

**Lessons for Our Tool:**
- Add a bounding box/volume showing generation area
- Visualize lateral_density as a heatmap on the path
- Separate preview toggles for structures/terrain/connections
- Add "Update" button that only regenerates changed areas
- Show path_width as a visual tube around the spline

### 3. Unity's ProBuilder

**What They Do Well:**
- **Direct Manipulation**: Edit results directly in viewport
- **Shape Tools**: Predefined shapes that can be customized
- **Snapping and Alignment**: Clear grid-based placement
- **Material Zones**: Visual indication of different areas
- **Undo/Redo**: Full history of procedural operations

**Lessons for Our Tool:**
- Make generated blocks editable after creation
- Add preset "path shapes" (straight, S-curve, spiral, etc.)
- Visualize the grid_size parameter as an overlay
- Color-code different space types (enclosed/open/semi-open)
- Better undo support (currently limited)

### 4. Blender's Geometry Nodes

**What They Do Well:**
- **Non-Destructive**: Original curve remains editable
- **Viewport Display**: See results while editing input
- **Attribute Inspection**: Hover to see values
- **Modular System**: Combine different generators
- **Instance on Points**: Clear visual of distribution

**Lessons for Our Tool:**
- Keep the spline editable and linked to output
- Add real-time regeneration option (on curve edit)
- Show space IDs and properties as text overlays
- Allow mixing different generator types
- Use instancing for better performance

### 5. Substance Designer (Procedural Textures)

**What They Do Well:**
- **Parameter Exposure**: Clear sliders with visual feedback
- **Thumbnail Previews**: See results of presets
- **Random Seed Visualization**: Show what changes with seed
- **Before/After Comparison**: Toggle between versions
- **Export Presets**: Share configurations easily

**Lessons for Our Tool:**
- Add thumbnail previews for presets
- Show "before/after" when changing parameters
- Visualize what the seed affects (highlight random elements)
- Better preset management UI
- Export/import preset files

## Recommended Improvements for Next Version

### Phase 1: Visual Feedback (High Priority)

**1. Path Visualization Enhancements**
```python
# Features to add:
- Show sample points as small spheres along curve
- Display path_width as a transparent tube
- Color-code curve by space density
- Add distance markers every N units
- Show tangent/normal vectors at sample points
```

**2. Preview Mode**
```python
# Add a "Preview" button that shows:
- Wireframe boxes at space locations
- Low-poly placeholder blocks
- Terrain as a simple grid
- Connection lines between spaces
- Updates in real-time as you edit the curve
```

**3. Generation Area Visualization**
```python
# Show the generation bounds:
- Bounding box around entire generation area
- Transparent plane showing terrain extent
- Grid overlay showing grid_size
- Lateral branch indicators (arrows)
```

### Phase 2: Better Control (Medium Priority)

**4. Interactive Gizmos**
```python
# Add viewport widgets:
- Drag handles to adjust spacing visually
- Resize handles for path_width
- Rotation gizmos for space orientation
- Height adjustment for terrain
```

**5. Layer/Toggle System**
```python
# Better organization:
- Toggle preview on/off per layer
- Show/hide structures/terrain/connections independently
- Lock layers to prevent accidental edits
- Color-code by layer type
```

**6. Smart Defaults**
```python
# Context-aware parameters:
- Auto-calculate spacing based on curve length
- Suggest path_width based on space sizes
- Recommend terrain_width based on path_width
- Warn about parameter conflicts
```

### Phase 3: Advanced Features (Lower Priority)

**7. Biome/Zone System**
```python
# Different areas along the path:
- Mark sections of curve with different properties
- "Urban zone" vs "wilderness zone"
- Transition smoothly between zones
- Per-zone parameter overrides
```

**8. Constraint System**
```python
# Rules for generation:
- "No platforms in enclosed spaces"
- "Always place floor at space boundaries"
- "Ramps only between height differences"
- User-definable rules
```

**9. Template Library**
```python
# Pre-made configurations:
- "Dungeon Crawler" template
- "Open World Exploration" template
- "Linear Action Level" template
- "Arena/Combat Space" template
```

## Specific UI/UX Improvements

### Current Issues → Solutions

| Issue | Solution | Priority |
|-------|----------|----------|
| Can't see where spaces will be | Add preview spheres at sample points | HIGH |
| Path width is abstract | Show as transparent tube around curve | HIGH |
| Spacing is hard to predict | Show count: "Will generate N spaces" | HIGH |
| No visual feedback during generation | Add progress bar with preview | MEDIUM |
| Can't compare different seeds | Add "Compare" mode with side-by-side | MEDIUM |
| Terrain doesn't follow path visually | Add wireframe preview of terrain | MEDIUM |
| Block placement seems random | Show connection lines to path | LOW |
| Can't edit after generation | Make blocks editable/moveable | LOW |

## Implementation Roadmap

### Version 1.1 (Quick Wins)
- [ ] Add "Preview Sample Points" button
- [ ] Show path_width as visual guide
- [ ] Display space count before generation
- [ ] Add color-coding to generated objects
- [ ] Improve error messages

### Version 1.2 (Visual Feedback)
- [ ] Real-time preview mode
- [ ] Viewport gizmos for parameters
- [ ] Generation area visualization
- [ ] Better preset UI with thumbnails
- [ ] Undo/redo improvements

### Version 2.0 (Advanced Features)
- [ ] Zone/biome system
- [ ] Constraint-based generation
- [ ] Template library
- [ ] Non-destructive editing
- [ ] Performance optimizations

## Key Takeaways from PCG Tools

1. **Show, Don't Tell**: Visualize everything before generation
2. **Immediate Feedback**: Real-time updates as parameters change
3. **Clear Relationships**: Make input→output connections obvious
4. **Iterative Workflow**: Easy to tweak and regenerate
5. **Predictable Results**: Users should know what to expect
6. **Visual Parameters**: Sliders with visual feedback
7. **Layered Complexity**: Simple by default, advanced when needed
8. **Non-Destructive**: Keep inputs editable
9. **Debug Visualization**: Show the "why" behind generation
10. **Good Defaults**: Works well out of the box

## Next Steps

For the next version, I recommend focusing on:

1. **Visual Preview System** (biggest impact on usability)
2. **Path Width Visualization** (makes relationship clear)
3. **Sample Point Indicators** (shows spacing intuitively)
4. **Better Presets UI** (easier to explore options)
5. **Real-time Updates** (modern PCG workflow)

These changes would bring the tool much closer to industry-standard PCG workflows while maintaining its simplicity.

---

**Would you like me to start implementing any of these improvements?** The preview system would be a great first step to make the path→mesh relationship more intuitive.
