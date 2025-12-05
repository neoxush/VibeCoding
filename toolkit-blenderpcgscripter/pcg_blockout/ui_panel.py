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
from .core import seed_manager, scene_manager, parameters, preset_manager, history_manager
from .core.spline_sampler import SplineSampler
from .core.adapters import BlenderCurveAdapter
from .core.errors import PCGError
from .core.preview_manager import PreviewManager
from .generators.layout_generator import LayoutGenerator
from .generators.building_generator import BuildingBlockGenerator
from .generators.terrain_generator import TerrainGenerator





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
        # Save current state to history before generating (if it's a manual generation)
        # We might want to avoid duplicates if this was triggered by RandomizeSeed, 
        # but RandomizeSeed calls this operator via bpy.ops, which is a separate execution.
        # However, RandomizeSeed ALREADY pushed history.
        # If we push here too, we might get double history for Randomize actions.
        # But for manual "Generate" clicks, we definitely want history.
        # A simple check: if the last history item has the SAME parameters as current, skip?
        # Or just let it be. Let's just push for now, user can clear.
        # Actually, better: RandomizeSeed changes params THEN calls generate.
        # So RandomizeSeed saves the OLD state.
        # Generate should save the CURRENT state? No, history is usually "undo stack" style or "previous results".
        # If I click Generate, I want to save what I HAD before I clicked, in case I ruin it?
        # OR do I want to save what I just GENERATED so I can go back to it?
        # The user said "memorize if there's a good one".
        # So if I generate something cool, I want it in history.
        # So we should probably push AFTER generation or BEFORE?
        # If I change params and click Generate, I produce a NEW result.
        # If that result is good, I want it in history.
        # So really, we should push the state used for generation.
        
        # Let's push at the START. If I have a good state, and I change params and click Generate,
        # I want to save that previous good state.
        # But wait, if I change params, the "current state" in UI is the NEW params.
        # So pushing at start of Generate saves the NEW params.
        # Which effectively saves the "Result" of this generation.
        # So yes, pushing at start of Generate is correct for "Saving this generation".
        
        history_manager.push_history(context)
        
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
            
            # Handle seed randomization
            if props.randomize_on_generate:
                new_seed = seed_manager.generate_random_seed()
                props.seed = new_seed
                params.seed = new_seed
                self.report({'INFO'}, f"Randomized seed: {new_seed}")
            
            # Initialize seed
            seed = seed_manager.initialize_seed(params.seed)
            self.report({'INFO'}, f"Using seed: {seed}")
            
            wm.progress_update(20)
            
            # Sample spline
            adapter = BlenderCurveAdapter(params.spline_object)
            sampler = SplineSampler(adapter)
            sampler.validate_spline()
            
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
            all_blocks_by_layer = {}
            total_blocks = 0
            
            for space in spaces:
                blocks_map = building_gen.populate_space(space)
                for layer_name, blocks in blocks_map.items():
                    if layer_name not in all_blocks_by_layer:
                        all_blocks_by_layer[layer_name] = []
                    all_blocks_by_layer[layer_name].extend(blocks)
                    total_blocks += len(blocks)
            
            # Organize blocks into collection
            for layer_name, blocks in all_blocks_by_layer.items():
                if blocks:
                    # Create sub-collection for layer
                    layer_coll_name = f"{struct_coll.name}_{layer_name}"
                    layer_coll = bpy.data.collections.new(layer_name)
                    struct_coll.children.link(layer_coll)
                    
                    scene_manager.organize_objects(blocks, layer_coll.name)
            
            self.report({'INFO'}, f"Generated {total_blocks} building blocks")
            
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
        
        except PCGError as e:
            self.report({'ERROR'}, str(e))
            return {'CANCELLED'}
            
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
        # Save current state to history before changing
        history_manager.push_history(context)
        
        import random
        
        props = context.scene.pcg_props
        new_seed = seed_manager.generate_random_seed()
        props.seed = new_seed
        
        # Randomize parameters if enabled
        # We now check individual flags
        
        # Layout parameters
        if props.random_include_spacing:
            props.spacing = random.uniform(5.0, 20.0)
        if props.random_include_width:
            props.path_width = random.uniform(10.0, 30.0)
        if props.random_include_density:
            props.lateral_density = random.uniform(0.2, 0.8)
        if props.random_include_variation:
            props.space_size_variation = random.uniform(0.2, 0.8)
        
        # Building parameters
        if props.random_include_grid:
            props.grid_size = random.choice([1.0, 2.0, 3.0, 4.0])
        if props.random_include_height:
            props.wall_height = random.uniform(2.5, 6.0)
        
        # Terrain parameters
        if props.terrain_enabled and props.random_include_terrain:
            props.height_variation = random.uniform(5.0, 20.0)
            props.smoothness = random.uniform(0.3, 0.9)
            props.terrain_width = random.uniform(30.0, 80.0)
        
        # Road mode parameters
        if props.road_mode_enabled and props.random_include_road:
            props.road_width = random.uniform(6.0, 15.0)
            
        self.report({'INFO'}, f"Remixed parameters (Seed: {new_seed})")
        
        # NO automatic generation
            
        return {'FINISHED'}


