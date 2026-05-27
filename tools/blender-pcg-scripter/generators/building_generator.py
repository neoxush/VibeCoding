"""Building block generator.

Owns the canonical placeholder piece library (Floor / Wall / Wall-Half /
Doorway / Ramp / Stairs / Pillar) and runs the FLOOR / WALL / TRAVERSAL passes
on a list of :class:`Cell` objects.

Performance design:

* Zero ``bpy.ops`` calls in the hot path. Every piece is built via
  ``bpy.data.meshes.new`` + ``mesh.from_pydata`` and a fresh
  ``bpy.data.objects.new`` linked straight into its target collection. No undo
  pushes, no depsgraph eval, no viewport refresh per spawn.
* Mesh sharing. All box-shaped pieces (floor, wall, half-wall, pillar) reuse a
  single per-generation unit-cube mesh; doorways / ramps / stairs are cached
  per quantized dimension tuple. A 200-cell level typically ends up with 1
  floor mesh, 1 wall mesh, 1 doorway mesh and ~few ramp meshes shared across
  hundreds of objects.
* Per-generation caches. Override-collection mesh lists, layer source
  collections and per-piece sub-collections are all looked up once and reused.
* Per-cell trig and world position computed once and reused across the four
  cardinal edges.

The decoration pass (existing layer system) lives in :py:meth:`populate_cell`
and shares the same mesh / collection caches.
"""

from __future__ import annotations

import math
import random
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import bpy
import mathutils

from ..core.layer_system import CellTarget, LayerConfig, PlacementRule
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

_EDGE_INDEX: Dict[str, int] = {DIR_N: 1, DIR_E: 2, DIR_S: 3, DIR_W: 4}

# Unit cube vertex/face data; reused as the source for every box-shaped piece.
# Vertex indexing: bit pattern is (x, y, z) sign with x outer-most loop.
#   0=(−,−,−), 1=(−,−,+), 2=(−,+,−), 3=(−,+,+),
#   4=(+,−,−), 5=(+,−,+), 6=(+,+,−), 7=(+,+,+)
# Face windings are CCW viewed from *outside* the cube so face normals point
# outward (which avoids inside-out shading on materials that respect backface
# culling, and keeps exporters happy).
_UNIT_CUBE_VERTS: Tuple[Tuple[float, float, float], ...] = (
    (-0.5, -0.5, -0.5), (-0.5, -0.5, 0.5),
    (-0.5,  0.5, -0.5), (-0.5,  0.5, 0.5),
    ( 0.5, -0.5, -0.5), ( 0.5, -0.5, 0.5),
    ( 0.5,  0.5, -0.5), ( 0.5,  0.5, 0.5),
)
_UNIT_CUBE_FACES: Tuple[Tuple[int, int, int, int], ...] = (
    (0, 1, 3, 2),  # -X
    (4, 6, 7, 5),  # +X
    (0, 4, 5, 1),  # -Y
    (2, 3, 7, 6),  # +Y
    (0, 2, 6, 4),  # -Z
    (1, 5, 7, 3),  # +Z
)


def _box_face_block(verts: List[Tuple[float, float, float]],
                    faces: List[Tuple[int, int, int, int]],
                    cx: float, cy: float, cz: float,
                    sx: float, sy: float, sz: float) -> None:
    """Append one axis-aligned box's 8 verts + 6 quad faces to lists.

    Used by composite primitives (doorway, stairs) that are several boxes
    welded into a single mesh. Face windings match the unit-cube template
    (outward-pointing normals).
    """
    base = len(verts)
    hx, hy, hz = sx * 0.5, sy * 0.5, sz * 0.5
    verts.extend((
        (cx - hx, cy - hy, cz - hz),  # 0 (-,-,-)
        (cx - hx, cy - hy, cz + hz),  # 1 (-,-,+)
        (cx - hx, cy + hy, cz - hz),  # 2 (-,+,-)
        (cx - hx, cy + hy, cz + hz),  # 3 (-,+,+)
        (cx + hx, cy - hy, cz - hz),  # 4 (+,-,-)
        (cx + hx, cy - hy, cz + hz),  # 5 (+,-,+)
        (cx + hx, cy + hy, cz - hz),  # 6 (+,+,-)
        (cx + hx, cy + hy, cz + hz),  # 7 (+,+,+)
    ))
    faces.extend((
        (base + 0, base + 1, base + 3, base + 2),  # -X
        (base + 4, base + 6, base + 7, base + 5),  # +X
        (base + 0, base + 4, base + 5, base + 1),  # -Y
        (base + 2, base + 3, base + 7, base + 6),  # +Y
        (base + 0, base + 2, base + 6, base + 4),  # -Z
        (base + 1, base + 5, base + 7, base + 3),  # +Z
    ))


