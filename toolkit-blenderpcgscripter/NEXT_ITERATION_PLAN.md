# Next Iteration: Visual Connection Improvements

## Core Goal
**Improve the visual connection between spline-based sketch and mesh blockout outcome**

Make it immediately obvious how the spline curve translates into the generated level geometry.

---

## Priority Features for Next Version

### 1. Preview Sample Points (HIGHEST PRIORITY)

**Problem:** Users can't see where spaces will be placed before generating

**Solution:** Add a "Preview" button that shows sample points

**Implementation:**
```python
class PCG_OT_PreviewSamplePoints(bpy.types.Operator):
    """Show where spaces will be generated along the spline"""
    
    def execute(self, context):
        # Sample the spline
        # Create small empty objects at each point
        # Add to a "PCG_Preview" collection
        # Color them based on space type
```

**Visual Result:**
- Small colored spheres along the curve
- Shows exact spacing
- Updates when parameters change
- Can be cleared with one click

**User Benefit:** "I can see exactly where my 12 spaces will be before generating"

---

### 2. Path Width Visualization (HIGH PRIORITY)

**Problem:** "Path Width" parameter is abstract - users don't know how wide the generation area is

**Solution:** Show the generation area as a visual guide

**Implementation:**
```python
class PCG_OT_ShowPathGuide(bpy.types.Operator):
    """Display the generation area around the spline"""
    
    def execute(self, context):
        # Create a curve modifier on the spline
        # Extrude with path_width as thickness
        # Make it transparent (wireframe or ghost material)
        # Add to "PCG_Preview" collection
```

**Visual Result:**
- Transparent tube/ribbon around the spline
- Width matches path_width parameter
- Shows where buildings and terrain will appear
- Updates when path_width changes

**User Benefit:** "I can see the generation zone before committing"

---

### 3. Space Boundary Indicators (HIGH PRIORITY)

**Problem:** Generated spaces appear randomly placed with no clear connection to the path

**Solution:** Show space boundaries as wireframe boxes in preview

**Implementation:**
```python
def create_space_preview(space_position, space_size, space_orientation):
    # Create wireframe cube at space location
    # Size matches space dimensions
    # Rotation matches spline orientation
    # Color-code by space type (enclosed=red, open=green, semi=yellow)
```

**Visual Result:**
- Wireframe boxes showing each space
- Positioned and oriented along the path
- Color-coded by type
- Shows lateral branches clearly

**User Benefit:** "I understand how spaces are distributed along my path"

---

### 4. Connection Lines (MEDIUM PRIORITY)

**Problem:** Relationship between path points and generated content is unclear

**Solution:** Draw lines connecting path to space centers

**Implementation:**
```python
def create_connection_indicators(spline_points, spaces):
    # For each space, draw a line from nearest path point to space center
    # Use the "Connections" collection
    # Make lines dashed or dotted
    # Color-code by connection type (main path vs lateral)
```

**Visual Result:**
- Lines from path to each space
- Shows which spaces are on main path vs branches
- Makes the relationship explicit
- Can be toggled on/off

**User Benefit:** "I see how each space connects to the path"

---

### 5. Real-time Parameter Feedback (MEDIUM PRIORITY)

**Problem:** Users must regenerate to see parameter changes

**Solution:** Update preview when parameters change

**Implementation:**
```python
# Add update callbacks to properties
def update_preview(self, context):
    if context.scene.pcg_props.preview_enabled:
        # Clear old preview
        # Regenerate preview with new parameters
        # Fast because it's just empties/wireframes
```

**Visual Result:**
- Preview updates as you adjust sliders
- See spacing changes immediately
- Path width adjusts in real-time
- No need to regenerate full geometry

**User Benefit:** "I can experiment with parameters and see results instantly"

---

### 6. Generation Info Display (LOW PRIORITY)

**Problem:** Users don't know what will be generated

**Solution:** Show statistics before generation

**Implementation:**
```python
# In the UI panel, display:
- "Will generate: 12 spaces"
- "Main path: 8 spaces"
- "Lateral branches: 4 spaces"
- "Estimated objects: ~45"
- "Spline length: 120m"
```

**Visual Result:**
- Text info in the panel
- Updates with parameters
- Gives expectations before generating

**User Benefit:** "I know what to expect before clicking Generate"

---

## UI Changes

### New Buttons in Panel

