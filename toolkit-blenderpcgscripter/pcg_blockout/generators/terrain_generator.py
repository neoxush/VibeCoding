"""Terrain generator for creating ground meshes with elevation variation."""

import bpy
import mathutils
import random
import math
from typing import List, Tuple, Optional
from ..core.parameters import GenerationParams
from ..core.spline_sampler import SplinePoint


class TerrainGenerator:
    """Generates terrain with elevation variation along spline paths."""
    
    def __init__(self, seed: int, params: GenerationParams, spline_points: List[SplinePoint]):
        """
        Initialize the terrain generator.
        
        Args:
            seed: Random seed for reproducible generation
            params: Generation parameters
            spline_points: Sampled points along the spline path
        """
        self.seed = seed
        self.params = params
        self.spline_points = spline_points
        random.seed(seed)
    
    def generate_heightmap(self, bounds: Tuple[float, float, float, float]) -> List[List[float]]:
        """
        Generate a 2D heightmap using Perlin-like noise.
        
        Args:
            bounds: (min_x, max_x, min_y, max_y) terrain boundaries
        
        Returns:
            2D list of height values
        """
        min_x, max_x, min_y, max_y = bounds
        
        # Calculate grid resolution based on terrain size
        width = max_x - min_x
        height = max_y - min_y
        resolution = 2.0  # meters per grid cell
        
        cols = int(width / resolution) + 1
        rows = int(height / resolution) + 1
        
        # Initialize heightmap
        heightmap = [[0.0 for _ in range(cols)] for _ in range(rows)]
        
        # Generate noise-based terrain
        # Using simple random variation for now (can be replaced with proper Perlin noise)
        smoothness_factor = self.params.smoothness
        height_var = self.params.height_variation
        
        for i in range(rows):
            for j in range(cols):
                # Simple noise generation
                noise_value = random.random() * 2.0 - 1.0  # -1 to 1
                heightmap[i][j] = noise_value * height_var * (1.0 - smoothness_factor)
        
        # Apply smoothing based on smoothness parameter
        if smoothness_factor > 0.1:
            heightmap = self._smooth_heightmap(heightmap, int(smoothness_factor * 5))
        
        return heightmap
    
    def _smooth_heightmap(self, heightmap: List[List[float]], iterations: int) -> List[List[float]]:
        """
        Apply smoothing to the heightmap.
        
        Args:
            heightmap: The heightmap to smooth
            iterations: Number of smoothing passes
        
        Returns:
            Smoothed heightmap
        """
        rows = len(heightmap)
        cols = len(heightmap[0]) if rows > 0 else 0
        
        for _ in range(iterations):
            new_heightmap = [[0.0 for _ in range(cols)] for _ in range(rows)]
            
            for i in range(rows):
                for j in range(cols):
                    # Average with neighbors
                    total = heightmap[i][j]
                    count = 1
                    
                    for di in [-1, 0, 1]:
                        for dj in [-1, 0, 1]:
                            if di == 0 and dj == 0:
                                continue
                            ni, nj = i + di, j + dj
                            if 0 <= ni < rows and 0 <= nj < cols:
                                total += heightmap[ni][nj]
                                count += 1
                    
                    new_heightmap[i][j] = total / count
            
            heightmap = new_heightmap
        
        return heightmap

    
    def align_to_spline_path(self, heightmap: List[List[float]], bounds: Tuple[float, float, float, float]) -> List[List[float]]:
        """
        Blend heightmap with spline elevation data for smooth transitions.
        
        Args:
            heightmap: The heightmap to modify
            bounds: (min_x, max_x, min_y, max_y) terrain boundaries
        
        Returns:
            Modified heightmap with spline elevation blended in
        """
        min_x, max_x, min_y, max_y = bounds
        resolution = 2.0
        
        rows = len(heightmap)
        cols = len(heightmap[0]) if rows > 0 else 0
        
        # For each heightmap cell, check distance to spline path
        for i in range(rows):
            for j in range(cols):
                # Calculate world position of this cell
                world_x = min_x + (j / (cols - 1)) * (max_x - min_x) if cols > 1 else min_x
                world_y = min_y + (i / (rows - 1)) * (max_y - min_y) if rows > 1 else min_y
                cell_pos = mathutils.Vector((world_x, world_y, 0))
                
                # Find nearest spline point
                min_dist = float('inf')
                nearest_height = 0.0
                
                for point in self.spline_points:
                    dist_2d = (mathutils.Vector((point.position.x, point.position.y, 0)) - 
                              mathutils.Vector((cell_pos.x, cell_pos.y, 0))).length
                    
                    if dist_2d < min_dist:
                        min_dist = dist_2d
                        nearest_height = point.position.z
                
                # Blend based on distance to path
                blend_distance = self.params.path_width
                if min_dist < blend_distance:
                    # Close to path - blend with spline elevation
                    blend_factor = 1.0 - (min_dist / blend_distance)
                    heightmap[i][j] = heightmap[i][j] * (1.0 - blend_factor) + nearest_height * blend_factor
        
        return heightmap

    
    def create_terrain_mesh(self, heightmap: List[List[float]], bounds: Tuple[float, float, float, float]) -> bpy.types.Object:
        """
        Convert 2D heightmap to Blender mesh.
        
        Args:
            heightmap: 2D array of height values
            bounds: (min_x, max_x, min_y, max_y) terrain boundaries
        
        Returns:
            Created terrain mesh object
        """
        min_x, max_x, min_y, max_y = bounds
        rows = len(heightmap)
        cols = len(heightmap[0]) if rows > 0 else 0
        
        if rows == 0 or cols == 0:
            return None
        
        # Create mesh and object
        mesh = bpy.data.meshes.new("TerrainMesh")
        obj = bpy.data.objects.new("Terrain", mesh)
        
        # Link to scene
        bpy.context.collection.objects.link(obj)
        
        # Create vertices
        vertices = []
        for i in range(rows):
            for j in range(cols):
                x = min_x + (j / (cols - 1)) * (max_x - min_x) if cols > 1 else min_x
                y = min_y + (i / (rows - 1)) * (max_y - min_y) if rows > 1 else min_y
                z = heightmap[i][j]
                vertices.append((x, y, z))
        
        # Create faces (quads)
        faces = []
        for i in range(rows - 1):
            for j in range(cols - 1):
                # Vertex indices for this quad
                v1 = i * cols + j
                v2 = i * cols + (j + 1)
                v3 = (i + 1) * cols + (j + 1)
                v4 = (i + 1) * cols + j
                faces.append((v1, v2, v3, v4))
        
        # Create mesh from data
        mesh.from_pydata(vertices, [], faces)
        mesh.update()
        
        # Apply subdivision modifier for smoothness
        if self.params.smoothness > 0.3:
            modifier = obj.modifiers.new(name="Subdivision", type='SUBSURF')
            modifier.levels = 1
            modifier.render_levels = 2
        
        return obj

    
    def create_flat_zones(self, heightmap: List[List[float]], zones: List[Tuple[mathutils.Vector, float]], 
                         bounds: Tuple[float, float, float, float]) -> List[List[float]]:
        """
        Flatten designated areas in the heightmap.
        
        Args:
            heightmap: The heightmap to modify
            zones: List of (center_position, radius) tuples for flat zones
            bounds: (min_x, max_x, min_y, max_y) terrain boundaries
        
        Returns:
            Modified heightmap with flat zones
        """
        min_x, max_x, min_y, max_y = bounds
        rows = len(heightmap)
        cols = len(heightmap[0]) if rows > 0 else 0
        
        for zone_center, zone_radius in zones:
            target_height = zone_center.z
            
            for i in range(rows):
                for j in range(cols):
                    # Calculate world position
                    world_x = min_x + (j / (cols - 1)) * (max_x - min_x) if cols > 1 else min_x
                    world_y = min_y + (i / (rows - 1)) * (max_y - min_y) if rows > 1 else min_y
                    
                    # Check distance to zone center
                    dist = math.sqrt((world_x - zone_center.x)**2 + (world_y - zone_center.y)**2)
                    
                    if dist < zone_radius:
                        # Inside zone - flatten
                        blend_factor = 1.0 - (dist / zone_radius)
                        heightmap[i][j] = heightmap[i][j] * (1.0 - blend_factor) + target_height * blend_factor
        
        return heightmap
    
    def generate(self, spaces: List = None) -> Optional[bpy.types.Object]:
        """
        Orchestrate the full terrain generation process.
        
        Args:
            spaces: Optional list of spaces to create flat zones around
        
        Returns:
            Created terrain mesh object, or None if terrain is disabled
        """
        if not self.params.terrain_enabled:
            return None
        
        # Calculate terrain bounds based on spline points
        if not self.spline_points:
            return None
        
        # Find bounding box of spline path
        min_x = min(p.position.x for p in self.spline_points) - self.params.terrain_width
        max_x = max(p.position.x for p in self.spline_points) + self.params.terrain_width
        min_y = min(p.position.y for p in self.spline_points) - self.params.terrain_width
        max_y = max(p.position.y for p in self.spline_points) + self.params.terrain_width
        
        bounds = (min_x, max_x, min_y, max_y)
        
        # Generate base heightmap
        heightmap = self.generate_heightmap(bounds)
        
        # Blend with spline elevation
        heightmap = self.align_to_spline_path(heightmap, bounds)
        
        # Create flat zones around spaces if provided
        if spaces:
            flat_zones = []
            for space in spaces:
                # Create flat zone at each space location
                zone_radius = max(space.size.x, space.size.y) * 0.7
                flat_zones.append((space.position, zone_radius))
            
            heightmap = self.create_flat_zones(heightmap, flat_zones, bounds)
        
        # Convert to mesh
        terrain_obj = self.create_terrain_mesh(heightmap, bounds)
        
        return terrain_obj
