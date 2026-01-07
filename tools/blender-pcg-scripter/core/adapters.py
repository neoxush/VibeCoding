"""Adapters for Blender objects to conform to core interfaces."""

from typing import List, Any
import mathutils
from .interfaces import AbstractCurve, AbstractSpline

class BlenderSplineAdapter(AbstractSpline):
    """Adapter for a Blender spline object."""
    
    def __init__(self, blender_spline: Any, resolution_u: int):
        self._spline = blender_spline
        self._resolution_u = resolution_u
        
    @property
    def type(self) -> str:
        return self._spline.type
    
    @property
    def points(self) -> List[Any]:
        return self._spline.points
    
    @property
    def bezier_points(self) -> List[Any]:
        return self._spline.bezier_points
        
    @property
    def resolution_u(self) -> int:
        return self._resolution_u

class BlenderCurveAdapter(AbstractCurve):
    """Adapter for a Blender curve object."""
    
    def __init__(self, blender_obj: Any):
        if blender_obj.type != 'CURVE':
            raise ValueError("Object is not a curve")
        self._obj = blender_obj
        self._data = blender_obj.data
        
    @property
    def splines(self) -> List[AbstractSpline]:
        return [BlenderSplineAdapter(s, self._data.resolution_u) for s in self._data.splines]
    
    @property
    def matrix_world(self) -> mathutils.Matrix:
        return self._obj.matrix_world
        
    @property
    def resolution_u(self) -> int:
        return self._data.resolution_u
