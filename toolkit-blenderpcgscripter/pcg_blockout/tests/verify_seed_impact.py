
import sys
import os
import mathutils
import random
from unittest.mock import MagicMock

# Mock bpy
sys.modules['bpy'] = MagicMock()
sys.modules['bpy.types'] = MagicMock()
sys.modules['bpy.props'] = MagicMock()

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Now we can import
from core.parameters import GenerationParams
from core.spline_sampler import SplinePoint
from generators.layout_generator import LayoutGenerator

def test_seed_impact():
    print("Testing seed impact on LayoutGenerator...")
    
    # Mock spline points
    spline_points = []
    for i in range(10):
        pos = mathutils.Vector((i * 10, 0, 0))
        tangent = mathutils.Vector((1, 0, 0))
        normal = mathutils.Vector((0, 0, 1))
        spline_points.append(SplinePoint(pos, tangent, normal, 1.0))
    
    # Run 1: Seed 123
    params1 = GenerationParams()
    params1.space_size_variation = 0.5
    params1.path_width = 20.0
    params1.wall_height = 3.0
    params1.road_mode_enabled = False
    
    gen1 = LayoutGenerator(123, params1, spline_points)
    spaces1 = gen1.generate()
    
    print(f"Run 1 (Seed 123): Generated {len(spaces1)} spaces")
    sizes1 = [s.size.x for s in spaces1]
    print(f"Sizes 1: {sizes1[:5]}...")
    
    # Run 2: Seed 123 (Should be identical)
    gen2 = LayoutGenerator(123, params1, spline_points)
    spaces2 = gen2.generate()
    sizes2 = [s.size.x for s in spaces2]
    
    if sizes1 == sizes2:
        print("SUCCESS: Same seed produced identical results.")
    else:
        print("FAILURE: Same seed produced different results!")
        return
        
    # Run 3: Seed 456 (Should be different)
    gen3 = LayoutGenerator(456, params1, spline_points)
    spaces3 = gen3.generate()
    sizes3 = [s.size.x for s in spaces3]
    print(f"Sizes 3 (Seed 456): {sizes3[:5]}...")
    
    if sizes1 != sizes3:
        print("SUCCESS: Different seed produced different results.")
    else:
        print("FAILURE: Different seed produced identical results!")

if __name__ == "__main__":
    test_seed_impact()
