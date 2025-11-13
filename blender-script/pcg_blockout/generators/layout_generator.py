"""Layout generator for creating space networks along spline paths."""

import mathutils
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class Space:
    """Represents a single area/space in the layout."""
    id: int
    position: mathutils.Vector      # (x, y, z) world position
    size: mathutils.Vector          # (width, depth, height)
    type: str                       # "enclosed", "open", "semi_open"
    orientation: mathutils.Quaternion  # Rotation based on spline tangent/normal
    connections: List[int] = field(default_factory=list)  # IDs of connected spaces


import random
from ..core.parameters import GenerationParams
from ..core.spline_sampler import SplinePoint


class LayoutGenerator:
    """Generates spatial layouts along spline paths."""
    
    def __init__(self, seed: int, params: GenerationParams, spline_points: List[SplinePoint]):
        """
        Initialize the layout generator.
        
        Args:
            seed: Random seed for reproducible generation
            params: Generation parameters
            spline_points: Sampled points along the spline path
        """
        self.seed = seed
        self.params = params
        self.spline_points = spline_points
        self.spaces = []
        self.next_space_id = 0
        random.seed(seed)
    
    def create_spaces_along_path(self) -> List[Space]:
        """
        Create spaces at spline sample points.
        
        Returns:
            List of created Space objects
        """
        spaces = []
        
        for i, point in enumerate(self.spline_points):
            # Calculate space size with variation
            base_size = self.params.path_width * 0.5
            variation = self.params.space_size_variation
            
            # Apply variation based on position and randomness
            size_factor = 1.0 + (random.random() * 2.0 - 1.0) * variation
            width = base_size * size_factor
            depth = base_size * size_factor
            height = self.params.wall_height
            
            # Determine space type based on position
            # Vary types along the path for interest
            rand_val = random.random()
            if rand_val < 0.3:
                space_type = "enclosed"
            elif rand_val < 0.7:
                space_type = "semi_open"
            else:
                space_type = "open"
            
            # Calculate orientation from tangent and normal
            orientation = self._calculate_orientation(point.tangent, point.normal)
            
            # Create space
            space = Space(
                id=self.next_space_id,
                position=point.position.copy(),
                size=mathutils.Vector((width, depth, height)),
                type=space_type,
                orientation=orientation,
                connections=[]
            )
            
            # Connect to previous space
            if i > 0:
                space.connections.append(spaces[-1].id)
                spaces[-1].connections.append(space.id)
            
            spaces.append(space)
            self.next_space_id += 1
        
        return spaces
    
    def _calculate_orientation(self, tangent: mathutils.Vector, normal: mathutils.Vector) -> mathutils.Quaternion:
        """
        Calculate orientation quaternion from tangent and normal vectors.
        
        Args:
            tangent: Forward direction
            normal: Up direction
        
        Returns:
            Orientation as quaternion
        """
        # Create rotation matrix from tangent and normal
        forward = tangent.normalized()
        up = normal.normalized()
        right = forward.cross(up).normalized()
        
        # Recalculate up to ensure orthogonality
        up = right.cross(forward).normalized()
        
        # Create rotation matrix
        mat = mathutils.Matrix((
            right,
            forward,
            up
        )).transposed()
        
        # Convert to quaternion
        return mat.to_quaternion()

    
    def add_lateral_spaces(self, main_path_spaces: List[Space]) -> List[Space]:
        """
        Create spaces branching off the main path.
        
        Args:
            main_path_spaces: Spaces along the main spline path
        
        Returns:
            List of lateral spaces created
        """
        lateral_spaces = []
        
        # Determine how many lateral spaces to create based on density
        num_main_spaces = len(main_path_spaces)
        num_lateral = int(num_main_spaces * self.params.lateral_density)
        
        if num_lateral == 0:
            return lateral_spaces
        
        # Select random main path spaces to branch from
        branch_indices = random.sample(range(num_main_spaces), min(num_lateral, num_main_spaces))
        
        for idx in branch_indices:
            main_space = main_path_spaces[idx]
            
            # Create 1-2 lateral spaces per branch point
            num_branches = random.randint(1, 2)
            
            for _ in range(num_branches):
                # Calculate lateral offset direction
                # Use the space's orientation to determine left/right
                offset_direction = self._get_lateral_direction(main_space.orientation)
                
                # Random distance from main path
                lateral_distance = self.params.path_width * random.uniform(0.5, 1.5)
                
                # Calculate position
                lateral_pos = main_space.position + offset_direction * lateral_distance
                
                # Size similar to main space with some variation
                size_factor = random.uniform(0.7, 1.3)
                lateral_size = main_space.size * size_factor
                
                # Create lateral space
                lateral_space = Space(
                    id=self.next_space_id,
                    position=lateral_pos,
                    size=lateral_size,
                    type=random.choice(["enclosed", "semi_open", "open"]),
                    orientation=main_space.orientation.copy(),
                    connections=[main_space.id]
                )
                
                # Connect back to main space
                main_space.connections.append(lateral_space.id)
                
                lateral_spaces.append(lateral_space)
                self.next_space_id += 1
        
        return lateral_spaces
    
    def _get_lateral_direction(self, orientation: mathutils.Quaternion) -> mathutils.Vector:
        """
        Get a lateral (left or right) direction based on orientation.
        
        Args:
            orientation: The space's orientation
        
        Returns:
            Lateral direction vector
        """
        # Get the right vector from the orientation
        right = orientation @ mathutils.Vector((1, 0, 0))
        
        # Randomly choose left or right
        if random.random() < 0.5:
            return right
        else:
            return -right

    
    def ensure_connectivity(self, spaces: List[Space]) -> bool:
        """
        Validate that all spaces are reachable from the first space.
        
        Args:
            spaces: List of all spaces
        
        Returns:
            True if all spaces are connected, False otherwise
        """
        if not spaces:
            return True
        
        # Use BFS to find all reachable spaces
        visited = set()
        queue = [spaces[0].id]
        visited.add(spaces[0].id)
        
        # Create ID to space mapping
        space_map = {space.id: space for space in spaces}
        
        while queue:
            current_id = queue.pop(0)
            current_space = space_map.get(current_id)
            
            if current_space:
                for connected_id in current_space.connections:
                    if connected_id not in visited:
                        visited.add(connected_id)
                        queue.append(connected_id)
        
        # Check if all spaces were visited
        return len(visited) == len(spaces)
    
    def generate(self) -> List[Space]:
        """
        Orchestrate the full layout generation process.
        
        Returns:
            List of all generated spaces
        """
        # Create spaces along the main path
        main_spaces = self.create_spaces_along_path()
        self.spaces.extend(main_spaces)
        
        # Add lateral branches
        lateral_spaces = self.add_lateral_spaces(main_spaces)
        self.spaces.extend(lateral_spaces)
        
        # Validate connectivity
        if not self.ensure_connectivity(self.spaces):
            print("Warning: Not all spaces are connected")
        
        return self.spaces
