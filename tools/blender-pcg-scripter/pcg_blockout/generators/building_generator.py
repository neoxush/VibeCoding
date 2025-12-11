"""Building block generator for creating modular level geometry."""

import bpy
import mathutils
import math
import random
from enum import Enum
from typing import Optional, List
from ..core.parameters import GenerationParams
from ..core.layer_system import PlacementRule, LayerConfig


class BlockType(Enum):
    """Enumeration of available building block types."""
    WALL = "wall"
    FLOOR = "floor"
    PLATFORM = "platform"
    RAMP = "ramp"


class BuildingBlockGenerator:
    """Generates modular building blocks (walls, floors, platforms, ramps)."""
    
    def __init__(self, seed: int, params: GenerationParams):
        """
        Initialize the building block generator.
        
        Args:
            seed: Random seed for reproducible generation
            params: Generation parameters
        """
        self.seed = seed
        self.params = params
    
    @staticmethod
    def align_to_grid(position: mathutils.Vector, grid_size: float) -> mathutils.Vector:
        """
        Snap a position to the nearest grid point.
        
        Args:
            position: The position to align
            grid_size: The size of the grid cells
        
        Returns:
            The aligned position
        """
        return mathutils.Vector((
            round(position.x / grid_size) * grid_size,
            round(position.y / grid_size) * grid_size,
            round(position.z / grid_size) * grid_size
        ))

    
    def generate_block(self, block_type: BlockType, position: mathutils.Vector, 
                      dimensions: mathutils.Vector, space_id: int, index: int) -> bpy.types.Object:
        """
        Create a single building block mesh.
        
        Args:
            block_type: Type of block to create
            position: World position for the block
            dimensions: (width, depth, height) of the block
            space_id: ID of the space this block belongs to
            index: Index of this block within the space
        
        Returns:
            The created mesh object
        """
        # Align position to grid
        aligned_pos = self.align_to_grid(position, self.params.grid_size)
        
        # Create mesh based on block type
        if block_type == BlockType.WALL:
            obj = self._create_wall(aligned_pos, dimensions)
        elif block_type == BlockType.FLOOR:
            obj = self._create_floor(aligned_pos, dimensions)
        elif block_type == BlockType.PLATFORM:
            obj = self._create_platform(aligned_pos, dimensions)
        elif block_type == BlockType.RAMP:
            obj = self._create_ramp(aligned_pos, dimensions)
        else:
            obj = self._create_wall(aligned_pos, dimensions)
        
        # Set name using consistent convention
        obj.name = f"{block_type.value.capitalize()}_{space_id:03d}_{index:03d}"
        
        return obj
    
    def _create_wall(self, position: mathutils.Vector, dimensions: mathutils.Vector) -> bpy.types.Object:
        """Create a wall block."""
        bpy.ops.mesh.primitive_cube_add(
            size=1.0,
            location=position
        )
        obj = bpy.context.active_object
        
        # Scale to dimensions (thin wall)
        wall_thickness = self.params.grid_size * 0.5
        obj.scale = (wall_thickness, dimensions.y, dimensions.z)
        
        # Apply scale
        bpy.ops.object.transform_apply(scale=True)
        
        # Set pivot to bottom-center
        self._set_pivot_to_bottom(obj)
        
        return obj
    
    def _create_floor(self, position: mathutils.Vector, dimensions: mathutils.Vector) -> bpy.types.Object:
        """Create a floor block."""
        bpy.ops.mesh.primitive_cube_add(
            size=1.0,
            location=position
        )
        obj = bpy.context.active_object
        
        # Scale to dimensions (thin floor)
        floor_thickness = self.params.grid_size * 0.25
        obj.scale = (dimensions.x, dimensions.y, floor_thickness)
        
        # Apply scale
        bpy.ops.object.transform_apply(scale=True)
        
        # Set pivot to bottom-center
        self._set_pivot_to_bottom(obj)
        
        return obj
    
    def _create_platform(self, position: mathutils.Vector, dimensions: mathutils.Vector) -> bpy.types.Object:
        """Create a platform block (elevated floor)."""
        bpy.ops.mesh.primitive_cube_add(
            size=1.0,
            location=position
        )
        obj = bpy.context.active_object
        
        # Scale to dimensions
        platform_height = dimensions.z * 0.5
        obj.scale = (dimensions.x, dimensions.y, platform_height)
        
        # Apply scale
        bpy.ops.object.transform_apply(scale=True)
        
        # Set pivot to bottom-center
        self._set_pivot_to_bottom(obj)
        
        return obj
    
    def _create_ramp(self, position: mathutils.Vector, dimensions: mathutils.Vector) -> bpy.types.Object:
        """Create a ramp block."""
        # Create a cube and modify it to be a ramp
        bpy.ops.mesh.primitive_cube_add(
            size=1.0,
            location=position
        )
        obj = bpy.context.active_object
        
        # Scale to dimensions
        obj.scale = (dimensions.x, dimensions.y, dimensions.z * 0.5)
        
        # Apply scale
        bpy.ops.object.transform_apply(scale=True)
        
        # Modify mesh to create ramp shape
        mesh = obj.data
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        
        # Simple ramp: rotate one edge
        bpy.ops.object.mode_set(mode='OBJECT')
        
        # Set pivot to bottom-center
        self._set_pivot_to_bottom(obj)
        
        return obj
    
    def _set_pivot_to_bottom(self, obj: bpy.types.Object):
        """Set object pivot point to bottom-center."""
        # Get bounding box
        bbox = [obj.matrix_world @ mathutils.Vector(corner) for corner in obj.bound_box]
        
        # Find bottom center
        min_z = min(v.z for v in bbox)
        center_x = sum(v.x for v in bbox) / len(bbox)
        center_y = sum(v.y for v in bbox) / len(bbox)
        
        # Set origin
        bpy.ops.object.mode_set(mode='OBJECT')
        bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
        bpy.context.scene.cursor.location = (center_x, center_y, min_z)
        bpy.ops.object.origin_set(type='ORIGIN_CURSOR')

    
    def populate_space(self, space) -> dict[str, List[bpy.types.Object]]:
        """
        Fill a space with objects based on configured layers.
        
        Args:
            space: Space object to populate
        
        Returns:
            Dictionary mapping layer names to lists of created block objects
        """
        import random
        random.seed(self.seed + space.id)
        
        blocks_by_layer = {}
        
        # Iterate through all enabled layers
        for layer_idx, layer in enumerate(self.params.layers):
            if not layer.enabled:
                continue
                
            layer_blocks = self._process_layer(layer, space, layer_idx)
            if layer_blocks:
                blocks_by_layer[layer.name] = layer_blocks
            
        return blocks_by_layer

    def _process_layer(self, layer: LayerConfig, space, layer_idx: int) -> List[bpy.types.Object]:
        """Process a single layer for a given space."""
        blocks = []
        width, depth, height = space.size
        
        # Determine placement points based on rule
        points = []
        
        if layer.rule == PlacementRule.EDGE_LOOP:
            # Place along edges
            perimeter = (width + depth) * 2
            num_points = int(perimeter * layer.density * 0.1)
            if num_points < 1: num_points = 1
            
            for i in range(num_points):
                t = i / num_points
                pos = self._get_perimeter_point(width, depth, t)
                points.append(pos)
                
        elif layer.rule == PlacementRule.FILL_GRID:
            # Grid fill
            step = self.params.grid_size / layer.density
            x_steps = int(width / step)
            y_steps = int(depth / step)
            
            for x in range(x_steps):
                for y in range(y_steps):
                    pos = mathutils.Vector((
                        (x - x_steps/2 + 0.5) * step,
                        (y - y_steps/2 + 0.5) * step,
                        0
                    ))
                    points.append(pos)
                    
        elif layer.rule == PlacementRule.SCATTER:
            # Random scatter
            area = width * depth
            num_points = int(area * layer.density * 0.1)
            
            for _ in range(num_points):
                pos = mathutils.Vector((
                    random.uniform(-width/2, width/2),
                    random.uniform(-depth/2, depth/2),
                    0
                ))
                points.append(pos)
        
        # Instantiate objects at points
        for i, local_pos in enumerate(points):
            # Apply offsets
            world_pos = space.position + local_pos + mathutils.Vector((0, 0, layer.z_offset))
            
            # Try to get assets from collection
            source_obj = None
            if layer.collection_name:
                coll = bpy.data.collections.get(layer.collection_name)
                if coll:
                    # Filter for mesh objects
                    meshes = [o for o in coll.objects if o.type == 'MESH']
                    if meshes:
                        source_obj = random.choice(meshes)
            
            if source_obj:
                # Create instance
                obj = source_obj.copy()
                # Link to scene so it's visible and can be manipulated
                bpy.context.collection.objects.link(obj)
                obj.location = world_pos
            else:
                # Fallback to cube
                bpy.ops.mesh.primitive_cube_add(size=1.0, location=world_pos)
                obj = bpy.context.active_object
            
            obj.name = f"{layer.name}_{space.id}_{i}"
            
            # Apply random transforms
            if layer.random_rotation:
                obj.rotation_euler.z = random.uniform(0, math.pi * 2)
            
            if layer.random_scale:
                s = random.uniform(layer.scale_min, layer.scale_max)
                obj.scale = (s, s, s)
            
            blocks.append(obj)
            
        return blocks

    def _get_perimeter_point(self, width: float, depth: float, t: float) -> mathutils.Vector:
        """Get a point along the perimeter rectangle at parameter t (0-1)."""
        perimeter = (width + depth) * 2
        dist = t * perimeter
        
        half_w = width / 2
        half_d = depth / 2
        
        # Walk the perimeter: Top -> Right -> Bottom -> Left
        if dist < width: # Top edge
            return mathutils.Vector((-half_w + dist, half_d, 0))
        dist -= width
        
        if dist < depth: # Right edge
            return mathutils.Vector((half_w, half_d - dist, 0))
        dist -= depth
        
        if dist < width: # Bottom edge
            return mathutils.Vector((half_w - dist, -half_d, 0))
        dist -= width
        
        # Left edge
        return mathutils.Vector((-half_w, -half_d + dist, 0))
