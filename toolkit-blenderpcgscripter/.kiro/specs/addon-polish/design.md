# Design Document

## Overview

This design document outlines the architectural improvements and refactoring needed to polish the PCG Level Blockout Blender addon to production quality. The focus is on fixing critical bugs, improving code quality, enhancing user experience, and establishing maintainable patterns for future development.

## Architecture

### Current Architecture Analysis

The addon follows a modular architecture with clear separation of concerns:

```
UI Layer (ui_panel.py)
    ↓
Core Systems (core/)
    - seed_manager: Global seed state
    - spline_sampler: Curve sampling
    - preview_manager: Preview visualization
    - scene_manager: Collection organization
    - parameters: Data structures & validation
    ↓
Generators (generators/)
    - layout_generator: Space creation
    - building_generator: Block creation
    - terrain_generator: Terrain creation
```

### Critical Issues Identified

1. **Seed Management**: Global state in `seed_manager` causes preview/generation mismatch
2. **Code Duplication**: Preview and generation use different code paths for the same logic
3. **Terrain Quality**: Simple random noise instead of proper Perlin noise
4. **Error Handling**: Inconsistent error handling and logging
5. **Type Safety**: Missing type hints in many functions

### Proposed Architecture Improvements

```
UI Layer (ui_panel.py)
    ↓
Core Systems (core/)
    - seed_context: Context-based seed management (NEW)
    - spline_sampler: Enhanced with caching
    - preview_manager: Refactored to reuse generators
    - scene_manager: Enhanced with cleanup
    - parameters: Enhanced validation
    - logger: Centralized logging (NEW)
    ↓
Generators (generators/)
    - layout_generator: Refactored for reusability
    - building_generator: Enhanced error handling
    - terrain_generator: Perlin noise implementation
    - base_generator: Abstract base class (NEW)
```

## Components and Interfaces

### 1. Seed Context Manager (NEW)

**Purpose**: Replace global seed state with context-based management

**Interface**:
```python
class SeedContext:
    """Context manager for seed-based random generation."""
    
    def __init__(self, seed: Optional[int] = None):
        """Initialize with seed (None = generate random)."""
        self.seed = seed if seed is not None else self._generate_seed()
        self.original_state = None
    
    def __enter__(self) -> int:
        """Enter context and set random seed."""
        self.original_state = random.getstate()
        random.seed(self.seed)
        return self.seed
    
    def __exit__(self, *args):
        """Restore original random state."""
        if self.original_state:
            random.setstate(self.original_state)
    
    @staticmethod
    def _generate_seed() -> int:
        """Generate a random seed value."""
        return int(time.time() * 1000) % (2**31)
```

**Benefits**:
- No global state
- Automatic cleanup
- Thread-safe
- Predictable behavior

### 2. Centralized Logger (NEW)

**Purpose**: Provide consistent logging across all modules

**Interface**:
```python
class PCGLogger:
    """Centralized logging for PCG addon."""
    
    @staticmethod
    def info(message: str, context: str = ""):
        """Log info message."""
        print(f"[PCG] {context}: {message}")
    
    @staticmethod
    def warning(message: str, context: str = ""):
        """Log warning message."""
        print(f"[PCG WARNING] {context}: {message}")
    
    @staticmethod
    def error(message: str, context: str = "", exc_info: bool = False):
        """Log error message with optional traceback."""
        print(f"[PCG ERROR] {context}: {message}")
        if exc_info:
            import traceback
            traceback.print_exc()
    
    @staticmethod
    def debug(message: str, context: str = "", enabled: bool = False):
        """Log debug message (only if enabled)."""
        if enabled:
            print(f"[PCG DEBUG] {context}: {message}")
```

### 3. Base Generator Class (NEW)

**Purpose**: Establish common patterns for all generators

