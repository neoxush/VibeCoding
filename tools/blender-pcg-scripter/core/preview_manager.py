"""Preview system for visualizing the blockout layout before execution.

Spawns wireframe cell tiles plus simple text labels showing key metrics. Uses
the new grid `Cell` model directly so the preview matches what `Generate`
will produce.
"""

from typing import List, Optional

import bpy
import mathutils

from ..generators.layout_generator import (
    CARDINALS,
    DIR_OFFSETS,
    Cell,
    LayoutGenerator,
)
from .adapters import BlenderCurveAdapter
from .errors import InvalidSplineError
from .parameters import BlockoutStyle, GenerationParams
from .spline_sampler import SplinePoint, SplineSampler


class PreviewManager:
    """Manages preview visualization for PCG generation."""

    PREVIEW_COLLECTION_NAME = "PCG_Preview"

    def __init__(self, params: Optional[GenerationParams],
                 spline_object: Optional[bpy.types.Object]):
        self.params = params
        self.spline_object = spline_object
        self.preview_collection = None

    # ------------------------------------------------------------- entrypoints

    def create_preview(self) -> bool:
        try:
            self.clear_preview()
            self.preview_collection = self._get_or_create_preview_collection()

            adapter = BlenderCurveAdapter(self.spline_object)
            sampler = SplineSampler(adapter)
            try:
                sampler.validate_spline()
            except InvalidSplineError as e:
                print(f"Preview: Invalid spline - {e}")
                return False

            points = sampler.sample_points(self.params.spacing)
            if not points:
                print("Preview: No points sampled from spline")
                return False

            from . import seed_manager
            seed = seed_manager.initialize_seed(self.params.seed)
            cells = LayoutGenerator(seed, self.params, points).generate()

            self._create_sample_point_markers(points)
            self._create_cell_previews(cells)
            self._create_metric_labels(points, cells, sampler)

            print(f"Preview created: {len(points)} samples, {len(cells)} cells")
            return True
        except Exception as e:
            print(f"Preview creation failed: {e}")
            import traceback
            traceback.print_exc()
            return False

    def clear_preview(self):
        preview_coll = bpy.data.collections.get(self.PREVIEW_COLLECTION_NAME)
        if preview_coll:
            for obj in list(preview_coll.objects):
                bpy.data.objects.remove(obj, do_unlink=True)
            bpy.data.collections.remove(preview_coll)
        self.preview_collection = None

    # ------------------------------------------------------------ collection

    def _get_or_create_preview_collection(self) -> bpy.types.Collection:
        coll = bpy.data.collections.get(self.PREVIEW_COLLECTION_NAME)
        if coll is None:
            coll = bpy.data.collections.new(self.PREVIEW_COLLECTION_NAME)
            bpy.context.scene.collection.children.link(coll)
        return coll

    # ------------------------------------------------------------ markers

    def _create_sample_point_markers(self, points: List[SplinePoint]):
        for i, point in enumerate(points):
            bpy.ops.object.empty_add(
                type='SPHERE',
                radius=max(0.25, self.params.grid_size * 0.15),
                location=point.position,
            )
            marker = bpy.context.active_object
            marker.name = f"Preview_Sample_{i:03d}"
            marker.color = (0.0, 0.8, 1.0, 1.0)
            for c in marker.users_collection:
                c.objects.unlink(marker)
            self.preview_collection.objects.link(marker)
            marker["pcg_preview"] = True

    # ------------------------------------------------------------ cell tiles

    def _create_cell_previews(self, cells: List[Cell]):
        gs = self.params.grid_size
        sh = self.params.step_height
        is_indoor = self.params.blockout_style == BlockoutStyle.INDOOR.value

        for cell in cells:
            pos = cell.world_position(gs, sh)
            color = self._color_for(cell, is_indoor)
            self._create_wireframe_box(
                position=mathutils.Vector((pos.x, pos.y, pos.z + 0.01)),
                size=(gs, gs, 0.05),
                color=color,
                name=f"Cell_{cell.grid_coord[0]:+03d}_{cell.grid_coord[1]:+03d}",
                tag=cell.role,
            )

            # Edge indicators: open edges are red, doorways green
            for cardinal in CARDINALS:
                nb = cell.neighbors.get(cardinal)
                connected = cardinal in cell.connections
                di, dj = DIR_OFFSETS[cardinal]
                ep = mathutils.Vector((pos.x + di * gs * 0.5,
                                       pos.y + dj * gs * 0.5,
                                       pos.z))
                if nb is None:
                    # wall edge
                    self._make_dot(ep, (1, 0.3, 0.2, 1))
                elif connected and cell.elevation != nb.elevation:
                    # ramp edge
                    self._make_dot(ep, (1, 0.8, 0.1, 1))
                elif connected:
                    # doorway / open
                    self._make_dot(ep, (0.2, 1, 0.4, 1))

    def _color_for(self, cell: Cell, indoor: bool):
        # Color tinted by elevation step for clarity.
        e = cell.elevation
        if cell.role == "lateral":
            return (0.4 + 0.2 * (e % 3), 0.3, 0.9, 1.0)
        # path / room
        if indoor:
            return (0.2 + 0.15 * (e % 4), 0.6, 1.0, 1.0)
        return (0.2, 0.9, 0.5 + 0.1 * (e % 4), 1.0)

    def _make_dot(self, position: mathutils.Vector, color):
        bpy.ops.object.empty_add(type='PLAIN_AXES', radius=0.25, location=position)
        d = bpy.context.active_object
        d.color = color
        d["pcg_preview"] = True
        for c in d.users_collection:
            c.objects.unlink(d)
        self.preview_collection.objects.link(d)

    def _create_wireframe_box(self, position, size, color, name, tag):
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=position)
        box = bpy.context.active_object
        box.name = f"Preview_{name}"
        box.scale = (size[0], size[1], size[2])
        box.display_type = 'WIRE'

        mat_name = f"PCG_Preview_{tag}"
        mat = bpy.data.materials.get(mat_name)
        if mat is None:
            mat = bpy.data.materials.new(name=mat_name)
            mat.use_nodes = True
            bsdf = mat.node_tree.nodes.get("Principled BSDF")
            if bsdf:
                bsdf.inputs["Base Color"].default_value = color
                try:
                    bsdf.inputs["Emission"].default_value = color
                    bsdf.inputs["Emission Strength"].default_value = 0.4
                except Exception:
                    pass
        if box.data.materials:
            box.data.materials[0] = mat
        else:
            box.data.materials.append(mat)

        for c in box.users_collection:
            c.objects.unlink(box)
        self.preview_collection.objects.link(box)
        box["pcg_preview"] = True

    # ------------------------------------------------------------ labels

    def _create_metric_labels(self, points: List[SplinePoint],
                              cells: List[Cell], sampler: SplineSampler):
        if not points or not cells:
            return
        if not getattr(self.params, "show_preview_labels", True):
            return
        spline_length = sampler.get_spline_length()
        mid = points[len(points) // 2].position
        z = (self.params.wall_height * 2
             + self.params.max_elevation_steps * self.params.step_height)

        labels = [
            (mid + mathutils.Vector((0, 0, z)),       "BLOCKOUT PREVIEW"),
            (mid + mathutils.Vector((0, 0, z + 2)),   f"Style: {self.params.blockout_style}"),
            (mid + mathutils.Vector((0, 0, z + 4)),   f"Spline: {spline_length:.1f}m"),
            (mid + mathutils.Vector((0, 0, z + 6)),   f"Cells: {len(cells)}"),
            (mid + mathutils.Vector((0, 0, z + 8)),   f"Grid: {self.params.grid_size:.1f}m"),
        ]
        for i, (pos, text) in enumerate(labels):
            self._create_text_label(pos, text, f"Label_{i}")

    def _create_text_label(self, position, text, name):
        text_data = bpy.data.curves.new(name=f"Preview_{name}", type='FONT')
        text_data.body = text
        text_data.size = 1.0
        text_data.align_x = 'CENTER'
        text_data.align_y = 'CENTER'
        text_obj = bpy.data.objects.new(f"Preview_{name}", text_data)
        text_obj.location = position
        if bpy.context.scene.camera:
            c = text_obj.constraints.new(type='TRACK_TO')
            c.track_axis = 'TRACK_Z'
            c.up_axis = 'UP_Y'
            c.target = bpy.context.scene.camera

        mat_name = "PCG_Preview_Text_Material"
        mat = bpy.data.materials.get(mat_name)
        if mat is None:
            mat = bpy.data.materials.new(name=mat_name)
            mat.use_nodes = True
            bsdf = mat.node_tree.nodes.get("Principled BSDF")
            if bsdf:
                bsdf.inputs["Base Color"].default_value = (1.0, 1.0, 0.0, 1.0)
                try:
                    bsdf.inputs["Emission"].default_value = (1.0, 1.0, 0.0, 1.0)
                    bsdf.inputs["Emission Strength"].default_value = 2.0
                except Exception:
                    pass
        text_data.materials.append(mat)
        self.preview_collection.objects.link(text_obj)
        text_obj["pcg_preview"] = True

    # ------------------------------------------------------------ info

    def get_preview_info(self) -> dict:
        if not self.preview_collection:
            return {"exists": False, "cell_count": 0, "spline_length": 0.0}
        cell_count = sum(1 for o in self.preview_collection.objects
                         if o.name.startswith("Preview_Cell_"))
        adapter = BlenderCurveAdapter(self.spline_object)
        sampler = SplineSampler(adapter)
        return {
            "exists": True,
            "cell_count": cell_count,
            "spline_length": sampler.get_spline_length(),
            "spacing": self.params.spacing,
            "grid_size": self.params.grid_size,
        }
