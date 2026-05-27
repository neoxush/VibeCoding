"""Parameter validation and defaults for PCG Level Blockout addon."""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple

import bpy

from .layer_system import CellTarget, LayerConfig, PlacementRule


class BlockoutStyle(str, Enum):
    """Top-level blockout intent.

    Controls every downstream pass (layout, elevation, walls, traversal).
    """
    OUTDOOR = "OUTDOOR"  # open platforms, cover walls, no enforced doorways
    INDOOR = "INDOOR"    # enclosed rooms, doorways between connected neighbors


class ElevationSource(str, Enum):
    """How per-cell elevation is computed."""
    FLAT = "FLAT"                          # all cells at z = 0
    RANDOM_SMOOTHED = "RANDOM_SMOOTHED"    # random per cell, smoothed across neighbors
    SPLINE_Z = "SPLINE_Z"                  # follow spline Z, side cells inherit + noise


# Canonical placeholder piece identifiers used by BuildingBlockGenerator and
# the per-piece override map. Stored as strings so they serialize cleanly.
PIECE_FLOOR = "floor"
PIECE_WALL = "wall"
PIECE_WALL_HALF = "wall_half"
PIECE_DOORWAY = "doorway"
PIECE_RAMP = "ramp"
PIECE_STAIRS = "stairs"
PIECE_PILLAR = "pillar"

ALL_PIECE_TYPES: Tuple[str, ...] = (
    PIECE_FLOOR,
    PIECE_WALL,
    PIECE_WALL_HALF,
    PIECE_DOORWAY,
    PIECE_RAMP,
    PIECE_STAIRS,
    PIECE_PILLAR,
)


