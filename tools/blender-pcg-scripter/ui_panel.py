"""
UI Panel Module - Blender 3D viewport sidebar panels for PCG Level Blockout.

Panel layout (top-to-bottom in the N-panel):

    1.  Spline Path
    2.  Blockout Style           (top-level Outdoor / Indoor switch)
    3.  Layout Grid              (grid_size, path_width_cells, lateral)
    4.  Elevation                (source, step_height, max_steps, smoothing)
    5.  Blockout Pieces          (per-piece toggles + collection overrides)
    6.  Decoration Layers        (existing layer system; runs AFTER blockout)
    7.  Terrain
    8.  Road Mesh
    9.  Controls & Utilities
    10. Presets
"""

import bpy

from .core import (
    history_manager,
    parameters,
    preset_manager,
    scene_manager,
    seed_manager,
)
from .core.adapters import BlenderCurveAdapter
from .core.errors import PCGError
from .core.parameters import (
    PIECE_DOORWAY,
    PIECE_FLOOR,
    PIECE_PILLAR,
    PIECE_RAMP,
    PIECE_STAIRS,
    PIECE_WALL,
    PIECE_WALL_HALF,
    BlockoutStyle,
)
from .core.preview_manager import PreviewManager
from .core.spline_sampler import SplineSampler
from .generators.building_generator import BuildingBlockGenerator
from .generators.layout_generator import LayoutGenerator
from .generators.terrain_generator import TerrainGenerator

# ------------------------------------------------------------------ operators


class PCG_OT_CreateDefaultSpline(bpy.types.Operator):
    """Create a default spline curve for level generation"""
    bl_idname = "pcg.create_default_spline"
    bl_label = "Create Default Spline"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        bpy.ops.curve.primitive_bezier_curve_add(enter_editmode=False, location=(0, 0, 0))
        curve_obj = context.active_object
        curve_obj.name = "PCG_Path"

        curve_data = curve_obj.data
        if curve_data.splines:
            spline = curve_data.splines[0]
            if len(spline.bezier_points) >= 2:
                spline.bezier_points[0].co = (-10, 0, 0)
                spline.bezier_points[1].co = (10, 0, 0)
                spline.bezier_points[0].handle_left_type = 'AUTO'
                spline.bezier_points[0].handle_right_type = 'AUTO'
                spline.bezier_points[1].handle_left_type = 'AUTO'
                spline.bezier_points[1].handle_right_type = 'AUTO'

        context.scene.pcg_props.spline_object = curve_obj
        self.report({'INFO'}, "Default spline created")
        return {'FINISHED'}


class PCG_OT_Preview(bpy.types.Operator):
    """Toggle preview visualization of generation layout"""
    bl_idname = "pcg.toggle_preview"
    bl_label = "Toggle Preview"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        props = context.scene.pcg_props
        if props.spline_object is None:
            self.report({'ERROR'}, "No spline object selected")
            return {'CANCELLED'}

        preview_coll = bpy.data.collections.get(PreviewManager.PREVIEW_COLLECTION_NAME)
        if preview_coll:
            pm = PreviewManager(None, None)
            pm.clear_preview()
            self.report({'INFO'}, "Preview cleared")
            return {'FINISHED'}

        params = props.to_generation_params()
        pm = PreviewManager(params, props.spline_object)
        if pm.create_preview():
            self.report({'INFO'}, "Preview generated")
        else:
            self.report({'ERROR'}, "Preview generation failed")
        return {'FINISHED'}


