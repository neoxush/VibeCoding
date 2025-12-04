import pytest
from unittest.mock import MagicMock, patch
import mathutils

# Import the module under test
# Note: bpy is already mocked by conftest.py
from ..generators.building_generator import BuildingBlockGenerator
from ..core.parameters import GenerationParams
from ..core.layer_system import LayerConfig, PlacementRule

class TestRandomScattering:
    
    def test_process_layer_with_collection(self):
        """Test that objects are picked from the specified collection."""
        
        # Setup mocks
        mock_collection = MagicMock()
        mock_obj1 = MagicMock()
        mock_obj1.type = 'MESH'
        mock_obj1.name = "Mesh1"
        
        mock_obj2 = MagicMock()
        mock_obj2.type = 'MESH'
        mock_obj2.name = "Mesh2"
        
        # Setup copy behavior
        mock_copy1 = MagicMock()
        mock_obj1.copy.return_value = mock_copy1
        
        mock_collection.objects = [mock_obj1, mock_obj2]
        
        # Mock bpy.data.collections.get to return our mock collection
        with patch('bpy.data.collections.get', return_value=mock_collection) as mock_get_collection:
            with patch('bpy.context.collection.objects.link') as mock_link:
                # Setup generator
                params = GenerationParams()
                generator = BuildingBlockGenerator(seed=42, params=params)
                
                # Setup layer
                layer = LayerConfig(
                    name="ScatterLayer",
                    enabled=True,
                    rule=PlacementRule.SCATTER,
                    collection_name="TestCollection",
                    density=1.0 # Ensure we generate at least one point
                )
                
                # Setup space
                space = MagicMock()
                space.id = 1
                space.size = (10, 10, 10)
                space.position = mathutils.Vector((0, 0, 0))
                
                # Run
                blocks = generator._process_layer(layer, space, 0)
                
                # Verify
                mock_get_collection.assert_called_with("TestCollection")
                
                # Should have generated some blocks
                assert len(blocks) > 0
                
                # Verify that objects were copied and linked
                # Since we mocked random, we might not know exactly which one was picked unless we patch random too,
                # but we can check that copy was called on one of them.
                assert mock_obj1.copy.called or mock_obj2.copy.called
                assert mock_link.called

    def test_process_layer_fallback(self):
        """Test fallback to cube when collection is missing."""
        
        with patch('bpy.data.collections.get', return_value=None):
            with patch('bpy.ops.mesh.primitive_cube_add') as mock_cube_add:
                # Setup generator
                params = GenerationParams()
                generator = BuildingBlockGenerator(seed=42, params=params)
                
                # Setup layer with non-existent collection
                layer = LayerConfig(
                    name="ScatterLayer",
                    enabled=True,
                    rule=PlacementRule.SCATTER,
                    collection_name="NonExistent",
                    density=1.0
                )
                
                space = MagicMock()
                space.id = 1
                space.size = (10, 10, 10)
                space.position = mathutils.Vector((0, 0, 0))
                
                # Run
                generator._process_layer(layer, space, 0)
                
                # Verify fallback
                mock_cube_add.assert_called()