class PCG_OT_SavePreset(bpy.types.Operator):
    """Save current parameters as a preset"""
    bl_idname = "pcg.save_preset"
    bl_label = "Save Preset"
    
    preset_name: bpy.props.StringProperty(name="Preset Name")
    
    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)
    
    def execute(self, context):
        props = context.scene.pcg_props
        params = props.to_generation_params()
        
        if preset_manager.save_preset(self.preset_name, params):
            self.report({'INFO'}, f"Preset '{self.preset_name}' saved")
        else:
            self.report({'ERROR'}, "Failed to save preset")
            
        return {'FINISHED'}


class PCG_OT_LoadPreset(bpy.types.Operator):
    """Load parameters from a preset"""
    bl_idname = "pcg.load_preset"
    bl_label = "Load Preset"
    
    preset_name: bpy.props.EnumProperty(
        name="Preset",
        items=lambda self, context: [(p, p, "") for p in preset_manager.get_preset_list()]
    )
    
    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)
    
    def execute(self, context):
        preset_data = preset_manager.load_preset(self.preset_name)
        
        if preset_data:
            preset_manager.apply_preset_to_scene(preset_data, context.scene)
            self.report({'INFO'}, f"Preset '{self.preset_name}' loaded")
        else:
            self.report({'ERROR'}, "Failed to load preset")
            
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


class PCG_UL_LayerList(bpy.types.UIList):
    """UI List for managing generation layers"""
    
    def draw_item(self, context, layout, data, item, icon, active_data, active_propname, index):
        # We could draw some custom icons here based on the rule type
        if self.layout_type in {'DEFAULT', 'COMPACT'}:
            layout.prop(item, "enabled", text="")
            layout.prop(item, "name", text="", emboss=False)
            layout.label(text=item.rule, icon='MODIFIER')
        elif self.layout_type == 'GRID':
            layout.alignment = 'CENTER'
            layout.label(text="", icon='MODIFIER')


class PCG_OT_AddLayer(bpy.types.Operator):
    """Add a new generation layer"""
    bl_idname = "pcg.add_layer"
    bl_label = "Add Layer"
    
    def execute(self, context):
        props = context.scene.pcg_props
        layer = props.layers.add()
        layer.name = f"Layer {len(props.layers)}"
        props.active_layer_index = len(props.layers) - 1
        return {'FINISHED'}


class PCG_OT_RemoveLayer(bpy.types.Operator):
    """Remove the active generation layer"""
    bl_idname = "pcg.remove_layer"
    bl_label = "Remove Layer"
    
    @classmethod
    def poll(cls, context):
        props = context.scene.pcg_props
        return len(props.layers) > 0
    
    def execute(self, context):
        props = context.scene.pcg_props
        props.layers.remove(props.active_layer_index)
        props.active_layer_index = min(max(0, props.active_layer_index - 1), len(props.layers) - 1)
        return {'FINISHED'}


class PCG_OT_MoveLayer(bpy.types.Operator):
    """Move the active layer up or down"""
    bl_idname = "pcg.move_layer"
    bl_label = "Move Layer"
    
    direction: bpy.props.EnumProperty(items=[('UP', "Up", ""), ('DOWN', "Down", "")])
    
    @classmethod
    def poll(cls, context):
        props = context.scene.pcg_props
        return len(props.layers) > 0
    
    def execute(self, context):
        props = context.scene.pcg_props
        idx = props.active_layer_index
        
        if self.direction == 'UP' and idx > 0:
            props.layers.move(idx, idx - 1)
            props.active_layer_index -= 1
        elif self.direction == 'DOWN' and idx < len(props.layers) - 1:
            props.layers.move(idx, idx + 1)
            props.active_layer_index += 1
            
        return {'FINISHED'}


        row.operator("pcg.load_preset", text="Load", icon='FILE_FOLDER')


