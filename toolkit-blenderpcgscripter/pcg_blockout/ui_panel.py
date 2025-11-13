"""
UI Panel Module - Blender 3D viewport sidebar panels for PCG Level Blockout
"""

import bpy

# Import all required modules at the top
if "bpy" in locals():
    import importlib
    if "seed_manager" in locals():
        importlib.reload(seed_manager)
    if "scene_manager" in locals():
        importlib.reload(scene_manager)
    if "spline_sampler" in locals():
        importlib.reload(spline_sampler)
    if "layout_generator" in locals():
        importlib.reload(layout_generator)
    if "building_generator" in locals():
        importlib.reload(building_generator)
    if "terrain_generator" in locals():
        importlib.reload(terrain_generator)
    if "parameters" in locals():
        importlib.reload(parameters)

from . import core
from .core import seed_manager, scene_manager, parameters
from .core.spline_sampler import SplineSampler
from .core.preview_manager import PreviewManager
from .generators.layout_generator import LayoutGenerator
from .generators.building_generator import BuildingBlockGenerator
from .generators.terrain_generator import TerrainGenerator


class PCG_OT_ShowPreview(bpy.types.Operator):
    """Show generation preview with sample points and path guide"""
    bl_idname = "pcg.show_preview"
    bl_label = "Show Preview"
    bl_options = {'REGISTER', 'UNDO'}
    
    def execute(self, context):
        props = context.scene.pcg_props
        
        # Validate spline
        if props.spline_object is None:
            self.report({'ERROR'}, "No spline object selected")
            return {'CANCELLED'}
        
        # Convert properties to GenerationParams
        params = props.to_generation_params()
        
        # Create preview
        preview_mgr = PreviewManager(params, props.spline_object)
        success = preview_mgr.create_preview()
        
        if success:
            info = preview_mgr.get_preview_info()
            self.report({'INFO'}, f"Preview created: {info['point_count']} sample points")
        else:
            self.report({'ERROR'}, "Failed to create preview")
            return {'CANCELLED'}
        
        return {'FINISHED'}


class PCG_OT_ClearPreview(bpy.types.Operator):
    """Clear generation preview"""
    bl_idname = "pcg.clear_preview"
    bl_label = "Clear Preview"
    bl_options = {'REGISTER', 'UNDO'}
    
    def execute(self, context):
        props = context.scene.pcg_props
        params = props.to_generation_params()
        
        # Clear preview
        preview_mgr = PreviewManager(params, props.spline_object)
        preview_mgr.clear_preview()
        
        self.report({'INFO'}, "Preview cleared")
        return {'FINISHED'}


class PCG_OT_CreateDefaultSpline(bpy.types.Operator):
    """Create a default spline curve for level generation"""
    bl_idname = "pcg.create_default_spline"
    bl_label = "Create Default Spline"
    bl_options = {'REGISTER', 'UNDO'}
    
    def execute(self, context):
        # Create a Bezier curve
        bpy.ops.curve.primitive_bezier_curve_add(
            enter_editmode=False,
            location=(0, 0, 0)
        )
        
        curve_obj = context.active_object
        curve_obj.name = "PCG_Path"
        
        # Modify the curve to create an S-curve shape
        curve_data = curve_obj.data
        if curve_data.splines:
            spline = curve_data.splines[0]
            if len(spline.bezier_points) >= 2:
                # Adjust points to create a more interesting path
                spline.bezier_points[0].co = (-10, 0, 0)
                spline.bezier_points[0].handle_right = (-5, 5, 0)
                
                spline.bezier_points[1].co = (10, 0, 0)
                spline.bezier_points[1].handle_left = (5, -5, 0)
        
        # Set the created spline as the selected spline in properties
        context.scene.pcg_props.spline_object = curve_obj
        
        self.report({'INFO'}, "Default spline created")
        return {'FINISHED'}