```
┌─────────────────────────────────────┐
│ Spline Path                         │
│ ├─ Spline: PCG_Path            ✓   │
│ └─ [Create Default Spline]          │
├─────────────────────────────────────┤
│ Preview                             │
│ ├─ [Show Preview]                   │ ← NEW
│ ├─ [Clear Preview]                  │ ← NEW
│ └─ ☑ Auto-update preview            │ ← NEW
├─────────────────────────────────────┤
│ Layout Parameters                   │
│ ├─ Spacing: 10.0m                   │
│ │  └─ Will generate: 12 spaces      │ ← NEW
│ ├─ Path Width: 20.0m                │
│ │  └─ [Show Path Guide]             │ ← NEW
│ └─ ...                               │
├─────────────────────────────────────┤
│ [Generate]                          │
│ [Randomize Seed]                    │
│ [Reset Parameters]                  │
└─────────────────────────────────────┘
```

---

## Visual Design Language

### Color Coding System

**Preview Elements:**
- **Sample Points**: Cyan spheres (easy to see)
- **Path Guide**: Transparent blue tube
- **Space Previews**: 
  - Enclosed spaces: Red wireframe
  - Open spaces: Green wireframe
  - Semi-open: Yellow wireframe
- **Connection Lines**: White dashed lines
- **Lateral Branches**: Orange indicators

**Generated Elements:**
- Keep current organization (Structures/Terrain/Connections)
- Add color-coding to match preview

---

## Implementation Order

### Phase 1: Basic Preview (Week 1)
1. ✅ Preview Sample Points operator
2. ✅ Path Width visualization
3. ✅ Clear Preview operator
4. ✅ UI buttons for preview

### Phase 2: Enhanced Preview (Week 2)
5. ✅ Space boundary wireframes
6. ✅ Connection line indicators
7. ✅ Color-coding system
8. ✅ Generation info display

### Phase 3: Real-time Updates (Week 3)
9. ✅ Auto-update toggle
10. ✅ Parameter change callbacks
11. ✅ Performance optimization
12. ✅ Polish and testing

---

## Technical Approach

### Preview System Architecture

```python
# New module: pcg_blockout/core/preview_manager.py

class PreviewManager:
    """Manages preview visualization"""
    
    def __init__(self, params, spline_object):
        self.params = params
        self.spline_object = spline_object
        self.preview_collection = None
    
    def create_preview(self):
        """Generate all preview elements"""
        self.clear_preview()
        self.preview_collection = self._create_preview_collection()
        
        # Sample the spline
        sampler = SplineSampler(self.spline_object)
        points = sampler.sample_points(self.params.spacing)
        
        # Create preview elements
        self._create_sample_point_markers(points)
        self._create_path_guide()
        self._create_space_previews(points)
        self._create_connection_lines(points)
    
    def clear_preview(self):
        """Remove all preview elements"""
        # Delete preview collection and contents
    
    def update_preview(self):
        """Refresh preview with current parameters"""
        self.create_preview()
```

### New Operators

```python
# Add to ui_panel.py

class PCG_OT_ShowPreview(bpy.types.Operator):
    """Show generation preview"""
    bl_idname = "pcg.show_preview"
    bl_label = "Show Preview"
    
class PCG_OT_ClearPreview(bpy.types.Operator):
    """Clear generation preview"""
    bl_idname = "pcg.clear_preview"
    bl_label = "Clear Preview"

class PCG_OT_TogglePathGuide(bpy.types.Operator):
    """Toggle path width visualization"""
    bl_idname = "pcg.toggle_path_guide"
    bl_label = "Show Path Guide"
```

---

## Success Metrics

After implementing these features, users should be able to:

1. ✅ **See where spaces will be** before generating
2. ✅ **Understand the generation area** (path width)
3. ✅ **Predict the outcome** (space count, distribution)
4. ✅ **Experiment quickly** (real-time preview updates)
5. ✅ **Make informed decisions** (clear visual feedback)

---

## Example User Workflow (After Improvements)

**Before (Current):**
1. Draw spline
2. Adjust parameters (guessing)
3. Click Generate
4. Wait...
5. "That's not what I wanted"
6. Undo, adjust, regenerate
7. Repeat until satisfied

**After (With Improvements):**
1. Draw spline
2. Click "Show Preview"
3. See sample points and path guide
4. Adjust spacing slider → preview updates instantly
5. "Perfect! I can see exactly what I'll get"
6. Click Generate
7. Result matches expectations ✓

---

## Next Steps

1. **Review this plan** - Does this address the visual connection issue?
2. **Prioritize features** - Which are most important to you?
3. **Start implementation** - Begin with Phase 1 (basic preview)
4. **Iterate based on feedback** - Test and refine

**Ready to start implementing?** I can begin with the Preview Sample Points feature, which will have the biggest immediate impact on visual clarity.