class PCG_OT_RestoreHistory(bpy.types.Operator):
    """Restore a state from history"""
    bl_idname = "pcg.restore_history"
    bl_label = "Restore"
    bl_options = {'REGISTER', 'UNDO'}
    
    index: bpy.props.IntProperty()
    
    def execute(self, context):
        history_manager.restore_history(context, self.index)
        
        # Trigger generation if spline is selected
        if context.scene.pcg_props.spline_object:
            bpy.ops.pcg.generate()
            
        self.report({'INFO'}, "Restored from history")
        return {'FINISHED'}


class PCG_OT_Snapshot(bpy.types.Operator):
    """Save current state as a snapshot"""
    bl_idname = "pcg.snapshot"
    bl_label = "Snapshot"
    
    def execute(self, context):
        history_manager.push_history(context, is_snapshot=True)
        self.report({'INFO'}, "Snapshot saved")
        return {'FINISHED'}


class PCG_OT_ClearHistory(bpy.types.Operator):
    """Clear history items"""
    bl_idname = "pcg.clear_history"
    bl_label = "Clear History"
    
    def execute(self, context):
        history_manager.clear_history(context)
        self.report({'INFO'}, "History cleared")
        return {'FINISHED'}


class PCG_PT_HistoryPopover(bpy.types.Panel):
    """Popover for History and Snapshots"""
    bl_label = "History"
    bl_idname = "PCG_PT_history_popover"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_options = {'INSTANCED'}
    
    def draw(self, context):
        layout = self.layout
        props = context.scene.pcg_props
        
        # Snapshot button
        layout.operator("pcg.snapshot", text="Save Snapshot", icon='BOOKMARKS')
        
        layout.separator()
        
        # List history items
        if len(props.history) > 0:
            box = layout.box()
            box.label(text="Recent Generations", icon='TIME')
            
            # Show in reverse order (newest first)
            for i in range(len(props.history) - 1, -1, -1):
                item = props.history[i]
                row = box.row()
                
                # Icon based on type
                icon = 'BOOKMARKS' if item.is_snapshot else 'TIME'
                
                # Label
                row.label(text=item.name, icon=icon)
                
                # Restore button
                op = row.operator("pcg.restore_history", text="", icon='LOOP_BACK')
                op.index = i
            
            layout.separator()
            layout.operator("pcg.clear_history", text="Clear History", icon='TRASH')
        else:
            layout.label(text="No history yet", icon='INFO')