**Interface**:
```python
class BaseGenerator(ABC):
    """Abstract base class for all generators."""
    
    def __init__(self, seed: int, params: GenerationParams):
        self.seed = seed
        self.params = params
        self.logger = PCGLogger()
    
    @abstractmethod
    def generate(self) -> Any:
        """Generate content. Must be implemented by subclasses."""
        pass
    
    def validate_params(self) -> Tuple[bool, List[str]]:
        """Validate parameters before generation."""
        return ParameterValidator.validate_all(self.params)
    
    def log_generation_start(self):
        """Log generation start with parameters."""
        self.logger.info(f"Starting generation with seed {self.seed}", 
                        context=self.__class__.__name__)
    
    def log_generation_complete(self, result_count: int):
        """Log generation completion."""
        self.logger.info(f"Generated {result_count} items", 
                        context=self.__class__.__name__)
```

### 4. Refactored Preview Manager

**Purpose**: Eliminate code duplication by reusing generator logic

**Key Changes**:
- Use `LayoutGenerator` directly instead of duplicating logic
- Use `SeedContext` for consistent seed management
- Separate visualization from generation logic

**New Architecture**:
```python
class PreviewManager:
    def __init__(self, params: GenerationParams, spline_object: bpy.types.Object):
        self.params = params
        self.spline_object = spline_object
        self.preview_collection = None
        self.cached_spaces = None  # Cache for reuse in generation
    
    def create_preview(self) -> bool:
        """Generate preview using actual generator logic."""
        # Use SeedContext for consistent seed management
        seed = self.params.seed if self.params.seed else SeedContext._generate_seed()
        
        with SeedContext(seed) as actual_seed:
            # Sample spline
            sampler = SplineSampler(self.spline_object)
            points = sampler.sample_points(self.params.spacing)
            
            # Use actual LayoutGenerator
            layout_gen = LayoutGenerator(actual_seed, self.params, points)
            self.cached_spaces = layout_gen.generate()
            
            # Visualize the spaces
            self._visualize_spaces(self.cached_spaces)
            self._create_metric_labels(points, sampler)
        
        return True
    
    def _visualize_spaces(self, spaces: List[Space]):
        """Create visual representations of spaces."""
        for space in spaces:
            self._create_wireframe_box(space)
    
    def get_cached_spaces(self) -> Optional[List[Space]]:
        """Get cached spaces for reuse in generation."""
        return self.cached_spaces
```

### 5. Enhanced Layout Generator

**Purpose**: Make generator reusable for both preview and generation

**Key Changes**:
- Accept seed via constructor (no global state)
- Return structured data (Space objects)
- Add comprehensive logging
- Improve error handling

**Interface** (already good, minor enhancements):
```python
class LayoutGenerator(BaseGenerator):
    def __init__(self, seed: int, params: GenerationParams, spline_points: List[SplinePoint]):
        super().__init__(seed, params)
        self.spline_points = spline_points
        self.spaces = []
        self.next_space_id = 0
        self._rng = random.Random(seed)  # Use instance-specific RNG
    
    def generate(self) -> List[Space]:
        """Generate layout with logging and error handling."""
        try:
            self.log_generation_start()
            
            # Create spaces
            main_spaces = self.create_spaces_along_path()
            lateral_spaces = self.add_lateral_spaces(main_spaces)
            
            all_spaces = main_spaces + lateral_spaces
            
            # Validate connectivity
            if not self.ensure_connectivity(all_spaces):
                self.logger.warning("Not all spaces are connected", 
                                   context="LayoutGenerator")
            
            self.log_generation_complete(len(all_spaces))
            return all_spaces
            
        except Exception as e:
            self.logger.error(f"Layout generation failed: {e}", 
                            context="LayoutGenerator", exc_info=True)
            raise
```

### 6. Improved Terrain Generator

**Purpose**: Generate high-quality terrain using proper Perlin noise

**Key Changes**:
- Implement Perlin noise algorithm
- Constrain terrain width to 2x path_width
- Ensure building blocks remain visible
- Better elevation blending with spline

