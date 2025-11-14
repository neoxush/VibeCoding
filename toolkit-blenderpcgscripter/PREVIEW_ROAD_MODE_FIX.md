# Preview Road Mode Fix

## Problem Fixed

The preview was failing with "Failed to create preview" error because the preview system didn't support road mode.

## What Was Fixed

### Updated `preview_manager.py`:

1. **Split preview logic** into two modes:
   - `_create_centered_preview()` - For standard mode
   - `_create_road_side_previews()` - For road mode

2. **Added road mode detection**:
   - Checks `self.params.road_mode_enabled`
   - Routes to appropriate preview method

3. **Added side placement logic**:
   - `_get_preview_sides_for_index()` method
   - Handles "left", "right", "both", "alternating"

4. **Color coding for road mode**:
   - Blue wireframes for left side
   - Orange wireframes for right side
   - Makes it easy to see which side is which

### How It Works Now:

**Standard Mode Preview:**
```
[Red/Yellow/Green Box]  ← Centered on spline
         |
[Red/Yellow/Green Box]
         |
[Red/Yellow/Green Box]
```

**Road Mode Preview:**
```
[Blue Box]  ====spline====  [Orange Box]
    (left)                      (right)
              |
[Blue Box]  ====spline====  [Orange Box]
              |
[Blue Box]  ====spline====  [Orange Box]
```

## To Test:

1. **Reload addon** (F3 → Reload Scripts)
2. **Enable Road Mode**
3. **Set Side to "Both"**
4. **Click "Show Preview"**
5. **You should see:**
   - Blue wireframe boxes on LEFT side
   - Orange wireframe boxes on RIGHT side
   - Clear gap in the middle
   - Cyan spheres along the spline

## Preview Colors:

- **Standard Mode:**
  - Red = Enclosed spaces
  - Yellow = Semi-open spaces
  - Green = Open spaces

- **Road Mode:**
  - Blue = Left side buildings
  - Orange = Right side buildings
  - Cyan spheres = Sample points

## Benefits:

✓ Preview now matches generation in road mode
✓ Easy to see which side buildings will be on
✓ Can test different side placements before generating
✓ Visual feedback for road width

---

**Status:** ✅ FIXED
**File Modified:** `pcg_blockout/core/preview_manager.py`
**Date:** 2025-11-14
