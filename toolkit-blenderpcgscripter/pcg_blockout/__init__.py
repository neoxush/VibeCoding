"""
PCG Level Blockout - Procedural Content Generation Tool for Blender
A spline-based level blockout generator for game development
"""

bl_info = {
    "name": "PCG Level Blockout",
    "author": "PCG Tools",
    "version": (1, 0, 0),
    "blender": (3, 6, 0),
    "location": "View3D > Sidebar > PCG Blockout",
    "description": "Procedural generation tool for semi-open world level blockouts using spline-based layouts",
    "category": "3D View",
}

import bpy

# Import modules with error handling
try:
    from . import ui_panel
    from .core import parameters
except ImportError as e:
    print(f"PCG Level Blockout: Import error - {e}")
    raise

# List of classes to register
classes = []

def register():
    """Register addon classes and properties"""
    try:
        # Register parameter system
        parameters.register()
        
        # Register UI panel classes
        for cls in ui_panel.classes:
            bpy.utils.register_class(cls)
        
        print("PCG Level Blockout addon registered successfully")
    except Exception as e:
        print(f"PCG Level Blockout: Registration error - {e}")
        import traceback
        traceback.print_exc()
        raise

def unregister():
    """Unregister addon classes and properties"""
    try:
        # Unregister UI panel classes
        for cls in reversed(ui_panel.classes):
            bpy.utils.unregister_class(cls)
        
        # Unregister parameter system
        parameters.unregister()
        
        print("PCG Level Blockout addon unregistered")
    except Exception as e:
        print(f"PCG Level Blockout: Unregistration error - {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    register()