class PCG_OT_Generate(bpy.types.Operator):
    """Generate blockout map from spline (multi-pass pipeline)."""
    bl_idname = "pcg.generate"
    bl_label = "Generate Level Blockout"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        history_manager.push_history(context)
        wm = context.window_manager
        wm.progress_begin(0, 100)

        try:
            props = context.scene.pcg_props
            params = props.to_generation_params()

            if params.spline_object is None:
                self.report({'ERROR'}, "No spline object selected")
                return {'CANCELLED'}

            wm.progress_update(10)

            if props.randomize_on_generate:
                new_seed = seed_manager.generate_random_seed()
                props.seed = new_seed
                params.seed = new_seed
                self.report({'INFO'}, f"Randomized seed: {new_seed}")

            seed = seed_manager.initialize_seed(params.seed)
            wm.progress_update(20)

            # ---- Sample spline ----
            adapter = BlenderCurveAdapter(params.spline_object)
            sampler = SplineSampler(adapter)
            sampler.validate_spline()
            spline_points = sampler.sample_points(params.spacing)
            if not spline_points:
                self.report({'ERROR'}, "No points sampled from spline")
                return {'CANCELLED'}
            self.report({'INFO'}, f"Sampled {len(spline_points)} points from spline")
            wm.progress_update(35)

            # ---- P1-P6: build cell grid ----
            layout_gen = LayoutGenerator(seed, params, spline_points)
            cells = layout_gen.generate()
            self.report({'INFO'}, f"Built {len(cells)} cells "
                                  f"({params.blockout_style.lower()} style)")
            wm.progress_update(55)

            # ---- Collection scaffolding ----
            (root_coll, struct_coll, terrain_coll, conn_coll) = \
                scene_manager.create_generation_structure()

            # ---- Blockout (Floor/Wall/Traversal) ----
            building_gen = BuildingBlockGenerator(seed, params)
            blockout_by_piece = building_gen.build_blockout(cells)

            blockout_root = bpy.data.collections.new("Blockout")
            struct_coll.children.link(blockout_root)
            for piece_id, objs in blockout_by_piece.items():
                if not objs:
                    continue
                pcoll = bpy.data.collections.new(piece_id.capitalize())
                blockout_root.children.link(pcoll)
                scene_manager.organize_objects(objs, pcoll.name)

            total_blockout = sum(len(o) for o in blockout_by_piece.values())
            self.report({'INFO'}, f"Placed {total_blockout} blockout pieces")
            wm.progress_update(75)

            # ---- Decoration layers (legacy layer system) ----
            decor_blocks: dict[str, list] = {}
            for cell in cells:
                cell_blocks = building_gen.populate_cell(cell)
                for layer_name, blocks in cell_blocks.items():
                    decor_blocks.setdefault(layer_name, []).extend(blocks)

            if decor_blocks:
                decor_root = bpy.data.collections.new("Decoration")
                struct_coll.children.link(decor_root)
                for layer_name, blocks in decor_blocks.items():
                    if blocks:
                        lc = bpy.data.collections.new(layer_name)
                        decor_root.children.link(lc)
                        scene_manager.organize_objects(blocks, lc.name)

            total_decor = sum(len(b) for b in decor_blocks.values())
            self.report({'INFO'}, f"Placed {total_decor} decoration blocks")
            wm.progress_update(85)

            # ---- Terrain ----
            if params.terrain_enabled:
                terrain_gen = TerrainGenerator(seed, params, spline_points)
                terrain_obj = terrain_gen.generate(cells)  # cells expose .position/.size
                if terrain_obj:
                    scene_manager.organize_objects([terrain_obj], terrain_coll.name)
                    self.report({'INFO'}, "Terrain generated")

            if params.road_mesh_enabled:
                terrain_gen = TerrainGenerator(seed, params, spline_points)
                road_obj = terrain_gen.generate_road_mesh()
                if road_obj:
                    scene_manager.organize_objects([road_obj], terrain_coll.name)
                    self.report({'INFO'}, "Road mesh generated")

            wm.progress_update(95)

            scene_manager.store_metadata(root_coll, params)
            wm.progress_update(100)

            self.report({'INFO'},
                f"Done: {len(cells)} cells, {total_blockout} blockout, "
                f"{total_decor} decor, {len(spline_points)} samples, seed={seed}")
            return {'FINISHED'}

        except PCGError as e:
            self.report({'ERROR'}, str(e))
            return {'CANCELLED'}
        except Exception as e:
            import traceback
            traceback.print_exc()
            self.report({'ERROR'}, f"Generation failed: {e}")
            return {'CANCELLED'}
        finally:
            wm.progress_end()


