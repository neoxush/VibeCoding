"""
Quick test to verify addon structure is correct.
Run this before installing in Blender.
"""

import os
import sys

def check_file_exists(filepath):
    """Check if a file exists and report."""
    exists = os.path.exists(filepath)
    status = "✓" if exists else "✗"
    print(f"{status} {filepath}")
    return exists

def main():
    print("=" * 60)
    print("PCG Level Blockout - Addon Structure Check")
    print("=" * 60)
    
    required_files = [
        "pcg_blockout/__init__.py",
        "pcg_blockout/ui_panel.py",
        "pcg_blockout/core/__init__.py",
        "pcg_blockout/core/parameters.py",
        "pcg_blockout/core/seed_manager.py",
        "pcg_blockout/core/spline_sampler.py",
        "pcg_blockout/core/scene_manager.py",
        "pcg_blockout/core/preset_manager.py",
        "pcg_blockout/generators/__init__.py",
        "pcg_blockout/generators/layout_generator.py",
        "pcg_blockout/generators/building_generator.py",
        "pcg_blockout/generators/terrain_generator.py",
    ]
    
    print("\nChecking required files:")
    all_exist = True
    for filepath in required_files:
        if not check_file_exists(filepath):
            all_exist = False
    
    print("\nChecking directories:")
    required_dirs = [
        "pcg_blockout",
        "pcg_blockout/core",
        "pcg_blockout/generators",
        "pcg_blockout/presets",
    ]
    
    for dirpath in required_dirs:
        exists = os.path.isdir(dirpath)
        status = "✓" if exists else "✗"
        print(f"{status} {dirpath}/")
        if not exists:
            all_exist = False
    
    print("\n" + "=" * 60)
    if all_exist:
        print("✓ All required files and directories present!")
        print("\nThe addon is ready to install in Blender.")
        print("\nNext steps:")
        print("1. Zip the 'pcg_blockout' folder")
        print("2. In Blender: Edit > Preferences > Add-ons > Install")
        print("3. Select the ZIP file")
        print("4. Enable 'PCG Level Blockout'")
        print("5. Press N in 3D Viewport to see the panel")
    else:
        print("✗ Some files or directories are missing!")
        print("Please ensure all required files are present.")
    print("=" * 60)
    
    return all_exist

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
