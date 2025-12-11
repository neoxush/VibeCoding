# Design Document

## Overview

The PCG Level Blockout tool is implemented as a Blender 3.6.22 addon using Python and the bpy API. The system follows a modular architecture with separate generators for different content types (buildings, terrain, layouts), a parameter management system, and a UI layer that integrates into Blender's 3D viewport sidebar. The design emphasizes extensibility, allowing new generator types to be added without modifying core systems.

**Key Design Principle: Spline-Based Generation**
The tool uses a spline-driven approach where users draw a curve object in Blender to define the path of their level. The system samples points along this spline and generates spaces, building blocks, and terrain features at regular intervals. This gives users direct control over the overall layout direction while automating the detailed blockout generation.

The tool uses a seed-based random generation approach, ensuring reproducibility while providing variation. All generated content is organized into Blender collections for easy management, and the system maintains metadata about generation parameters and the source spline for future reference.

## Architecture

### High-Level Component Structure

```
PCG Level Blockout Addon
│
├── UI Layer (Blender Panel)
│   ├── Parameter Controls
│   ├── Generation Triggers
│   └── Preset Management
│
├── Core Generation Engine
│   ├── Layout Generator
│   ├── Building Block Generator
│   ├── Terrain Generator
│   └── Seed Manager
│
├── Parameter System
│   ├── Parameter Validator
│   ├── Preset Manager
│   └── Default Configurations
│
└── Scene Management
    ├── Collection Organizer
    ├── Object Naming
    └── Metadata Storage
```

### Data Flow

1. User creates or selects a spline curve in Blender
2. User adjusts parameters in UI panel
3. Parameter Validator checks input validity and spline selection
4. User triggers generation
5. Seed Manager initializes random state
6. Spline Sampler extracts points along the curve
7. Layout Generator creates spaces at sampled points
8. Building Block Generator populates spaces
9. Terrain Generator adds ground features along the spline path
10. Collection Organizer structures scene hierarchy
11. Metadata Storage saves generation info and spline reference

## Components and Interfaces

### 1. Addon Registration Module (`__init__.py`)

**Responsibility:** Register/unregister the addon with Blender

**Key Functions:**
- `register()`: Registers all classes, properties, and UI panels
- `unregister()`: Cleans up on addon disable
- `bl_info`: Metadata dictionary for Blender addon system

**Dependencies:** All other modules

### 2. UI Panel Module (`ui_panel.py`)

**Responsibility:** Provide user interface in 3D viewport sidebar

**Classes:**
- `PCG_PT_MainPanel`: Main panel container
- `PCG_PT_LayoutPanel`: Layout generation controls
- `PCG_PT_BuildingPanel`: Building block controls
- `PCG_PT_TerrainPanel`: Terrain controls
- `PCG_PT_PresetPanel`: Preset management

**Properties (stored in Scene):**
- Layout parameters: area_count, density, connectivity, seed
- Building parameters: block_types, dimensions, grid_size
- Terrain parameters: height_variation, smoothness, scale
- UI state: active_preset, show_advanced

**Interface:**
```python
class PCG_PT_MainPanel(bpy.types.Panel):
    bl_label = "PCG Level Blockout"
    bl_idname = "PCG_PT_main_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'PCG Blockout'
    
    def draw(self, context):
        # Render UI controls
```

### 3. Spline Sampler Module (`core/spline_sampler.py`)

**Responsibility:** Extract sample points from user-created spline curves

**Classes:**
- `SplineSampler`: Samples points along Blender curve objects

**Key Methods:**
```python
class SplineSampler:
    def __init__(self, curve_object):
        # Initialize with Blender curve object
        
    def sample_points(self, spacing):
        # Returns list of (position, tangent, normal) tuples
        
    def get_spline_length(self):
        # Returns total length of the spline
        
    def validate_spline(self):
        # Checks if spline is valid for generation
```

**Algorithm:**
1. Validate curve object is a valid Blender curve/spline
2. Calculate total spline length
3. Sample points at regular intervals based on spacing parameter
4. Extract position, tangent, and normal vectors at each point
5. Handle branching splines by sampling all branches
6. Return ordered list of sample points

### 4. Layout Generator Module (`generators/layout_generator.py`)

**Responsibility:** Generate spatial layouts along spline path

**Classes:**
- `LayoutGenerator`: Main layout generation logic
- `Space`: Represents a single area in the layout
- `Connection`: Represents pathways between spaces