class BuildingBlockGenerator:
    """Builds blockout geometry from a list of :class:`Cell` instances.

    Two entry points:

    * :py:meth:`build_blockout` runs the FLOOR / WALL / TRAVERSAL / PILLAR
      passes and links each piece into a per-piece sub-collection beneath the
      ``parent_collection`` argument when provided.
    * :py:meth:`populate_cell` runs the user-defined decoration layers on a
      single cell, optionally linking each placed prop directly under a
      ``Decoration`` parent collection.
    """

    # -------------------------------------------------- construction & utils

    def __init__(self, seed: int, params: GenerationParams):
        self.seed = seed
        self.params = params
        self.rng = random.Random(seed)
        # Per-generation caches; cleared at the start of build_blockout.
        self._mesh_cache: Dict[Any, bpy.types.Mesh] = {}
        self._override_cache: Dict[str, List[bpy.types.Object]] = {}
        self._layer_meshes_cache: Dict[str, List[bpy.types.Object]] = {}
        # parent_id(int) -> {layer_name -> Collection}, populated by populate_cell.
        self._layer_subcoll_cache: Dict[int, Dict[str, bpy.types.Collection]] = {}

    @staticmethod
    def align_to_grid(position: mathutils.Vector, grid_size: float) -> mathutils.Vector:
        """Snap a position to the nearest grid point. Kept for backward-compat
        with external callers; the build_blockout pipeline no longer snaps so
        ribbon (rotated) cells stay on their tangent-aligned positions.
        """
        return mathutils.Vector((
            round(position.x / grid_size) * grid_size,
            round(position.y / grid_size) * grid_size,
            round(position.z / grid_size) * grid_size,
        ))

    # ----------------------------------------------------- mesh templates

    def _unit_cube_mesh(self) -> bpy.types.Mesh:
        key = ("UNIT_CUBE",)
        cached = self._mesh_cache.get(key)
        if cached is not None:
            return cached
        mesh = bpy.data.meshes.new("PCG_UnitCube")
        mesh.from_pydata(list(_UNIT_CUBE_VERTS), [], list(_UNIT_CUBE_FACES))
        mesh.update()
        self._mesh_cache[key] = mesh
        return mesh

    def _doorway_mesh(self, dims_x: float, dims_z: float) -> bpy.types.Mesh:
        key = ("DOORWAY", round(dims_x, 4), round(dims_z, 4),
               round(self.params.grid_size, 4))
        cached = self._mesh_cache.get(key)
        if cached is not None:
            return cached
        thickness = max(0.1, self.params.grid_size * 0.1)
        post_w = max(0.15, dims_x * 0.15)
        lintel_h = max(0.15, dims_z * 0.2)
        opening_h = dims_z - lintel_h
        side_offset = dims_x * 0.5 - post_w * 0.5

        verts: List[Tuple[float, float, float]] = []
        faces: List[Tuple[int, int, int, int]] = []
        _box_face_block(verts, faces, -side_offset, 0.0, opening_h * 0.5,
                        post_w, thickness, opening_h)
        _box_face_block(verts, faces,  side_offset, 0.0, opening_h * 0.5,
                        post_w, thickness, opening_h)
        _box_face_block(verts, faces, 0.0, 0.0, opening_h + lintel_h * 0.5,
                        dims_x, thickness, lintel_h)

        mesh = bpy.data.meshes.new("PCG_Doorway")
        mesh.from_pydata(verts, [], faces)
        mesh.update()
        self._mesh_cache[key] = mesh
        return mesh

    def _ramp_mesh(self, dims_x: float, dims_y: float, dims_z: float) -> bpy.types.Mesh:
        key = ("RAMP", round(dims_x, 4), round(dims_y, 4), round(dims_z, 4))
        cached = self._mesh_cache.get(key)
        if cached is not None:
            return cached
        # Wedge with bottom rectangle on z=0 and top edge raised on the -X side.
        # Slope descends toward +X, matching the original ramp orientation.
        # Face winding is CCW viewed from outside so normals point outward.
        hx, hy = dims_x * 0.5, dims_y * 0.5
        verts = [
            (-hx, -hy, 0.0),       # 0 -X -Y bottom
            (-hx,  hy, 0.0),       # 1 -X +Y bottom
            ( hx,  hy, 0.0),       # 2 +X +Y bottom
            ( hx, -hy, 0.0),       # 3 +X -Y bottom
            (-hx, -hy, dims_z),    # 4 -X -Y top
            (-hx,  hy, dims_z),    # 5 -X +Y top
        ]
        faces = [
            (0, 1, 2, 3),    # bottom (-Z normal)
            (0, 4, 5, 1),    # back vertical (-X)
            (4, 3, 2, 5),    # top slope (+X / +Z)
            (0, 3, 4),       # -Y triangle
            (1, 5, 2),       # +Y triangle
        ]
        mesh = bpy.data.meshes.new("PCG_Ramp")
        mesh.from_pydata(verts, [], faces)
        mesh.update()
        self._mesh_cache[key] = mesh
        return mesh

    def _stairs_mesh(self, dims_x: float, dims_y: float, dims_z: float) -> bpy.types.Mesh:
        key = ("STAIRS", round(dims_x, 4), round(dims_y, 4), round(dims_z, 4),
               round(self.params.grid_size, 4))
        cached = self._mesh_cache.get(key)
        if cached is not None:
            return cached
        n_steps = max(3, int(round(dims_z / max(0.15, self.params.grid_size * 0.075))))
        step_run = dims_x / n_steps
        step_rise = dims_z / n_steps
        verts: List[Tuple[float, float, float]] = []
        faces: List[Tuple[int, int, int, int]] = []
        for i in range(n_steps):
            cx = (i + 0.5) * step_run - dims_x * 0.5
            cz = step_rise * (n_steps - i - 0.5)
            _box_face_block(verts, faces, cx, 0.0, cz,
                            step_run, dims_y, step_rise)
        mesh = bpy.data.meshes.new("PCG_Stairs")
        mesh.from_pydata(verts, [], faces)
        mesh.update()
        self._mesh_cache[key] = mesh
        return mesh

    # ------------------------------------------------------ object spawn

    @staticmethod
    def _link(obj: bpy.types.Object, target_coll: Optional[bpy.types.Collection]) -> None:
        if target_coll is None:
            target_coll = bpy.context.scene.collection
        target_coll.objects.link(obj)

    def _spawn(self, mesh: bpy.types.Mesh, name: str,
               location: Tuple[float, float, float], yaw: float,
               scale: Optional[Tuple[float, float, float]],
               target_coll: Optional[bpy.types.Collection]) -> bpy.types.Object:
        obj = bpy.data.objects.new(name, mesh)
        obj.location = location
        obj.rotation_mode = 'XYZ'
        obj.rotation_euler = (0.0, 0.0, yaw)
        if scale is not None:
            obj.scale = scale
        self._link(obj, target_coll)
        return obj

    # ------------------------------------------- override collection lookups

    def _piece_enabled(self, piece_id: str) -> bool:
        return piece_id in self.params.block_types

    def _override_meshes(self, piece_id: str) -> List[bpy.types.Object]:
        cached = self._override_cache.get(piece_id)
        if cached is not None:
            return cached
        name = (self.params.piece_overrides or {}).get(piece_id, "")
        if not name:
            self._override_cache[piece_id] = []
            return []
        coll = bpy.data.collections.get(name)
        if coll is None:
            self._override_cache[piece_id] = []
            return []
        meshes = [o for o in coll.objects if o.type == 'MESH']
        self._override_cache[piece_id] = meshes
        return meshes

    def _spawn_override(self, piece_id: str, name: str,
                        location: Tuple[float, float, float], yaw: float,
                        scale: Tuple[float, float, float],
                        target_coll: Optional[bpy.types.Collection]
                        ) -> Optional[bpy.types.Object]:
        meshes = self._override_meshes(piece_id)
        if not meshes:
            return None
        src = self.rng.choice(meshes)
        obj = src.copy()  # shallow copy: mesh datablock is shared
        obj.name = name
        obj.location = location
        obj.rotation_mode = 'XYZ'
        obj.rotation_euler = (0.0, 0.0, yaw)
        obj.scale = scale
        self._link(obj, target_coll)
        return obj

    # ------------------------------------------------- single-piece API

    def generate_block(self, block_type: BlockType, position: mathutils.Vector,
                       dimensions: mathutils.Vector, space_id: int, index: int,
                       yaw: float = 0.0,
                       target_coll: Optional[bpy.types.Collection] = None
                       ) -> bpy.types.Object:
        """Create a single building block and link it into ``target_coll``.

        ``position`` is treated as the final world position; we no longer snap
        to the world-axis grid here because path cells live on a tangent-
        aligned ribbon whose centers are not on the global grid. When
        ``target_coll`` is None the object is linked into the active scene
        collection (legacy fallback).
        """
        name = f"{block_type.value.capitalize()}_{space_id:04d}_{index:03d}"
        loc = (position.x, position.y, position.z)
        scale_xyz = (dimensions.x, dimensions.y, dimensions.z)

        # Override path: shared source mesh, scaled by user-supplied dims.
        obj = self._spawn_override(block_type.value, name, loc, yaw,
                                   scale_xyz, target_coll)
        if obj is not None:
            return obj

        gs = self.params.grid_size
        if block_type == BlockType.FLOOR:
            thickness = max(0.05, gs * 0.05)
            return self._spawn(
                self._unit_cube_mesh(), name,
                (loc[0], loc[1], loc[2] - thickness * 0.5),
                yaw, (dimensions.x, dimensions.y, thickness), target_coll)

        if block_type == BlockType.WALL or block_type == BlockType.WALL_HALF:
            thickness = max(0.1, gs * 0.1)
            full = block_type == BlockType.WALL
            height = dimensions.z if full else dimensions.z * 0.45
            return self._spawn(
                self._unit_cube_mesh(), name,
                (loc[0], loc[1], loc[2] + height * 0.5),
                yaw, (dimensions.x, thickness, height), target_coll)

        if block_type == BlockType.DOORWAY:
            return self._spawn(
                self._doorway_mesh(dimensions.x, dimensions.z), name,
                loc, yaw, None, target_coll)

        if block_type == BlockType.RAMP:
            return self._spawn(
                self._ramp_mesh(dimensions.x, dimensions.y, dimensions.z), name,
                loc, yaw, None, target_coll)

        if block_type == BlockType.STAIRS:
            return self._spawn(
                self._stairs_mesh(dimensions.x, dimensions.y, dimensions.z), name,
                loc, yaw, None, target_coll)

        if block_type == BlockType.PILLAR:
            radius = max(0.1, gs * 0.08)
            return self._spawn(
                self._unit_cube_mesh(), name,
                (loc[0], loc[1], loc[2] + dimensions.z * 0.5),
                0.0, (radius * 2, radius * 2, dimensions.z), target_coll)

        # Fallback: full wall.
        thickness = max(0.1, gs * 0.1)
        return self._spawn(
            self._unit_cube_mesh(), name,
            (loc[0], loc[1], loc[2] + dimensions.z * 0.5),
            yaw, (dimensions.x, thickness, dimensions.z), target_coll)

    # ---------------------------------------------------- blockout pipeline

    def build_blockout(self, cells: List[Cell],
                       parent_collection: Optional[bpy.types.Collection] = None
                       ) -> Dict[str, List[bpy.types.Object]]:
        """Run FLOOR / WALL / TRAVERSAL / PILLAR passes on the given cells.

        When ``parent_collection`` is provided, per-piece sub-collections are
        created lazily under it and pieces are linked in directly (no
        unlink/relink round-trip via ``scene_manager.organize_objects``).

        Returns:
            Dict mapping piece-type id -> list of created objects.
        """
        # Per-generation caches: clear so a single generator instance can be
        # reused safely across multiple Generate runs.
        self._mesh_cache.clear()
        self._override_cache.clear()

        gs = self.params.grid_size
        wh = self.params.wall_height
        sh = self.params.step_height

        # Cache piece-enabled flags + style flags + RNG-relevant params.
        floor_on = self._piece_enabled(PIECE_FLOOR)
        wall_on = self._piece_enabled(PIECE_WALL)
        wall_half_on = self._piece_enabled(PIECE_WALL_HALF)
        doorway_on = self._piece_enabled(PIECE_DOORWAY)
        pillar_on = self._piece_enabled(PIECE_PILLAR)
        ramp_piece = BlockType.STAIRS if self.params.use_stairs else BlockType.RAMP
        ramp_piece_id = ramp_piece.value
        ramp_on = self._piece_enabled(ramp_piece_id)
        is_indoor = self.params.is_indoor()
        is_outdoor = self.params.is_outdoor()
        cover_density = self.params.cover_density
        gen_pillars = self.params.generate_pillars
        rng = self.rng

        out: Dict[str, List[bpy.types.Object]] = {p.value: [] for p in BlockType}

        # Lazy per-piece sub-collection lookup.
        sub_colls: Dict[str, bpy.types.Collection] = {}

        def coll_for(piece_id: str) -> Optional[bpy.types.Collection]:
            if parent_collection is None:
                return None
            existing = sub_colls.get(piece_id)
            if existing is not None:
                return existing
            new_coll = bpy.data.collections.new(piece_id.capitalize())
            parent_collection.children.link(new_coll)
            sub_colls[piece_id] = new_coll
            return new_coll

        # Pre-cache per-cell trig + world position. Shared across passes.
        n = len(cells)
        cell_pos: List[mathutils.Vector] = [None] * n  # type: ignore[list-item]
        cell_cos: List[float] = [0.0] * n
        cell_sin: List[float] = [0.0] * n
        cell_index: Dict[int, int] = {}
        for idx, cell in enumerate(cells):
            cell_pos[idx] = cell.world_position(gs, sh)
            cell_cos[idx] = math.cos(cell.orientation)
            cell_sin[idx] = math.sin(cell.orientation)
            cell_index[cell.id] = idx

        wall_dims = mathutils.Vector((gs, gs, wh))
        gs_half = gs * 0.5

        # ---- FLOOR pass --------------------------------------------------
        if floor_on:
            floor_coll = coll_for(PIECE_FLOOR)
            for idx, cell in enumerate(cells):
                obj = self.generate_block(
                    BlockType.FLOOR, cell_pos[idx], wall_dims,
                    space_id=cell.id, index=0, yaw=cell.orientation,
                    target_coll=floor_coll,
                )
                out[PIECE_FLOOR].append(obj)

        # ---- WALL pass ---------------------------------------------------
        # Each cell-edge is processed once via the shared edge_consumed map.
        edge_consumed: Dict[Tuple, bool] = {}

        for idx, cell in enumerate(cells):
            pos = cell_pos[idx]
            cos_o = cell_cos[idx]
            sin_o = cell_sin[idx]
            base_yaw = cell.orientation
            coord = cell.grid_coord

            for cardinal in CARDINALS:
                edge_key = self._edge_key(coord, cardinal)
                if edge_key in edge_consumed:
                    continue

                di, dj = DIR_OFFSETS[cardinal]
                local_dx = di * gs_half
                local_dy = dj * gs_half
                world_dx = local_dx * cos_o - local_dy * sin_o
                world_dy = local_dx * sin_o + local_dy * cos_o
                wall_pos = mathutils.Vector(
                    (pos.x + world_dx, pos.y + world_dy, pos.z))
                yaw = base_yaw + _CARDINAL_YAW[cardinal]

                nb = cell.neighbors.get(cardinal)
                if nb is None:
                    if is_indoor:
                        if wall_on:
                            obj = self.generate_block(
                                BlockType.WALL, wall_pos, wall_dims,
                                space_id=cell.id,
                                index=_EDGE_INDEX[cardinal],
                                yaw=yaw, target_coll=coll_for(PIECE_WALL),
                            )
                            out[PIECE_WALL].append(obj)
                    elif wall_half_on and rng.random() < cover_density:
                        obj = self.generate_block(
                            BlockType.WALL_HALF, wall_pos, wall_dims,
                            space_id=cell.id,
                            index=_EDGE_INDEX[cardinal],
                            yaw=yaw, target_coll=coll_for(PIECE_WALL_HALF),
                        )
                        out[PIECE_WALL_HALF].append(obj)
                    edge_consumed[edge_key] = True
                    continue

                delta = cell.elevation - nb.elevation
                connected = cardinal in cell.connections

                # Road continuity: edges between two path cells are kept open --
                # never wall, half-wall or doorway across the spline corridor.
                if cell.role == "path" and nb.role == "path":
                    if abs(delta) < 1:
                        edge_consumed[edge_key] = True
                    continue

                if abs(delta) >= 1:
                    continue  # Defer to traversal pass.

                if connected:
                    if is_indoor and doorway_on:
                        obj = self.generate_block(
                            BlockType.DOORWAY, wall_pos, wall_dims,
                            space_id=cell.id,
                            index=_EDGE_INDEX[cardinal],
                            yaw=yaw, target_coll=coll_for(PIECE_DOORWAY),
                        )
                        out[PIECE_DOORWAY].append(obj)
                    edge_consumed[edge_key] = True
                else:
                    if wall_on:
                        obj = self.generate_block(
                            BlockType.WALL, wall_pos, wall_dims,
                            space_id=cell.id,
                            index=_EDGE_INDEX[cardinal],
                            yaw=yaw, target_coll=coll_for(PIECE_WALL),
                        )
                        out[PIECE_WALL].append(obj)
                    edge_consumed[edge_key] = True

        # ---- TRAVERSAL pass ---------------------------------------------
        ramp_run = gs * max(1, self.params.ramp_slope_cells)
        for idx, cell in enumerate(cells):
            pos = cell_pos[idx]
            cos_o = cell_cos[idx]
            sin_o = cell_sin[idx]
            base_yaw = cell.orientation
            coord = cell.grid_coord

            for cardinal in CARDINALS:
                nb = cell.neighbors.get(cardinal)
                if nb is None:
                    continue
                delta = cell.elevation - nb.elevation
                if abs(delta) < 1 or delta > 0:
                    continue
                edge_key = self._edge_key(coord, cardinal)
                if edge_key in edge_consumed:
                    continue

                di, dj = DIR_OFFSETS[cardinal]
                local_dx = di * gs_half
                local_dy = dj * gs_half
                world_dx = local_dx * cos_o - local_dy * sin_o
                world_dy = local_dx * sin_o + local_dy * cos_o
                wall_x = pos.x + world_dx
                wall_y = pos.y + world_dy
                edge_yaw = base_yaw + _CARDINAL_YAW[cardinal]
                rise = -delta * sh  # delta < 0 here

                if ramp_on:
                    obj = self.generate_block(
                        ramp_piece,
                        mathutils.Vector((wall_x, wall_y, pos.z)),
                        mathutils.Vector((ramp_run, gs, rise)),
                        space_id=cell.id,
                        index=_EDGE_INDEX[cardinal] + 50,
                        yaw=edge_yaw + math.pi,
                        target_coll=coll_for(ramp_piece_id),
                    )
                    out[ramp_piece_id].append(obj)

                edge_consumed[edge_key] = True

                road_internal = (cell.role == "path" and nb.role == "path")
                if (not road_internal) and is_outdoor and wall_half_on \
                        and rng.random() < cover_density:
                    obj = self.generate_block(
                        BlockType.WALL_HALF,
                        mathutils.Vector((wall_x, wall_y, pos.z)),
                        mathutils.Vector((gs, gs, sh)),
                        space_id=cell.id,
                        index=_EDGE_INDEX[cardinal] + 100,
                        yaw=edge_yaw,
                        target_coll=coll_for(PIECE_WALL_HALF),
                    )
                    out[PIECE_WALL_HALF].append(obj)

        # ---- Pillar pass -------------------------------------------------
        if gen_pillars and pillar_on:
            corner_pairs = ((DIR_N, DIR_E), (DIR_E, DIR_S),
                            (DIR_S, DIR_W), (DIR_W, DIR_N))
            for idx, cell in enumerate(cells):
                if cell.role != "path" and cell.role != "lateral":
                    continue
                neighbors = cell.neighbors
                pos = cell_pos[idx]
                cos_o = cell_cos[idx]
                sin_o = cell_sin[idx]
                for cardA, cardB in corner_pairs:
                    if neighbors.get(cardA) is not None: continue
                    if neighbors.get(cardB) is not None: continue
                    diA = DIR_OFFSETS[cardA]
                    diB = DIR_OFFSETS[cardB]
                    local_dx = (diA[0] + diB[0]) * gs_half
                    local_dy = (diA[1] + diB[1]) * gs_half
                    world_dx = local_dx * cos_o - local_dy * sin_o
                    world_dy = local_dx * sin_o + local_dy * cos_o
                    corner_pos = mathutils.Vector(
                        (pos.x + world_dx, pos.y + world_dy, pos.z))
                    obj = self.generate_block(
                        BlockType.PILLAR, corner_pos, wall_dims,
                        space_id=cell.id, index=200,
                        yaw=cell.orientation,
                        target_coll=coll_for(PIECE_PILLAR),
                    )
                    out[PIECE_PILLAR].append(obj)

        return out

    # ---------------------- edge bookkeeping helpers ---------------------

    @staticmethod
    def _edge_key(coord: Tuple[int, int], cardinal: str
                  ) -> Tuple[Tuple[int, int], Tuple[int, int]]:
        di, dj = DIR_OFFSETS[cardinal]
        other = (coord[0] + di, coord[1] + dj)
        return (coord, other) if coord < other else (other, coord)

    @staticmethod
    def _edge_index(cardinal: str) -> int:
        return _EDGE_INDEX[cardinal]

    @staticmethod
    def _edge_placement(cell_pos: mathutils.Vector, cardinal: str,
                        grid_size: float, orientation: float = 0.0):
        """Return (world_position, yaw) for a piece sitting on a cell edge.

        Kept for backward compat; the build_blockout hot path inlines the same
        math to avoid extra Vector allocations per edge.
        """
        di, dj = DIR_OFFSETS[cardinal]
        local_dx = di * grid_size * 0.5
        local_dy = dj * grid_size * 0.5
        cos_o = math.cos(orientation)
        sin_o = math.sin(orientation)
        return (mathutils.Vector((
            cell_pos.x + local_dx * cos_o - local_dy * sin_o,
            cell_pos.y + local_dx * sin_o + local_dy * cos_o,
            cell_pos.z,
        )), orientation + _CARDINAL_YAW[cardinal])

    # ------------------------------------------------ Decoration (layer pass)

    def populate_cell(self, cell: Cell,
                      parent_collection: Optional[bpy.types.Collection] = None
                      ) -> Dict[str, List[bpy.types.Object]]:
        """Run user-defined decoration layers on a single cell.

        When ``parent_collection`` is provided, each layer's props are linked
        directly into a per-layer sub-collection beneath it (created lazily
        and cached for subsequent cells).
        """
        self.rng.seed(self.seed + cell.id)
        blocks_by_layer: Dict[str, List[bpy.types.Object]] = {}
        for layer_idx, layer in enumerate(self.params.layers):
            if not layer.enabled:
                continue
            if not self._layer_targets_cell(layer, cell):
                continue
            target_coll: Optional[bpy.types.Collection] = None
            if parent_collection is not None:
                target_coll = self._get_layer_subcoll(parent_collection, layer.name)
            blocks = self._process_layer(layer, cell, layer_idx, target_coll)
            if blocks:
                blocks_by_layer[layer.name] = blocks
        return blocks_by_layer

    # Back-compat name used by older callers.
    populate_space = populate_cell

    def _get_layer_subcoll(self, parent: bpy.types.Collection,
                           name: str) -> bpy.types.Collection:
        parent_id = id(parent)
        inner = self._layer_subcoll_cache.get(parent_id)
        if inner is None:
            inner = {}
            self._layer_subcoll_cache[parent_id] = inner
        cached = inner.get(name)
        if cached is not None:
            return cached
        # Look it up on the parent first (handles repeated runs without clearing).
        for child in parent.children:
            if child.name == name:
                inner[name] = child
                return child
        coll = bpy.data.collections.new(name)
        parent.children.link(coll)
        inner[name] = coll
        return coll

    @staticmethod
    def _layer_targets_cell(layer: LayerConfig, cell: Cell) -> bool:
        """Return True if ``layer`` is allowed to populate ``cell``.

        Path cells are the spline corridor (the road); lateral cells are side
        pockets; everything else is treated as room.
        """
        target = getattr(layer, "cell_target", CellTarget.OFF_ROAD)
        if isinstance(target, str):
            try:
                target = CellTarget(target)
            except ValueError:
                target = CellTarget.OFF_ROAD
        if target == CellTarget.ALL:
            return True
        if target == CellTarget.OFF_ROAD:
            return cell.role != "path"
        if target == CellTarget.ROAD_ONLY:
            return cell.role == "path"
        if target == CellTarget.LATERAL_ONLY:
            return cell.role == "lateral"
        return True

    def _layer_meshes(self, collection_name: str
                      ) -> Optional[List[bpy.types.Object]]:
        """Cached ``[mesh objects]`` lookup for a layer's source collection.

        Returns:
            * ``None`` when the layer has no source collection assigned.
            * Empty list when the source collection is missing or has no
              mesh objects (a warning is printed once per generation).
            * List of mesh objects otherwise.
        """
        if not collection_name:
            return None
        cached = self._layer_meshes_cache.get(collection_name)
        if cached is not None:
            return cached
        coll = bpy.data.collections.get(collection_name)
        if coll is None:
            print(f"PCG Warning: collection '{collection_name}' not found")
            self._layer_meshes_cache[collection_name] = []
            return []
        meshes = [o for o in coll.objects if o.type == 'MESH']
        if not meshes:
            print(f"PCG Warning: collection '{collection_name}'"
                  " has no mesh objects")
        self._layer_meshes_cache[collection_name] = meshes
        return meshes

    def _process_layer(self, layer: LayerConfig, cell: Cell, layer_idx: int,
                       target_coll: Optional[bpy.types.Collection]
                       ) -> List[bpy.types.Object]:
        gs = self.params.grid_size
        sh = self.params.step_height
        cell_pos = cell.world_position(gs, sh)
        rng = self.rng

        # Build the local-space placement points based on the layer rule.
        points: List[mathutils.Vector] = []
        density = layer.density
        if layer.rule == PlacementRule.EDGE_LOOP:
            perimeter = (gs + gs) * 2
            num_points = max(1, int(perimeter * density * 0.1))
            inv = 1.0 / num_points
            for i in range(num_points):
                points.append(self._perimeter_point(gs, gs, i * inv))
        elif layer.rule == PlacementRule.FILL_GRID:
            step = max(0.25, gs / max(0.001, density))
            x_steps = max(1, int(gs / step))
            y_steps = max(1, int(gs / step))
            half_x = x_steps * 0.5
            half_y = y_steps * 0.5
            for x in range(x_steps):
                for y in range(y_steps):
                    points.append(mathutils.Vector((
                        (x - half_x + 0.5) * step,
                        (y - half_y + 0.5) * step,
                        0.0,
                    )))
        elif layer.rule == PlacementRule.SCATTER:
            area = gs * gs
            num_points = max(1, int(area * density * 0.1))
            half = gs * 0.5
            for _ in range(num_points):
                points.append(mathutils.Vector((
                    rng.uniform(-half, half),
                    rng.uniform(-half, half),
                    0.0,
                )))
        elif layer.rule == PlacementRule.CENTER_LINE:
            num_points = max(1, int(gs * density * 0.1))
            half_d = gs * 0.5
            denom = num_points - 1
            if denom <= 0:
                points.append(mathutils.Vector((0.0, 0.0, 0.0)))
            else:
                inv = 1.0 / denom
                for i in range(num_points):
                    points.append(mathutils.Vector(
                        (0.0, i * inv * gs - half_d, 0.0)))

        if not points:
            return []

        sources = self._layer_meshes(layer.collection_name)
        z_off = layer.z_offset
        twopi = math.pi * 2
        random_rot = layer.random_rotation
        random_scl = layer.random_scale
        scale_min = layer.scale_min
        scale_max = layer.scale_max

        # Pre-resolve the "no override" placeholder mesh once.
        placeholder = None if sources else self._unit_cube_mesh()

        blocks: List[bpy.types.Object] = []
        for i, local_pos in enumerate(points):
            wx = cell_pos.x + local_pos.x
            wy = cell_pos.y + local_pos.y
            wz = cell_pos.z + local_pos.z + z_off
            name = f"{layer.name}_{cell.id}_{i}"
            if sources:
                src = rng.choice(sources)
                obj = src.copy()
                obj.name = name
                obj.location = (wx, wy, wz)
                self._link(obj, target_coll)
            else:
                obj = self._spawn(
                    placeholder, name, (wx, wy, wz), 0.0,
                    (1.0, 1.0, 1.0), target_coll)
            if random_rot:
                obj.rotation_euler.z = rng.uniform(0.0, twopi)
            if random_scl:
                s = rng.uniform(scale_min, scale_max)
                obj.scale = (s, s, s)
            blocks.append(obj)
        return blocks

    @staticmethod
    def _perimeter_point(width: float, depth: float, t: float) -> mathutils.Vector:
        perimeter = (width + depth) * 2
        dist = t * perimeter
        half_w = width * 0.5
        half_d = depth * 0.5
        if dist < width:
            return mathutils.Vector((-half_w + dist, half_d, 0.0))
        dist -= width
        if dist < depth:
            return mathutils.Vector((half_w, half_d - dist, 0.0))
        dist -= depth
        if dist < width:
            return mathutils.Vector((half_w - dist, -half_d, 0.0))
        dist -= width
        return mathutils.Vector((-half_w, -half_d + dist, 0.0))
