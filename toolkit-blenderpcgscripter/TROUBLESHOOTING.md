# Troubleshooting: Addon Not Appearing in Blender

## Common Issues and Solutions

### Issue: Addon doesn't appear in the addon list after installation

This usually happens due to one of these reasons:

#### 1. **Incorrect ZIP Structure**

**Problem**: The ZIP file has an extra folder level.

**Wrong structure:**
```
pcg_blockout.zip
  └── pcg_blockout/
      └── pcg_blockout/
          ├── __init__.py
          └── ...
```

**Correct structure:**
```
pcg_blockout.zip
  └── pcg_blockout/
      ├── __init__.py
      ├── ui_panel.py
      ├── core/
      ├── generators/
      └── presets/
```

**Solution:**
- When creating the ZIP, make sure you're zipping the `pcg_blockout` folder itself
- The `__init__.py` should be directly inside `pcg_blockout/` in the ZIP

**How to create correct ZIP:**

**Windows:**
1. Navigate to the folder CONTAINING `pcg_blockout`
2. Right-click on the `pcg_blockout` folder
3. Select "Send to > Compressed (zipped) folder"

**macOS/Linux:**
```bash
# Navigate to the folder CONTAINING pcg_blockout
cd /path/to/parent/folder
zip -r pcg_blockout.zip pcg_blockout/
```

#### 2. **Python Syntax Errors**

**Problem**: There's a syntax error preventing the addon from loading.

**Solution:**
1. Open Blender
2. Go to `Window > Toggle System Console` (Windows) or run Blender from terminal (macOS/Linux)
3. Try to install/enable the addon
4. Look for error messages in the console

Common errors to look for:
- `SyntaxError`
- `ImportError`
- `ModuleNotFoundError`

#### 3. **Blender Version Mismatch**

**Problem**: The addon is installed in the wrong Blender version folder.

**Solution:**
- Make sure you're using Blender 3.6.x
- Check that the addon is installed in the correct version folder
- Try reinstalling the addon

#### 4. **Manual Installation Path Issues**

**Problem**: Addon copied to wrong location.

**Correct paths:**
- **Windows**: `C:\Users\{YourUsername}\AppData\Roaming\Blender Foundation\Blender\3.6\scripts\addons\pcg_blockout\`
- **macOS**: `/Users/{YourUsername}/Library/Application Support/Blender/3.6/scripts/addons/pcg_blockout/`
- **Linux**: `~/.config/blender/3.6/scripts/addons/pcg_blockout/`

**Verify:**
- The `__init__.py` file should be at: `.../addons/pcg_blockout/__init__.py`
- NOT at: `.../addons/pcg_blockout/pcg_blockout/__init__.py`

## Step-by-Step Debugging

### Step 1: Verify File Structure

Check that your `pcg_blockout` folder contains:
```
pcg_blockout/
├── __init__.py          ← Must be here!
├── ui_panel.py
├── core/
│   ├── __init__.py
│   ├── parameters.py
│   ├── seed_manager.py
│   ├── spline_sampler.py
│   ├── scene_manager.py
│   └── preset_manager.py
├── generators/
│   ├── __init__.py
│   ├── layout_generator.py
│   ├── building_generator.py
│   └── terrain_generator.py
└── presets/
```

### Step 2: Test Import

Create a test file `test_import.py` in the same directory as `pcg_blockout`:

```python
import sys
sys.path.insert(0, '.')

try:
    import pcg_blockout
    print("✓ Main module imports successfully")
    print(f"  bl_info: {pcg_blockout.bl_info}")
except Exception as e:
    print(f"✗ Import failed: {e}")
    import traceback
    traceback.print_exc()
```

Run it with Python (not in Blender):
```bash
python test_import.py
```

### Step 3: Check Blender Console

1. Open Blender
2. **Windows**: `Window > Toggle System Console`
3. **macOS/Linux**: Run Blender from terminal:
   ```bash
   /Applications/Blender.app/Contents/MacOS/Blender  # macOS
   blender  # Linux
   ```
4. Try to install the addon
5. Look for error messages

### Step 4: Try Manual Installation

Instead of using ZIP:

1. Copy the entire `pcg_blockout` folder to Blender's addons directory
2. Restart Blender
3. Go to `Edit > Preferences > Add-ons`
4. Search for "PCG" or "Level"
5. If it appears, enable it

### Step 5: Check for Conflicting Addons

1. Disable all other addons temporarily
2. Try enabling PCG Level Blockout
3. If it works, re-enable other addons one by one to find conflicts

## Quick Fix: Reinstall from Scratch

1. **Remove old installation:**
   - Go to `Edit > Preferences > Add-ons`
   - If you see "PCG Level Blockout", click Remove
   - Close Blender

2. **Clean up manually:**
   - Navigate to the addons folder (see paths above)
   - Delete the `pcg_blockout` folder if it exists
   - Delete any `pcg_blockout.zip` files

3. **Create fresh ZIP:**
   ```bash
   # Make sure you're in the parent directory
   cd /path/to/parent
   zip -r pcg_blockout_fresh.zip pcg_blockout/
   ```

4. **Reinstall:**
   - Open Blender
   - `Edit > Preferences > Add-ons > Install`
   - Select the fresh ZIP
   - Enable the addon

## Still Not Working?

### Check Python Version

Blender 3.6 uses Python 3.10. Make sure there are no Python 3.11+ specific syntax.

### Verify bl_info

The `bl_info` in `__init__.py` should look like this:

```python
bl_info = {
    "name": "PCG Level Blockout",
    "author": "PCG Tools",
    "version": (1, 0, 0),
    "blender": (3, 6, 0),  # Note: (3, 6, 0) not (3, 6, 22)
    "location": "View3D > Sidebar > PCG Blockout",
    "description": "Procedural generation tool for semi-open world level blockouts using spline-based layouts",
    "category": "3D View",
}
```

### Enable Developer Extras

1. `Edit > Preferences > Interface`
2. Enable "Developer Extras"
3. This shows more detailed error messages

### Check Blender Version

```python
# In Blender's Python console:
import bpy
print(bpy.app.version)  # Should be (3, 6, x)
```

## Getting Help

If none of these solutions work, provide:

1. Blender version (exact)
2. Operating system
3. Error messages from console
4. Screenshot of folder structure
5. Contents of `__init__.py` (first 20 lines)

## Success Indicators

When the addon is properly installed, you should see:

1. ✓ "PCG Level Blockout" in the addon list
2. ✓ Category: "3D View"
3. ✓ Location: "View3D > Sidebar > PCG Blockout"
4. ✓ Checkbox to enable/disable
5. ✓ After enabling: "PCG Blockout" tab in 3D Viewport sidebar (press N)