**New Perlin Noise Implementation**:
```python
class PerlinNoise:
    """Perlin noise generator for natural-looking terrain."""
    
    def __init__(self, seed: int):
        self.seed = seed
        self.perm = self._generate_permutation_table(seed)
    
    def _generate_permutation_table(self, seed: int) -> List[int]:
        """Generate permutation table for Perlin noise."""
        rng = random.Random(seed)
        p = list(range(256))
        rng.shuffle(p)
        return p + p  # Duplicate for wrapping
    
    def noise2d(self, x: float, y: float) -> float:
        """Generate 2D Perlin noise value at (x, y)."""
        # Standard Perlin noise implementation
        # Returns value in range [-1, 1]
        ...
    
    def octave_noise2d(self, x: float, y: float, octaves: int = 4, 
                      persistence: float = 0.5) -> float:
        """Generate multi-octave Perlin noise for more natural variation."""
        total = 0.0
        frequency = 1.0
        amplitude = 1.0
        max_value = 0.0
        
        for _ in range(octaves):
            total += self.noise2d(x * frequency, y * frequency) * amplitude
            max_value += amplitude
            amplitude *= persistence
            frequency *= 2.0
        
        return total / max_value
```

**Enhanced Terrain Generator**:
```python
class TerrainGenerator(BaseGenerator):
    def __init__(self, seed: int, params: GenerationParams, spline_points: List[SplinePoint]):
        super().__init__(seed, params)
        self.spline_points = spline_points
        self.perlin = PerlinNoise(seed)
    
    def generate_heightmap(self, bounds: Tuple[float, float, float, float]) -> List[List[float]]:
        """Generate heightmap using Perlin noise."""
        min_x, max_x, min_y, max_y = bounds
        
        # Calculate resolution
        resolution = 1.0  # 1 meter per cell for better quality
        cols = int((max_x - min_x) / resolution) + 1
        rows = int((max_y - min_y) / resolution) + 1
        
        heightmap = []
        for i in range(rows):
            row = []
            for j in range(cols):
                world_x = min_x + (j / (cols - 1)) * (max_x - min_x)
                world_y = min_y + (i / (rows - 1)) * (max_y - min_y)
                
                # Generate Perlin noise value
                noise_scale = 0.05  # Adjust for terrain feature size
                noise_value = self.perlin.octave_noise2d(
                    world_x * noise_scale, 
                    world_y * noise_scale,
                    octaves=4
                )
                
                # Scale by height variation parameter
                height = noise_value * self.params.height_variation
                row.append(height)
            
            heightmap.append(row)
        
        return heightmap
    
    def constrain_terrain_width(self, heightmap: List[List[float]], 
                                bounds: Tuple[float, float, float, float]) -> List[List[float]]:
        """Constrain terrain to 2x path_width from spline."""
        max_distance = self.params.path_width * 2.0
        
        # Fade out terrain beyond max_distance
        for i in range(len(heightmap)):
            for j in range(len(heightmap[0])):
                # Calculate distance to nearest spline point
                world_pos = self._get_world_pos(i, j, bounds, heightmap)
                min_dist = self._distance_to_spline(world_pos)
                
                if min_dist > max_distance:
                    # Beyond max distance - set to zero
                    heightmap[i][j] = 0.0
                elif min_dist > self.params.path_width:
                    # Fade zone - blend to zero
                    fade_factor = 1.0 - ((min_dist - self.params.path_width) / 
                                        (max_distance - self.params.path_width))
                    heightmap[i][j] *= fade_factor
        
        return heightmap
```

### 7. Enhanced Parameter Validation

**Purpose**: Provide comprehensive validation with clear error messages

**Key Changes**:
- Add validation for parameter combinations
- Provide suggestions for fixing invalid parameters
- Validate before generation and preview