class PCG_OT_Generate(bpy.types.Operator):
    """Generate level blockout from spline"""
    bl_idname = "pcg.generate"
    bl_label = "Generate Level Blockout"
    bl_options = {'REGISTER', 'UNDO'}
    
    def execute(self, context):
        wm = context.window_manager
        
        # Start progress reporting
        wm.progress_begin(0, 100)
        
        try:
            props = context.scene.pcg_props
            
            # Convert properties to GenerationParams
            params = props.to_generation_params()
            
            # Validate spline
            if params.spline_object is None:
                self.report({'ERROR'}, "No spline object selected")
                return {'CANCELLED'}
            
            wm.progress_update(10)
            
            # Initialize seed
            seed = seed_manager.initialize_seed(params.seed)
            self.report({'INFO'}, f"Using seed: {seed}")
            
            wm.progress_update(20)
            
            # Sample spline
            sampler = SplineSampler(params.spline_object)
            is_valid, error_msg = sampler.validate_spline()
            
            if not is_valid:
                self.report({'ERROR'}, f"Invalid spline: {error_msg}")
                return {'CANCELLED'}
            
            spline_points = sampler.sample_points(params.spacing)
            
            if not spline_points:
                self.report({'ERROR'}, "No points sampled from spline")
                return {'CANCELLED'}
            
            self.report({'INFO'}, f"Sampled {len(spline_points)} points from spline")
            
            wm.progress_update(40)
            
            # Generate layout
            layout_gen = LayoutGenerator(seed, params, spline_points)
            spaces = layout_gen.generate()
            
            self.report({'INFO'}, f"Generated {len(spaces)} spaces")
            
            wm.progress_update(60)
            
            # Create collection structure
            root_coll, struct_coll, terrain_coll, conn_coll = scene_manager.create_generation_structure()
            
            # Generate building blocks
            building_gen = BuildingBlockGenerator(seed, params)
            all_blocks = []
            
            for space in spaces:
                blocks = building_gen.populate_space(space)
                all_blocks.extend(blocks)
            
            # Organize blocks into collection
            if all_blocks:
                scene_manager.organize_objects(all_blocks, struct_coll.name)
            
            self.report({'INFO'}, f"Generated {len(all_blocks)} building blocks")
            
            wm.progress_update(80)
            
            # Generate terrain if enabled
            if params.terrain_enabled:
                terrain_gen = TerrainGenerator(seed, params, spline_points)
                terrain_obj = terrain_gen.generate(spaces)
                
                if terrain_obj:
                    scene_manager.organize_objects([terrain_obj], terrain_coll.name)
                    self.report({'INFO'}, "Terrain generated")
            
            wm.progress_update(90)
            
            # Store metadata
            scene_manager.store_metadata(root_coll, params)
            
            wm.progress_update(100)
            
            self.report({'INFO'}, "Generation complete!")
            return {'FINISHED'}
        
        except Exception as e:
            import traceback
            traceback.print_exc()
            self.report({'ERROR'}, f"Generation failed: {str(e)}")
            return {'CANCELLED'}
        
        finally:
            wm.progress_end()


class PCG_OT_RandomizeSeed(bpy.types.Operator):
    """Generate a new random seed"""
    bl_idname = "pcg.randomize_seed"
    bl_label = "Randomize Seed"
    bl_options = {'REGISTER', 'UNDO'}
    
    def execute(self, context):
        new_seed = seed_manager.generate_random_seed()
        context.scene.pcg_props.seed = new_seed
        
        self.report({'INFO'}, f"New seed: {new_seed}")
        return {'FINISHED'}


class PCG_OT_ResetParameters(bpy.types.Operator):
    """Reset all parameters to defaults"""
    bl_idname = "pcg.reset_parameters"
    bl_label = "Reset Parameters"
    bl_options = {'REGISTER', 'UNDO'}
    
    def execute(self, context):
        props = context.scene.pcg_props
        defaults = parameters.ParameterDefaults()
        
        # Reset to defaults
        props.spacing = defaults.SPACING
        props.path_width = defaults.PATH_WIDTH
        props.lateral_density = defaults.LATERAL_DENSITY
        props.space_size_variation = defaults.SPACE_SIZE_VARIATION
        props.seed = 0
        props.grid_size = defaults.GRID_SIZE
        props.wall_height = defaults.WALL_HEIGHT
        props.block_type_wall = True
        props.block_type_floor = True
        props.block_type_platform = True
        props.block_type_ramp = True
        props.terrain_enabled = defaults.TERRAIN_ENABLED
        props.height_variation = defaults.HEIGHT_VARIATION
        props.smoothness = defaults.SMOOTHNESS
        props.terrain_width = defaults.TERRAIN_WIDTH
        
        self.report({'INFO'}, "Parameters reset to defaults")
        return {'FINISHED'}