@dataclass
class GenerationParams:
    """Data structure for all generation parameters."""

    # ---------------------------------------------------------------- Spline
    spline_object: Optional[bpy.types.Object] = None
    spacing: float = 4.0           # Sample interval along the spline (m)
    path_width: float = 16.0       # Legacy continuous path width (kept for compat)

    # --------------------------------------------------------- Blockout style
    blockout_style: str = BlockoutStyle.OUTDOOR.value

    # ---------------------------------------------------------------- Layout
    lateral_density: float = 0.3
    space_size_variation: float = 0.3
    seed: Optional[int] = None

    # ------------------------------------------------------------- Grid model
    grid_size: float = 4.0          # Cell footprint in meters (X & Y)
    wall_height: float = 3.0        # Wall vertical extent
    path_width_cells: int = 1       # Cells across the spline corridor
    lateral_depth_cells: int = 1    # Cells extending sideways from the corridor

    # ------------------------------------------------------------- Elevation
    elevation_source: str = ElevationSource.SPLINE_Z.value
    step_height: float = 1.5        # Vertical size of one elevation step
    max_elevation_steps: int = 2    # Max steps a cell can rise above base
    elevation_smoothing: int = 2    # Neighbor-averaging passes

    # -------------------------------------------------------- Blockout pieces
    cover_density: float = 0.6      # 0..1, chance a drop-edge becomes WALL_HALF
    ramp_slope_cells: int = 1       # Ramp footprint length (in cells) per step
    use_stairs: bool = False        # If True, stairs replace ramps
    generate_pillars: bool = False  # Add pillars at room corners (indoor)
    piece_overrides: Dict[str, str] = field(default_factory=dict)
    # Set of piece types to generate (skip omitted ones)
    block_types: Set[str] = field(
        default_factory=lambda: {
            PIECE_FLOOR,
            PIECE_WALL,
            PIECE_WALL_HALF,
            PIECE_DOORWAY,
            PIECE_RAMP,
        }
    )

    # ----------------------------------------------------------------- Terrain
    terrain_enabled: bool = False
    height_variation: float = 2.0
    smoothness: float = 0.8
    terrain_width: float = 50.0

    # ------------------------------------------------------------ Road / corridor
    road_mode_enabled: bool = False
    road_width: float = 10.0
    side_placement: str = "both"  # "left", "right", "both", "alternating"

    # ----------------------------------------------------------- Road mesh
    road_mesh_enabled: bool = False
    road_mesh_width: float = 8.0
    road_height_offset: float = 0.05
    road_material_color: Tuple[float, float, float, float] = (0.2, 0.2, 0.2, 1.0)

    # --------------------------------------------------------- Decoration layers
    layers: List[LayerConfig] = field(default_factory=list)

    # ------------------------------------------------------------------ Helpers
    def is_indoor(self) -> bool:
        return self.blockout_style == BlockoutStyle.INDOOR.value

    def is_outdoor(self) -> bool:
        return self.blockout_style == BlockoutStyle.OUTDOOR.value

    def to_dict(self) -> Dict[str, Any]:
        """Convert parameters to dictionary for serialization."""
        return {
            "schema_version": 2,
            # Spline
            "spacing": self.spacing,
            "path_width": self.path_width,
            # Style
            "blockout_style": self.blockout_style,
            # Layout
            "lateral_density": self.lateral_density,
            "space_size_variation": self.space_size_variation,
            "seed": self.seed,
            # Grid
            "grid_size": self.grid_size,
            "wall_height": self.wall_height,
            "path_width_cells": self.path_width_cells,
            "lateral_depth_cells": self.lateral_depth_cells,
            # Elevation
            "elevation_source": self.elevation_source,
            "step_height": self.step_height,
            "max_elevation_steps": self.max_elevation_steps,
            "elevation_smoothing": self.elevation_smoothing,
            # Pieces
            "cover_density": self.cover_density,
            "ramp_slope_cells": self.ramp_slope_cells,
            "use_stairs": self.use_stairs,
            "generate_pillars": self.generate_pillars,
            "piece_overrides": dict(self.piece_overrides),
            "block_types": list(self.block_types),
            # Terrain
            "terrain_enabled": self.terrain_enabled,
            "height_variation": self.height_variation,
            "smoothness": self.smoothness,
            "terrain_width": self.terrain_width,
            # Road
            "road_mode_enabled": self.road_mode_enabled,
            "road_width": self.road_width,
            "side_placement": self.side_placement,
            "road_mesh_enabled": self.road_mesh_enabled,
            "road_mesh_width": self.road_mesh_width,
            "road_height_offset": self.road_height_offset,
            "road_material_color": list(self.road_material_color),
            # Layers
            "layers": [layer.to_dict() for layer in self.layers],
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'GenerationParams':
        """Create GenerationParams from dictionary (handles v1 and v2 schemas)."""
        params = cls()
        # Direct field copies
        for key in (
            "spacing", "path_width", "blockout_style",
            "lateral_density", "space_size_variation", "seed",
            "grid_size", "wall_height", "path_width_cells", "lateral_depth_cells",
            "elevation_source", "step_height", "max_elevation_steps", "elevation_smoothing",
            "cover_density", "ramp_slope_cells", "use_stairs", "generate_pillars",
            "terrain_enabled", "height_variation", "smoothness", "terrain_width",
            "road_mode_enabled", "road_width", "side_placement",
            "road_mesh_enabled", "road_mesh_width", "road_height_offset",
        ):
            if key in data:
                setattr(params, key, data[key])

        if "piece_overrides" in data and isinstance(data["piece_overrides"], dict):
            params.piece_overrides = dict(data["piece_overrides"])

        if "block_types" in data:
            params.block_types = set(data["block_types"])

        if "road_material_color" in data:
            params.road_material_color = tuple(data["road_material_color"])

        if "layers" in data:
            params.layers = [LayerConfig.from_dict(d) for d in data["layers"]]

        # v1 -> v2 migration: old presets only had block_types {wall, floor, platform, ramp}
        # Map 'platform' (legacy) onto WALL_HALF so the visual stays similar.
        if "schema_version" not in data:
            if "block_types" in data:
                legacy = set(data["block_types"])
                mapped = set()
                if "wall" in legacy: mapped.add(PIECE_WALL)
                if "floor" in legacy: mapped.add(PIECE_FLOOR)
                if "ramp" in legacy: mapped.add(PIECE_RAMP)
                if "platform" in legacy: mapped.add(PIECE_WALL_HALF)
                # Always include doorways for indoor migration sanity
                mapped.add(PIECE_DOORWAY)
                params.block_types = mapped

        return params


# ------------------------------------------------------------------ Blender PG

class PCG_HistoryItem(bpy.types.PropertyGroup):
    """Blender PropertyGroup for storing a history state."""
    name: bpy.props.StringProperty(name="Name")
    timestamp: bpy.props.StringProperty(name="Timestamp")
    is_snapshot: bpy.props.BoolProperty(name="Is Snapshot", default=False)
    data_json: bpy.props.StringProperty(name="Data JSON")


class PCG_LayerProperty(bpy.types.PropertyGroup):
    """Blender PropertyGroup for a single decoration layer."""

    name: bpy.props.StringProperty(name="Name", default="New Layer")
    enabled: bpy.props.BoolProperty(name="Enabled", default=True)

    rule: bpy.props.EnumProperty(
        name="Rule",
        items=[
            (PlacementRule.EDGE_LOOP.value, "Edge Loop", "Place along edges"),
            (PlacementRule.FILL_GRID.value, "Fill Grid", "Fill interior space"),
            (PlacementRule.SCATTER.value, "Scatter", "Random scatter"),
            (PlacementRule.CENTER_LINE.value, "Center Line", "Place along center"),
        ],
        default=PlacementRule.EDGE_LOOP.value
    )

    cell_target: bpy.props.EnumProperty(
        name="Target Cells",
        description="Which cells this layer is allowed to populate. "
                    "Default 'Off-Road' keeps the spline corridor clear of "
                    "decoration props so the road stays walkable.",
        items=[
            (CellTarget.OFF_ROAD.value, "Off-Road",
             "Skip path/road cells, decorate side & lateral cells only"),
            (CellTarget.ALL.value, "All Cells",
             "Decorate every cell (legacy behaviour)"),
            (CellTarget.ROAD_ONLY.value, "Road Only",
             "Only decorate path/road cells (lane markings, manholes, debris)"),
            (CellTarget.LATERAL_ONLY.value, "Lateral Only",
             "Only decorate lateral pockets (side rooms / alcoves)"),
        ],
        default=CellTarget.OFF_ROAD.value,
    )

    collection_name: bpy.props.StringProperty(
        name="Asset Collection",
        description="Name of collection containing assets to place"
    )

    density: bpy.props.FloatProperty(name="Density", default=1.0, min=0.1)
    offset: bpy.props.FloatProperty(name="Offset", default=0.0, unit='LENGTH')
    z_offset: bpy.props.FloatProperty(name="Z Offset", default=0.0, unit='LENGTH')

    random_rotation: bpy.props.BoolProperty(name="Random Rotation", default=False)
    random_scale: bpy.props.BoolProperty(name="Random Scale", default=False)
    scale_min: bpy.props.FloatProperty(name="Min Scale", default=0.8, min=0.1)
    scale_max: bpy.props.FloatProperty(name="Max Scale", default=1.2, min=0.1)


class PCG_PropertyGroup(bpy.types.PropertyGroup):
    """Blender PropertyGroup for storing parameters in scene data."""

    # ---- Spline
    spline_object: bpy.props.PointerProperty(
        name="Spline Object",
        description="Curve object that defines the level path",
        type=bpy.types.Object,
        poll=lambda self, obj: obj.type == 'CURVE'
    )

    spacing: bpy.props.FloatProperty(
        name="Spacing",
        description="Sample interval along the spline (smaller = denser corridor)",
        default=4.0, min=0.5, unit='LENGTH'
    )

    path_width: bpy.props.FloatProperty(
        name="Path Width",
        description="Legacy continuous corridor width (informational only; "
                    "actual width comes from Path Width Cells)",
        default=16.0, min=5.0, unit='LENGTH'
    )

    # ---- Blockout style (TOP-LEVEL CONTROL)
    blockout_style: bpy.props.EnumProperty(
        name="Blockout Style",
        description="Top-level style driving every generation pass",
        items=[
            (BlockoutStyle.OUTDOOR.value, "Outdoor / Open",
             "Open platforms, cover walls on drops, no enforced doorways. "
             "Good for parkour, city streets, outdoor combat zones."),
            (BlockoutStyle.INDOOR.value, "Indoor / Dungeon",
             "Enclosed rooms with full walls. Doorways cut between connected "
             "neighbors. Good for interiors, dungeons, base layouts."),
        ],
        default=BlockoutStyle.OUTDOOR.value
    )

    # ---- Layout
    lateral_density: bpy.props.FloatProperty(
        name="Lateral Density",
        description="How often extra cells branch off the main corridor (0.0=none, 1.0=max)",
        default=0.3, min=0.0, max=1.0, subtype='FACTOR'
    )

    space_size_variation: bpy.props.FloatProperty(
        name="Size Variation",
        description="Variance in lateral pocket depth (0.0=uniform, 1.0=high variance)",
        default=0.3, min=0.0, max=1.0, subtype='FACTOR'
    )

    seed: bpy.props.IntProperty(
        name="Seed",
        description="Random seed for reproducible generation (0 = random)",
        default=0, min=0
    )

    randomize_on_generate: bpy.props.BoolProperty(
        name="Randomize on Generate",
        description="Generate a new random seed every time",
        default=False
    )

    randomize_params_with_seed: bpy.props.BoolProperty(
        name="Randomize Parameters",
        description="Randomize all parameters when randomizing seed",
        default=True
    )

    # ---- Granular randomization toggles
    random_include_spacing: bpy.props.BoolProperty(name="Spacing", default=True)
    random_include_width: bpy.props.BoolProperty(name="Path Width", default=True)
    random_include_density: bpy.props.BoolProperty(name="Lateral Density", default=True)
    random_include_variation: bpy.props.BoolProperty(name="Size Variation", default=True)
    random_include_grid: bpy.props.BoolProperty(name="Grid Size", default=True)
    random_include_height: bpy.props.BoolProperty(name="Wall Height", default=True)
    random_include_elevation: bpy.props.BoolProperty(name="Elevation", default=True)
    random_include_terrain: bpy.props.BoolProperty(name="Terrain", default=True)
    random_include_road: bpy.props.BoolProperty(name="Road Mode", default=True)

    # ---- Grid model
    grid_size: bpy.props.FloatProperty(
        name="Grid Size",
        description="Footprint of a single cell (X & Y, in meters)",
        default=4.0, min=0.5, max=16.0, unit='LENGTH'
    )

    wall_height: bpy.props.FloatProperty(
        name="Wall Height",
        description="Vertical extent of full-height walls",
        default=3.0, min=1.0, unit='LENGTH'
    )

    path_width_cells: bpy.props.IntProperty(
        name="Path Width (cells)",
        description="Number of cells across the main corridor",
        default=1, min=1, max=8
    )

    lateral_depth_cells: bpy.props.IntProperty(
        name="Lateral Depth (cells)",
        description="Number of cells branches extend sideways from the corridor",
        default=1, min=0, max=6
    )

    # ---- Elevation
    elevation_source: bpy.props.EnumProperty(
        name="Elevation Source",
        description="How per-cell elevation is computed",
        items=[
            (ElevationSource.FLAT.value, "Flat",
             "All cells at z=0 (no ramps generated)"),
            (ElevationSource.RANDOM_SMOOTHED.value, "Random + Smooth",
             "Random per-cell elevation smoothed across neighbors. "
             "Best for varied indoor dungeons."),
            (ElevationSource.SPLINE_Z.value, "Follow Spline Z",
             "Read elevation from the spline; side cells inherit nearest path "
             "cell. Best for outdoor terrain-following layouts."),
        ],
        default=ElevationSource.SPLINE_Z.value
    )

    step_height: bpy.props.FloatProperty(
        name="Step Height",
        description="Vertical size of one elevation step",
        default=1.5, min=0.25, max=10.0, unit='LENGTH'
    )

    max_elevation_steps: bpy.props.IntProperty(
        name="Max Steps",
        description="Maximum elevation steps a cell can rise above base",
        default=2, min=0, max=10
    )

    elevation_smoothing: bpy.props.IntProperty(
        name="Smoothing Passes",
        description="Neighbor-averaging passes for elevation (0 = jagged)",
        default=2, min=0, max=8
    )

    # ---- Blockout piece toggles
    block_type_floor: bpy.props.BoolProperty(name="Floors", default=True)
    block_type_wall: bpy.props.BoolProperty(name="Walls", default=True)
    block_type_wall_half: bpy.props.BoolProperty(name="Cover", default=True)
    block_type_doorway: bpy.props.BoolProperty(name="Doorways", default=True)
    block_type_ramp: bpy.props.BoolProperty(name="Ramps", default=True)
    block_type_stairs: bpy.props.BoolProperty(name="Stairs", default=False)
    block_type_pillar: bpy.props.BoolProperty(name="Pillars", default=False)

    cover_density: bpy.props.FloatProperty(
        name="Cover Density",
        description="Chance an exposed elevation drop becomes a cover wall "
                    "(0=open edge, 1=always cover)",
        default=0.6, min=0.0, max=1.0, subtype='FACTOR'
    )

    ramp_slope_cells: bpy.props.IntProperty(
        name="Ramp Length",
        description="Number of cells a single-step ramp spans (1 = steep, 3 = gentle)",
        default=1, min=1, max=4
    )

    use_stairs: bpy.props.BoolProperty(
        name="Use Stairs Instead of Ramps",
        description="Replace generated ramps with stepped stairs",
        default=False
    )

    generate_pillars: bpy.props.BoolProperty(
        name="Generate Pillars",
        description="Add pillars at room corners (indoor style)",
        default=False
    )

    # Per-piece collection overrides (designer assets)
    piece_override_floor: bpy.props.StringProperty(name="Floor", default="")
    piece_override_wall: bpy.props.StringProperty(name="Wall", default="")
    piece_override_wall_half: bpy.props.StringProperty(name="Cover", default="")
    piece_override_doorway: bpy.props.StringProperty(name="Doorway", default="")
    piece_override_ramp: bpy.props.StringProperty(name="Ramp", default="")
    piece_override_stairs: bpy.props.StringProperty(name="Stairs", default="")
    piece_override_pillar: bpy.props.StringProperty(name="Pillar", default="")

    # ---- Terrain
    terrain_enabled: bpy.props.BoolProperty(name="Enable Terrain", default=False)
    height_variation: bpy.props.FloatProperty(
        name="Height Variation", default=2.0, min=0.0, unit='LENGTH'
    )
    smoothness: bpy.props.FloatProperty(
        name="Smoothness", default=0.8, min=0.0, max=1.0, subtype='FACTOR'
    )
    terrain_width: bpy.props.FloatProperty(
        name="Terrain Width", default=50.0, min=10.0, unit='LENGTH'
    )

    # ---- Preview
    show_preview_labels: bpy.props.BoolProperty(
        name="Show Metric Labels", default=True
    )
    show_path_guide: bpy.props.BoolProperty(
        name="Show Path Guide", default=False
    )

    # ---- Road mode (used by spline rasterizer to skip center cells)
    road_mode_enabled: bpy.props.BoolProperty(
        name="Road Mode",
        description="Clear the centre corridor (road) and place blockout cells on the sides",
        default=False
    )

    road_width: bpy.props.FloatProperty(
        name="Road Width", default=8.0, min=2.0, unit='LENGTH'
    )
    road_mesh_width: bpy.props.FloatProperty(
        name="Road Mesh Width", default=8.0, min=2.0, unit='LENGTH'
    )
    side_placement: bpy.props.EnumProperty(
        name="Side",
        items=[
            ('LEFT', "Left", ""),
            ('RIGHT', "Right", ""),
            ('BOTH', "Both", ""),
            ('ALTERNATING', "Alternating", ""),
        ],
        default='BOTH'
    )

    # ---- Road mesh
    road_mesh_enabled: bpy.props.BoolProperty(name="Enable Road Mesh", default=False)
    road_height_offset: bpy.props.FloatProperty(
        name="Road Z Offset", default=0.05, min=0.0, unit='LENGTH'
    )
    road_material_color: bpy.props.FloatVectorProperty(
        name="Road Color", subtype='COLOR',
        default=(0.2, 0.2, 0.2, 1.0), size=4, min=0.0, max=1.0
    )

    # ---- Decoration layers
    layers: bpy.props.CollectionProperty(type=PCG_LayerProperty)
    active_layer_index: bpy.props.IntProperty(name="Active Layer Index", default=0)

    # ---- History
    history: bpy.props.CollectionProperty(type=PCG_HistoryItem)
    active_history_index: bpy.props.IntProperty(name="Active History Index", default=-1)

    # ---------------------------------------------------------------- to_data
    def _collect_block_types(self) -> Set[str]:
        result: Set[str] = set()
        if self.block_type_floor:     result.add(PIECE_FLOOR)
        if self.block_type_wall:      result.add(PIECE_WALL)
        if self.block_type_wall_half: result.add(PIECE_WALL_HALF)
        if self.block_type_doorway:   result.add(PIECE_DOORWAY)
        if self.block_type_ramp:      result.add(PIECE_RAMP)
        if self.block_type_stairs:    result.add(PIECE_STAIRS)
        if self.block_type_pillar:    result.add(PIECE_PILLAR)
        return result

    def _collect_piece_overrides(self) -> Dict[str, str]:
        return {
            PIECE_FLOOR:     self.piece_override_floor,
            PIECE_WALL:      self.piece_override_wall,
            PIECE_WALL_HALF: self.piece_override_wall_half,
            PIECE_DOORWAY:   self.piece_override_doorway,
            PIECE_RAMP:      self.piece_override_ramp,
            PIECE_STAIRS:    self.piece_override_stairs,
            PIECE_PILLAR:    self.piece_override_pillar,
        }

    def to_generation_params(self) -> GenerationParams:
        """Convert PropertyGroup to GenerationParams dataclass."""
        return GenerationParams(
            spline_object=self.spline_object,
            spacing=self.spacing,
            path_width=self.path_width,
            blockout_style=self.blockout_style,
            lateral_density=self.lateral_density,
            space_size_variation=self.space_size_variation,
            seed=self.seed if self.seed > 0 else None,
            grid_size=self.grid_size,
            wall_height=self.wall_height,
            path_width_cells=self.path_width_cells,
            lateral_depth_cells=self.lateral_depth_cells,
            elevation_source=self.elevation_source,
            step_height=self.step_height,
            max_elevation_steps=self.max_elevation_steps,
            elevation_smoothing=self.elevation_smoothing,
            cover_density=self.cover_density,
            ramp_slope_cells=self.ramp_slope_cells,
            use_stairs=self.use_stairs,
            generate_pillars=self.generate_pillars,
            piece_overrides=self._collect_piece_overrides(),
            block_types=self._collect_block_types(),
            terrain_enabled=self.terrain_enabled,
            height_variation=self.height_variation,
            smoothness=self.smoothness,
            terrain_width=self.terrain_width,
            road_mode_enabled=self.road_mode_enabled,
            road_width=self.road_width,
            side_placement=self.side_placement.lower(),
            road_mesh_enabled=self.road_mesh_enabled,
            road_mesh_width=self.road_mesh_width,
            road_height_offset=self.road_height_offset,
            road_material_color=tuple(self.road_material_color),
            layers=self._get_layer_configs()
        )

    def _get_layer_configs(self) -> List[LayerConfig]:
        configs = []
        for layer in self.layers:
            try:
                target = CellTarget(layer.cell_target)
            except (ValueError, AttributeError):
                target = CellTarget.OFF_ROAD
            configs.append(LayerConfig(
                name=layer.name,
                enabled=layer.enabled,
                rule=PlacementRule(layer.rule),
                collection_name=layer.collection_name,
                density=layer.density,
                offset=layer.offset,
                z_offset=layer.z_offset,
                cell_target=target,
                random_rotation=layer.random_rotation,
                random_scale=layer.random_scale,
                scale_min=layer.scale_min,
                scale_max=layer.scale_max,
            ))
        return configs

    def to_dict(self) -> Dict[str, Any]:
        data = self.to_generation_params().to_dict()
        data["randomize_params_with_seed"] = self.randomize_params_with_seed
        return data


# ------------------------------------------------------------------- register

def register():
    bpy.utils.register_class(PCG_HistoryItem)
    bpy.utils.register_class(PCG_LayerProperty)
    bpy.utils.register_class(PCG_PropertyGroup)
    bpy.types.Scene.pcg_props = bpy.props.PointerProperty(type=PCG_PropertyGroup)


def unregister():
    del bpy.types.Scene.pcg_props
    bpy.utils.unregister_class(PCG_PropertyGroup)
    bpy.utils.unregister_class(PCG_LayerProperty)
    bpy.utils.unregister_class(PCG_HistoryItem)


# ----------------------------------------------------------------- defaults

class ParameterDefaults:
    """Default values for all generation parameters."""

    SPACING = 4.0
    PATH_WIDTH = 16.0
    BLOCKOUT_STYLE = BlockoutStyle.OUTDOOR.value
    LATERAL_DENSITY = 0.3
    SPACE_SIZE_VARIATION = 0.3
    SEED = None
    GRID_SIZE = 4.0
    WALL_HEIGHT = 3.0
    PATH_WIDTH_CELLS = 1
    LATERAL_DEPTH_CELLS = 1
    ELEVATION_SOURCE = ElevationSource.SPLINE_Z.value
    STEP_HEIGHT = 1.5
    MAX_ELEVATION_STEPS = 2
    ELEVATION_SMOOTHING = 2
    COVER_DENSITY = 0.6
    RAMP_SLOPE_CELLS = 1
    USE_STAIRS = False
    GENERATE_PILLARS = False
    BLOCK_TYPES = {PIECE_FLOOR, PIECE_WALL, PIECE_WALL_HALF, PIECE_DOORWAY, PIECE_RAMP}
    TERRAIN_ENABLED = False
    HEIGHT_VARIATION = 2.0
    SMOOTHNESS = 0.8
    TERRAIN_WIDTH = 50.0

    @classmethod
    def get_default_params(cls) -> GenerationParams:
        return GenerationParams(
            spline_object=None,
            spacing=cls.SPACING,
            path_width=cls.PATH_WIDTH,
            blockout_style=cls.BLOCKOUT_STYLE,
            lateral_density=cls.LATERAL_DENSITY,
            space_size_variation=cls.SPACE_SIZE_VARIATION,
            seed=cls.SEED,
            grid_size=cls.GRID_SIZE,
            wall_height=cls.WALL_HEIGHT,
            path_width_cells=cls.PATH_WIDTH_CELLS,
            lateral_depth_cells=cls.LATERAL_DEPTH_CELLS,
            elevation_source=cls.ELEVATION_SOURCE,
            step_height=cls.STEP_HEIGHT,
            max_elevation_steps=cls.MAX_ELEVATION_STEPS,
            elevation_smoothing=cls.ELEVATION_SMOOTHING,
            cover_density=cls.COVER_DENSITY,
            ramp_slope_cells=cls.RAMP_SLOPE_CELLS,
            use_stairs=cls.USE_STAIRS,
            generate_pillars=cls.GENERATE_PILLARS,
            block_types=cls.BLOCK_TYPES.copy(),
            terrain_enabled=cls.TERRAIN_ENABLED,
            height_variation=cls.HEIGHT_VARIATION,
            smoothness=cls.SMOOTHNESS,
            terrain_width=cls.TERRAIN_WIDTH,
        )


class ValidationError(Exception):
    """Exception raised when parameter validation fails."""
    pass


class ParameterValidator:
    """Validates generation parameters and provides error messages."""

    @staticmethod
    def validate_spacing(spacing: float) -> tuple[bool, str]:
        if spacing <= 0: return False, "Spacing must be greater than 0"
        if spacing > 100: return False, "Spacing must be 100 or less"
        return True, ""

    @staticmethod
    def validate_path_width(path_width: float) -> tuple[bool, str]:
        if path_width < 5.0: return False, "Path width must be at least 5.0"
        if path_width > 100.0: return False, "Path width must be 100.0 or less"
        return True, ""

    @staticmethod
    def validate_lateral_density(v: float) -> tuple[bool, str]:
        if v < 0.0 or v > 1.0: return False, "Lateral density must be between 0.0 and 1.0"
        return True, ""

    @staticmethod
    def validate_space_size_variation(v: float) -> tuple[bool, str]:
        if v < 0.0 or v > 1.0: return False, "Size variation must be between 0.0 and 1.0"
        return True, ""

    @staticmethod
    def validate_grid_size(v: float) -> tuple[bool, str]:
        if v < 0.5: return False, "Grid size must be at least 0.5"
        if v > 16.0: return False, "Grid size must be 16.0 or less"
        return True, ""

    @staticmethod
    def validate_wall_height(v: float) -> tuple[bool, str]:
        if v < 1.0: return False, "Wall height must be at least 1.0"
        if v > 20.0: return False, "Wall height must be 20.0 or less"
        return True, ""

    @staticmethod
    def validate_step_height(v: float) -> tuple[bool, str]:
        if v < 0.1: return False, "Step height must be at least 0.1"
        if v > 10.0: return False, "Step height must be 10.0 or less"
        return True, ""

    @staticmethod
    def validate_height_variation(v: float) -> tuple[bool, str]:
        if v < 0.0: return False, "Height variation must be 0.0 or greater"
        if v > 50.0: return False, "Height variation must be 50.0 or less"
        return True, ""

    @staticmethod
    def validate_smoothness(v: float) -> tuple[bool, str]:
        if v < 0.0 or v > 1.0: return False, "Smoothness must be between 0.0 and 1.0"
        return True, ""

    @staticmethod
    def validate_terrain_width(v: float) -> tuple[bool, str]:
        if v < 10.0: return False, "Terrain width must be at least 10.0"
        if v > 200.0: return False, "Terrain width must be 200.0 or less"
        return True, ""

    @staticmethod
    def validate_spline_object(spline_object) -> tuple[bool, str]:
        if spline_object is None: return False, "No spline object selected"
        if spline_object.type != 'CURVE': return False, "Selected object must be a curve/spline"
        if not spline_object.data.splines: return False, "Curve object has no splines"
        return True, ""

    @staticmethod
    def validate_block_types(block_types: Set[str]) -> tuple[bool, str]:
        if not block_types:
            return False, "At least one piece type must be selected"
        invalid = block_types - set(ALL_PIECE_TYPES)
        if invalid:
            return False, f"Invalid piece types: {', '.join(invalid)}"
        return True, ""

    @classmethod
    def validate_all(cls, params: GenerationParams) -> tuple[bool, list[str]]:
        errors = []

        valid, msg = cls.validate_spline_object(params.spline_object)
        if not valid: errors.append(msg)

        validators = [
            (cls.validate_spacing, params.spacing, "spacing"),
            (cls.validate_path_width, params.path_width, "path_width"),
            (cls.validate_lateral_density, params.lateral_density, "lateral_density"),
            (cls.validate_space_size_variation, params.space_size_variation,
             "space_size_variation"),
            (cls.validate_grid_size, params.grid_size, "grid_size"),
            (cls.validate_wall_height, params.wall_height, "wall_height"),
            (cls.validate_step_height, params.step_height, "step_height"),
            (cls.validate_height_variation, params.height_variation, "height_variation"),
            (cls.validate_smoothness, params.smoothness, "smoothness"),
            (cls.validate_terrain_width, params.terrain_width, "terrain_width"),
        ]
        for fn, value, name in validators:
            ok, msg = fn(value)
            if not ok: errors.append(f"{name}: {msg}")

        ok, msg = cls.validate_block_types(params.block_types)
        if not ok: errors.append(msg)

        return len(errors) == 0, errors

    @classmethod
    def validate_and_raise(cls, params: GenerationParams):
        ok, errors = cls.validate_all(params)
        if not ok:
            error_msg = "Parameter validation failed:\n" + "\n".join(f"  - {e}" for e in errors)
            raise ValidationError(error_msg)
