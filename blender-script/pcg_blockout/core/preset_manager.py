"""Preset management system for saving and loading parameter configurations."""

import bpy
import json
import os
from typing import List, Optional, Dict, Any
from .parameters import GenerationParams


def get_preset_directory() -> str:
    """
    Get the directory path for storing presets.
    
    Returns:
        Path to the presets directory
    """
    # Get the addon directory
    addon_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    preset_dir = os.path.join(addon_dir, "presets")
    
    # Create directory if it doesn't exist
    if not os.path.exists(preset_dir):
        os.makedirs(preset_dir)
    
    return preset_dir


def save_preset(name: str, parameters: GenerationParams) -> bool:
    """
    Save a parameter preset to a JSON file.
    
    Args:
        name: Name for the preset
        parameters: Generation parameters to save
    
    Returns:
        True if successful, False otherwise
    """
    try:
        preset_dir = get_preset_directory()
        filepath = os.path.join(preset_dir, f"{name}.json")
        
        # Convert parameters to dictionary
        preset_data = {
            "name": name,
            "version": "1.0",
            "parameters": {
                "spacing": parameters.spacing,
                "path_width": parameters.path_width,
                "lateral_density": parameters.lateral_density,
                "space_size_variation": parameters.space_size_variation,
                "seed": parameters.seed,
                "grid_size": parameters.grid_size,
                "wall_height": parameters.wall_height,
                "block_types": list(parameters.block_types),
                "terrain_enabled": parameters.terrain_enabled,
                "height_variation": parameters.height_variation,
                "smoothness": parameters.smoothness,
                "terrain_width": parameters.terrain_width
            }
        }
        
        # Write to file
        with open(filepath, 'w') as f:
            json.dump(preset_data, f, indent=2)
        
        return True
    
    except Exception as e:
        print(f"Error saving preset: {e}")
        return False


def load_preset(name: str) -> Optional[Dict[str, Any]]:
    """
    Load a parameter preset from a JSON file.
    
    Args:
        name: Name of the preset to load
    
    Returns:
        Dictionary of parameters, or None if loading failed
    """
    try:
        preset_dir = get_preset_directory()
        filepath = os.path.join(preset_dir, f"{name}.json")
        
        if not os.path.exists(filepath):
            print(f"Preset file not found: {filepath}")
            return None
        
        # Read from file
        with open(filepath, 'r') as f:
            preset_data = json.load(f)
        
        return preset_data.get("parameters", {})
    
    except Exception as e:
        print(f"Error loading preset: {e}")
        return None


def get_preset_list() -> List[str]:
    """
    Get a list of available preset names.
    
    Returns:
        List of preset names (without .json extension)
    """
    try:
        preset_dir = get_preset_directory()
        
        if not os.path.exists(preset_dir):
            return []
        
        # Get all .json files in the preset directory
        presets = []
        for filename in os.listdir(preset_dir):
            if filename.endswith(".json"):
                preset_name = filename[:-5]  # Remove .json extension
                presets.append(preset_name)
        
        return sorted(presets)
    
    except Exception as e:
        print(f"Error getting preset list: {e}")
        return []


def delete_preset(name: str) -> bool:
    """
    Delete a preset file.
    
    Args:
        name: Name of the preset to delete
    
    Returns:
        True if successful, False otherwise
    """
    try:
        preset_dir = get_preset_directory()
        filepath = os.path.join(preset_dir, f"{name}.json")
        
        if os.path.exists(filepath):
            os.remove(filepath)
            return True
        else:
            print(f"Preset file not found: {filepath}")
            return False
    
    except Exception as e:
        print(f"Error deleting preset: {e}")
        return False


def apply_preset_to_scene(preset_params: Dict[str, Any], scene: bpy.types.Scene):
    """
    Apply preset parameters to the scene properties.
    
    Args:
        preset_params: Dictionary of preset parameters
        scene: Blender scene to apply parameters to
    """
    props = scene.pcg_props
    
    # Apply parameters
    if "spacing" in preset_params:
        props.spacing = preset_params["spacing"]
    if "path_width" in preset_params:
        props.path_width = preset_params["path_width"]
    if "lateral_density" in preset_params:
        props.lateral_density = preset_params["lateral_density"]
    if "space_size_variation" in preset_params:
        props.space_size_variation = preset_params["space_size_variation"]
    if "seed" in preset_params:
        props.seed = preset_params["seed"] if preset_params["seed"] is not None else 0
    if "grid_size" in preset_params:
        props.grid_size = preset_params["grid_size"]
    if "wall_height" in preset_params:
        props.wall_height = preset_params["wall_height"]
    
    # Apply block types
    if "block_types" in preset_params:
        block_types = preset_params["block_types"]
        props.block_type_wall = "wall" in block_types
        props.block_type_floor = "floor" in block_types
        props.block_type_platform = "platform" in block_types
        props.block_type_ramp = "ramp" in block_types
    
    # Apply terrain parameters
    if "terrain_enabled" in preset_params:
        props.terrain_enabled = preset_params["terrain_enabled"]
    if "height_variation" in preset_params:
        props.height_variation = preset_params["height_variation"]
    if "smoothness" in preset_params:
        props.smoothness = preset_params["smoothness"]
    if "terrain_width" in preset_params:
        props.terrain_width = preset_params["terrain_width"]
