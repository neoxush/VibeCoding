"""Preview system for visualizing generation before execution."""

import bpy
import mathutils
from typing import List, Optional
from .parameters import GenerationParams
from .spline_sampler import SplineSampler, SplinePoint


class PreviewManager:
    """Manages preview visualization for PCG generation."""
    
    PREVIEW_COLLECTION_NAME = "PCG_Preview"
    
    def __init__(self, params: GenerationParams, spline_object: bpy.types.Object):
        """
        Initialize the preview manager.
        
        Args:
            params: Generation parameters
            spline_object: The spline curve to preview
        """
        self.params = params
        self.spline_object = spline_object
        self.preview_collection = None
    
    def create_preview(self) -> bool:
        """
        Generate all preview elements.
        
        Returns:
            True if successful, False otherwise
        """
        try:
            # Clear any existing preview
            self.clear_preview()
            
            # Create preview collection
            self.preview_collection = self._get_or_create_preview_collection()
            
            # Sample the spline
            sampler = SplineSampler(self.spline_object)
            is_valid, error_msg = sampler.validate_spline()
            
            if not is_valid:
                print(f"Preview: Invalid spline - {error_msg}")
                return False
            
            points = sampler.sample_points(self.params.spacing)
            
            if not points:
                print("Preview: No points sampled from spline")
                return False
            
            # Create preview elements
            self._create_sample_point_markers(points)
            self._create_space_boundary_previews(points)
            
            # Create metric labels if enabled
            # Note: We'll check this via a parameter or always show for now
            self._create_metric_labels(points, sampler)
            
            print(f"Preview created: {len(points)} sample points")
            return True
            
        except Exception as e:
            print(f"Preview creation failed: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def clear_preview(self):
        """Remove all preview elements."""
        # Find and remove preview collection
        preview_coll = bpy.data.collections.get(self.PREVIEW_COLLECTION_NAME)
        
        if preview_coll:
            # Remove all objects in the collection
            for obj in preview_coll.objects:
                bpy.data.objects.remove(obj, do_unlink=True)
            
            # Remove the collection
            bpy.data.collections.remove(preview_coll)
        
        self.preview_collection = None
    
    def _get_or_create_preview_collection(self) -> bpy.types.Collection:
        """Get or create the preview collection."""
        preview_coll = bpy.data.collections.get(self.PREVIEW_COLLECTION_NAME)
        
        if preview_coll is None:
            preview_coll = bpy.data.collections.new(self.PREVIEW_COLLECTION_NAME)
            bpy.context.scene.collection.children.link(preview_coll)
        
        return preview_coll
    
    def _create_sample_point_markers(self, points: List[SplinePoint]):
        """
        Create visual markers at each sample point.
        
        Args:
            points: List of sampled points along the spline
        """
        for i, point in enumerate(points):
            # Create empty object as marker
            bpy.ops.object.empty_add(
                type='SPHERE',
                radius=self.params.grid_size * 0.5,
                location=point.position
            )
            
            marker = bpy.context.active_object
            marker.name = f"Preview_Point_{i:03d}"
            
            # Set color (cyan for visibility)
            marker.empty_display_type = 'SPHERE'
            marker.color = (0.0, 0.8, 1.0, 1.0)  # Cyan
            
            # Add to preview collection
            for coll in marker.users_collection:
                coll.objects.unlink(marker)
            self.preview_collection.objects.link(marker)
            
            # Store metadata
            marker["pcg_preview"] = True
            marker["sample_index"] = i
            marker["distance"] = point.distance
    
    def _create_path_guide(self):
        """Create a visual guide showing the path width."""
        try:
            # Duplicate the spline curve
            spline_copy = self.spline_object.copy()
            spline_copy.data = self.spline_object.data.copy()
            spline_copy.name = "Preview_PathGuide"
            
            # Link to preview collection
            self.preview_collection.objects.link(spline_copy)
            
            # Set curve properties for visualization
            curve_data = spline_copy.data
            curve_data.bevel_depth = self.params.path_width / 2
            curve_data.bevel_resolution = 4
            curve_data.use_fill_caps = False
            
            # Make it semi-transparent
            # Create material if needed
            mat_name = "PCG_Preview_PathGuide_Material"
            mat = bpy.data.materials.get(mat_name)
            
            if mat is None:
                mat = bpy.data.materials.new(name=mat_name)
                mat.use_nodes = True
                
                # Set up transparent blue material
                nodes = mat.node_tree.nodes
                bsdf = nodes.get("Principled BSDF")
                
                if bsdf:
                    bsdf.inputs["Base Color"].default_value = (0.2, 0.5, 1.0, 1.0)  # Blue
                    bsdf.inputs["Alpha"].default_value = 0.3  # Semi-transparent
                    bsdf.inputs["Roughness"].default_value = 0.5
                
                mat.blend_method = 'BLEND'
                mat.show_transparent_back = False
            
            # Assign material
            if spline_copy.data.materials:
                spline_copy.data.materials[0] = mat
            else:
                spline_copy.data.materials.append(mat)
            
            # Store metadata
            spline_copy["pcg_preview"] = True
            spline_copy["preview_type"] = "path_guide"
            
        except Exception as e:
            print(f"Failed to create path guide: {e}")
    
    def get_preview_info(self) -> dict:
        """
        Get information about the current preview.
        
        Returns:
            Dictionary with preview statistics
        """
        if not self.preview_collection:
            return {
                "exists": False,
                "point_count": 0,
                "spline_length": 0.0
            }
        
        # Count preview points
        point_count = sum(1 for obj in self.preview_collection.objects 
                         if obj.name.startswith("Preview_Point_"))
        
        # Get spline length
        sampler = SplineSampler(self.spline_object)
        spline_length = sampler.get_spline_length()
        
        return {
            "exists": True,
            "point_count": point_count,
            "spline_length": spline_length,
            "spacing": self.params.spacing,
            "path_width": self.params.path_width
        }

    
    def _create_space_boundary_previews(self, points: List[SplinePoint]):
        """
        Create wireframe boxes showing where spaces will be generated.
        This matches the actual layout generation logic.
        
        Args:
            points: List of sampled points along the spline
        """
        import random
        from . import seed_manager
        
        # Use the EXACT same seed initialization as the actual generation
        # This ensures preview matches output
        seed_to_use = seed_manager.initialize_seed(self.params.seed)
        random.seed(seed_to_use)
        
        print(f"Preview using seed: {seed_to_use}")
        print(f"Preview road mode: {self.params.road_mode_enabled}")
        
        # Simulate the layout generation to show accurate previews
        for i, point in enumerate(points):
            if self.params.road_mode_enabled:
                # Road mode: create previews on sides
                self._create_road_side_previews(point, i, random)
            else:
                # Standard mode: create centered preview
                self._create_centered_preview(point, i, random)
    
    def _create_centered_preview(self, point: SplinePoint, index: int, random_module):
        """Create a single centered preview box (standard mode)."""
        # Calculate space size with variation (matching layout_generator logic)
        base_size = self.params.path_width * 0.5
        variation = self.params.space_size_variation
        
        # Apply variation based on position and randomness
        size_factor = 1.0 + (random_module.random() * 2.0 - 1.0) * variation
        width = base_size * size_factor
        depth = base_size * size_factor
        height = self.params.wall_height
        
        # Determine space type (matching layout_generator logic)
        rand_val = random_module.random()
        if rand_val < 0.3:
            space_type = "enclosed"
            color = (1.0, 0.2, 0.2, 1.0)  # Red
        elif rand_val < 0.7:
            space_type = "semi_open"
            color = (1.0, 1.0, 0.2, 1.0)  # Yellow
        else:
            space_type = "open"
            color = (0.2, 1.0, 0.2, 1.0)  # Green
        
        # Calculate orientation from tangent and normal
        orientation = self._calculate_orientation_quat(point.tangent, point.normal)
        
        # Create wireframe box at this location
        self._create_wireframe_box(
            position=point.position,
            size=(width, depth, height),
            orientation=orientation,
            color=color,
            name=f"Space_{index:03d}",
            space_type=space_type
        )
    
    def _create_road_side_previews(self, point: SplinePoint, index: int, random_module):
        """Create preview boxes on the sides of the road (road mode)."""
        # Calculate orientation
        orientation = self._calculate_orientation_quat(point.tangent, point.normal)
        right_vector = orientation @ mathutils.Vector((1, 0, 0))
        
        # Determine which sides to show
        sides = self._get_preview_sides_for_index(index)
        
        for side in sides:
            # Calculate offset position
            offset_distance = self.params.road_width / 2 + self.params.path_width / 4
            
            if side == "left":
                offset_vector = -right_vector * offset_distance
                color = (0.2, 0.5, 1.0, 1.0)  # Blue for left
            else:  # right
                offset_vector = right_vector * offset_distance
                color = (1.0, 0.5, 0.2, 1.0)  # Orange for right
            
            position = point.position + offset_vector
            
            # Calculate space size
            base_size = self.params.path_width * 0.4
            variation = self.params.space_size_variation
            size_factor = 1.0 + (random_module.random() * 2.0 - 1.0) * variation
            width = base_size * size_factor
            depth = base_size * size_factor
            height = self.params.wall_height
            
            # Create wireframe box
            self._create_wireframe_box(
                position=position,
                size=(width, depth, height),
                orientation=orientation,
                color=color,
                name=f"Space_{index:03d}_{side}",
                space_type="road_side"
            )
    
    def _get_preview_sides_for_index(self, index: int) -> list:
        """Determine which sides to preview for this index."""
        placement = self.params.side_placement
        
        if placement == "left":
            return ["left"]
        elif placement == "right":
            return ["right"]
        elif placement == "both":
            return ["left", "right"]
        elif placement == "alternating":
            return ["left"] if index % 2 == 0 else ["right"]
        else:
            return ["left", "right"]
    
    def _calculate_orientation_quat(self, tangent: mathutils.Vector, normal: mathutils.Vector) -> mathutils.Quaternion:
        """
        Calculate orientation quaternion from tangent and normal vectors.
        Matches the layout_generator logic.
        
        Args:
            tangent: Forward direction
            normal: Up direction
        
        Returns:
            Orientation as quaternion
        """
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
        
        return mat.to_quaternion()
    
    def _create_wireframe_box(self, position: mathutils.Vector, size: tuple, 
                              orientation: mathutils.Quaternion, color: tuple, 
                              name: str, space_type: str):
        """
        Create a wireframe box showing space boundaries.
        
        Args:
            position: Center position
            size: (width, depth, height)
            orientation: Rotation quaternion
            color: RGBA color tuple
            name: Object name
            space_type: Type of space (for metadata)
        """
        # Create a cube mesh
        bpy.ops.mesh.primitive_cube_add(
            size=1.0,
            location=position
        )
        
        box = bpy.context.active_object
        box.name = f"Preview_{name}"
        
        # Scale to size
        box.scale = (size[0], size[1], size[2])
        
        # Apply orientation
        box.rotation_mode = 'QUATERNION'
        box.rotation_quaternion = orientation
        
        # Set to wireframe display
        box.display_type = 'WIRE'
        
        # Create material for color
        mat_name = f"PCG_Preview_Space_{space_type}"
        mat = bpy.data.materials.get(mat_name)
        
        if mat is None:
            mat = bpy.data.materials.new(name=mat_name)
            mat.use_nodes = True
            nodes = mat.node_tree.nodes
            bsdf = nodes.get("Principled BSDF")
            if bsdf:
                bsdf.inputs["Base Color"].default_value = color
                bsdf.inputs["Emission"].default_value = color
                bsdf.inputs["Emission Strength"].default_value = 0.5
        
        # Assign material
        if box.data.materials:
            box.data.materials[0] = mat
        else:
            box.data.materials.append(mat)
        
        # Move to preview collection
        for coll in box.users_collection:
            coll.objects.unlink(box)
        self.preview_collection.objects.link(box)
        
        # Store metadata
        box["pcg_preview"] = True
        box["preview_type"] = "space_boundary"
        box["space_type"] = space_type
    
    def _create_lateral_space_previews(self, main_path_points: List[SplinePoint]):
        """
        Create previews for lateral spaces that branch off the main path.
        Matches the layout_generator logic.
        
        Args:
            main_path_points: Points along the main path
        """
        import random
        
        num_main_spaces = len(main_path_points)
        num_lateral = int(num_main_spaces * self.params.lateral_density)
        
        if num_lateral == 0:
            return
        
        # Select random points to branch from
        branch_indices = random.sample(range(num_main_spaces), min(num_lateral, num_main_spaces))
        
        for idx in branch_indices:
            main_point = main_path_points[idx]
            
            # Create 1-2 lateral spaces per branch point
            num_branches = random.randint(1, 2)
            
            for _ in range(num_branches):
                # Calculate lateral offset direction
                orientation = self._calculate_orientation_quat(main_point.tangent, main_point.normal)
                right = orientation @ mathutils.Vector((1, 0, 0))
                
                # Random left or right
                if random.random() < 0.5:
                    offset_direction = right
                else:
                    offset_direction = -right
                
                # Random distance from main path
                lateral_distance = self.params.path_width * random.uniform(0.5, 1.5)
                
                # Calculate position
                lateral_pos = main_point.position + offset_direction * lateral_distance
                
                # Size similar to main space with variation
                base_size = self.params.path_width * 0.5
                size_factor = random.uniform(0.7, 1.3)
                width = base_size * size_factor
                depth = base_size * size_factor
                height = self.params.wall_height
                
                # Lateral spaces are typically more open
                space_type = random.choice(["open", "semi_open"])
                color = (0.2, 1.0, 0.2, 1.0) if space_type == "open" else (1.0, 1.0, 0.2, 1.0)
                
                # Create wireframe box
                self._create_wireframe_box(
                    position=lateral_pos,
                    size=(width, depth, height),
                    orientation=orientation,
                    color=color,
                    name=f"Lateral_{idx}_{_}",
                    space_type=space_type
                )
    
    def _create_metric_labels(self, points: List[SplinePoint], sampler: SplineSampler):
        """
        Create text labels showing key metrics in the viewport.
        
        Args:
            points: List of sampled points
            sampler: SplineSampler instance for getting spline info
        """
        # Get spline length
        spline_length = sampler.get_spline_length()
        
        # Calculate center position for labels (above the spline)
        if points:
            # Find the midpoint of the spline
            mid_index = len(points) // 2
            mid_point = points[mid_index].position
            label_height = self.params.wall_height * 2  # Place labels above content
            
            # Create label positions
            label_positions = [
                (mid_point + mathutils.Vector((0, 0, label_height)), "METRICS"),
                (mid_point + mathutils.Vector((0, 0, label_height + 2)), f"Spline Length: {spline_length:.1f}m"),
                (mid_point + mathutils.Vector((0, 0, label_height + 4)), f"Spacing: {self.params.spacing:.1f}m"),
                (mid_point + mathutils.Vector((0, 0, label_height + 6)), f"Path Width: {self.params.path_width:.1f}m"),
                (mid_point + mathutils.Vector((0, 0, label_height + 8)), f"Sample Points: {len(points)}"),
                (mid_point + mathutils.Vector((0, 0, label_height + 10)), f"Est. Spaces: {len(points) + int(len(points) * self.params.lateral_density)}"),
            ]
            
            # Create text objects for each label
            for i, (pos, text) in enumerate(label_positions):
                self._create_text_label(pos, text, f"Label_{i}")
    
    def _create_text_label(self, position: mathutils.Vector, text: str, name: str):
        """
        Create a text object at the specified position.
        
        Args:
            position: World position for the text
            text: Text content to display
            name: Name for the text object
        """
        # Create text curve
        text_data = bpy.data.curves.new(name=f"Preview_{name}", type='FONT')
        text_data.body = text
        text_data.size = 1.0
        text_data.align_x = 'CENTER'
        text_data.align_y = 'CENTER'
        
        # Create text object
        text_obj = bpy.data.objects.new(f"Preview_{name}", text_data)
        text_obj.location = position
        
        # Make text always face camera (billboard effect)
        # Add a constraint to track camera
        constraint = text_obj.constraints.new(type='TRACK_TO')
        constraint.track_axis = 'TRACK_Z'
        constraint.up_axis = 'UP_Y'
        
        # Try to find active camera
        if bpy.context.scene.camera:
            constraint.target = bpy.context.scene.camera
        
        # Set color (yellow for visibility)
        text_data.materials.clear()
        mat_name = "PCG_Preview_Text_Material"
        mat = bpy.data.materials.get(mat_name)
        
        if mat is None:
            mat = bpy.data.materials.new(name=mat_name)
            mat.use_nodes = True
            nodes = mat.node_tree.nodes
            bsdf = nodes.get("Principled BSDF")
            if bsdf:
                bsdf.inputs["Base Color"].default_value = (1.0, 1.0, 0.0, 1.0)  # Yellow
                bsdf.inputs["Emission"].default_value = (1.0, 1.0, 0.0, 1.0)  # Emit light
                bsdf.inputs["Emission Strength"].default_value = 2.0
        
        text_data.materials.append(mat)
        
        # Add to preview collection
        self.preview_collection.objects.link(text_obj)
        
        # Store metadata
        text_obj["pcg_preview"] = True
        text_obj["preview_type"] = "metric_label"
    
    def _create_spacing_indicators(self, points: List[SplinePoint]):
        """
        Create visual indicators showing spacing between points.
        
        Args:
            points: List of sampled points
        """
        # Create lines between consecutive points to show spacing
        for i in range(len(points) - 1):
            p1 = points[i].position
            p2 = points[i + 1].position
            
            # Create a line between points
            self._create_dimension_line(p1, p2, f"Spacing_{i}")
    
    def _create_dimension_line(self, start: mathutils.Vector, end: mathutils.Vector, name: str):
        """
        Create a dimension line between two points.
        
        Args:
            start: Start position
            end: End position
            name: Name for the line object
        """
        # Create curve for the line
        curve_data = bpy.data.curves.new(name=f"Preview_{name}", type='CURVE')
        curve_data.dimensions = '3D'
        
        # Create spline
        spline = curve_data.splines.new('POLY')
        spline.points.add(1)  # Add one more point (total 2)
        spline.points[0].co = (start.x, start.y, start.z, 1)
        spline.points[1].co = (end.x, end.y, end.z, 1)
        
        # Create object
        line_obj = bpy.data.objects.new(f"Preview_{name}", curve_data)
        
        # Set line properties
        curve_data.bevel_depth = 0.05
        curve_data.bevel_resolution = 2
        
        # Set color (white for dimension lines)
        mat_name = "PCG_Preview_Line_Material"
        mat = bpy.data.materials.get(mat_name)
        
        if mat is None:
            mat = bpy.data.materials.new(name=mat_name)
            mat.use_nodes = True
            nodes = mat.node_tree.nodes
            bsdf = nodes.get("Principled BSDF")
            if bsdf:
                bsdf.inputs["Base Color"].default_value = (1.0, 1.0, 1.0, 1.0)  # White
                bsdf.inputs["Emission"].default_value = (1.0, 1.0, 1.0, 1.0)
                bsdf.inputs["Emission Strength"].default_value = 1.0
        
        curve_data.materials.append(mat)
        
        # Add to preview collection
        self.preview_collection.objects.link(line_obj)
        
        # Store metadata
        line_obj["pcg_preview"] = True
        line_obj["preview_type"] = "dimension_line"
        
        # Add distance label at midpoint
        midpoint = (start + end) / 2
        distance = (end - start).length
        self._create_text_label(
            midpoint + mathutils.Vector((0, 0, 1)),
            f"{distance:.1f}m",
            f"{name}_dist"
        )
