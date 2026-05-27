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
    # In test environments, relative imports may fail
    if __name__ != "__main__":
        print(f"PCG Level Blockout: Import error (non-fatal in test) - {e}")
    else:
        raise

# List of classes to register
classes = []
_addon_keymaps = []

def _register_keymaps():
    """Register keyboard shortcuts. Fails silently if keyconfig unavailable."""
    global _addon_keymaps
    try:
        wm = bpy.context.window_manager
        kc = wm.keyconfigs.addon
        if kc is None:
            return
        km = kc.keymaps.new(name="PCG Blockout", space_type='VIEW_3D')
        items = [
            ("pcg.generate", 'G'),
            ("pcg.toggle_preview", 'P'),
            ("pcg.randomize_seed", 'R'),
        ]
        for op_id, key in items:
            kmi = km.keymap_items.new(op_id, key, 'PRESS', ctrl=True, shift=True)
            _addon_keymaps.append((km, kmi))
    except Exception as e:
        print(f"PCG: Keymap registration skipped - {e}")


def _unregister_keymaps():
    """Remove keyboard shortcuts. Fails silently on already-cleared keymaps."""
    global _addon_keymaps
    for km, kmi in _addon_keymaps:
        try:
            km.keymap_items.remove(kmi)
        except Exception:
            pass
    _addon_keymaps.clear()


def register():
    """Register addon classes and properties"""
    try:
        parameters.register()
        for cls in ui_panel.classes:
            bpy.utils.register_class(cls)
        _register_keymaps()
        print("PCG Level Blockout addon registered successfully")
    except Exception as e:
        print(f"PCG Level Blockout: Registration error - {e}")
        import traceback
        traceback.print_exc()
        raise


def unregister():
    """Unregister addon classes and properties"""
    try:
        _unregister_keymaps()
        for cls in reversed(ui_panel.classes):
            bpy.utils.unregister_class(cls)
        parameters.unregister()
        print("PCG Level Blockout addon unregistered")
    except Exception as e:
        print(f"PCG Level Blockout: Unregistration error - {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    register()
