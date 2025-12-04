"""Parameter validation and defaults for PCG Level Blockout addon."""

import bpy
from dataclasses import dataclass, field
from typing import Set, Optional, Tuple, List, Dict, Any
from .layer_system import PlacementRule, LayerConfig


@dataclass
class GenerationParams:
    """Data structure for all generation parameters."""
    
    # Spline parameters
    spline_object: Optional[bpy.types.Object] = None
    spacing: float = 10.0  # Distance between spaces along spline
    path_width: float = 20.0  # Width of generation area around spline
    
    # Layout parameters
    lateral_density: float = 0.5  # How many spaces branch off main path (0.0-1.0)
    space_size_variation: float = 0.3  # Variation in space sizes (0.0-1.0)
    seed: Optional[int] = None
    
    # Building block parameters
    grid_size: float = 2.0  # Grid alignment size in meters
    wall_height: float = 3.0  # Default wall height in meters
    block_types: Set[str] = field(default_factory=lambda: {"wall", "floor", "platform", "ramp"})
    
    # Terrain parameters
    terrain_enabled: bool = True
    height_variation: float = 10.0  # Maximum terrain height variation in meters
    smoothness: float = 0.5  # Terrain smoothness (0.0-1.0)
    terrain_width: float = 50.0  # Width of terrain around spline
    
    # Road mode parameters
    road_mode_enabled: bool = False  # Enable road mode (buildings on sides)
    road_width: float = 10.0  # Width of clear path in road mode
    side_placement: str = "both"  # "left", "right", "both", "alternating"
    
    # V2 Layer System
    layers: List[LayerConfig] = field(default_factory=list)


class PCG_LayerProperty(bpy.types.PropertyGroup):
    """Blender PropertyGroup for a single generation layer."""
    
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
    
    collection_name: bpy.props.StringProperty(
        name="Asset Collection",
        description="Name of collection containing assets to place"
    )
    
    density: bpy.props.FloatProperty(name="Density", default=1.0, min=0.1, max=10.0)
    offset: bpy.props.FloatProperty(name="Offset", default=0.0, unit='LENGTH')
    z_offset: bpy.props.FloatProperty(name="Z Offset", default=0.0, unit='LENGTH')
    
    random_rotation: bpy.props.BoolProperty(name="Random Rotation", default=False)
    random_scale: bpy.props.BoolProperty(name="Random Scale", default=False)
    scale_min: bpy.props.FloatProperty(name="Min Scale", default=0.8, min=0.1)
    scale_max: bpy.props.FloatProperty(name="Max Scale", default=1.2, min=0.1)