**Key Methods:**
```python
class LayoutGenerator:
    def __init__(self, seed, params, spline_points):
        # Initialize with seed, parameters, and spline sample points
        
    def generate(self):
        # Returns list of Space objects
        
    def create_spaces_along_path(self):
        # Creates spaces at spline sample points
        
    def add_lateral_spaces(self):
        # Adds spaces branching off the main path
        
    def ensure_connectivity(self):
        # Validates all spaces are reachable
```

**Algorithm:**
1. Initialize random state with seed
2. Create primary spaces at each spline sample point
3. Orient spaces based on spline tangent/normal vectors
4. Vary space sizes based on parameters and position along path
5. Add lateral spaces branching off the main path based on density
6. Create connection graph between adjacent and nearby spaces
7. Ensure minimum connectivity (all spaces reachable)
8. Return space network data structure

### 4. Building Block Generator Module (`generators/building_generator.py`)

**Responsibility:** Create modular building blocks (walls, floors, platforms, ramps)

**Classes:**
- `BuildingBlockGenerator`: Main building generation logic
- `BlockType`: Enum for block types (WALL, FLOOR, PLATFORM, RAMP)

**Key Methods:**
```python
class BuildingBlockGenerator:
    def __init__(self, seed, params):
        # Initialize with seed and parameters
        
    def generate_block(self, block_type, position, dimensions):
        # Creates a single block mesh
        
    def populate_space(self, space):
        # Fills a space with appropriate blocks
        
    def align_to_grid(self, position):
        # Snaps position to grid
```

**Block Generation:**
- Uses `bpy.ops.mesh.primitive_cube_add()` as base
- Applies transformations for dimensions
- Sets pivot points to bottom-center for easy placement
- Applies consistent naming: `{BlockType}_{SpaceID}_{Index}`

### 5. Terrain Generator Module (`generators/terrain_generator.py`)

**Responsibility:** Generate terrain with elevation variation along spline path

**Classes:**
- `TerrainGenerator`: Main terrain generation logic
- `HeightMap`: 2D array representing elevation data

**Key Methods:**
```python
class TerrainGenerator:
    def __init__(self, seed, params, spline_points):
        # Initialize with seed, parameters, and spline points
        
    def generate_heightmap(self, bounds):
        # Creates 2D height data using Perlin noise
        
    def create_terrain_mesh(self, heightmap):
        # Converts heightmap to Blender mesh
        
    def create_flat_zones(self, zones):
        # Flattens specified areas
        
    def align_to_spline_path(self):
        # Ensures terrain follows spline elevation
```

**Algorithm:**
1. Calculate terrain bounds based on spline path and width parameters
2. Generate Perlin noise-based heightmap within bounds
3. Blend heightmap with spline elevation data for smooth transitions
4. Apply smoothing based on parameters
5. Create mesh grid from heightmap
6. Flatten designated zones (building areas)
7. Apply subdivision for smooth appearance

### 6. Seed Manager Module (`core/seed_manager.py`)

**Responsibility:** Manage random seed state for reproducibility

**Functions:**
```python
def initialize_seed(seed=None):
    # Sets random state, returns seed used
    
def get_current_seed():
    # Returns active seed value
    
def generate_random_seed():
    # Creates new random seed
```

### 7. Parameter System Module (`core/parameters.py`)

**Responsibility:** Validate and manage generation parameters

**Classes:**
- `ParameterValidator`: Validates user input
- `ParameterDefaults`: Stores default values

**Validation Rules:**
- Area count: 5-100
- Density: 0.0-1.0
- Grid size: 0.5-10.0 meters
- Height variation: 0.0-50.0 meters

### 8. Preset Manager Module (`core/preset_manager.py`)

**Responsibility:** Save and load parameter presets

**Functions:**
```python
def save_preset(name, parameters):
    # Saves preset to JSON file
    
def load_preset(name):
    # Loads preset from JSON file
    
def get_preset_list():
    # Returns available presets
    
def delete_preset(name):
    # Removes preset file
```

**Storage Location:** `{BLENDER_USER_SCRIPTS}/addons/pcg_blockout/presets/`

**Default Presets:**
- "Dense Urban": High density, small spaces, minimal terrain
- "Open Wilderness": Low density, large spaces, high terrain variation
- "Mixed Environment": Balanced parameters