**Enhanced Validator**:
```python
class ParameterValidator:
    @classmethod
    def validate_with_suggestions(cls, params: GenerationParams) -> Tuple[bool, List[str], List[str]]:
        """
        Validate parameters and provide suggestions.
        
        Returns:
            (is_valid, errors, suggestions)
        """
        is_valid, errors = cls.validate_all(params)
        suggestions = []
        
        # Add suggestions based on parameter values
        if params.spacing > params.path_width:
            suggestions.append("Spacing is larger than path width - spaces may not overlap properly")
        
        if params.lateral_density > 0.7:
            suggestions.append("High lateral density may create cluttered layouts")
        
        if params.terrain_enabled and params.height_variation > params.wall_height:
            suggestions.append("Terrain height variation exceeds wall height - buildings may be obscured")
        
        if params.seed == 0:
            suggestions.append("Seed=0 generates random seed - use 'Randomize Seed' for reproducibility")
        
        return is_valid, errors, suggestions
```

## Road/Path Generation Mode

### Overview

The road mode feature allows generation of building blocks along the sides of a path rather than centered on the spline. This is useful for creating streets, corridors, and pathways where the spline represents the center of a clear path.

### Generation Modes

**Standard Mode (Current)**:
- Spaces are centered on the spline path
- Lateral spaces branch off randomly

**Road Mode (New)**:
- Spline represents the center of a clear path
- Spaces are offset to the sides of the path
- Path remains clear for traversal

### Side Placement Options

1. **Left**: All spaces on the left side of the path
2. **Right**: All spaces on the right side of the path
3. **Both**: Spaces on both sides (mirrored layout)
4. **Alternating**: Spaces alternate between left and right

### Implementation

**New Parameters**:
```python
@dataclass
class GenerationParams:
    # ... existing parameters ...
    
    # Road mode parameters
    road_mode_enabled: bool = False  # Enable road mode
    road_width: float = 10.0  # Width of clear path in road mode
    side_placement: str = "both"  # "left", "right", "both", "alternating"
```

**Layout Generator Enhancement**:
```python
class LayoutGenerator(BaseGenerator):
    def create_spaces_along_path(self) -> List[Space]:
        """Create spaces at spline sample points."""
        spaces = []
        
        for i, point in enumerate(self.spline_points):
            if self.params.road_mode_enabled:
                # Road mode: create spaces on sides
                side_spaces = self._create_road_side_spaces(point, i)
                spaces.extend(side_spaces)
            else:
                # Standard mode: create centered space
                space = self._create_centered_space(point, i)
                spaces.append(space)
        
        return spaces
    
    def _create_road_side_spaces(self, point: SplinePoint, index: int) -> List[Space]:
        """Create spaces on the sides of the road."""
        spaces = []
        
        # Calculate offset direction (perpendicular to path)
        orientation = self._calculate_orientation(point.tangent, point.normal)
        right_vector = orientation @ mathutils.Vector((1, 0, 0))
        
        # Determine which sides to place spaces on
        sides_to_generate = self._get_sides_for_index(index)
        
        for side in sides_to_generate:
            # Calculate offset position
            offset_distance = self.params.road_width / 2 + self.params.path_width / 4
            
            if side == "left":
                offset_vector = -right_vector * offset_distance
                side_placement = "left"
            else:  # right
                offset_vector = right_vector * offset_distance
                side_placement = "right"
            
            position = point.position + offset_vector
            
            # Create space
            space = Space(
                id=self.next_space_id,
                position=position,
                size=self._calculate_space_size(),
                type=self._determine_space_type(),
                orientation=orientation,
                side_placement=side_placement
            )
            
            spaces.append(space)
            self.next_space_id += 1
        
        return spaces
    
    def _get_sides_for_index(self, index: int) -> List[str]:
        """Determine which sides to generate spaces on for this index."""
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
            return ["left", "right"]  # Default to both
```

