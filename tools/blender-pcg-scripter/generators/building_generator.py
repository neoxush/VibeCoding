"""Building block generator.

Owns the canonical placeholder piece library (Floor / Wall / Wall-Half /
Doorway / Ramp / Stairs / Pillar) used by the blockout builder, and runs the
three blockout passes (floor / wall / traversal) on a grid of ``Cell``s.

The decoration pass (existing layer system) lives in :py:meth:`populate_cell`
and remains unchanged in spirit -- it now takes a ``Cell`` (which exposes the
legacy Space-shape attributes via properties).
"""

from __future__ import annotations

import math
import random
from enum import Enum
from typing import Dict, List, Optional

import bmesh
import bpy
import mathutils

from ..core.layer_system import LayerConfig, PlacementRule
from ..core.parameters import (
    PIECE_DOORWAY,
    PIECE_FLOOR,
    PIECE_PILLAR,
    PIECE_RAMP,
    PIECE_STAIRS,
    PIECE_WALL,
    PIECE_WALL_HALF,
    GenerationParams,
)
from .layout_generator import (
    CARDINALS,
    DIR_E,
    DIR_N,
    DIR_OFFSETS,
    DIR_S,
    DIR_W,
    Cell,
)


class BlockType(Enum):
    """All placeholder piece types supported by the blockout builder."""
    FLOOR = PIECE_FLOOR
    WALL = PIECE_WALL
    WALL_HALF = PIECE_WALL_HALF
    DOORWAY = PIECE_DOORWAY
    RAMP = PIECE_RAMP
    STAIRS = PIECE_STAIRS
    PILLAR = PIECE_PILLAR


# Yaw (Z-rotation) used to face a piece toward a cardinal direction.
# Pieces are authored facing +Y (north) by default.
_CARDINAL_YAW: Dict[str, float] = {
    DIR_N: 0.0,
    DIR_E: -math.pi / 2,
    DIR_S: math.pi,
    DIR_W: math.pi / 2,
}


