"""
Core data structures for the V2 Layer System.
Defines Layers, Rules, and their configuration.
"""

import bpy
from enum import Enum
from dataclasses import dataclass, field
from typing import List, Optional, Any

class PlacementRule(Enum):
    """Defines how objects are placed in a layer."""
    EDGE_LOOP = "EDGE_LOOP"  # Place along the edges of the path
    FILL_GRID = "FILL_GRID"  # Fill the interior space on a grid
    SCATTER = "SCATTER"      # Randomly scatter objects
    CENTER_LINE = "CENTER_LINE" # Place along the center spline

@dataclass
class LayerConfig:
    """Configuration for a single generation layer."""
    name: str = "New Layer"
    enabled: bool = True
    rule: PlacementRule = PlacementRule.EDGE_LOOP
    
    # Asset settings
    collection_name: str = ""  # Name of the collection to use as asset source
    
    # Placement settings
    density: float = 1.0
    offset: float = 0.0
    z_offset: float = 0.0
    
    # Randomization
    random_rotation: bool = False
    random_scale: bool = False
    scale_min: float = 0.8
    scale_max: float = 1.2

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "enabled": self.enabled,
            "rule": self.rule.value,
            "collection_name": self.collection_name,
            "density": self.density,
            "offset": self.offset,
            "z_offset": self.z_offset,
            "random_rotation": self.random_rotation,
            "random_scale": self.random_scale,
            "scale_min": self.scale_min,
            "scale_max": self.scale_max
        }

    @classmethod
    def from_dict(cls, data: dict) -> 'LayerConfig':
        layer = cls()
        layer.name = data.get("name", "New Layer")
        layer.enabled = data.get("enabled", True)
        layer.rule = PlacementRule(data.get("rule", "EDGE_LOOP"))
        layer.collection_name = data.get("collection_name", "")
        layer.density = data.get("density", 1.0)
        layer.offset = data.get("offset", 0.0)
        layer.z_offset = data.get("z_offset", 0.0)
        layer.random_rotation = data.get("random_rotation", False)
        layer.random_scale = data.get("random_scale", False)
        layer.scale_min = data.get("scale_min", 0.8)
        layer.scale_max = data.get("scale_max", 1.2)
        return layer