class PCG_OT_RandomizeSeed(bpy.types.Operator):
    """Generate a new random seed (and optionally remix parameters)."""
    bl_idname = "pcg.randomize_seed"
    bl_label = "Randomize Seed"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        history_manager.push_history(context)

        import random
        props = context.scene.pcg_props
        new_seed = seed_manager.generate_random_seed()
        props.seed = new_seed

        if props.random_include_spacing:
            props.spacing = random.choice([2.0, 3.0, 4.0, 6.0])
        if props.random_include_width:
            props.path_width_cells = random.randint(1, 3)
        if props.random_include_density:
            props.lateral_density = random.uniform(0.1, 0.7)
        if props.random_include_variation:
            props.space_size_variation = random.uniform(0.1, 0.7)
        if props.random_include_grid:
            props.grid_size = random.choice([2.0, 3.0, 4.0])
        if props.random_include_height:
            props.wall_height = random.uniform(2.5, 5.0)
        if props.random_include_elevation:
            props.max_elevation_steps = random.randint(0, 3)
            props.step_height = random.uniform(1.0, 2.5)
        if props.terrain_enabled and props.random_include_terrain:
            props.height_variation = random.uniform(5.0, 20.0)
            props.smoothness = random.uniform(0.3, 0.9)
            props.terrain_width = random.uniform(30.0, 80.0)
        if props.road_mode_enabled and props.random_include_road:
            props.road_width = random.uniform(6.0, 15.0)

        self.report({'INFO'}, f"Remixed parameters (Seed: {new_seed})")
        return {'FINISHED'}


# -------------------------- Preset ops (unchanged signatures) --------------


class PCG_OT_SavePreset(bpy.types.Operator):
    bl_idname = "pcg.save_preset"
    bl_label = "Save Preset"
    preset_name: bpy.props.StringProperty(name="Preset Name")

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)

    def execute(self, context):
        props = context.scene.pcg_props
        params = props.to_generation_params()
        success, msg = preset_manager.save_preset(self.preset_name, params)
        if success:
            self.report({'INFO'}, f"Preset '{self.preset_name}' saved")
        else:
            self.report({'ERROR'}, msg or "Failed to save preset")
        return {'FINISHED'}


class PCG_OT_LoadPreset(bpy.types.Operator):
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


class PCG_OT_DeletePreset(bpy.types.Operator):
    bl_idname = "pcg.delete_preset"
    bl_label = "Delete Preset"
    preset_name: bpy.props.EnumProperty(
        name="Preset",
        items=lambda self, context: [(p, p, "") for p in preset_manager.get_preset_list()]
    )

    @classmethod
    def poll(cls, context):
        return len(preset_manager.get_preset_list()) > 0

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)

    def execute(self, context):
        if preset_manager.delete_preset(self.preset_name):
            self.report({'INFO'}, f"Preset '{self.preset_name}' deleted")
        else:
            self.report({'ERROR'}, "Failed to delete preset")
        return {'FINISHED'}


class PCG_OT_ResetParameters(bpy.types.Operator):
    """Reset all parameters to defaults"""
    bl_idname = "pcg.reset_parameters"
    bl_label = "Reset Parameters"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        props = context.scene.pcg_props
        d = parameters.ParameterDefaults
        props.spacing = d.SPACING
        props.path_width = d.PATH_WIDTH
        props.blockout_style = d.BLOCKOUT_STYLE
        props.lateral_density = d.LATERAL_DENSITY
        props.space_size_variation = d.SPACE_SIZE_VARIATION
        props.seed = 0
        props.grid_size = d.GRID_SIZE
        props.wall_height = d.WALL_HEIGHT
        props.path_width_cells = d.PATH_WIDTH_CELLS
        props.lateral_depth_cells = d.LATERAL_DEPTH_CELLS
        props.elevation_source = d.ELEVATION_SOURCE
        props.step_height = d.STEP_HEIGHT
        props.max_elevation_steps = d.MAX_ELEVATION_STEPS
        props.elevation_smoothing = d.ELEVATION_SMOOTHING
        props.cover_density = d.COVER_DENSITY
        props.ramp_slope_cells = d.RAMP_SLOPE_CELLS
        props.use_stairs = d.USE_STAIRS
        props.generate_pillars = d.GENERATE_PILLARS
        props.block_type_floor = True
        props.block_type_wall = True
        props.block_type_wall_half = True
        props.block_type_doorway = True
        props.block_type_ramp = True
        props.block_type_stairs = False
        props.block_type_pillar = False
        props.terrain_enabled = d.TERRAIN_ENABLED
        props.height_variation = d.HEIGHT_VARIATION
        props.smoothness = d.SMOOTHNESS
        props.terrain_width = d.TERRAIN_WIDTH
        self.report({'INFO'}, "Parameters reset to defaults")
        return {'FINISHED'}