class PCG_PropertyGroup(bpy.types.PropertyGroup):
    """Blender PropertyGroup for storing parameters in scene data."""
    
    # Spline parameters
    spline_object: bpy.props.PointerProperty(
        name="Spline Object",
        description="Curve object that defines the level path",
        type=bpy.types.Object,
        poll=lambda self, obj: obj.type == 'CURVE'
    )
    
    spacing: bpy.props.FloatProperty(
        name="Spacing",
        description="Distance between spaces along the spline path",
        default=3.0,
        min=1.0,
        max=100.0,
        unit='LENGTH'
    )
    
    path_width: bpy.props.FloatProperty(
        name="Path Width",
        description="Width of the generation area around the spline",
        default=8.0,
        min=5.0,
        max=100.0,
        unit='LENGTH'
    )
    
    # Layout parameters
    lateral_density: bpy.props.FloatProperty(
        name="Lateral Density",
        description="How many spaces branch off the main path (0.0 = none, 1.0 = maximum)",
        default=0.0,
        min=0.0,
        max=1.0,
        subtype='FACTOR'
    )
    
    space_size_variation: bpy.props.FloatProperty(
        name="Space Size Variation",
        description="Amount of variation in space sizes (0.0 = uniform, 1.0 = maximum variation)",
        default=0.6,
        min=0.0,
        max=1.0,
        subtype='FACTOR'
    )
    
    seed: bpy.props.IntProperty(
        name="Seed",
        description="Random seed for reproducible generation (0 = random)",
        default=0,
        min=0
    )

    randomize_on_generate: bpy.props.BoolProperty(
        name="Randomize on Generate",
        description="Generate a new random seed every time",
        default=False
    )
    
    # Building block parameters
    grid_size: bpy.props.FloatProperty(
        name="Grid Size",
        description="Size of the grid for aligning building blocks",
        default=2.0,
        min=0.5,
        max=10.0,
        unit='LENGTH'
    )
    
    wall_height: bpy.props.FloatProperty(
        name="Wall Height",
        description="Default height for wall blocks",
        default=4.0,
        min=1.0,
        max=20.0,
        unit='LENGTH'
    )
    
    # Block type toggles
    block_type_wall: bpy.props.BoolProperty(
        name="Walls",
        description="Generate wall blocks",
        default=True
    )
    
    block_type_floor: bpy.props.BoolProperty(
        name="Floors",
        description="Generate floor blocks",
        default=True
    )
    
    block_type_platform: bpy.props.BoolProperty(
        name="Platforms",
        description="Generate platform blocks",
        default=True
    )
    
    block_type_ramp: bpy.props.BoolProperty(
        name="Ramps",
        description="Generate ramp blocks",
        default=True
    )
    
    # Terrain parameters
    terrain_enabled: bpy.props.BoolProperty(
        name="Enable Terrain",
        description="Generate terrain along the spline path",
        default=True
    )
    
    height_variation: bpy.props.FloatProperty(
        name="Height Variation",
        description="Maximum terrain height variation",
        default=2.0,
        min=0.0,
        max=50.0,
        unit='LENGTH'
    )
    
    smoothness: bpy.props.FloatProperty(
        name="Smoothness",
        description="Terrain smoothness (0.0 = rough, 1.0 = smooth)",
        default=0.8,
        min=0.0,
        max=1.0,
        subtype='FACTOR'
    )
    
    terrain_width: bpy.props.FloatProperty(
        name="Terrain Width",
        description="Width of terrain generation around the spline",
        default=50.0,
        min=10.0,
        max=200.0,
        unit='LENGTH'
    )
    
    # Preview options
    show_preview_labels: bpy.props.BoolProperty(
        name="Show Metric Labels",
        description="Display measurement labels in preview",
        default=True
    )
    
    show_path_guide: bpy.props.BoolProperty(
        name="Show Path Guide",
        description="Display the path width visualization tube",
        default=False  # Disabled by default since it can be confusing
    )
    
    # Road mode parameters
    road_mode_enabled: bpy.props.BoolProperty(
        name="Road Mode",
        description="Generate buildings on sides of path instead of centered",
        default=True
    )
    
    road_width: bpy.props.FloatProperty(
        name="Road Width",
        description="Width of clear path in road mode",
        default=8.0,
        min=2.0,
        max=50.0,
        unit='LENGTH'
    )
    
    side_placement: bpy.props.EnumProperty(
        name="Side",
        description="Which side(s) to place buildings on",
        items=[
            ('LEFT', "Left", "Place buildings on left side only"),
            ('RIGHT', "Right", "Place buildings on right side only"),
            ('BOTH', "Both", "Place buildings on both sides"),
            ('ALTERNATING', "Alternating", "Alternate between left and right")
        ],
        default='BOTH'
    )
    
    # V2 Layer System
    layers: bpy.props.CollectionProperty(type=PCG_LayerProperty)
    active_layer_index: bpy.props.IntProperty(name="Active Layer Index", default=0)
    
    def to_generation_params(self) -> GenerationParams:
        """Convert PropertyGroup to GenerationParams dataclass."""
        block_types = set()
        if self.block_type_wall:
            block_types.add("wall")
        if self.block_type_floor:
            block_types.add("floor")
        if self.block_type_platform:
            block_types.add("platform")
        if self.block_type_ramp:
            block_types.add("ramp")
        
        return GenerationParams(
            spline_object=self.spline_object,
            spacing=self.spacing,
            path_width=self.path_width,
            lateral_density=self.lateral_density,
            space_size_variation=self.space_size_variation,
            seed=self.seed if self.seed > 0 else None,
            grid_size=self.grid_size,
            wall_height=self.wall_height,
            block_types=block_types,
            terrain_enabled=self.terrain_enabled,
            height_variation=self.height_variation,
            smoothness=self.smoothness,
            terrain_width=self.terrain_width,
            road_mode_enabled=self.road_mode_enabled,
            road_width=self.road_width,
            side_placement=self.side_placement.lower(),
            layers=self._get_layer_configs()
        )

    def _get_layer_configs(self) -> List[LayerConfig]:
        """Convert Blender layer properties to LayerConfig objects."""
        configs = []
        for layer in self.layers:
            config = LayerConfig(
                name=layer.name,
                enabled=layer.enabled,
                rule=PlacementRule(layer.rule),
                collection_name=layer.collection_name,
                density=layer.density,
                offset=layer.offset,
                z_offset=layer.z_offset,
                random_rotation=layer.random_rotation,
                random_scale=layer.random_scale,
                scale_min=layer.scale_min,
                scale_max=layer.scale_max
            )
            configs.append(config)
        return configs

    def to_dict(self) -> Dict[str, Any]:
        """Convert parameters to dictionary for serialization."""
        # Convert layers to dict list
        layers_data = []
        for layer in self.layers:
            layers_data.append({
                "name": layer.name,
                "enabled": layer.enabled,
                "rule": layer.rule.value,
                "collection_name": layer.collection_name,
                "density": layer.density,
                "offset": layer.offset,
                "z_offset": layer.z_offset,
                "random_rotation": layer.random_rotation,
                "random_scale": layer.random_scale,
                "scale_min": layer.scale_min,
                "scale_max": layer.scale_max
            })

        return {
            "spacing": self.spacing,
            "path_width": self.path_width,
            "lateral_density": self.lateral_density,
            "space_size_variation": self.space_size_variation,
            "seed": self.seed,
            "grid_size": self.grid_size,
            "wall_height": self.wall_height,
            "block_types": list(self.block_types),
            "terrain_enabled": self.terrain_enabled,
            "height_variation": self.height_variation,
            "smoothness": self.smoothness,
            "terrain_width": self.terrain_width,
            "road_mode_enabled": self.road_mode_enabled,
            "road_width": self.road_width,
            "side_placement": self.side_placement,
            "layers": layers_data
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'GenerationParams':
        """Create GenerationParams from dictionary."""
        params = cls()
        
        if "spacing" in data: params.spacing = data["spacing"]
        if "path_width" in data: params.path_width = data["path_width"]
        if "lateral_density" in data: params.lateral_density = data["lateral_density"]
        if "space_size_variation" in data: params.space_size_variation = data["space_size_variation"]
        if "seed" in data: params.seed = data["seed"]
        if "grid_size" in data: params.grid_size = data["grid_size"]
        if "wall_height" in data: params.wall_height = data["wall_height"]
        if "block_types" in data: params.block_types = set(data["block_types"])
        if "terrain_enabled" in data: params.terrain_enabled = data["terrain_enabled"]
        if "height_variation" in data: params.height_variation = data["height_variation"]
        if "smoothness" in data: params.smoothness = data["smoothness"]
        if "terrain_width" in data: params.terrain_width = data["terrain_width"]
        if "road_mode_enabled" in data: params.road_mode_enabled = data["road_mode_enabled"]
        if "road_width" in data: params.road_width = data["road_width"]
        if "side_placement" in data: params.side_placement = data["side_placement"]
        
        if "layers" in data:
            params.layers = []
            for layer_data in data["layers"]:
                # Handle potential missing keys with defaults
                config = LayerConfig(
                    name=layer_data.get("name", "Layer"),
                    enabled=layer_data.get("enabled", True),
                    rule=PlacementRule(layer_data.get("rule", "edge_loop")),
                    collection_name=layer_data.get("collection_name", ""),
                    density=layer_data.get("density", 1.0),
                    offset=layer_data.get("offset", 0.0),
                    z_offset=layer_data.get("z_offset", 0.0),
                    random_rotation=layer_data.get("random_rotation", False),
                    random_scale=layer_data.get("random_scale", False),
                    scale_min=layer_data.get("scale_min", 0.8),
                    scale_max=layer_data.get("scale_max", 1.2)
                )
                params.layers.append(config)
        
        return params


def register():
    """Register PropertyGroup with Blender."""
    bpy.utils.register_class(PCG_LayerProperty)
    bpy.utils.register_class(PCG_PropertyGroup)
    bpy.types.Scene.pcg_props = bpy.props.PointerProperty(type=PCG_PropertyGroup)


def unregister():
    """Unregister PropertyGroup from Blender."""
    del bpy.types.Scene.pcg_props
    bpy.utils.unregister_class(PCG_PropertyGroup)
    bpy.utils.unregister_class(PCG_LayerProperty)



class ParameterDefaults:
    """Default values for all generation parameters."""
    
    # Spline parameters
    SPACING = 10.0
    PATH_WIDTH = 20.0
    
    # Layout parameters
    LATERAL_DENSITY = 0.5
    SPACE_SIZE_VARIATION = 0.3
    SEED = None
    
    # Building block parameters
    GRID_SIZE = 2.0
    WALL_HEIGHT = 3.0
    BLOCK_TYPES = {"wall", "floor", "platform", "ramp"}
    
    # Terrain parameters
    TERRAIN_ENABLED = True
    HEIGHT_VARIATION = 10.0
    SMOOTHNESS = 0.5
    TERRAIN_WIDTH = 50.0
    
    @classmethod
    def get_default_params(cls) -> GenerationParams:
        """Get a GenerationParams instance with all default values."""
        return GenerationParams(
            spline_object=None,
            spacing=cls.SPACING,
            path_width=cls.PATH_WIDTH,
            lateral_density=cls.LATERAL_DENSITY,
            space_size_variation=cls.SPACE_SIZE_VARIATION,
            seed=cls.SEED,
            grid_size=cls.GRID_SIZE,
            wall_height=cls.WALL_HEIGHT,
            block_types=cls.BLOCK_TYPES.copy(),
            terrain_enabled=cls.TERRAIN_ENABLED,
            height_variation=cls.HEIGHT_VARIATION,
            smoothness=cls.SMOOTHNESS,
            terrain_width=cls.TERRAIN_WIDTH
        )


class ValidationError(Exception):
    """Exception raised when parameter validation fails."""
    pass


class ParameterValidator:
    """Validates generation parameters and provides error messages."""
    
    @staticmethod
    def validate_spacing(spacing: float) -> tuple[bool, str]:
        """Validate spacing parameter."""
        if spacing <= 0:
            return False, "Spacing must be greater than 0"
        if spacing > 100:
            return False, "Spacing must be 100 or less"
        return True, ""
    
    @staticmethod
    def validate_path_width(path_width: float) -> tuple[bool, str]:
        """Validate path_width parameter."""
        if path_width < 5.0:
            return False, "Path width must be at least 5.0"
        if path_width > 100.0:
            return False, "Path width must be 100.0 or less"
        return True, ""
    
    @staticmethod
    def validate_lateral_density(lateral_density: float) -> tuple[bool, str]:
        """Validate lateral_density parameter."""
        if lateral_density < 0.0 or lateral_density > 1.0:
            return False, "Lateral density must be between 0.0 and 1.0"
        return True, ""
    
    @staticmethod
    def validate_space_size_variation(space_size_variation: float) -> tuple[bool, str]:
        """Validate space_size_variation parameter."""
        if space_size_variation < 0.0 or space_size_variation > 1.0:
            return False, "Space size variation must be between 0.0 and 1.0"
        return True, ""
    
    @staticmethod
    def validate_grid_size(grid_size: float) -> tuple[bool, str]:
        """Validate grid_size parameter."""
        if grid_size < 0.5:
            return False, "Grid size must be at least 0.5"
        if grid_size > 10.0:
            return False, "Grid size must be 10.0 or less"
        return True, ""
    
    @staticmethod
    def validate_wall_height(wall_height: float) -> tuple[bool, str]:
        """Validate wall_height parameter."""
        if wall_height < 1.0:
            return False, "Wall height must be at least 1.0"
        if wall_height > 20.0:
            return False, "Wall height must be 20.0 or less"
        return True, ""
    
    @staticmethod
    def validate_height_variation(height_variation: float) -> tuple[bool, str]:
        """Validate height_variation parameter."""
        if height_variation < 0.0:
            return False, "Height variation must be 0.0 or greater"
        if height_variation > 50.0:
            return False, "Height variation must be 50.0 or less"
        return True, ""
    
    @staticmethod
    def validate_smoothness(smoothness: float) -> tuple[bool, str]:
        """Validate smoothness parameter."""
        if smoothness < 0.0 or smoothness > 1.0:
            return False, "Smoothness must be between 0.0 and 1.0"
        return True, ""
    
    @staticmethod
    def validate_terrain_width(terrain_width: float) -> tuple[bool, str]:
        """Validate terrain_width parameter."""
        if terrain_width < 10.0:
            return False, "Terrain width must be at least 10.0"
        if terrain_width > 200.0:
            return False, "Terrain width must be 200.0 or less"
        return True, ""
    
    @staticmethod
    def validate_spline_object(spline_object) -> tuple[bool, str]:
        """Validate spline_object parameter."""
        if spline_object is None:
            return False, "No spline object selected"
        if spline_object.type != 'CURVE':
            return False, "Selected object must be a curve/spline"
        if not spline_object.data.splines:
            return False, "Curve object has no splines"
        return True, ""
    
    @staticmethod
    def validate_block_types(block_types: Set[str]) -> tuple[bool, str]:
        """Validate block_types parameter."""
        valid_types = {"wall", "floor", "platform", "ramp"}
        if not block_types:
            return False, "At least one block type must be selected"
        invalid_types = block_types - valid_types
        if invalid_types:
            return False, f"Invalid block types: {', '.join(invalid_types)}"
        return True, ""
    
    @classmethod
    def validate_all(cls, params: GenerationParams) -> tuple[bool, list[str]]:
        """
        Validate all parameters in a GenerationParams instance.
        
        Returns:
            tuple: (is_valid, list_of_error_messages)
        """
        errors = []
        
        # Validate spline object
        valid, msg = cls.validate_spline_object(params.spline_object)
        if not valid:
            errors.append(msg)
        
        # Validate numeric parameters
        validators = [
            (cls.validate_spacing, params.spacing, "spacing"),
            (cls.validate_path_width, params.path_width, "path_width"),
            (cls.validate_lateral_density, params.lateral_density, "lateral_density"),
            (cls.validate_space_size_variation, params.space_size_variation, "space_size_variation"),
            (cls.validate_grid_size, params.grid_size, "grid_size"),
            (cls.validate_wall_height, params.wall_height, "wall_height"),
            (cls.validate_height_variation, params.height_variation, "height_variation"),
            (cls.validate_smoothness, params.smoothness, "smoothness"),
            (cls.validate_terrain_width, params.terrain_width, "terrain_width"),
        ]
        
        for validator_func, value, param_name in validators:
            valid, msg = validator_func(value)
            if not valid:
                errors.append(f"{param_name}: {msg}")
        
        # Validate block types
        valid, msg = cls.validate_block_types(params.block_types)
        if not valid:
            errors.append(msg)
        
        return len(errors) == 0, errors
    
    @classmethod
    def validate_and_raise(cls, params: GenerationParams):
        """
        Validate all parameters and raise ValidationError if any are invalid.
        
        Raises:
            ValidationError: If any parameters are invalid
        """
        is_valid, errors = cls.validate_all(params)
        if not is_valid:
            error_msg = "Parameter validation failed:\n" + "\n".join(f"  - {err}" for err in errors)
            raise ValidationError(error_msg)
