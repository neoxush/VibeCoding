import unittest
from typing import List, Any
from pcg_blockout.core.interfaces import AbstractCurve, AbstractSpline
from pcg_blockout.core.spline_sampler import SplineSampler
from pcg_blockout.core.errors import InvalidSplineError

# Mocks
class MockSpline(AbstractSpline):
    def __init__(self, type: str, points: List[Any], resolution_u: int = 12):
        self._type = type
        self._points = points
        self._resolution_u = resolution_u
        self._bezier_points = points if type == 'BEZIER' else []
        
    @property
    def type(self) -> str:
        return self._type
    
    @property
    def points(self) -> List[Any]:
        return self._points
    
    @property
    def bezier_points(self) -> List[Any]:
        return self._bezier_points
        
    @property
    def resolution_u(self) -> int:
        return self._resolution_u

class MockCurve(AbstractCurve):
    def __init__(self, splines: List[MockSpline]):
        self._splines = splines
        self._matrix_world = mathutils.Matrix.Identity(4)
        
    @property
    def splines(self) -> List[AbstractSpline]:
        return self._splines
    
    @property
    def matrix_world(self) -> mathutils.Matrix:
        return self._matrix_world
        
    @property
    def resolution_u(self) -> int:
        return 12

# Helper classes for points
class MockPoint:
    def __init__(self, co):
        self.co = mathutils.Vector(co)

class TestSplineSampler(unittest.TestCase):
    def test_validate_spline_valid(self):
        spline = MockSpline('POLY', [MockPoint((0,0,0)), MockPoint((1,0,0))])
        curve = MockCurve([spline])
        sampler = SplineSampler(curve)
        
        # Should not raise exception
        sampler.validate_spline()

    def test_validate_spline_no_splines(self):
        curve = MockCurve([])
        sampler = SplineSampler(curve)
        
        with self.assertRaisesRegex(InvalidSplineError, "no splines"):
            sampler.validate_spline()

    def test_get_spline_length_poly(self):
        # Create a straight line of length 10
        points = [MockPoint((0,0,0)), MockPoint((10,0,0))]
        spline = MockSpline('POLY', points)
        curve = MockCurve([spline])
        sampler = SplineSampler(curve)
        
        length = sampler.get_spline_length()
        self.assertAlmostEqual(length, 10.0)

    def test_sample_points_poly(self):
        # Line from 0 to 10. Sample every 2 units.
        points = [MockPoint((0,0,0)), MockPoint((10,0,0))]
        spline = MockSpline('POLY', points)
        curve = MockCurve([spline])
        sampler = SplineSampler(curve)
        
        samples = sampler.sample_points(2.0)
        
        # Should have points at 0, 2, 4, 6, 8, 10 (6 points)
        self.assertEqual(len(samples), 6)
        self.assertAlmostEqual(samples[0].distance, 0.0)
        self.assertAlmostEqual(samples[1].distance, 2.0)
        self.assertAlmostEqual(samples[-1].distance, 10.0)

if __name__ == '__main__':
    unittest.main()
