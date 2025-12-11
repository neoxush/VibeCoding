import unittest
import os
import json
from unittest.mock import patch, mock_open
from pcg_blockout.core.parameters import GenerationParams
from pcg_blockout.core import preset_manager

class TestPresetManager(unittest.TestCase):
    def test_generation_params_serialization(self):
        params = GenerationParams(
            spacing=15.0,
            path_width=25.0,
            block_types={"wall", "floor"}
        )
        
        data = params.to_dict()
        
        self.assertEqual(data["spacing"], 15.0)
        self.assertEqual(data["path_width"], 25.0)
        self.assertIn("wall", data["block_types"])
        self.assertIn("floor", data["block_types"])
        
        # Test deserialization
        new_params = GenerationParams.from_dict(data)
        self.assertEqual(new_params.spacing, 15.0)
        self.assertEqual(new_params.path_width, 25.0)
        self.assertEqual(new_params.block_types, {"wall", "floor"})

    @patch("pcg_blockout.core.preset_manager.get_preset_directory")
    def test_save_preset(self, mock_get_dir):
        mock_get_dir.return_value = "/tmp/presets"
        
        params = GenerationParams()
        
        with patch("builtins.open", mock_open()) as mock_file:
            success = preset_manager.save_preset("test_preset", params)
            
            self.assertTrue(success)
            mock_file.assert_called_with(os.path.join("/tmp/presets", "test_preset.json"), 'w')
            
            # Verify JSON content
            handle = mock_file()
            args, _ = handle.write.call_args
            written_data = json.loads(args[0]) if args else json.loads(handle.write.call_args_list[0][0][0])
            
            self.assertEqual(written_data["name"], "test_preset")
            self.assertIn("parameters", written_data)

    @patch("pcg_blockout.core.preset_manager.get_preset_directory")
    def test_load_preset(self, mock_get_dir):
        mock_get_dir.return_value = "/tmp/presets"
        
        preset_data = {
            "name": "test_preset",
            "version": "1.0",
            "parameters": {
                "spacing": 12.0
            }
        }
        
        with patch("os.path.exists", return_value=True):
            with patch("builtins.open", mock_open(read_data=json.dumps(preset_data))):
                loaded_params = preset_manager.load_preset("test_preset")
                
                self.assertIsNotNone(loaded_params)
                self.assertEqual(loaded_params["spacing"], 12.0)

if __name__ == '__main__':
    unittest.main()
