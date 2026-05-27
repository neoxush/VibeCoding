"""Preset management system for saving and loading parameter configurations."""

import json
import os
from typing import Any, Dict, List, Optional

import bpy

from .parameters import (
    PIECE_DOORWAY,
    PIECE_FLOOR,
    PIECE_PILLAR,
    PIECE_RAMP,
    PIECE_STAIRS,
    PIECE_WALL,
    PIECE_WALL_HALF,
    GenerationParams,
)


def get_preset_directory() -> str:
    """Get the directory path for storing presets."""
    addon_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    preset_dir = os.path.join(addon_dir, "presets")
    if not os.path.exists(preset_dir):
        os.makedirs(preset_dir)
    return preset_dir


def save_preset(name: str, parameters: GenerationParams, overwrite: bool = False) -> tuple:
    """Save a parameter preset to a JSON file."""
    try:
        preset_dir = get_preset_directory()
        filepath = os.path.join(preset_dir, f"{name}.json")
        if not overwrite and os.path.exists(filepath):
            return False, f"Preset '{name}' already exists"

        preset_data = {
            "name": name,
            "version": "2.0",
            "schema_version": 2,
            "parameters": parameters.to_dict(),
        }
        with open(filepath, 'w') as f:
            json.dump(preset_data, f, indent=2)
        return True, ""
    except Exception as e:
        print(f"Error saving preset: {e}")
        return False, str(e)


def load_preset(name: str) -> Optional[Dict[str, Any]]:
    """Load a parameter preset; returns the migrated parameter dict."""
    try:
        preset_dir = get_preset_directory()
        filepath = os.path.join(preset_dir, f"{name}.json")
        if not os.path.exists(filepath):
            print(f"Preset file not found: {filepath}")
            return None

        with open(filepath) as f:
            preset_data = json.load(f)

        # Accept both top-level params (v2) and the v1 schema where the
        # parameters lived inline at the root or under "parameters".
        if "parameters" in preset_data:
            params = preset_data["parameters"]
        else:
            params = preset_data

        return _migrate_to_v2(params)
    except Exception as e:
        print(f"Error loading preset: {e}")
        return None


def _migrate_to_v2(params: Dict[str, Any]) -> Dict[str, Any]:
    """Best-effort upgrade of a v1 preset dict to the v2 schema.

    v1 had: spacing, path_width, lateral_density, space_size_variation, seed,
             grid_size, wall_height, block_types (legacy 4), road_*, terrain_*.

    v2 adds: blockout_style, path_width_cells, lateral_depth_cells,
             elevation_*, step_height, cover_density, ramp_slope_cells,
             use_stairs, generate_pillars, piece_overrides, and a new
             block_types vocabulary.
    """
    if params.get("schema_version") == 2:
        return params

    out = dict(params)
    out.setdefault("schema_version", 2)

    # Top-level style default: outdoor for the legacy "urban street" feel.
    out.setdefault("blockout_style", "OUTDOOR")

    # Grid model defaults derived from legacy continuous values.
    out.setdefault("grid_size", float(out.get("grid_size", 4.0)) or 4.0)
    legacy_pw = float(out.get("path_width", 16.0))
    gs = float(out["grid_size"])
    out.setdefault("path_width_cells", max(1, int(round(legacy_pw / max(gs * 2, 1.0)))))
    out.setdefault("lateral_depth_cells", 1)

    # Elevation defaults
    out.setdefault("elevation_source", "SPLINE_Z")
    out.setdefault("step_height", 1.5)
    out.setdefault("max_elevation_steps", 2)
    out.setdefault("elevation_smoothing", 2)

    # Piece library defaults
    out.setdefault("cover_density", 0.6)
    out.setdefault("ramp_slope_cells", 1)
    out.setdefault("use_stairs", False)
    out.setdefault("generate_pillars", False)
    out.setdefault("piece_overrides", {})

    # Map legacy block_types ({wall, floor, platform, ramp}) onto v2 set
    legacy_bt = set(out.get("block_types", ["wall", "floor", "ramp"]))
    new_bt = set()
    if "floor" in legacy_bt: new_bt.add(PIECE_FLOOR)
    if "wall" in legacy_bt: new_bt.add(PIECE_WALL)
    if "ramp" in legacy_bt: new_bt.add(PIECE_RAMP)
    # 'platform' (legacy elevated floor) -> closest analog: WALL_HALF (cover)
    if "platform" in legacy_bt: new_bt.add(PIECE_WALL_HALF)
    # Ensure at least one piece survives migration
    if not new_bt:
        new_bt = {PIECE_FLOOR, PIECE_WALL, PIECE_RAMP}
    # Indoor presets need doorways to remain traversable
    if out["blockout_style"] == "INDOOR":
        new_bt.add(PIECE_DOORWAY)
    out["block_types"] = sorted(new_bt)

    return out


