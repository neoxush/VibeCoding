"""Building block generator for creating modular level geometry."""

import bpy
import mathutils
import math
import random
from enum import Enum
from typing import Optional, List
from ..core.parameters import GenerationParams


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

    
    def populate_space(self, space) -> List[bpy.types.Object]:
        """
        Fill a space with appropriate building blocks.
        
        Args:
            space: Space object to populate
        
        Returns:
            List of created block objects
        """
        import random
        random.seed(self.seed + space.id)
        
        blocks = []
        
        # Get space dimensions
        width, depth, height = space.size
        half_width = width / 2
        half_depth = depth / 2
        
        # Create floor if enabled
        if "floor" in self.params.block_types:
            floor_pos = space.position.copy()
            floor_dims = mathutils.Vector((width, depth, self.params.grid_size * 0.25))
            floor = self.generate_block(BlockType.FLOOR, floor_pos, floor_dims, space.id, len(blocks))
            blocks.append(floor)
        
        # Create walls for enclosed spaces
        if space.type == "enclosed" and "wall" in self.params.block_types:
            wall_height = self.params.wall_height
            wall_thickness = self.params.grid_size * 0.5
            
            # Front wall
            wall_pos = space.position + mathutils.Vector((0, half_depth, wall_height / 2))
            wall_dims = mathutils.Vector((width, wall_thickness, wall_height))
            wall = self.generate_block(BlockType.WALL, wall_pos, wall_dims, space.id, len(blocks))
            blocks.append(wall)
            
            # Back wall
            wall_pos = space.position + mathutils.Vector((0, -half_depth, wall_height / 2))
            wall = self.generate_block(BlockType.WALL, wall_pos, wall_dims, space.id, len(blocks))
            blocks.append(wall)
            
            # Left wall
            wall_pos = space.position + mathutils.Vector((-half_width, 0, wall_height / 2))
            wall_dims = mathutils.Vector((wall_thickness, depth, wall_height))
            wall = self.generate_block(BlockType.WALL, wall_pos, wall_dims, space.id, len(blocks))
            blocks.append(wall)
            
            # Right wall
            wall_pos = space.position + mathutils.Vector((half_width, 0, wall_height / 2))
            wall = self.generate_block(BlockType.WALL, wall_pos, wall_dims, space.id, len(blocks))
            blocks.append(wall)
        
        # Add some platforms for vertical variation
        if "platform" in self.params.block_types and random.random() < 0.3:
            platform_height = self.params.wall_height * random.uniform(0.3, 0.7)
            platform_size = min(width, depth) * random.uniform(0.3, 0.6)
            
            platform_pos = space.position + mathutils.Vector((
                random.uniform(-half_width * 0.5, half_width * 0.5),
                random.uniform(-half_depth * 0.5, half_depth * 0.5),
                platform_height
            ))
            platform_dims = mathutils.Vector((platform_size, platform_size, platform_height * 0.5))
            platform = self.generate_block(BlockType.PLATFORM, platform_pos, platform_dims, space.id, len(blocks))
            blocks.append(platform)
        
        # Add occasional ramps
        if "ramp" in self.params.block_types and random.random() < 0.2:
            ramp_pos = space.position + mathutils.Vector((
                random.uniform(-half_width * 0.5, half_width * 0.5),
                random.uniform(-half_depth * 0.5, half_depth * 0.5),
                0
            ))
            ramp_dims = mathutils.Vector((
                self.params.grid_size * 2,
                self.params.grid_size * 3,
                self.params.wall_height * 0.5
            ))
            ramp = self.generate_block(BlockType.RAMP, ramp_pos, ramp_dims, space.id, len(blocks))
            blocks.append(ramp)
        
        return blocks
