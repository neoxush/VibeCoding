"""Terrain generator for creating ground meshes with elevation variation."""

import math
import random
from typing import List, Optional, Tuple

import bpy
import mathutils

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

    def generate_heightmap(self, bounds: Tuple[float, float, float, float],
                           rows: int = None, cols: int = None) -> List[List[float]]:
        """
        Generate a 2D heightmap using Perlin-like noise.

        Args:
            bounds: (min_x, max_x, min_y, max_y) terrain boundaries
            rows: Pre-computed row count (optional, auto-calculated if None)
            cols: Pre-computed column count (optional, auto-calculated if None)

        Returns:
            2D list of height values
        """
        min_x, max_x, min_y, max_y = bounds

        if rows is None or cols is None:
            width = max_x - min_x
            height = max_y - min_y
            resolution = 2.0
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


    def _precompute_spline_distance(self, bounds: Tuple[float, float, float, float],
                                     rows: int, cols: int) -> Tuple[List[List[float]], List[List[float]]]:
        """
        Precompute nearest spline-point Z and distance for every terrain cell.

        Called once per generation run. All terrain methods read from this cache
        instead of re-scanning every spline point for every cell.
        """
        min_x, max_x, min_y, max_y = bounds
        nearest_z = [[0.0 for _ in range(cols)] for _ in range(rows)]
        nearest_dist = [[float('inf') for _ in range(cols)] for _ in range(rows)]

        for i in range(rows):
            for j in range(cols):
                world_x = min_x + (j / (cols - 1)) * (max_x - min_x) if cols > 1 else min_x
                world_y = min_y + (i / (rows - 1)) * (max_y - min_y) if rows > 1 else min_y

                min_d = float('inf')
                near_z = 0.0
                for point in self.spline_points:
                    dx = point.position.x - world_x
                    dy = point.position.y - world_y
                    d2 = dx * dx + dy * dy
                    if d2 < min_d:
                        min_d = d2
                        near_z = point.position.z

                nearest_dist[i][j] = math.sqrt(min_d) if min_d < float('inf') else float('inf')
                nearest_z[i][j] = near_z

        return nearest_z, nearest_dist

    def align_to_spline_path(self, heightmap: List[List[float]],
                             bounds: Tuple[float, float, float, float],
                             nearest_z: List[List[float]],
                             nearest_dist: List[List[float]]) -> List[List[float]]:
        """Blend heightmap with spline elevation using precomputed distance cache."""
        rows = len(heightmap)
        cols = len(heightmap[0]) if rows > 0 else 0
        blend_distance = self.params.path_width

        for i in range(rows):
            for j in range(cols):
                dist = nearest_dist[i][j]
                if dist < blend_distance:
                    blend_factor = 1.0 - (dist / blend_distance)
                    heightmap[i][j] = heightmap[i][j] * (1.0 - blend_factor) + nearest_z[i][j] * blend_factor

        return heightmap

    def create_road_surface(self, heightmap: List[List[float]],
                           bounds: Tuple[float, float, float, float],
                           nearest_z: List[List[float]],
                           nearest_dist: List[List[float]]) -> List[List[float]]:
        """Flatten road surface using precomputed distance cache."""
        if not self.params.road_mode_enabled:
            return heightmap

        rows = len(heightmap)
        cols = len(heightmap[0]) if rows > 0 else 0
        road_width = self.params.road_width

        for i in range(rows):
            for j in range(cols):
                dist = nearest_dist[i][j]
                if dist < road_width / 2:
                    heightmap[i][j] = nearest_z[i][j]
                elif dist < road_width:
                    blend_factor = (dist - road_width / 2) / (road_width / 2)
                    heightmap[i][j] = nearest_z[i][j] * (1 - blend_factor) + heightmap[i][j] * blend_factor

        return heightmap

    def carve_road_trench(self, heightmap: List[List[float]],
                         bounds: Tuple[float, float, float, float],
                         nearest_z: List[List[float]],
                         nearest_dist: List[List[float]]) -> List[List[float]]:
        """Lower terrain under road mesh using precomputed distance cache."""
        if not self.spline_points or len(self.spline_points) < 2:
            return heightmap

        rows = len(heightmap)
        cols = len(heightmap[0]) if rows > 0 else 0
        road_width = getattr(self.params, 'road_mesh_width', self.params.road_width)
        trench_half_width = road_width / 2 + 0.5
        trench_depth = self.params.road_height_offset + 0.2
        blend_margin = 1.5

        for i in range(rows):
            for j in range(cols):
                dist = nearest_dist[i][j]
                if dist < trench_half_width:
                    heightmap[i][j] = nearest_z[i][j] - trench_depth
                elif dist < trench_half_width + blend_margin:
                    t = (dist - trench_half_width) / blend_margin
                    lowered = nearest_z[i][j] - trench_depth
                    heightmap[i][j] = lowered * (1 - t) + heightmap[i][j] * t

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
            zones: List of (center_position, radius) tuples for flat zones.
                   ``center_position.z`` is taken as the target ground level.
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
        if not self.params.terrain_enabled:
            return None
        if not self.spline_points:
            return None

        wm = bpy.context.window_manager
        wm.progress_begin(0, 100)

        min_x = min(p.position.x for p in self.spline_points) - self.params.terrain_width
        max_x = max(p.position.x for p in self.spline_points) + self.params.terrain_width
        min_y = min(p.position.y for p in self.spline_points) - self.params.terrain_width
        max_y = max(p.position.y for p in self.spline_points) + self.params.terrain_width

        width = max_x - min_x
        height = max_y - min_y
        resolution = max(2.0, min(width, height) / 200.0)
        cols = min(int(width / resolution) + 1, 200)
        rows = min(int(height / resolution) + 1, 200)

        bounds = (min_x, max_x, min_y, max_y)

        heightmap = self.generate_heightmap(bounds, rows, cols)
        if wm.progress_is_cancel:
            wm.progress_end()
            return None
        wm.progress_update(20)

        nearest_z, nearest_dist = self._precompute_spline_distance(bounds, rows, cols)
        if wm.progress_is_cancel:
            wm.progress_end()
            return None
        wm.progress_update(40)

        heightmap = self.align_to_spline_path(heightmap, bounds, nearest_z, nearest_dist)
        if wm.progress_is_cancel:
            wm.progress_end()
            return None
        wm.progress_update(55)

        if self.params.road_mode_enabled:
            heightmap = self.create_road_surface(heightmap, bounds, nearest_z, nearest_dist)
            if wm.progress_is_cancel:
                wm.progress_end()
                return None
        wm.progress_update(70)

        if spaces:
            flat_zones = []
            gs = self.params.grid_size
            sh = self.params.step_height
            for space in spaces:
                # Cells expose world_position(); legacy Space objects expose .position.
                if hasattr(space, "world_position") and callable(space.world_position):
                    center = space.world_position(gs, sh)
                    zone_radius = gs * 0.7
                else:
                    center = space.position
                    zone_radius = max(space.size.x, space.size.y) * 0.7
                flat_zones.append((center, zone_radius))
            heightmap = self.create_flat_zones(heightmap, flat_zones, bounds)
            if wm.progress_is_cancel:
                wm.progress_end()
                return None
        wm.progress_update(85)

        if self.params.road_mesh_enabled:
            heightmap = self.carve_road_trench(heightmap, bounds, nearest_z, nearest_dist)
            if wm.progress_is_cancel:
                wm.progress_end()
                return None
        wm.progress_update(95)

        terrain_obj = self.create_terrain_mesh(heightmap, bounds)
        wm.progress_update(100)
        wm.progress_end()

        return terrain_obj

    def generate_road_mesh(self) -> Optional[bpy.types.Object]:
        """
        Create a road mesh along the spline path with mitered corner joins.

        Returns:
            Road mesh object or None
        """
        n = len(self.spline_points)
        if n < 2:
            return None

        road_width = getattr(self.params, 'road_mesh_width', self.params.road_width)
        half_width = road_width / 2
        offset_z = mathutils.Vector((0, 0, self.params.road_height_offset))
        miter_limit = 2.0

        left_edge = [None] * n
        right_edge = [None] * n
        center_pt = [None] * n

        for i in range(n):
            point = self.spline_points[i]
            up = point.normal.normalized()
            center_pt[i] = point.position + offset_z

            if i == 0:
                tangent = point.tangent.normalized()
            elif i == n - 1:
                tangent = point.tangent.normalized()
            else:
                dir_prev = (point.position - self.spline_points[i - 1].position)
                dir_next = (self.spline_points[i + 1].position - point.position)
                if dir_prev.length > 0.0001 and dir_next.length > 0.0001:
                    bisector = dir_prev.normalized() + dir_next.normalized()
                    if bisector.length > 0.001:
                        tangent = bisector.normalized()
                    else:
                        tangent = point.tangent.normalized()
                else:
                    tangent = point.tangent.normalized()

            right = tangent.cross(up).normalized()
            left_edge[i] = center_pt[i] - right * half_width
            right_edge[i] = center_pt[i] + right * half_width

        for i in range(1, n - 1):
            center = center_pt[i]
            tangent = (self.spline_points[i + 1].position - self.spline_points[i - 1].position)
            if tangent.length < 0.0001:
                continue
            tangent = tangent.normalized()
            up = self.spline_points[i].normal.normalized()
            right = tangent.cross(up).normalized()

            inner_pt = center - right * half_width
            outer_pt = center + right * half_width

            dist_inner = (inner_pt - center).length
            dist_outer = (outer_pt - center).length

            if dist_inner > half_width * miter_limit:
                inner_pt = center + (inner_pt - center).normalized() * half_width * miter_limit
            if dist_outer > half_width * miter_limit:
                outer_pt = center + (outer_pt - center).normalized() * half_width * miter_limit

            left_edge[i] = inner_pt
            right_edge[i] = outer_pt

        vertices = []
        faces = []

        for i in range(n):
            vertices.append(left_edge[i])
            vertices.append(right_edge[i])

        for i in range(n - 1):
            v0 = i * 2
            v1 = i * 2 + 1
            v2 = (i + 1) * 2 + 1
            v3 = (i + 1) * 2
            faces.append((v0, v1, v2, v3))

        mesh = bpy.data.meshes.new("RoadSurface")
        obj = bpy.data.objects.new("Road", mesh)
        bpy.context.collection.objects.link(obj)
        mesh.from_pydata(vertices, [], faces)
        mesh.update()

        mat_name = "PCG_Road_Material"
        mat = bpy.data.materials.get(mat_name)
        if mat is None:
            mat = bpy.data.materials.new(name=mat_name)
            mat.use_nodes = True
            nodes = mat.node_tree.nodes
            bsdf = nodes.get("Principled BSDF")
            if bsdf:
                bsdf.inputs["Base Color"].default_value = self.params.road_material_color
                bsdf.inputs["Roughness"].default_value = 0.8
        else:
            mat.use_nodes = True
            bsdf = mat.node_tree.nodes.get("Principled BSDF")
            if bsdf:
                bsdf.inputs["Base Color"].default_value = self.params.road_material_color

        if obj.data.materials:
            obj.data.materials[0] = mat
        else:
            obj.data.materials.append(mat)

        return obj