class BuildingBlockGenerator:
    """Builds blockout geometry from a grid of `Cell`s.

    Two entry points:

    * :py:meth:`build_blockout` runs the FLOOR / WALL / TRAVERSAL passes.
    * :py:meth:`populate_cell` runs the user-defined decoration layers.

    The legacy ``populate_space`` name remains as an alias for back-compat
    with code that has not yet migrated.
    """

    # -------------------------------------------------- construction & utils

    def __init__(self, seed: int, params: GenerationParams):
        self.seed = seed
        self.params = params
        self.rng = random.Random(seed)

    @staticmethod
    def align_to_grid(position: mathutils.Vector, grid_size: float) -> mathutils.Vector:
        """Snap a position to the nearest grid point."""
        return mathutils.Vector((
            round(position.x / grid_size) * grid_size,
            round(position.y / grid_size) * grid_size,
            round(position.z / grid_size) * grid_size,
        ))

    # -------------------------------------------------- piece factory helpers

    def _piece_enabled(self, piece_id: str) -> bool:
        return piece_id in self.params.block_types

    def _override_for(self, piece_id: str) -> Optional[bpy.types.Collection]:
        name = (self.params.piece_overrides or {}).get(piece_id, "")
        if not name:
            return None
        return bpy.data.collections.get(name)

    def _spawn_override(self, coll: bpy.types.Collection, location: mathutils.Vector,
                       yaw: float, scale: mathutils.Vector) -> Optional[bpy.types.Object]:
        meshes = [o for o in coll.objects if o.type == 'MESH']
        if not meshes:
            return None
        src = self.rng.choice(meshes)
        obj = src.copy()
        bpy.context.collection.objects.link(obj)
        obj.location = location
        obj.rotation_mode = 'XYZ'
        obj.rotation_euler = (0.0, 0.0, yaw)
        obj.scale = scale
        return obj

    def _spawn_primitive_box(self, location: mathutils.Vector,
                             dims: mathutils.Vector, yaw: float = 0.0) -> bpy.types.Object:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=location)
        obj = bpy.context.active_object
        obj.scale = (dims.x, dims.y, dims.z)
        obj.rotation_mode = 'XYZ'
        obj.rotation_euler = (0.0, 0.0, yaw)
        bpy.ops.object.transform_apply(rotation=True, scale=True)
        return obj

    # -------------------------------------------------- single-piece builders

    def generate_block(self, block_type: BlockType, position: mathutils.Vector,
                       dimensions: mathutils.Vector, space_id: int, index: int,
                       yaw: float = 0.0) -> bpy.types.Object:
        """Create a single building block (override-aware)."""
        aligned = self.align_to_grid(position, self.params.grid_size)

        # Override path
        coll = self._override_for(block_type.value)
        if coll is not None:
            obj = self._spawn_override(
                coll, aligned, yaw,
                mathutils.Vector((dimensions.x, dimensions.y, dimensions.z)),
            )
            if obj is not None:
                obj.name = f"{block_type.value.capitalize()}_{space_id:04d}_{index:03d}"
                return obj
            # Fall-through to primitive if collection had no meshes.

        # Primitive path
        if block_type == BlockType.FLOOR:
            obj = self._create_floor_primitive(aligned, dimensions, yaw)
        elif block_type == BlockType.WALL:
            obj = self._create_wall_primitive(aligned, dimensions, yaw, full=True)
        elif block_type == BlockType.WALL_HALF:
            obj = self._create_wall_primitive(aligned, dimensions, yaw, full=False)
        elif block_type == BlockType.DOORWAY:
            obj = self._create_doorway_primitive(aligned, dimensions, yaw)
        elif block_type == BlockType.RAMP:
            obj = self._create_ramp_primitive(aligned, dimensions, yaw)
        elif block_type == BlockType.STAIRS:
            obj = self._create_stairs_primitive(aligned, dimensions, yaw)
        elif block_type == BlockType.PILLAR:
            obj = self._create_pillar_primitive(aligned, dimensions)
        else:
            obj = self._create_wall_primitive(aligned, dimensions, yaw, full=True)

        obj.name = f"{block_type.value.capitalize()}_{space_id:04d}_{index:03d}"
        return obj

    # ----------------- Primitive shapes -----------------------------------

    def _create_floor_primitive(self, position: mathutils.Vector,
                                dims: mathutils.Vector, yaw: float) -> bpy.types.Object:
        thickness = max(0.05, self.params.grid_size * 0.05)
        loc = mathutils.Vector((position.x, position.y, position.z - thickness * 0.5))
        return self._spawn_primitive_box(loc, mathutils.Vector((dims.x, dims.y, thickness)), yaw)

    def _create_wall_primitive(self, position: mathutils.Vector, dims: mathutils.Vector,
                               yaw: float, full: bool) -> bpy.types.Object:
        thickness = max(0.1, self.params.grid_size * 0.1)
        height = dims.z if full else dims.z * 0.45
        # Wall sits along local X axis (length = grid_size) and is 'thickness' deep on Y.
        # Place its centre at half-height above floor.
        loc = mathutils.Vector((position.x, position.y, position.z + height * 0.5))
        return self._spawn_primitive_box(
            loc, mathutils.Vector((dims.x, thickness, height)), yaw
        )

    def _create_doorway_primitive(self, position: mathutils.Vector, dims: mathutils.Vector,
                                  yaw: float) -> bpy.types.Object:
        """Two short posts + a lintel forming a passable opening."""
        thickness = max(0.1, self.params.grid_size * 0.1)
        height = dims.z
        post_w = max(0.15, dims.x * 0.15)
        lintel_h = max(0.15, height * 0.2)
        opening_h = height - lintel_h
        side_offset = dims.x * 0.5 - post_w * 0.5

        # Build at origin, then rotate+translate.
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0))
        obj = bpy.context.active_object
        mesh = obj.data
        bm = bmesh.new()
        bm.from_mesh(mesh)
        bm.clear()

        def _add_box(cx, cy, cz, sx, sy, sz):
            verts = []
            for sxv in (-0.5, 0.5):
                for syv in (-0.5, 0.5):
                    for szv in (-0.5, 0.5):
                        verts.append(bm.verts.new(
                            (cx + sxv * sx, cy + syv * sy, cz + szv * sz)
                        ))
            bm.verts.ensure_lookup_table()
            # 6 faces of the cube using the 8 verts (Z-low / Z-high ordering)
            v = verts
            bm.faces.new((v[0], v[2], v[3], v[1]))  # -X
            bm.faces.new((v[4], v[5], v[7], v[6]))  # +X
            bm.faces.new((v[0], v[1], v[5], v[4]))  # -Y
            bm.faces.new((v[2], v[6], v[7], v[3]))  # +Y
            bm.faces.new((v[0], v[4], v[6], v[2]))  # -Z
            bm.faces.new((v[1], v[3], v[7], v[5]))  # +Z

        _add_box(-side_offset, 0.0, opening_h * 0.5, post_w, thickness, opening_h)
        _add_box(+side_offset, 0.0, opening_h * 0.5, post_w, thickness, opening_h)
        _add_box(0.0, 0.0, opening_h + lintel_h * 0.5, dims.x, thickness, lintel_h)

        bm.to_mesh(mesh)
        bm.free()
        mesh.update()

        obj.location = position
        obj.rotation_mode = 'XYZ'
        obj.rotation_euler = (0.0, 0.0, yaw)
        return obj

    def _create_ramp_primitive(self, position: mathutils.Vector, dims: mathutils.Vector,
                               yaw: float) -> bpy.types.Object:
        """Wedge sloping up along +X (after yaw).

        ``dims``: x = run, y = grid width, z = rise.
        Low end at +X, high end at -X? Let's set: low at the cell origin (where
        we place the piece), high in the +X direction (then yaw rotates it).
        """
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0))
        obj = bpy.context.active_object
        obj.scale = (dims.x, dims.y, dims.z)
        bpy.ops.object.transform_apply(scale=True)

        mesh = obj.data
        bm = bmesh.new()
        bm.from_mesh(mesh)
        # Translate so bottom sits on z=0
        bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, dims.z * 0.5))
        # Flatten the +X edge to bottom (creates the ramp slope downwards toward +X)
        bottom_z = min(v.co.z for v in bm.verts)
        for v in bm.verts:
            if v.co.x > 0:
                v.co.z = bottom_z
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0001)
        bm.to_mesh(mesh)
        bm.free()
        mesh.update()

        obj.location = position
        obj.rotation_mode = 'XYZ'
        obj.rotation_euler = (0.0, 0.0, yaw)
        return obj

    def _create_stairs_primitive(self, position: mathutils.Vector, dims: mathutils.Vector,
                                 yaw: float) -> bpy.types.Object:
        """Stepped ramp variant. Steps run along +X, rising to +Z."""
        n_steps = max(3, int(round(dims.z / max(0.15, self.params.grid_size * 0.075))))
        step_run = dims.x / n_steps
        step_rise = dims.z / n_steps

        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0))
        obj = bpy.context.active_object
        mesh = obj.data
        bm = bmesh.new()
        bm.from_mesh(mesh)
        bm.clear()

        for i in range(n_steps):
            cx = (i + 0.5) * step_run - dims.x * 0.5
            cz = step_rise * (n_steps - i - 0.5)
            verts = []
            for sxv in (-0.5, 0.5):
                for syv in (-0.5, 0.5):
                    for szv in (-0.5, 0.5):
                        verts.append(bm.verts.new((
                            cx + sxv * step_run,
                            syv * dims.y,
                            cz + szv * step_rise,
                        )))
            v = verts
            bm.faces.new((v[0], v[2], v[3], v[1]))
            bm.faces.new((v[4], v[5], v[7], v[6]))
            bm.faces.new((v[0], v[1], v[5], v[4]))
            bm.faces.new((v[2], v[6], v[7], v[3]))
            bm.faces.new((v[0], v[4], v[6], v[2]))
            bm.faces.new((v[1], v[3], v[7], v[5]))
            bm.verts.ensure_lookup_table()

        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0001)
        bm.to_mesh(mesh)
        bm.free()
        mesh.update()

        obj.location = position
        obj.rotation_mode = 'XYZ'
        obj.rotation_euler = (0.0, 0.0, yaw)
        return obj

    def _create_pillar_primitive(self, position: mathutils.Vector,
                                 dims: mathutils.Vector) -> bpy.types.Object:
        radius = max(0.1, self.params.grid_size * 0.08)
        loc = mathutils.Vector((position.x, position.y, position.z + dims.z * 0.5))
        return self._spawn_primitive_box(
            loc, mathutils.Vector((radius * 2, radius * 2, dims.z)), 0.0
        )

    # ---------------------------------------------------- blockout pipeline

    def build_blockout(self, cells: List[Cell]) -> Dict[str, List[bpy.types.Object]]:
        """Run FLOOR / WALL / TRAVERSAL passes on the given cells.

        Returns:
            Dict mapping piece-type id -> list of created objects.
        """
        out: Dict[str, List[bpy.types.Object]] = {}
        for piece in BlockType:
            out[piece.value] = []

        gs = self.params.grid_size
        wh = self.params.wall_height
        sh = self.params.step_height

        # -------- P3 FLOOR pass
        if self._piece_enabled(PIECE_FLOOR):
            for cell in cells:
                pos = cell.world_position(gs, sh)
                obj = self.generate_block(
                    BlockType.FLOOR, pos,
                    mathutils.Vector((gs, gs, wh)),
                    space_id=cell.id, index=0, yaw=0.0,
                )
                out[PIECE_FLOOR].append(obj)

        # -------- P4 WALL pass
        # We process each cell-edge once by only walking N/E to skip duplicates.
        # For edges with a missing neighbour we still need them; handle all 4.
        edge_consumed_for_traversal: Dict[tuple, bool] = {}

        for cell in cells:
            cell_pos = cell.world_position(gs, sh)
            for cardinal in CARDINALS:
                nb = cell.neighbors.get(cardinal)
                edge_key = self._edge_key(cell.grid_coord, cardinal)
                if edge_key in edge_consumed_for_traversal:
                    continue

                # Compute placement at the midpoint of the cell edge.
                wall_pos, yaw = self._edge_placement(cell_pos, cardinal, gs)

                if nb is None:
                    # Open edge -> always a full wall (in INDOOR) or skip in OUTDOOR
                    # unless cover_density requests a low parapet at the boundary.
                    if self.params.is_indoor():
                        if self._piece_enabled(PIECE_WALL):
                            obj = self.generate_block(
                                BlockType.WALL, wall_pos,
                                mathutils.Vector((gs, gs, wh)),
                                space_id=cell.id, index=self._edge_index(cardinal),
                                yaw=yaw,
                            )
                            out[PIECE_WALL].append(obj)
                    else:
                        if self._piece_enabled(PIECE_WALL_HALF) and \
                                self.rng.random() < self.params.cover_density:
                            obj = self.generate_block(
                                BlockType.WALL_HALF, wall_pos,
                                mathutils.Vector((gs, gs, wh)),
                                space_id=cell.id, index=self._edge_index(cardinal),
                                yaw=yaw,
                            )
                            out[PIECE_WALL_HALF].append(obj)
                    edge_consumed_for_traversal[edge_key] = True
                    continue

                delta = cell.elevation - nb.elevation
                connected = cardinal in cell.connections

                if abs(delta) >= 1:
                    # Defer to traversal pass; nothing to place here yet.
                    continue

                # Same elevation neighbour
                if connected:
                    if self.params.is_indoor() and self._piece_enabled(PIECE_DOORWAY):
                        obj = self.generate_block(
                            BlockType.DOORWAY, wall_pos,
                            mathutils.Vector((gs, gs, wh)),
                            space_id=cell.id, index=self._edge_index(cardinal),
                            yaw=yaw,
                        )
                        out[PIECE_DOORWAY].append(obj)
                    # OUTDOOR + same elevation + connected = open boundary, nothing to place.
                    edge_consumed_for_traversal[edge_key] = True
                else:
                    # Indoor sealed wall between neighbours
                    if self._piece_enabled(PIECE_WALL):
                        obj = self.generate_block(
                            BlockType.WALL, wall_pos,
                            mathutils.Vector((gs, gs, wh)),
                            space_id=cell.id, index=self._edge_index(cardinal),
                            yaw=yaw,
                        )
                        out[PIECE_WALL].append(obj)
                    edge_consumed_for_traversal[edge_key] = True

        # -------- P5 TRAVERSAL pass (ramps / stairs / cover walls on drops)
        ramp_piece = BlockType.STAIRS if self.params.use_stairs else BlockType.RAMP
        ramp_piece_id = ramp_piece.value
        for cell in cells:
            for cardinal in CARDINALS:
                nb = cell.neighbors.get(cardinal)
                if nb is None:
                    continue
                delta = cell.elevation - nb.elevation
                if abs(delta) < 1:
                    continue
                # Only emit traversal from the lower cell to avoid duplicates.
                if delta > 0:
                    continue
                edge_key = self._edge_key(cell.grid_coord, cardinal)
                if edge_key in edge_consumed_for_traversal:
                    continue

                rise = abs(delta) * sh
                run = gs * max(1, self.params.ramp_slope_cells)
                ramp_pos = cell.world_position(gs, sh).copy()

                # Place at the boundary between cells; the ramp piece's local +X is "up"
                # so we set yaw so +X points toward the higher neighbour direction.
                wall_pos, _ = self._edge_placement(ramp_pos, cardinal, gs)
                yaw = _CARDINAL_YAW[cardinal] + math.pi  # face *toward* nb (high side)

                if self._piece_enabled(ramp_piece_id):
                    obj = self.generate_block(
                        ramp_piece,
                        mathutils.Vector((wall_pos.x, wall_pos.y, ramp_pos.z)),
                        mathutils.Vector((run, gs, rise)),
                        space_id=cell.id, index=self._edge_index(cardinal) + 50,
                        yaw=yaw,
                    )
                    out[ramp_piece_id].append(obj)

                edge_consumed_for_traversal[edge_key] = True

                # Optional cover wall on the drop edge (outdoor style)
                if self.params.is_outdoor() and self._piece_enabled(PIECE_WALL_HALF) \
                        and self.rng.random() < self.params.cover_density:
                    obj = self.generate_block(
                        BlockType.WALL_HALF, wall_pos,
                        mathutils.Vector((gs, gs, sh)),
                        space_id=cell.id, index=self._edge_index(cardinal) + 100,
                        yaw=_CARDINAL_YAW[cardinal],
                    )
                    out[PIECE_WALL_HALF].append(obj)

        # -------- Optional pillars at room corners
        if self.params.generate_pillars and self._piece_enabled(PIECE_PILLAR):
            for cell in cells:
                if cell.role != "path" and cell.role != "lateral":
                    continue
                # Corner exists where two adjacent cardinals both miss neighbours.
                for cardA, cardB in ((DIR_N, DIR_E), (DIR_E, DIR_S),
                                     (DIR_S, DIR_W), (DIR_W, DIR_N)):
                    if cell.neighbors.get(cardA) is not None: continue
                    if cell.neighbors.get(cardB) is not None: continue
                    # Pillar at the corner between those two edges.
                    diA = DIR_OFFSETS[cardA]
                    diB = DIR_OFFSETS[cardB]
                    corner_pos = cell.world_position(gs, sh) + mathutils.Vector((
                        (diA[0] + diB[0]) * gs * 0.5,
                        (diA[1] + diB[1]) * gs * 0.5,
                        0.0,
                    ))
                    obj = self.generate_block(
                        BlockType.PILLAR, corner_pos,
                        mathutils.Vector((gs, gs, wh)),
                        space_id=cell.id, index=200, yaw=0.0,
                    )
                    out[PIECE_PILLAR].append(obj)

        return out

    @staticmethod
    def _edge_key(coord, cardinal):
        di, dj = DIR_OFFSETS[cardinal]
        other = (coord[0] + di, coord[1] + dj)
        a, b = (coord, other) if coord < other else (other, coord)
        return (a, b)

    @staticmethod
    def _edge_index(cardinal: str) -> int:
        return {DIR_N: 1, DIR_E: 2, DIR_S: 3, DIR_W: 4}[cardinal]

    @staticmethod
    def _edge_placement(cell_pos: mathutils.Vector, cardinal: str,
                        grid_size: float):
        """Return (world_position, yaw) for a piece sitting on the cell edge."""
        di, dj = DIR_OFFSETS[cardinal]
        pos = mathutils.Vector((
            cell_pos.x + di * grid_size * 0.5,
            cell_pos.y + dj * grid_size * 0.5,
            cell_pos.z,
        ))
        return pos, _CARDINAL_YAW[cardinal]

    # ------------------------------------------------ Decoration (layer pass)

    def populate_cell(self, cell: Cell) -> Dict[str, List[bpy.types.Object]]:
        """Run user-defined decoration layers on a single cell."""
        self.rng.seed(self.seed + cell.id)
        blocks_by_layer: Dict[str, List[bpy.types.Object]] = {}
        for layer_idx, layer in enumerate(self.params.layers):
            if not layer.enabled:
                continue
            blocks = self._process_layer(layer, cell, layer_idx)
            if blocks:
                blocks_by_layer[layer.name] = blocks
        return blocks_by_layer

    # Back-compat name used by older callers
    populate_space = populate_cell

    def _process_layer(self, layer: LayerConfig, cell: Cell, layer_idx: int):
        blocks = []
        width = self.params.grid_size
        depth = self.params.grid_size
        cell_pos = cell.world_position(self.params.grid_size, self.params.step_height)
        points = []

        if layer.rule == PlacementRule.EDGE_LOOP:
            perimeter = (width + depth) * 2
            num_points = max(1, int(perimeter * layer.density * 0.1))
            for i in range(num_points):
                t = i / num_points
                pos = self._perimeter_point(width, depth, t)
                points.append(pos)

        elif layer.rule == PlacementRule.FILL_GRID:
            step = max(0.25, self.params.grid_size / max(0.001, layer.density))
            x_steps = max(1, int(width / step))
            y_steps = max(1, int(depth / step))
            for x in range(x_steps):
                for y in range(y_steps):
                    pos = mathutils.Vector((
                        (x - x_steps / 2 + 0.5) * step,
                        (y - y_steps / 2 + 0.5) * step,
                        0.0,
                    ))
                    points.append(pos)

        elif layer.rule == PlacementRule.SCATTER:
            area = width * depth
            num_points = max(1, int(area * layer.density * 0.1))
            for _ in range(num_points):
                points.append(mathutils.Vector((
                    self.rng.uniform(-width / 2, width / 2),
                    self.rng.uniform(-depth / 2, depth / 2),
                    0.0,
                )))

        elif layer.rule == PlacementRule.CENTER_LINE:
            num_points = max(1, int(depth * layer.density * 0.1))
            half_depth = depth / 2
            for i in range(num_points):
                t = (i / (num_points - 1)) if num_points > 1 else 0.5
                points.append(mathutils.Vector((0.0, t * depth - half_depth, 0.0)))

        for i, local_pos in enumerate(points):
            world_pos = cell_pos + local_pos + mathutils.Vector((0.0, 0.0, layer.z_offset))
            source_obj = None
            if layer.collection_name:
                coll = bpy.data.collections.get(layer.collection_name)
                if coll:
                    meshes = [o for o in coll.objects if o.type == 'MESH']
                    if meshes:
                        source_obj = self.rng.choice(meshes)
                    else:
                        print(
                            f"PCG Warning: collection '{layer.collection_name}'"
                            " has no mesh objects"
                        )
                else:
                    print(f"PCG Warning: collection '{layer.collection_name}' not found")

            if source_obj is not None:
                obj = source_obj.copy()
                bpy.context.collection.objects.link(obj)
                obj.location = world_pos
            else:
                bpy.ops.mesh.primitive_cube_add(size=1.0, location=world_pos)
                obj = bpy.context.active_object

            obj.name = f"{layer.name}_{cell.id}_{i}"

            if layer.random_rotation:
                obj.rotation_euler.z = self.rng.uniform(0.0, math.pi * 2)
            if layer.random_scale:
                s = self.rng.uniform(layer.scale_min, layer.scale_max)
                obj.scale = (s, s, s)

            blocks.append(obj)
        return blocks

    @staticmethod
    def _perimeter_point(width: float, depth: float, t: float) -> mathutils.Vector:
        perimeter = (width + depth) * 2
        dist = t * perimeter
        half_w = width / 2
        half_d = depth / 2
        if dist < width:
            return mathutils.Vector((-half_w + dist, half_d, 0))
        dist -= width
        if dist < depth:
            return mathutils.Vector((half_w, half_d - dist, 0))
        dist -= depth
        if dist < width:
            return mathutils.Vector((half_w - dist, -half_d, 0))
        dist -= width
        return mathutils.Vector((-half_w, -half_d + dist, 0))
