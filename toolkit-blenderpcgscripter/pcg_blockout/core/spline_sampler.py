"""Spline sampling system for extracting points along Blender curve objects."""

import bpy
import mathutils
from dataclasses import dataclass
from typing import List, Optional, Tuple


@dataclass
class SplinePoint:
    """Represents a sampled point along a spline curve."""
    position: mathutils.Vector  # (x, y, z) world position
    tangent: mathutils.Vector   # Direction along spline
    normal: mathutils.Vector    # Up vector
    distance: float             # Distance along spline from start


class SplineSampler:
    """Samples points along Blender curve objects."""
    
    def __init__(self, curve_object: bpy.types.Object):
        """
        Initialize the spline sampler.
        
        Args:
            curve_object: Blender curve object to sample from
        """
        self.curve_object = curve_object
        self.curve_data = curve_object.data if curve_object else None
    
    def validate_spline(self) -> Tuple[bool, str]:
        """
        Check if the curve is valid for generation.
        
        Returns:
            Tuple of (is_valid, error_message)
        """
        if self.curve_object is None:
            return False, "No curve object provided"
        
        if self.curve_object.type != 'CURVE':
            return False, "Selected object is not a curve"
        
        if not self.curve_data:
            return False, "Curve has no data"
        
        if not self.curve_data.splines:
            return False, "Curve has no splines"
        
        if len(self.curve_data.splines) == 0:
            return False, "Curve has no splines"
        
        return True, ""
    
    def get_spline_length(self) -> float:
        """
        Calculate the total length of the spline.
        
        Returns:
            Total length in Blender units
        """
        if not self.curve_data or not self.curve_data.splines:
            return 0.0
        
        total_length = 0.0
        
        # Calculate length for each spline
        for spline in self.curve_data.splines:
            # Use resolution to estimate length
            resolution = self.curve_data.resolution_u
            
            if spline.type == 'BEZIER':
                # For Bezier curves, sample points and calculate distances
                num_points = len(spline.bezier_points)
                if num_points < 2:
                    continue
                
                # Sample points along the curve
                prev_point = None
                for i in range(num_points * resolution):
                    t = i / (num_points * resolution - 1) if num_points * resolution > 1 else 0
                    point = self._evaluate_bezier_spline(spline, t)
                    
                    if prev_point is not None:
                        total_length += (point - prev_point).length
                    
                    prev_point = point
            
            elif spline.type == 'POLY':
                # For poly curves, sum distances between points
                points = spline.points
                for i in range(len(points) - 1):
                    p1 = self.curve_object.matrix_world @ mathutils.Vector(points[i].co[:3])
                    p2 = self.curve_object.matrix_world @ mathutils.Vector(points[i + 1].co[:3])
                    total_length += (p2 - p1).length
        
        return total_length
    
    def _evaluate_bezier_spline(self, spline, t: float) -> mathutils.Vector:
        """
        Evaluate a position on a Bezier spline at parameter t.
        
        Args:
            spline: The Bezier spline to evaluate
            t: Parameter value (0.0 to 1.0)
        
        Returns:
            World space position
        """
        num_segments = len(spline.bezier_points) - 1
        if num_segments < 1:
            return self.curve_object.matrix_world @ spline.bezier_points[0].co
        
        # Determine which segment we're on
        segment_t = t * num_segments
        segment_index = min(int(segment_t), num_segments - 1)
        local_t = segment_t - segment_index
        
        # Get the two control points for this segment
        p0 = spline.bezier_points[segment_index]
        p1 = spline.bezier_points[segment_index + 1]
        
        # Cubic Bezier interpolation
        a = p0.co
        b = p0.handle_right
        c = p1.handle_left
        d = p1.co
        
        # Bezier formula: (1-t)³a + 3(1-t)²tb + 3(1-t)t²c + t³d
        t2 = local_t * local_t
        t3 = t2 * local_t
        mt = 1.0 - local_t
        mt2 = mt * mt
        mt3 = mt2 * mt
        
        point = mt3 * a + 3 * mt2 * local_t * b + 3 * mt * t2 * c + t3 * d
        
        # Transform to world space
        return self.curve_object.matrix_world @ point

    
    def sample_points(self, spacing: float) -> List[SplinePoint]:
        """
        Extract points at regular intervals along the spline.
        
        Args:
            spacing: Distance between sample points
        
        Returns:
            List of SplinePoint objects
        """
        if not self.curve_data or not self.curve_data.splines:
            return []
        
        sample_points = []
        total_distance = 0.0
        
        # Sample each spline in the curve
        for spline in self.curve_data.splines:
            spline_samples = self._sample_single_spline(spline, spacing, total_distance)
            sample_points.extend(spline_samples)
            
            # Update total distance for next spline
            if spline_samples:
                total_distance = spline_samples[-1].distance
        
        return sample_points
    
    def _sample_single_spline(self, spline, spacing: float, start_distance: float) -> List[SplinePoint]:
        """
        Sample points from a single spline.
        
        Args:
            spline: The spline to sample
            spacing: Distance between sample points
            start_distance: Starting distance value for this spline
        
        Returns:
            List of SplinePoint objects
        """
        samples = []
        
        if spline.type == 'BEZIER':
            samples = self._sample_bezier_spline(spline, spacing, start_distance)
        elif spline.type == 'POLY':
            samples = self._sample_poly_spline(spline, spacing, start_distance)
        
        return samples
    
    def _sample_bezier_spline(self, spline, spacing: float, start_distance: float) -> List[SplinePoint]:
        """
        Sample points from a Bezier spline.
        
        Args:
            spline: The Bezier spline to sample
            spacing: Distance between sample points
            start_distance: Starting distance value
        
        Returns:
            List of SplinePoint objects
        """
        samples = []
        num_points = len(spline.bezier_points)
        
        if num_points < 2:
            return samples
        
        # Use high resolution for accurate sampling
        resolution = 100
        total_samples = num_points * resolution
        
        accumulated_distance = 0.0
        next_sample_distance = 0.0
        prev_pos = None
        
        for i in range(total_samples):
            t = i / (total_samples - 1) if total_samples > 1 else 0
            
            # Evaluate position
            pos = self._evaluate_bezier_spline(spline, t)
            
            # Calculate distance traveled
            if prev_pos is not None:
                accumulated_distance += (pos - prev_pos).length
            
            # Check if we should create a sample point
            if accumulated_distance >= next_sample_distance:
                # Calculate tangent (direction)
                tangent = self._calculate_tangent_bezier(spline, t)
                
                # Calculate normal (up vector)
                normal = self._calculate_normal(tangent)
                
                # Create sample point
                sample = SplinePoint(
                    position=pos.copy(),
                    tangent=tangent.normalized(),
                    normal=normal.normalized(),
                    distance=start_distance + accumulated_distance
                )
                samples.append(sample)
                
                # Update next sample distance
                next_sample_distance += spacing
            
            prev_pos = pos
        
        return samples
    
    def _sample_poly_spline(self, spline, spacing: float, start_distance: float) -> List[SplinePoint]:
        """
        Sample points from a poly spline.
        
        Args:
            spline: The poly spline to sample
            spacing: Distance between sample points
            start_distance: Starting distance value
        
        Returns:
            List of SplinePoint objects
        """
        samples = []
        points = spline.points
        
        if len(points) < 2:
            return samples
        
        accumulated_distance = 0.0
        next_sample_distance = 0.0
        
        for i in range(len(points) - 1):
            p1 = self.curve_object.matrix_world @ mathutils.Vector(points[i].co[:3])
            p2 = self.curve_object.matrix_world @ mathutils.Vector(points[i + 1].co[:3])
            
            segment_vec = p2 - p1
            segment_length = segment_vec.length
            
            if segment_length == 0:
                continue
            
            segment_dir = segment_vec.normalized()
            
            # Sample along this segment
            while accumulated_distance + segment_length >= next_sample_distance:
                # Calculate position along segment
                local_dist = next_sample_distance - accumulated_distance
                pos = p1 + segment_dir * local_dist
                
                # Calculate normal
                normal = self._calculate_normal(segment_dir)
                
                # Create sample point
                sample = SplinePoint(
                    position=pos.copy(),
                    tangent=segment_dir.copy(),
                    normal=normal.normalized(),
                    distance=start_distance + next_sample_distance
                )
                samples.append(sample)
                
                next_sample_distance += spacing
            
            accumulated_distance += segment_length
        
        return samples
    
    def _calculate_tangent_bezier(self, spline, t: float) -> mathutils.Vector:
        """
        Calculate the tangent (derivative) at parameter t on a Bezier spline.
        
        Args:
            spline: The Bezier spline
            t: Parameter value (0.0 to 1.0)
        
        Returns:
            Tangent vector
        """
        num_segments = len(spline.bezier_points) - 1
        if num_segments < 1:
            return mathutils.Vector((1, 0, 0))
        
        # Determine which segment
        segment_t = t * num_segments
        segment_index = min(int(segment_t), num_segments - 1)
        local_t = segment_t - segment_index
        
        # Get control points
        p0 = spline.bezier_points[segment_index]
        p1 = spline.bezier_points[segment_index + 1]
        
        a = p0.co
        b = p0.handle_right
        c = p1.handle_left
        d = p1.co
        
        # Derivative of cubic Bezier: 3(1-t)²(b-a) + 6(1-t)t(c-b) + 3t²(d-c)
        mt = 1.0 - local_t
        mt2 = mt * mt
        t2 = local_t * local_t
        
        tangent = 3 * mt2 * (b - a) + 6 * mt * local_t * (c - b) + 3 * t2 * (d - c)
        
        # Transform to world space (rotation only)
        tangent = self.curve_object.matrix_world.to_3x3() @ tangent
        
        if tangent.length < 0.001:
            return mathutils.Vector((1, 0, 0))
        
        return tangent
    
    def _calculate_normal(self, tangent: mathutils.Vector) -> mathutils.Vector:
        """
        Calculate a normal (up) vector perpendicular to the tangent.
        
        Args:
            tangent: The tangent vector
        
        Returns:
            Normal vector perpendicular to tangent
        """
        # Use world up as reference
        world_up = mathutils.Vector((0, 0, 1))
        
        # If tangent is parallel to world up, use a different reference
        if abs(tangent.normalized().dot(world_up)) > 0.99:
            world_up = mathutils.Vector((0, 1, 0))
        
        # Calculate normal using cross product
        right = tangent.cross(world_up).normalized()
        normal = right.cross(tangent).normalized()
        
        return normal