# ---------------------------- layer-list ops -------------------------------


class PCG_UL_LayerList(bpy.types.UIList):
    def draw_item(self, context, layout, data, item, icon, active_data, active_propname, index):
        if self.layout_type in {'DEFAULT', 'COMPACT'}:
            layout.prop(item, "enabled", text="")
            layout.prop(item, "name", text="", emboss=False)
            layout.label(text=item.rule, icon='MODIFIER')
        elif self.layout_type == 'GRID':
            layout.alignment = 'CENTER'
            layout.label(text="", icon='MODIFIER')


class PCG_OT_AddLayer(bpy.types.Operator):
    bl_idname = "pcg.add_layer"
    bl_label = "Add Layer"

    def execute(self, context):
        props = context.scene.pcg_props
        layer = props.layers.add()
        layer.name = f"Layer {len(props.layers)}"
        props.active_layer_index = len(props.layers) - 1
        return {'FINISHED'}


class PCG_OT_RemoveLayer(bpy.types.Operator):
    bl_idname = "pcg.remove_layer"
    bl_label = "Remove Layer"

    @classmethod
    def poll(cls, context):
        return len(context.scene.pcg_props.layers) > 0

    def execute(self, context):
        props = context.scene.pcg_props
        props.layers.remove(props.active_layer_index)
        props.active_layer_index = min(max(0, props.active_layer_index - 1), len(props.layers) - 1)
        return {'FINISHED'}


class PCG_OT_MoveLayer(bpy.types.Operator):
    bl_idname = "pcg.move_layer"
    bl_label = "Move Layer"
    direction: bpy.props.EnumProperty(items=[('UP', "Up", ""), ('DOWN', "Down", "")])

    @classmethod
    def poll(cls, context):
        return len(context.scene.pcg_props.layers) > 0

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


class PCG_OT_DuplicateLayer(bpy.types.Operator):
    bl_idname = "pcg.duplicate_layer"
    bl_label = "Duplicate Layer"
    bl_options = {'REGISTER', 'UNDO'}

    @classmethod
    def poll(cls, context):
        return len(context.scene.pcg_props.layers) > 0

    def execute(self, context):
        props = context.scene.pcg_props
        idx = props.active_layer_index
        if idx < 0 or idx >= len(props.layers):
            return {'CANCELLED'}
        source = props.layers[idx]
        new_layer = props.layers.add()
        for attr in ("name", "enabled", "rule", "collection_name", "density",
                     "offset", "z_offset", "random_rotation", "random_scale",
                     "scale_min", "scale_max"):
            setattr(new_layer, attr, getattr(source, attr))
        new_layer.name = f"{source.name} Copy"
        props.active_layer_index = len(props.layers) - 1
        return {'FINISHED'}


class PCG_OT_ToggleAllLayers(bpy.types.Operator):
    bl_idname = "pcg.toggle_all_layers"
    bl_label = "Toggle All Layers"
    bl_options = {'REGISTER', 'UNDO'}
    action: bpy.props.EnumProperty(items=[('ENABLE', "Enable", ""), ('DISABLE', "Disable", "")])

    @classmethod
    def poll(cls, context):
        return len(context.scene.pcg_props.layers) > 0

    def execute(self, context):
        enabled = self.action == 'ENABLE'
        for layer in context.scene.pcg_props.layers:
            layer.enabled = enabled
        return {'FINISHED'}


# ----------------------- history ops --------------------------------------


