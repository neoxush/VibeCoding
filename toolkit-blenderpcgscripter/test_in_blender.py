"""
Test script to run in Blender's Python console.
This will help diagnose why the addon isn't appearing.

Instructions:
1. Open Blender
2. Switch to Scripting workspace
3. Copy and paste this entire script into the Python console
4. Press Enter to run
"""

import sys
import os

print("=" * 60)
print("PCG Level Blockout - Diagnostic Test")
print("=" * 60)

# Check Blender version
import bpy
print(f"\n✓ Blender version: {bpy.app.version}")

# Check Python version
print(f"✓ Python version: {sys.version}")

# Check addons path
import addon_utils
addon_paths = addon_utils.paths()
print(f"\n✓ Addon paths:")
for path in addon_paths:
    print(f"  - {path}")

# Try to find pcg_blockout
print(f"\n🔍 Looking for pcg_blockout addon...")
found = False
for path in addon_paths:
    addon_path = os.path.join(path, "pcg_blockout")
    if os.path.exists(addon_path):
        print(f"✓ Found at: {addon_path}")
        found = True
        
        # Check for __init__.py
        init_path = os.path.join(addon_path, "__init__.py")
        if os.path.exists(init_path):
            print(f"  ✓ __init__.py exists")
            
            # Try to read bl_info
            try:
                with open(init_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if 'bl_info' in content:
                        print(f"  ✓ bl_info found in __init__.py")
                    else:
                        print(f"  ✗ bl_info NOT found in __init__.py")
            except Exception as e:
                print(f"  ✗ Error reading __init__.py: {e}")
        else:
            print(f"  ✗ __init__.py NOT found")
        
        # Check subdirectories
        for subdir in ['core', 'generators', 'presets']:
            subdir_path = os.path.join(addon_path, subdir)
            if os.path.exists(subdir_path):
                print(f"  ✓ {subdir}/ exists")
            else:
                print(f"  ✗ {subdir}/ NOT found")

if not found:
    print("✗ pcg_blockout folder NOT found in any addon path")
    print("\nPlease install the addon first:")
    print("1. Edit > Preferences > Add-ons")
    print("2. Click 'Install...'")
    print("3. Select pcg_blockout.zip")

# Try to import the addon
print(f"\n🔍 Attempting to import addon...")
try:
    # Add to path if found
    if found:
        for path in addon_paths:
            if path not in sys.path:
                sys.path.insert(0, path)
    
    import pcg_blockout
    print("✓ Import successful!")
    print(f"  Name: {pcg_blockout.bl_info.get('name', 'Unknown')}")
    print(f"  Version: {pcg_blockout.bl_info.get('version', 'Unknown')}")
    print(f"  Blender: {pcg_blockout.bl_info.get('blender', 'Unknown')}")
    print(f"  Category: {pcg_blockout.bl_info.get('category', 'Unknown')}")
    
except ImportError as e:
    print(f"✗ Import failed: {e}")
    print("\nThis usually means:")
    print("- The addon is not installed correctly")
    print("- There's a syntax error in the code")
    print("- Missing dependencies")
    
except Exception as e:
    print(f"✗ Unexpected error: {e}")
    import traceback
    traceback.print_exc()

# Check if addon is enabled
print(f"\n🔍 Checking if addon is enabled...")
addon_enabled = False
for mod in addon_utils.modules():
    if mod.__name__ == 'pcg_blockout':
        addon_enabled = addon_utils.check(mod.__name__)[0]
        print(f"✓ Addon found in modules")
        print(f"  Enabled: {addon_enabled}")
        break

if not addon_enabled:
    print("ℹ Addon is not enabled. Enable it in:")
    print("  Edit > Preferences > Add-ons")
    print("  Search for 'PCG Level Blockout'")

print("\n" + "=" * 60)
print("Diagnostic complete!")
print("=" * 60)