**Terrain Generator Enhancement**:
```python
class TerrainGenerator(BaseGenerator):
    def create_road_surface(self, heightmap: List[List[float]], 
                           bounds: Tuple[float, float, float, float]) -> List[List[float]]:
        """Create a flat road surface along the spline path."""
        if not self.params.road_mode_enabled:
            return heightmap
        
        road_width = self.params.road_width
        
        for i in range(len(heightmap)):
            for j in range(len(heightmap[0])):
                world_pos = self._get_world_pos(i, j, bounds, heightmap)
                
                # Find nearest spline point
                nearest_point, distance = self._find_nearest_spline_point(world_pos)
                
                if distance < road_width / 2:
                    # Inside road - flatten to spline elevation
                    heightmap[i][j] = nearest_point.position.z
                elif distance < road_width:
                    # Road edge - blend to terrain
                    blend_factor = (distance - road_width / 2) / (road_width / 2)
                    heightmap[i][j] = (nearest_point.position.z * (1 - blend_factor) + 
                                      heightmap[i][j] * blend_factor)
        
        return heightmap
```

**UI Integration**:
```python
# Add to PCG_PropertyGroup in parameters.py
road_mode_enabled: bpy.props.BoolProperty(
    name="Road Mode",
    description="Generate buildings on sides of path instead of centered",
    default=False
)

road_width: bpy.props.FloatProperty(
    name="Road Width",
    description="Width of clear path in road mode",
    default=10.0,
    min=2.0,
    max=50.0,
    unit='LENGTH'
)

side_placement: bpy.props.EnumProperty(
    name="Side",
    description="Which side(s) to place buildings on",
    items=[
        ('LEFT', "Left", "Place buildings on left side only"),
        ('RIGHT', "Right", "Place buildings on right side only"),
        ('BOTH', "Both", "Place buildings on both sides"),
        ('ALTERNATING', "Alternating", "Alternate between left and right")
    ],
    default='BOTH'
)
```

**UI Panel Addition**:
```python
# Add to PCG_PT_MainPanel.draw()
# NEW: Road Mode Section (after Preview, before Layout Parameters)

layout.separator()

# Road Mode Section
box = layout.box()
row = box.row()
row.prop(props, "road_mode_enabled", text="Road Mode")

if props.road_mode_enabled:
    box.prop(props, "road_width")
    box.prop(props, "side_placement")
    box.label(text="→ Buildings on path sides", icon='INFO')

layout.separator()

# Layout Parameters Section (existing)
# ... rest of layout parameters ...

# Building Blocks Section (moved up, before Terrain)
# ... building blocks parameters ...

# Terrain Section (moved down)
# ... terrain parameters ...
```

**Revised UI Layout Order**:
```
┌─────────────────────────────────────┐
│ PCG Level Blockout                  │
├─────────────────────────────────────┤
│ 📍 Spline Path                      │
│ ├─ Spline: PCG_Path                 │
│                                     │
│ 👁 Preview                          │
│ ├─ [Show Preview] [Clear]          │
│ ├─ ☐ Show Metrics                  │
│ └─ ☐ Show Path Guide                │
│                                     │
│ 🛣 Road Mode                        │  ← NEW SECTION
│ ├─ ☐ Road Mode                     │  ← Checkbox toggle
│ │  (when enabled:)                  │
│ ├─   Road Width: [10.0]            │
│ ├─   Side: [Both ▼]                │
│ └─   → Buildings on path sides     │
│                                     │
│ 📐 Layout Parameters                │
│ ├─ Spacing: [10.0]                 │
│ ├─ → Will generate ~7 spaces       │
│ ├─ Path Width: [20.0]              │
│ ├─ Lateral Density: [0.5]          │
│ ├─ Space Size Variation: [0.3]     │
│ └─ Seed: [0]                        │
│                                     │
│ 🧱 Building Blocks                  │  ← MOVED UP
│ ├─ Grid Size: [2.0]                │
│ ├─ Wall Height: [3.0]              │
│ └─ Block Types:                     │
│    ├─ ☑ Walls                      │
│    ├─ ☑ Floors                     │
│    ├─ ☑ Platforms                  │
│    └─ ☑ Ramps                      │
│                                     │
│ 🏔 Terrain                          │  ← MOVED DOWN
│ ├─ ☑ Enable Terrain                │
│ ├─ Height Variation: [10.0]        │
│ ├─ Smoothness: [0.5]               │
│ └─ Terrain Width: [50.0]           │
│                                     │
│ [Generate]                          │
│ [Randomize Seed]                    │
│ [Reset Parameters]                  │
└─────────────────────────────────────┘
```

