"""Interfaces for decoupling core logic from Blender API."""

from abc import ABC, abstractmethod
from typing import List, Tuple, Any
import mathutils

class AbstractSpline(ABC):
    """Abstract interface for a spline."""
    
    @property
    @abstractmethod
    def type(self) -> str:
        """Get the type of the spline (e.g., 'BEZIER', 'POLY')."""
        pass
    
    @property
    @abstractmethod
    def points(self) -> List[Any]:
        """Get the points of the spline."""
        pass
    
    @property
    @abstractmethod
    def bezier_points(self) -> List[Any]:
        """Get the bezier points of the spline (if applicable)."""
        pass
    
    @property
    @abstractmethod
    def resolution_u(self) -> int:
        """Get the resolution of the spline."""
        pass

class AbstractCurve(ABC):
    """Abstract interface for a curve object."""
    
    @property
    @abstractmethod
    def splines(self) -> List[AbstractSpline]:
        """Get the list of splines in the curve."""
        pass
    
    @property
    @abstractmethod
    def matrix_world(self) -> mathutils.Matrix:
        """Get the world transformation matrix."""
        pass
    
    @property
    @abstractmethod
    def resolution_u(self) -> int:
        """Get the resolution of the curve."""
        pass