class PCG_OT_RestoreHistory(bpy.types.Operator):
    bl_idname = "pcg.restore_history"
    bl_label = "Restore"
    bl_options = {'REGISTER', 'UNDO'}
    index: bpy.props.IntProperty()

    def execute(self, context):
        history_manager.restore_history(context, self.index)
        if context.scene.pcg_props.spline_object:
            bpy.ops.pcg.generate()
        self.report({'INFO'}, "Restored from history")
        return {'FINISHED'}


class PCG_OT_Snapshot(bpy.types.Operator):
    bl_idname = "pcg.snapshot"
    bl_label = "Snapshot"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        history_manager.push_history(context, is_snapshot=True)
        self.report({'INFO'}, "Snapshot saved")
        return {'FINISHED'}


class PCG_OT_ClearHistory(bpy.types.Operator):
    bl_idname = "pcg.clear_history"
    bl_label = "Clear History"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        history_manager.clear_history(context)
        self.report({'INFO'}, "History cleared")
        return {'FINISHED'}


# -------------------------- popovers --------------------------------------


class PCG_PT_HistoryPopover(bpy.types.Panel):
    bl_label = "History"
    bl_idname = "PCG_PT_history_popover"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'PCG Blockout'
    bl_options = {'INSTANCED'}

    @classmethod
    def poll(cls, context):
        return context.scene is not None and hasattr(context.scene, "pcg_props")

    def draw(self, context):
        layout = self.layout
        props = context.scene.pcg_props
        layout.operator("pcg.snapshot", text="Save Snapshot", icon='BOOKMARKS')
        layout.separator()
        if len(props.history) > 0:
            box = layout.box()
            box.label(text="Recent Generations", icon='TIME')
            for i in range(len(props.history) - 1, -1, -1):
                item = props.history[i]
                row = box.row()
                icon = 'BOOKMARKS' if item.is_snapshot else 'TIME'
                row.label(text=item.name, icon=icon)
                op = row.operator("pcg.restore_history", text="", icon='LOOP_BACK')
                op.index = i
            layout.separator()
            layout.operator("pcg.clear_history", text="Clear History", icon='TRASH')
        else:
            layout.label(text="No history yet", icon='INFO')


class PCG_PT_RandomizeConfigPopover(bpy.types.Panel):
    bl_label = "Randomize Settings"
    bl_idname = "PCG_PT_randomize_config_popover"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'PCG Blockout'
    bl_options = {'INSTANCED'}

    @classmethod
    def poll(cls, context):
        return context.scene is not None and hasattr(context.scene, "pcg_props")

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
        col.prop(props, "random_include_elevation")
        col.separator()
        col.prop(props, "random_include_terrain")
        col.prop(props, "random_include_road")


# -------------------------- main panel ------------------------------------


# Map piece id -> (prop name on PG, override prop on PG, icon, label)
_PIECE_UI: list = [
    (PIECE_FLOOR,     "block_type_floor",     "piece_override_floor",
     'MESH_PLANE',    "Floor"),
    (PIECE_WALL,      "block_type_wall",      "piece_override_wall",
     'MESH_CUBE',     "Wall"),
    (PIECE_WALL_HALF, "block_type_wall_half", "piece_override_wall_half",
     'MOD_BEVEL',     "Cover (Half-wall)"),
    (PIECE_DOORWAY,   "block_type_doorway",   "piece_override_doorway",
     'MOD_BUILD',     "Doorway"),
    (PIECE_RAMP,      "block_type_ramp",      "piece_override_ramp",
     'TRIA_UP_BAR',   "Ramp"),
    (PIECE_STAIRS,    "block_type_stairs",    "piece_override_stairs",
     'MOD_ARRAY',     "Stairs"),
    (PIECE_PILLAR,    "block_type_pillar",    "piece_override_pillar",
     'MESH_CYLINDER', "Pillar"),
]