### Visual Representation

**Standard Mode**:
```
    [Space]
       |
    [Space]
       |
    [Space]
```

**Road Mode - Both Sides**:
```
[Space]  ====  [Space]
           |
[Space]  ====  [Space]
           |
[Space]  ====  [Space]
```

**Road Mode - Alternating**:
```
[Space]  ====
           |
         ====  [Space]
           |
[Space]  ====
```

## Data Models

### Space Data Structure (Enhanced)

```python
@dataclass
class Space:
    """Represents a single area/space in the layout."""
    id: int
    position: mathutils.Vector
    size: mathutils.Vector
    type: str  # "enclosed", "open", "semi_open"
    orientation: mathutils.Quaternion
    connections: List[int] = field(default_factory=list)
    
    # NEW: Additional metadata
    is_lateral: bool = False  # True if branched from main path
    parent_space_id: Optional[int] = None  # ID of parent space if lateral
    elevation: float = 0.0  # Ground elevation at this space
    side_placement: Optional[str] = None  # "left", "right", or None for centered
    
    def to_dict(self) -> dict:
        """Serialize to dictionary for metadata storage."""
        return {
            "id": self.id,
            "position": list(self.position),
            "size": list(self.size),
            "type": self.type,
            "is_lateral": self.is_lateral,
            "parent_space_id": self.parent_space_id,
            "elevation": self.elevation,
            "side_placement": self.side_placement
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'Space':
        """Deserialize from dictionary."""
        return cls(
            id=data["id"],
            position=mathutils.Vector(data["position"]),
            size=mathutils.Vector(data["size"]),
            type=data["type"],
            orientation=mathutils.Quaternion(),  # Reconstruct as needed
            is_lateral=data.get("is_lateral", False),
            parent_space_id=data.get("parent_space_id"),
            elevation=data.get("elevation", 0.0),
            side_placement=data.get("side_placement")
        )
```

### Generation Result (NEW)

```python
@dataclass
class GenerationResult:
    """Result of a complete generation operation."""
    success: bool
    seed_used: int
    spaces: List[Space]
    building_blocks: List[bpy.types.Object]
    terrain: Optional[bpy.types.Object]
    root_collection: bpy.types.Collection
    generation_time: float
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    
    def to_metadata_dict(self) -> dict:
        """Convert to dictionary for storage in collection metadata."""
        return {
            "success": self.success,
            "seed": self.seed_used,
            "space_count": len(self.spaces),
            "block_count": len(self.building_blocks),
            "has_terrain": self.terrain is not None,
            "generation_time": self.generation_time,
            "errors": self.errors,
            "warnings": self.warnings
        }
```

## Error Handling

### Error Handling Strategy

1. **Validation Errors**: Caught early, prevent generation from starting
2. **Generation Errors**: Logged with context, partial cleanup performed
3. **Blender API Errors**: Wrapped with informative messages
4. **User-Facing Errors**: Clear, actionable error messages in UI

### Error Handling Pattern