class PCG_PT_MainPanel(bpy.types.Panel):
    """Main panel container for PCG Level Blockout"""
    bl_label = "PCG Level Blockout"
    bl_idname = "PCG_PT_main_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'PCG Blockout'
    
    def draw(self, context):
        layout = self.layout
        props = context.scene.pcg_props
        
        # Spline Selection Section
        box = layout.box()
        box.label(text="Spline Path", icon='CURVE_DATA')
        
        # Spline object selector
        box.prop(props, "spline_object", text="Spline")
        
        # Create default spline button
        if props.spline_object is None:
            box.operator("pcg.create_default_spline", icon='ADD')
            box.label(text="No spline selected!", icon='ERROR')
        else:
            # Show spline info
            spline_obj = props.spline_object
            if spline_obj.type == 'CURVE':
                box.label(text=f"Spline: {spline_obj.name}", icon='CHECKMARK')
            else:
                box.label(text="Selected object is not a curve!", icon='ERROR')
        
        layout.separator()
        
        # Preview Section
        box = layout.box()
        box.label(text="Preview", icon='HIDE_OFF')
        
        if props.spline_object is None:
            box.label(text="Select a spline to preview", icon='INFO')
        else:
            row = box.row(align=True)
            row.operator("pcg.show_preview", text="Show Preview", icon='HIDE_OFF')
            row.operator("pcg.clear_preview", text="Clear", icon='X')
            
            # Preview options
            box.prop(props, "show_preview_labels", text="Show Metrics")
            box.prop(props, "show_path_guide", text="Show Path Guide")
            
            # Show preview info if it exists
            preview_coll = bpy.data.collections.get("PCG_Preview")
            if preview_coll:
                point_count = sum(1 for obj in preview_coll.objects 
                                if obj.name.startswith("Preview_Point_"))
                box.label(text=f"Preview: {point_count} sample points", icon='CHECKMARK')
                
                # Show key metrics
                if props.show_preview_labels:
                    box.label(text=f"Spacing: {props.spacing:.1f}m", icon='ARROW_LEFTRIGHT')
                    box.label(text=f"Path Width: {props.path_width:.1f}m", icon='FULLSCREEN_ENTER')
        
        layout.separator()
        
        # Layout Parameters Section
        box = layout.box()
        box.label(text="Layout Parameters", icon='OUTLINER')
        box.prop(props, "spacing")
        
        # Show estimated space count
        if props.spline_object and props.spline_object.type == 'CURVE':
            try:
                from .core.spline_sampler import SplineSampler
                sampler = SplineSampler(props.spline_object)
                spline_length = sampler.get_spline_length()
                estimated_spaces = int(spline_length / props.spacing) if props.spacing > 0 else 0
                box.label(text=f"→ Will generate ~{estimated_spaces} spaces", icon='INFO')
            except:
                pass
        
        box.prop(props, "path_width")
        box.prop(props, "lateral_density")
        box.prop(props, "space_size_variation")
        box.prop(props, "seed")
        
        # Warning about seed = 0
        if props.seed == 0:
            box.label(text="⚠ Seed=0: Preview won't match output", icon='ERROR')
            box.label(text="   Use 'Randomize Seed' or set a number", icon='INFO')
        
        layout.separator()
        
        # Building Block Parameters Section
        box = layout.box()
        box.label(text="Building Blocks", icon='MESH_CUBE')
        box.prop(props, "grid_size")
        box.prop(props, "wall_height")
        
        # Block type checkboxes
        col = box.column(align=True)
        col.label(text="Block Types:")
        col.prop(props, "block_type_wall")
        col.prop(props, "block_type_floor")
        col.prop(props, "block_type_platform")
        col.prop(props, "block_type_ramp")
        
        layout.separator()
        
        # Terrain Parameters Section
        box = layout.box()
        box.label(text="Terrain", icon='MESH_GRID')
        box.prop(props, "terrain_enabled")
        
        if props.terrain_enabled:
            box.prop(props, "height_variation")
            box.prop(props, "smoothness")
            box.prop(props, "terrain_width")
        
        layout.separator()
        
        # Generation Buttons
        col = layout.column(align=True)
        
        # Disable generate button if no spline selected
        if props.spline_object is None:
            col.enabled = False
        
        col.operator("pcg.generate", text="Generate", icon='PLAY')
        col.operator("pcg.randomize_seed", text="Randomize Seed", icon='FILE_REFRESH')
        col.operator("pcg.reset_parameters", text="Reset Parameters", icon='LOOP_BACK')


# List of classes to register
classes = [
    PCG_OT_ShowPreview,
    PCG_OT_ClearPreview,
    PCG_OT_CreateDefaultSpline,
    PCG_OT_Generate,
    PCG_OT_RandomizeSeed,
    PCG_OT_ResetParameters,
    PCG_PT_MainPanel,
]