### 9. Scene Management Module (`core/scene_manager.py`)

**Responsibility:** Organize generated content in Blender scene

**Functions:**
```python
def create_collection(name):
    # Creates new collection, returns reference
    
def organize_objects(objects, collection_name):
    # Moves objects to specified collection
    
def cleanup_previous_generation():
    # Removes old PCG collections
    
def store_metadata(collection, params):
    # Saves generation parameters to collection custom properties
```

**Collection Structure:**
```
PCG_Generation_{timestamp}
├── Structures
├── Terrain
└── Connections
```

## Data Models

### Space Data Structure
```python
@dataclass
class Space:
    id: int
    position: Vector  # (x, y, z)
    size: Vector      # (width, depth, height)
    type: str         # "enclosed", "open", "semi_open"
    connections: List[int]  # IDs of connected spaces
```

### Spline Sample Point
```python
@dataclass
class SplinePoint:
    position: Vector      # (x, y, z) world position
    tangent: Vector       # Direction along spline
    normal: Vector        # Up vector
    distance: float       # Distance along spline from start
```

### Generation Parameters
```python
@dataclass
class GenerationParams:
    # Spline
    spline_object: bpy.types.Object = None
    spacing: float = 10.0  # Distance between spaces along spline
    path_width: float = 20.0  # Width of generation area around spline
    
    # Layout
    lateral_density: float = 0.5  # How many spaces branch off main path
    space_size_variation: float = 0.3  # Variation in space sizes
    seed: int = None
    
    # Building Blocks
    grid_size: float = 2.0
    wall_height: float = 3.0
    block_types: Set[str] = {"wall", "floor", "platform", "ramp"}
    
    # Terrain
    terrain_enabled: bool = True
    height_variation: float = 10.0
    smoothness: float = 0.5
    terrain_width: float = 50.0  # Width of terrain around spline
```

### Preset Data Structure
```python
{
    "name": "Dense Urban",
    "parameters": {
        "area_count": 40,
        "density": 0.8,
        "connectivity": 0.6,
        ...
    },
    "version": "1.0"
}
```

## Error Handling

### Validation Errors
- Display error messages in UI panel
- Prevent generation with invalid parameters
- Highlight problematic fields in red

### Generation Errors
- Wrap generation in try-except blocks
- Log errors to Blender console
- Display user-friendly error messages
- Provide recovery options (retry, reset parameters)

### Common Error Scenarios
1. **Insufficient space for layout**: Reduce area count or increase bounds
2. **Memory exhaustion**: Reduce terrain resolution or object count
3. **Invalid seed**: Reset to random seed
4. **Collection conflicts**: Auto-rename or prompt user

### Error Logging
```python
import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Log to Blender console
def log_error(message, exception=None):
    logger.error(f"PCG Error: {message}")
    if exception:
        logger.exception(exception)
```

## Testing Strategy

### Unit Tests
- Test each generator independently with known seeds
- Verify parameter validation logic
- Test preset save/load functionality
- Validate seed reproducibility

**Test Framework:** Python's `unittest` module

**Example Test:**
```python
class TestLayoutGenerator(unittest.TestCase):
    def test_reproducibility(self):
        gen1 = LayoutGenerator(seed=42, params=default_params)
        gen2 = LayoutGenerator(seed=42, params=default_params)
        
        layout1 = gen1.generate()
        layout2 = gen2.generate()
        
        self.assertEqual(layout1, layout2)
```

### Integration Tests
- Test full generation pipeline with various parameter combinations
- Verify collection organization
- Test UI interaction with generation system
- Validate metadata storage and retrieval

### Manual Testing Checklist
- [ ] Install addon in Blender 3.6.22
- [ ] Generate layout with default parameters
- [ ] Modify parameters and regenerate
- [ ] Test each block type generation
- [ ] Enable/disable terrain generation
- [ ] Save and load presets
- [ ] Test seed reproducibility
- [ ] Generate large layouts (performance test)
- [ ] Test cleanup functionality
- [ ] Verify collection organization

### Performance Testing
- Measure generation time for various scales:
  - Small: 10-20 areas
  - Medium: 50-100 areas
  - Large: 200+ areas
- Profile memory usage during generation
- Test responsiveness during generation
- Verify cancellation works correctly

### Compatibility Testing
- Verify addon works on Blender 3.6.22 specifically
- Test on Windows, macOS, Linux
- Verify no deprecated API usage