```python
def generate_with_error_handling(context, params: GenerationParams) -> GenerationResult:
    """Generate with comprehensive error handling."""
    start_time = time.time()
    result = GenerationResult(
        success=False,
        seed_used=0,
        spaces=[],
        building_blocks=[],
        terrain=None,
        root_collection=None,
        generation_time=0.0
    )
    
    try:
        # Validate parameters
        is_valid, errors, suggestions = ParameterValidator.validate_with_suggestions(params)
        if not is_valid:
            result.errors = errors
            PCGLogger.error(f"Validation failed: {errors}", context="Generate")
            return result
        
        # Log suggestions
        for suggestion in suggestions:
            result.warnings.append(suggestion)
            PCGLogger.warning(suggestion, context="Generate")
        
        # Initialize seed
        with SeedContext(params.seed) as seed:
            result.seed_used = seed
            PCGLogger.info(f"Starting generation with seed {seed}", context="Generate")
            
            # Sample spline
            sampler = SplineSampler(params.spline_object)
            points = sampler.sample_points(params.spacing)
            
            # Generate layout
            layout_gen = LayoutGenerator(seed, params, points)
            result.spaces = layout_gen.generate()
            
            # Generate building blocks
            building_gen = BuildingBlockGenerator(seed, params)
            for space in result.spaces:
                blocks = building_gen.populate_space(space)
                result.building_blocks.extend(blocks)
            
            # Generate terrain
            if params.terrain_enabled:
                terrain_gen = TerrainGenerator(seed, params, points)
                result.terrain = terrain_gen.generate(result.spaces)
            
            # Organize scene
            result.root_collection = scene_manager.create_generation_structure()
            
            result.success = True
            result.generation_time = time.time() - start_time
            
            PCGLogger.info(f"Generation complete in {result.generation_time:.2f}s", 
                          context="Generate")
            
    except Exception as e:
        result.errors.append(str(e))
        PCGLogger.error(f"Generation failed: {e}", context="Generate", exc_info=True)
        
        # Attempt cleanup
        try:
            cleanup_partial_generation(result)
        except:
            PCGLogger.error("Cleanup failed", context="Generate", exc_info=True)
    
    return result
```

## Testing Strategy

### Unit Tests

**Test Coverage**:
1. **Seed Context Manager**
   - Test seed generation
   - Test context enter/exit
   - Test state restoration

2. **Spline Sampler**
   - Test Bezier curve sampling
   - Test poly curve sampling
   - Test edge cases (empty curves, single point)

3. **Layout Generator**
   - Test space creation along path
   - Test lateral space generation
   - Test connectivity validation
   - Test reproducibility with same seed

4. **Parameter Validator**
   - Test all validation rules
   - Test edge cases
   - Test error messages

5. **Perlin Noise**
   - Test noise generation
   - Test octave noise
   - Test value ranges

**Test Structure**:
```python
# tests/test_seed_context.py
import unittest
from pcg_blockout.core.seed_context import SeedContext

class TestSeedContext(unittest.TestCase):
    def test_seed_generation(self):
        """Test that seed is generated when None provided."""
        with SeedContext(None) as seed:
            self.assertIsInstance(seed, int)
            self.assertGreater(seed, 0)
    
    def test_seed_reproducibility(self):
        """Test that same seed produces same random sequence."""
        import random
        
        values1 = []
        with SeedContext(12345):
            values1 = [random.random() for _ in range(10)]
        
        values2 = []
        with SeedContext(12345):
            values2 = [random.random() for _ in range(10)]
        
        self.assertEqual(values1, values2)
    
    def test_state_restoration(self):
        """Test that random state is restored after context."""
        import random
        
        # Set initial state
        random.seed(999)
        value_before = random.random()
        
        # Use context with different seed
        with SeedContext(12345):
            _ = random.random()
        
        # State should be restored
        random.seed(999)
        value_after = random.random()
        
        self.assertEqual(value_before, value_after)
```

### Integration Tests

**Test Scenarios**:
1. Full generation pipeline with default parameters
2. Preview followed by generation (verify match)
3. Multiple generations with same seed (verify reproducibility)
4. Generation with various parameter combinations
5. Error handling (invalid spline, invalid parameters)

### Manual Testing Checklist

- [ ] Create default spline and generate
- [ ] Show preview, verify it matches generation
- [ ] Change parameters, verify preview updates correctly
- [ ] Test with different spline types (Bezier, Poly)
- [ ] Test with complex splines (loops, sharp turns)
- [ ] Test terrain generation quality
- [ ] Test with extreme parameter values
- [ ] Test error messages are clear
- [ ] Test addon reload works correctly
- [ ] Test with multiple generations in same scene