class PCG_PT_RandomizeConfigPopover(bpy.types.Panel):
    """Popover for configuring randomization"""
    bl_label = "Randomize Settings"
    bl_idname = "PCG_PT_randomize_config_popover"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_options = {'INSTANCED'}
    
    def draw(self, context):
        layout = self.layout
        props = context.scene.pcg_props
        
        layout.label(text="Include in Remix:", icon='CHECKBOX_HLT')
        
        col = layout.column(align=True)
        col.prop(props, "random_include_spacing")
        col.prop(props, "random_include_width")
        col.prop(props, "random_include_density")
        col.prop(props, "random_include_variation")
        
        col.separator()
        col.prop(props, "random_include_grid")
        col.prop(props, "random_include_height")
        
        col.separator()
        col.prop(props, "random_include_terrain")
        col.prop(props, "random_include_road")


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
        

        
        # Road Mode Section
        box = layout.box()
        
        # Header with mode indicator
        row = box.row()
        if props.road_mode_enabled:
            row.label(text="Road Mode", icon='CHECKMARK')
        else:
            row.label(text="Road Mode", icon='DRIVER_DISTANCE')
        
        # Prominent toggle button
        row = box.row()
        # row.scale_y = 1.5  # Removed custom scale
        if props.road_mode_enabled:
            row.prop(props, "road_mode_enabled", text="Road Mode: ON", toggle=True, icon='CHECKMARK')
        else:
            row.prop(props, "road_mode_enabled", text="Road Mode: OFF", toggle=True, icon='CHECKBOX_DEHLT')
        
        if props.road_mode_enabled:
            box.separator()
            
            # Road parameters
            box.prop(props, "road_width")
            box.prop(props, "side_placement")
            
            # Visual hints
            box.separator()
            col = box.column(align=True)
            col.label(text="→ Buildings on path sides", icon='INFO')
            col.label(text="→ Clear path in center", icon='INFO')
        else:
            # Show what standard mode does
            box.label(text="Standard: spaces centered on path", icon='DOT')
        
        layout.separator()
        
        # Layout Parameters Section
        box = layout.box()
        box.label(text="Layout Parameters", icon='OUTLINER')
        box.prop(props, "spacing")
        
        # Show estimated space count
        if props.spline_object and props.spline_object.type == 'CURVE':
            try:
                from .core.spline_sampler import SplineSampler
                from .core.adapters import BlenderCurveAdapter
                adapter = BlenderCurveAdapter(props.spline_object)
                sampler = SplineSampler(adapter)
                spline_length = sampler.get_spline_length()
                estimated_spaces = int(spline_length / props.spacing) if props.spacing > 0 else 0
                box.label(text=f"→ Will generate ~{estimated_spaces} spaces", icon='INFO')
            except:
                pass
        
        box.prop(props, "path_width")
        box.prop(props, "lateral_density")
        box.prop(props, "space_size_variation")
        

        
        # Removed Seed and Randomize toggles from here as requested
        
        layout.separator()
        
        layout.separator()
        
        layout.separator()
        
        # V2 Layer Management Section
        box = layout.box()
        box.label(text="Generation Layers", icon='MODIFIER')
        
        row = box.row()
        row.template_list("PCG_UL_LayerList", "", props, "layers", props, "active_layer_index")
        
        col = row.column(align=True)
        col.operator("pcg.add_layer", icon='ADD', text="")
        col.operator("pcg.remove_layer", icon='REMOVE', text="")
        col.separator()
        col.operator("pcg.move_layer", icon='TRIA_UP', text="").direction = 'UP'
        col.operator("pcg.move_layer", icon='TRIA_DOWN', text="").direction = 'DOWN'
        
        # Active Layer Properties
        if props.layers and props.active_layer_index >= 0 and props.active_layer_index < len(props.layers):
            active_layer = props.layers[props.active_layer_index]
            box = layout.box()
            box.label(text=f"Properties: {active_layer.name}")
            
            box.prop(active_layer, "name")
            box.prop(active_layer, "rule")
            box.prop_search(active_layer, "collection_name", bpy.data, "collections")
            
            col = box.column(align=True)
            col.prop(active_layer, "density")
            col.prop(active_layer, "offset")
            col.prop(active_layer, "z_offset")
            
            col = box.column(align=True)
            col.prop(active_layer, "random_rotation")
            col.prop(active_layer, "random_scale")
            if active_layer.random_scale:
                row = col.row(align=True)
                row.prop(active_layer, "scale_min")
                row.prop(active_layer, "scale_max")
        
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
        

        
        # History Popover next to Generate
        # We need to use a row to put them side by side, but 'col' is already a column.
        # However, we want Generate to be big.
        # Let's try to put them in a row.
        
        # Re-create the layout for this section
        # Remove the previous col.operator("pcg.generate") line from above replacement if possible, 
        # but since I'm replacing the whole block:
        
        row = col.row(align=True)
        row.scale_y = 1.2 # Make it a bit bigger
        row.operator("pcg.generate", text="Generate", icon='PLAY')
        row.popover(panel="PCG_PT_history_popover", text="", icon='TIME')
        
        col.separator()
        
        # Remix Parameters row
        row = col.row(align=True)
        row.operator("pcg.randomize_seed", text="Remix Parameters", icon='FILE_REFRESH')
        row.popover(panel="PCG_PT_randomize_config_popover", text="", icon='PREFERENCES')
        
        col.operator("pcg.reset_parameters", text="Reset Parameters", icon='LOOP_BACK')
        
        layout.separator()
        
        # Presets Section
        box = layout.box()
        box.label(text="Presets", icon='PRESET')
        row = box.row(align=True)
        row.operator("pcg.save_preset", text="Save", icon='FILE_TICK')
        row.operator("pcg.load_preset", text="Load", icon='FILE_FOLDER')


# List of classes to register
classes = [

    PCG_OT_CreateDefaultSpline,
    PCG_OT_Generate,
    PCG_OT_RandomizeSeed,
    PCG_OT_SavePreset,
    PCG_OT_LoadPreset,
    PCG_OT_ResetParameters,
    PCG_OT_AddLayer,
    PCG_OT_RemoveLayer,
    PCG_OT_MoveLayer,
    PCG_UL_LayerList,
    PCG_OT_RestoreHistory,
    PCG_OT_Snapshot,
    PCG_OT_ClearHistory,
    PCG_PT_HistoryPopover,
    PCG_PT_RandomizeConfigPopover,
    PCG_PT_MainPanel,
]
