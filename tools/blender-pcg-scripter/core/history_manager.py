"""History management system for saving and restoring generation states."""

import bpy
import json
import time
from datetime import datetime
from typing import Optional, Dict, Any
from .parameters import GenerationParams

MAX_HISTORY_ITEMS = 10

def push_history(context, is_snapshot: bool = False, name: str = ""):
    """
    Save the current state to history.
    
    Args:
        context: Blender context
        is_snapshot: Whether this is a permanent snapshot or temporary history
        name: Optional name for the snapshot
    """
    props = context.scene.pcg_props
    
    # Serialize current parameters
    data_dict = props.to_dict()
    data_json = json.dumps(data_dict)
    
    # Create new history item
    if is_snapshot:
        # Snapshots are added to the end and don't push out old items
        item = props.history.add()
        item.is_snapshot = True
        item.name = name if name else f"Snapshot {datetime.now().strftime('%H:%M:%S')}"
    else:
        # Auto-history: Maintain max size
        # We want the newest item at the top (index 0) for display, 
        # but Blender collections append to the end.
        # So we'll just append and show in reverse order in UI, 
        # or insert at 0 if we could (Blender collections don't support insert at index easily).
        # Strategy: Add to end. If count > MAX, remove first non-snapshot item.
        
        # Count non-snapshot items
        history_items = [item for item in props.history if not item.is_snapshot]
        
        if len(history_items) >= MAX_HISTORY_ITEMS:
            # Find index of oldest non-snapshot
            for i, item in enumerate(props.history):
                if not item.is_snapshot:
                    props.history.remove(i)
                    break
        
        item = props.history.add()
        item.is_snapshot = False
        item.name = f"Gen {datetime.now().strftime('%H:%M:%S')} (Seed {props.seed})"

    item.timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    item.data_json = data_json
    
    # Set active index to new item
    props.active_history_index = len(props.history) - 1


def restore_history(context, index: int):
    """
    Restore a state from history.
    
    Args:
        context: Blender context
        index: Index in the history collection
    """
    props = context.scene.pcg_props
    
    if index < 0 or index >= len(props.history):
        return
    
    item = props.history[index]
    
    try:
        data = json.loads(item.data_json)
        
        # Apply parameters
        # We can reuse the logic from preset_manager or duplicate it here.
        # Duplicating for now to avoid circular imports if preset_manager imports this.
        # Actually, let's just import preset_manager inside the function if needed, 
        # or better, just implement the apply logic here as it's simple.
        
        from . import preset_manager
        preset_manager.apply_preset_to_scene(data, context.scene)
        
    except Exception as e:
        print(f"Error restoring history: {e}")


def clear_history(context, keep_snapshots: bool = True):
    """
    Clear history items.
    
    Args:
        context: Blender context
        keep_snapshots: Whether to keep snapshot items
    """
    props = context.scene.pcg_props
    
    if not keep_snapshots:
        props.history.clear()
        return
        
    # Remove only non-snapshots
    # Iterate backwards to avoid index issues
    for i in range(len(props.history) - 1, -1, -1):
        if not props.history[i].is_snapshot:
            props.history.remove(i)
            
    props.active_history_index = -1