class PCG_PT_MainPanel(bpy.types.Panel):
    bl_label = "PCG Level Blockout"
    bl_idname = "PCG_PT_main_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'PCG Blockout'

    @classmethod
    def poll(cls, context):
        return context.scene is not None and hasattr(context.scene, "pcg_props")

    def draw(self, context):
        layout = self.layout
        props = context.scene.pcg_props

        # 1. Spline Path ------------------------------------------------
        box = layout.box()
        box.label(text="Spline Path", icon='CURVE_DATA')
        box.prop(props, "spline_object", text="Spline")
        if props.spline_object is None:
            box.operator("pcg.create_default_spline", icon='ADD')
            box.label(text="No spline selected!", icon='ERROR')
        else:
            obj = props.spline_object
            if obj.type == 'CURVE':
                box.label(text=f"Spline: {obj.name}", icon='CHECKMARK')
            else:
                box.label(text="Selected object is not a curve!", icon='ERROR')

        # 2. Blockout Style --------------------------------------------
        box = layout.box()
        box.label(text="Blockout Style", icon='WORLD')
        box.prop(props, "blockout_style", text="")
        if props.blockout_style == BlockoutStyle.OUTDOOR.value:
            box.label(text="Open platforms · cover walls · ramps", icon='DOT')
        else:
            box.label(text="Enclosed rooms · doorways · sealed walls", icon='DOT')

        # 3. Layout Grid ------------------------------------------------
        box = layout.box()
        box.label(text="Layout Grid", icon='OUTLINER')
        box.prop(props, "grid_size")
        box.prop(props, "spacing")
        row = box.row(align=True)
        row.prop(props, "path_width_cells")
        row.prop(props, "lateral_depth_cells")
        box.prop(props, "lateral_density")
        box.prop(props, "space_size_variation")

        sub = box.box()
        sub.label(text="Road Mode", icon='AUTO')
        if props.road_mode_enabled:
            sub.prop(props, "road_mode_enabled",
                     text="Road Mode: ON", toggle=True, icon='CHECKMARK')
            sub.prop(props, "road_width")
            sub.prop(props, "side_placement")
        else:
            sub.prop(props, "road_mode_enabled",
                     text="Road Mode: OFF", toggle=True, icon='CHECKBOX_DEHLT')

        # Spline length estimate
        if props.spline_object and props.spline_object.type == 'CURVE':
            try:
                spline_length = sum(
                    s.calc_length() for s in props.spline_object.data.splines
                )
                estimated = int(spline_length / props.spacing) if props.spacing > 0 else 0
                box.label(
                    text=f"~{estimated} sample cells along {spline_length:.1f}m spline",
                    icon='INFO',
                )
            except Exception:
                pass

        # 4. Elevation --------------------------------------------------
        box = layout.box()
        box.label(text="Elevation", icon='SORT_DESC')
        box.prop(props, "elevation_source", text="")
        if props.elevation_source != "FLAT":
            box.prop(props, "step_height")
            box.prop(props, "max_elevation_steps")
            box.prop(props, "elevation_smoothing")

        # 5. Blockout Pieces -------------------------------------------
        box = layout.box()
        box.label(text="Blockout Pieces", icon='MOD_BUILD')
        box.prop(props, "wall_height")
        box.prop(props, "ramp_slope_cells")
        row = box.row(align=True)
        row.prop(props, "cover_density")
        col2 = box.column(align=True)
        col2.prop(props, "use_stairs", icon='MOD_ARRAY')
        col2.prop(props, "generate_pillars", icon='MESH_CYLINDER')

        # Per-piece grid
        pieces_box = box.box()
        pieces_box.label(text="Piece Library:", icon='ASSET_MANAGER')
        for piece_id, prop_name, override_name, icon, label in _PIECE_UI:
            row = pieces_box.row(align=True)
            row.prop(props, prop_name, text="", icon=icon)
            row.label(text=label)
            sub = row.row(align=True)
            sub.scale_x = 1.4
            sub.prop_search(props, override_name, bpy.data, "collections", text="")

        # 6. Decoration Layers (runs AFTER blockout) -------------------
        box = layout.box()
        box.label(text="Decoration Layers (post-blockout)", icon='MODIFIER')
        row = box.row()
        row.template_list("PCG_UL_LayerList", "", props, "layers", props, "active_layer_index")
        col = row.column(align=True)
        col.operator("pcg.add_layer", icon='ADD', text="")
        col.operator("pcg.remove_layer", icon='REMOVE', text="")
        col.separator()
        col.operator("pcg.duplicate_layer", icon='DUPLICATE', text="")
        col.operator("pcg.move_layer", icon='TRIA_UP', text="").direction = 'UP'
        col.operator("pcg.move_layer", icon='TRIA_DOWN', text="").direction = 'DOWN'
        col.separator()
        col.operator("pcg.toggle_all_layers", icon='CHECKBOX_HLT', text="").action = 'ENABLE'
        col.operator("pcg.toggle_all_layers", icon='CHECKBOX_DEHLT', text="").action = 'DISABLE'

        if props.layers and 0 <= props.active_layer_index < len(props.layers):
            active_layer = props.layers[props.active_layer_index]
            sub_box = box.box()
            sub_box.label(text=f"Properties: {active_layer.name}")
            sub_box.prop(active_layer, "name")
            sub_box.prop(active_layer, "rule")
            sub_box.prop_search(active_layer, "collection_name", bpy.data, "collections")
            col = sub_box.column(align=True)
            col.prop(active_layer, "density")
            col.prop(active_layer, "offset")
            col.prop(active_layer, "z_offset")
            col = sub_box.column(align=True)
            col.prop(active_layer, "random_rotation")
            col.prop(active_layer, "random_scale")
            if active_layer.random_scale:
                row = col.row(align=True)
                row.prop(active_layer, "scale_min")
                row.prop(active_layer, "scale_max")

        # 7. Terrain ----------------------------------------------------
        box = layout.box()
        box.label(text="Terrain", icon='MESH_GRID')
        box.prop(props, "terrain_enabled")
        if props.terrain_enabled:
            box.prop(props, "height_variation")
            box.prop(props, "smoothness")
            box.prop(props, "terrain_width")

        # 8. Road Mesh --------------------------------------------------
        box = layout.box()
        box.label(text="Road Mesh", icon='MESH_PLANE')
        box.prop(props, "road_mesh_enabled")
        if props.road_mesh_enabled:
            box.prop(props, "road_mesh_width", text="Width")
            box.prop(props, "road_height_offset")
            box.prop(props, "road_material_color")

        layout.separator()

        # 9. Controls & Utilities --------------------------------------
        col = layout.column(align=True)
        if props.spline_object is None:
            col.enabled = False
        row = col.row(align=True)
        row.operator("pcg.randomize_seed", text="Remix Parameters", icon='FILE_REFRESH')
        row.popover(panel="PCG_PT_randomize_config_popover", text="", icon='PREFERENCES')
        col.operator("pcg.reset_parameters", text="Reset Parameters", icon='LOOP_BACK')
        col.separator()
        row = col.row(align=True)
        row.scale_y = 1.2
        row.operator("pcg.generate", text="Generate", icon='PLAY')
        row.operator("pcg.toggle_preview", text="Preview", icon='HIDE_OFF')
        row.popover(panel="PCG_PT_history_popover", text="", icon='TIME')

        layout.separator()

        # 10. Presets --------------------------------------------------
        box = layout.box()
        box.label(text="Presets", icon='PRESET')
        row = box.row(align=True)
        row.operator("pcg.save_preset", text="Save", icon='FILE_TICK')
        row.operator("pcg.load_preset", text="Load", icon='FILE_FOLDER')
        row.operator("pcg.delete_preset", text="", icon='TRASH')


# ---------------------------- registration ---------------------------------

classes = [
    PCG_OT_CreateDefaultSpline,
    PCG_OT_Preview,
    PCG_OT_Generate,
    PCG_OT_RandomizeSeed,
    PCG_OT_SavePreset,
    PCG_OT_LoadPreset,
    PCG_OT_DeletePreset,
    PCG_OT_ResetParameters,
    PCG_OT_AddLayer,
    PCG_OT_RemoveLayer,
    PCG_OT_DuplicateLayer,
    PCG_OT_MoveLayer,
    PCG_OT_ToggleAllLayers,
    PCG_UL_LayerList,
    PCG_OT_RestoreHistory,
    PCG_OT_Snapshot,
    PCG_OT_ClearHistory,
    PCG_PT_HistoryPopover,
    PCG_PT_RandomizeConfigPopover,
    PCG_PT_MainPanel,
]