## Implementation Plan Integration

### Phase 1: Core Refactoring (High Priority)
- Implement SeedContext manager
- Implement centralized logger
- Refactor seed_manager to use SeedContext
- Add comprehensive error handling

### Phase 2: Preview/Generation Sync (Critical)
- Refactor PreviewManager to use LayoutGenerator
- Implement space caching
- Update UI to show seed used in preview
- Add tests for preview/generation match

### Phase 3: Terrain Improvements (High Priority)
- Implement Perlin noise algorithm
- Add terrain width constraints
- Improve elevation blending
- Ensure buildings remain visible

### Phase 4: Code Quality (Medium Priority)
- Add type hints to all functions
- Add docstrings to all public methods
- Implement BaseGenerator abstract class
- Add comprehensive logging

### Phase 5: Testing & Documentation (Medium Priority)
- Write unit tests for core systems
- Write integration tests
- Create default presets
- Update user documentation

### Phase 6: UI/UX Polish (Low Priority)
- Add parameter validation feedback in UI
- Show generation progress details
- Add preset management UI
- Improve error message display

## Performance Considerations

### Optimization Targets

1. **Spline Sampling**: Cache sampled points for reuse
2. **Heightmap Generation**: Use efficient numpy arrays if available
3. **Mesh Creation**: Batch operations where possible
4. **Preview Updates**: Only regenerate changed elements

### Memory Management

1. **Cleanup**: Remove temporary objects after generation
2. **Collection Management**: Properly unlink objects before deletion
3. **Material Reuse**: Share materials between similar objects
4. **Mesh Data**: Clear unused mesh data blocks

### Progress Reporting

```python
def generate_with_progress(context, params: GenerationParams, wm) -> GenerationResult:
    """Generate with detailed progress reporting."""
    wm.progress_begin(0, 100)
    
    try:
        wm.progress_update(10)  # Validation
        # ... validate ...
        
        wm.progress_update(20)  # Spline sampling
        # ... sample spline ...
        
        wm.progress_update(40)  # Layout generation
        # ... generate layout ...
        
        wm.progress_update(60)  # Building blocks
        # ... generate blocks ...
        
        wm.progress_update(80)  # Terrain
        # ... generate terrain ...
        
        wm.progress_update(100)  # Complete
        
    finally:
        wm.progress_end()
```

## Migration Strategy

### Backward Compatibility

- Existing scenes with generated content will not be affected
- Old metadata format will be supported (read-only)
- Parameters will maintain same names and ranges

### Migration Steps

1. **Deprecate Global Seed Manager**: Add deprecation warnings
2. **Introduce SeedContext**: Use alongside old system initially
3. **Refactor Generators**: Update one at a time
4. **Update Preview**: Switch to new architecture
5. **Remove Old Code**: Clean up deprecated code

### Testing During Migration

- Run both old and new systems in parallel
- Compare outputs for consistency
- Verify no regressions in existing functionality

## Future Enhancements

### Post-Polish Features

1. **Preset System**: Save/load parameter presets
2. **Zone System**: Different parameters for different spline sections
3. **Constraint System**: User-defined rules for generation
4. **Template Library**: Pre-made building block templates
5. **Non-Destructive Editing**: Regenerate without losing manual edits
6. **Performance Profiling**: Built-in performance analysis tools

### Extensibility

- Plugin system for custom generators
- Custom block type definitions
- Scriptable generation rules
- Export/import generation data

## Conclusion

This design provides a comprehensive roadmap for polishing the PCG Level Blockout addon to production quality. The key improvements focus on:

1. **Fixing Critical Bugs**: Preview/generation sync, seed management
2. **Improving Code Quality**: Type hints, error handling, logging
3. **Enhancing User Experience**: Better terrain, clear errors, presets
4. **Establishing Patterns**: Base classes, consistent interfaces
5. **Enabling Testing**: Unit tests, integration tests, validation

The modular architecture allows for incremental implementation while maintaining functionality throughout the refactoring process.