def get_preset_list() -> List[str]:
    try:
        preset_dir = get_preset_directory()
        if not os.path.exists(preset_dir):
            return []
        return sorted(f[:-5] for f in os.listdir(preset_dir) if f.endswith(".json"))
    except Exception as e:
        print(f"Error getting preset list: {e}")
        return []


def delete_preset(name: str) -> bool:
    try:
        preset_dir = get_preset_directory()
        filepath = os.path.join(preset_dir, f"{name}.json")
        if os.path.exists(filepath):
            os.remove(filepath)
            return True
        return False
    except Exception as e:
        print(f"Error deleting preset: {e}")
        return False


# Field name -> per-piece override prop name on PG.
_PIECE_OVERRIDE_PROPS = {
    PIECE_FLOOR:     "piece_override_floor",
    PIECE_WALL:      "piece_override_wall",
    PIECE_WALL_HALF: "piece_override_wall_half",
    PIECE_DOORWAY:   "piece_override_doorway",
    PIECE_RAMP:      "piece_override_ramp",
    PIECE_STAIRS:    "piece_override_stairs",
    PIECE_PILLAR:    "piece_override_pillar",
}


# Direct scalar/string fields that map 1:1 to PG props.
_DIRECT_PROPS = (
    "spacing", "path_width", "blockout_style",
    "lateral_density", "space_size_variation",
    "grid_size", "wall_height", "path_width_cells", "lateral_depth_cells",
    "elevation_source", "step_height", "max_elevation_steps", "elevation_smoothing",
    "cover_density", "ramp_slope_cells", "use_stairs", "generate_pillars",
    "terrain_enabled", "height_variation", "smoothness", "terrain_width",
    "road_mode_enabled", "road_width",
    "road_mesh_enabled", "road_mesh_width", "road_height_offset",
    "randomize_params_with_seed",
)


def apply_preset_to_scene(preset_params: Dict[str, Any], scene: bpy.types.Scene):
    """Apply preset parameters to the scene properties."""
    props = scene.pcg_props

    # Direct fields
    for key in _DIRECT_PROPS:
        if key in preset_params and hasattr(props, key):
            try:
                setattr(props, key, preset_params[key])
            except Exception as e:
                print(f"PCG: failed to apply preset key '{key}': {e}")

    # Seed (None -> 0)
    if "seed" in preset_params:
        seed = preset_params["seed"]
        props.seed = seed if seed is not None else 0

    # side_placement (enum, upper-case)
    if "side_placement" in preset_params:
        sp = str(preset_params["side_placement"]).upper()
        if sp in ("LEFT", "RIGHT", "BOTH", "ALTERNATING"):
            props.side_placement = sp

    # Block types
    if "block_types" in preset_params:
        bt = set(preset_params["block_types"])
        props.block_type_floor = PIECE_FLOOR in bt
        props.block_type_wall = PIECE_WALL in bt
        props.block_type_wall_half = PIECE_WALL_HALF in bt
        props.block_type_doorway = PIECE_DOORWAY in bt
        props.block_type_ramp = PIECE_RAMP in bt
        props.block_type_stairs = PIECE_STAIRS in bt
        props.block_type_pillar = PIECE_PILLAR in bt

    # Per-piece overrides
    overrides = preset_params.get("piece_overrides", {}) or {}
    for piece_id, prop_name in _PIECE_OVERRIDE_PROPS.items():
        if hasattr(props, prop_name):
            setattr(props, prop_name, str(overrides.get(piece_id, "")))

    # Road color
    if "road_material_color" in preset_params:
        try:
            props.road_material_color = tuple(preset_params["road_material_color"])
        except Exception:
            pass

    # Layers
    if "layers" in preset_params:
        props.layers.clear()
        for layer_data in preset_params["layers"]:
            layer = props.layers.add()
            layer.name = layer_data.get("name", "Layer")
            layer.enabled = layer_data.get("enabled", True)
            layer.rule = layer_data.get("rule", "EDGE_LOOP")
            layer.collection_name = layer_data.get("collection_name", "")
            layer.density = layer_data.get("density", 1.0)
            layer.offset = layer_data.get("offset", 0.0)
            layer.z_offset = layer_data.get("z_offset", 0.0)
            layer.random_rotation = layer_data.get("random_rotation", False)
            layer.random_scale = layer_data.get("random_scale", False)
            layer.scale_min = layer_data.get("scale_min", 0.8)
            layer.scale_max = layer_data.get("scale_max", 1.2)
        props.active_layer_index = 0 if len(props.layers) > 0 else -1
