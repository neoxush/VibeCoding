# How to Reload the Addon After Fixing

The addon has been fixed with proper imports. Follow these steps to reload it in Blender:

## Method 1: Disable and Re-enable (Quick)

1. In Blender, go to `Edit > Preferences > Add-ons`
2. Find "PCG Level Blockout"
3. **Uncheck** the checkbox to disable it
4. **Check** the checkbox again to re-enable it
5. The addon should now work without errors!

## Method 2: Restart Blender (Most Reliable)

1. Save your work
2. Close Blender completely
3. Reopen Blender
4. Go to `Edit > Preferences > Add-ons`
5. Make sure "PCG Level Blockout" is enabled
6. Test the addon

## Method 3: Reinstall (If Methods 1 & 2 Don't Work)

1. In Blender: `Edit > Preferences > Add-ons`
2. Find "PCG Level Blockout"
3. Click the **Remove** button
4. Close Blender
5. Create a fresh ZIP of the `pcg_blockout` folder
6. Reopen Blender
7. `Edit > Preferences > Add-ons > Install`
8. Select the new ZIP file
9. Enable the addon

## What Was Fixed

**Problem:** Relative imports inside operator methods were failing

**Solution:** Moved all imports to the top of `ui_panel.py`:
```python
# Now at the top of the file
from .core import seed_manager, scene_manager, parameters
from .core.spline_sampler import SplineSampler
from .generators.layout_generator import LayoutGenerator
from .generators.building_generator import BuildingBlockGenerator
from .generators.terrain_generator import TerrainGenerator
```

This is the standard Blender addon pattern and ensures imports work correctly.

## Testing

After reloading, test these features:

1. **Create Default Spline**: Should create an S-curve
2. **Randomize Seed**: Should generate a new random number
3. **Reset Parameters**: Should reset all values to defaults
4. **Generate**: Should create level blockout (requires a spline)

## If You Still See Errors

1. **Check the System Console** (`Window > Toggle System Console`)
2. **Look for the exact error message**
3. **Make sure you're using the latest files** (the ones just fixed)
4. **Verify the ZIP structure** (see TROUBLESHOOTING.md)

## Success Indicators

✅ No error messages in console
✅ "Generate" button works
✅ "Randomize Seed" button works  
✅ "Reset Parameters" button works
✅ Objects are created in the 3D viewport

---

**The addon is now properly fixed and should work!** 🎉
