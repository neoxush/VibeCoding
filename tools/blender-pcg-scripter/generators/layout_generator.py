"""Layout generator.

Produces a ribbon of `Cell` objects from a spline and the generation parameters.
Path cells (the road) are placed in continuous world space along the spline's
local tangent/normal frame; each cell carries an `orientation` yaw so the wall
and floor passes can rotate pieces along the road instead of snapping to world
cardinals. Lateral pockets branch off ribbon cells in the road's local frame
so side rooms inherit the road's orientation.

A legacy ``Space`` view is also exposed so older consumers (preview, terrain)
keep working with minimal change.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass, field
from typing import Dict, List, Set, Tuple

import mathutils

from ..core.parameters import ElevationSource, GenerationParams
from ..core.spline_sampler import SplinePoint

# Cardinal direction helpers ------------------------------------------------

DIR_N = "N"
DIR_S = "S"
DIR_E = "E"
DIR_W = "W"
CARDINALS = (DIR_N, DIR_S, DIR_E, DIR_W)

# (di, dj) offsets in *local* cell-frame coords (i = side, j = sample).
# For a ribbon cell, local +Y (j+1) is "forward along the road" and local +X
# (i+1) is "right of the road"; a cell's `orientation` yaw rotates that
# local frame into world space.
DIR_OFFSETS: Dict[str, Tuple[int, int]] = {
    DIR_N: (0, 1),
    DIR_S: (0, -1),
    DIR_E: (1, 0),
    DIR_W: (-1, 0),
}

OPPOSITE: Dict[str, str] = {DIR_N: DIR_S, DIR_S: DIR_N, DIR_E: DIR_W, DIR_W: DIR_E}


def _rotate_xy(x: float, y: float, theta: float) -> Tuple[float, float]:
    """Rotate a 2D vector by ``theta`` radians (CCW)."""
    cos_t = math.cos(theta)
    sin_t = math.sin(theta)
    return (x * cos_t - y * sin_t, x * sin_t + y * cos_t)


def _orientation_for_tangent(tangent: mathutils.Vector) -> float:
    """Z-yaw such that the cell's local +Y aligns with ``tangent``.

    Pieces in our library face +Y by convention, so this yaw makes the cell's
    'forward' direction track the spline tangent.
    """
    tx, ty = float(tangent.x), float(tangent.y)
    if abs(tx) < 1e-6 and abs(ty) < 1e-6:
        return 0.0
    return math.atan2(-tx, ty)


def _snap_to_cardinal(vec: mathutils.Vector) -> str:
    """Return the cardinal closest to the given 2D-ish vector.

    Kept for backward compat with any external caller; the ribbon builder
    no longer relies on cardinal snapping for placement.
    """
    x, y = vec.x, vec.y
    if abs(x) >= abs(y):
        return DIR_E if x >= 0 else DIR_W
    return DIR_N if y >= 0 else DIR_S


# ---------------------------------------------------------------- Data model


@dataclass
class Cell:
    """A blockout cell.

    For ribbon (path) cells, ``grid_coord`` is a synthetic
    ``(side_offset, sample_index)`` key rather than a global grid coord, and
    ``orientation`` rotates the cell's local frame so its forward axis tracks
    the spline tangent. Lateral pockets inherit the parent ribbon cell's
    orientation so they extend perpendicular to the road, not the world axes.
    """

    grid_coord: Tuple[int, int]            # ribbon: (side_offset, sample_idx); legacy: (i, j)
    world_xy: Tuple[float, float]          # cell-center world X, Y
    base_z: float                          # ground reference (e.g. spline z)
    elevation: int = 0                     # integer steps above base_z
    role: str = "path"                     # "path" | "lateral" | "room"
    orientation: float = 0.0               # Z-yaw applied to the cell's local frame
    is_ribbon: bool = False                # True for tangent-aligned road cells
    connections: Set[str] = field(default_factory=set)  # cardinals that are passable
    neighbors: Dict[str, Cell] = field(default_factory=dict)
    # Stable id for naming; assigned by generator.
    id: int = 0

    # ------------- Adapters so older consumers keep working ---------------

    @property
    def step_height(self) -> float:  # set on the generator side via property
        return getattr(self, "_step_height", 0.0)

    def world_position(self, grid_size: float, step_height: float) -> mathutils.Vector:
        return mathutils.Vector((
            self.world_xy[0],
            self.world_xy[1],
            self.base_z + self.elevation * step_height,
        ))

    # Legacy "Space" compat ------------------------------------------------
    @property
    def position(self) -> mathutils.Vector:
        return mathutils.Vector((self.world_xy[0], self.world_xy[1], self.base_z))

    @property
    def size(self) -> mathutils.Vector:
        gs = getattr(self, "_grid_size", 4.0)
        wh = getattr(self, "_wall_height", 3.0)
        return mathutils.Vector((gs, gs, wh))

    @property
    def type(self) -> str:
        return self.role


# Legacy alias - some modules still reference "Space".
Space = Cell


# ---------------------------------------------------------- LayoutGenerator


class LayoutGenerator:
    """Build a tangent-aligned ribbon of `Cell`s along a spline.

    Pipeline (all internal to ``generate``):
        P1  Build the ribbon: at every spline sample place a column of
            ``path_width_cells`` cells perpendicular to the local tangent.
            In road-mode the centerline is skipped so the spline becomes
            the actual drivable road and only side/shoulder cells exist.
        P2  Add lateral pockets controlled by ``lateral_density``; each
            pocket extends perpendicular to the road, in the parent ribbon
            cell's local frame.
        P3  Resolve neighbours; assign elevation via ``elevation_source``.
        P4  Smooth elevation across neighbours.
        P5  Decide which edges are connections (doorways/open) per style.
            Path-to-path edges are always forced open so the road never
            gets fenced off.
    """

    def __init__(self, seed: int, params: GenerationParams,
                 spline_points: List[SplinePoint]):
        self.seed = seed
        self.params = params
        self.spline_points = spline_points
        self.rng = random.Random(seed)
        self._cells: Dict[Tuple[int, int], Cell] = {}
        self._next_id = 0

    # ---------------- Public API ------------------------------------------

    def generate(self) -> List[Cell]:
        """Run the full pipeline and return the cell list."""
        self._build_ribbon()
        self._add_lateral_cells()
        self._resolve_neighbors()
        self._assign_elevation()
        self._smooth_elevation()
        self._compute_connections()
        cells = list(self._cells.values())
        # Stamp helpers used by the legacy Cell/Space property accessors.
        for c in cells:
            c._grid_size = self.params.grid_size        # type: ignore[attr-defined]
            c._wall_height = self.params.wall_height    # type: ignore[attr-defined]
            c._step_height = self.params.step_height    # type: ignore[attr-defined]
        return cells

    # ---------------- Cell factory ----------------------------------------

    def _make_cell(
        self,
        coord: Tuple[int, int],
        world_xy: Tuple[float, float],
        base_z: float,
        role: str,
        orientation: float = 0.0,
        is_ribbon: bool = False,
    ) -> Cell:
        existing = self._cells.get(coord)
        if existing is not None:
            # Prefer 'path' role over 'lateral' for shared cells.
            if existing.role == "lateral" and role == "path":
                existing.role = "path"
            return existing
        cell = Cell(
            grid_coord=coord,
            world_xy=world_xy,
            base_z=base_z,
            role=role,
            orientation=orientation,
            is_ribbon=is_ribbon,
            id=self._next_id,
        )
        self._next_id += 1
        self._cells[coord] = cell
        return cell

    # ---------------- P1 ribbon builder -----------------------------------

    def _build_ribbon(self) -> None:
        """Rasterize the spline as a tangent-aligned ribbon of cells.

        At every spline sample we lay down a column of cells perpendicular
        to the local tangent, spaced by ``grid_size`` and oriented so that
        the cell's local +Y points along the road. Cells store the local
        tangent yaw as ``orientation`` so the wall pass can rotate pieces
        along the road instead of snapping to world cardinals.
        """
        if not self.spline_points:
            return

        gs = self.params.grid_size
        width = max(1, int(self.params.path_width_cells))
        half_extra = width - 1
        road_mode = self.params.road_mode_enabled
        # Precompute the side-offset list per side-placement choice; the road
        # mode case still picks per-sample via _sides_for_index for the
        # 'alternating' placement.
        if road_mode:
            base_left = list(range(-half_extra - 1, 0))
            base_right = list(range(1, half_extra + 2))
        else:
            ribbon_offsets = list(range(-half_extra, half_extra + 1))

        for i, point in enumerate(self.spline_points):
            # Inline tangent normalization to avoid Vector allocation per sample.
            tangent = point.tangent
            tx = float(tangent.x)
            ty = float(tangent.y)
            tlen_sq = tx * tx + ty * ty
            if tlen_sq < 1e-12:
                tx, ty = 0.0, 1.0
            else:
                inv = 1.0 / math.sqrt(tlen_sq)
                tx *= inv
                ty *= inv
            orientation = math.atan2(-tx, ty)
            # Local +X (right of road) in world coords. Local +X is local +Y
            # rotated -90 deg, i.e. (tangent.y, -tangent.x).
            right_x = ty
            right_y = -tx
            base_z = float(point.position.z)
            cx = float(point.position.x)
            cy = float(point.position.y)

            if road_mode:
                allowed = self._sides_for_index(i)
                offsets: List[int] = []
                if "left" in allowed:
                    offsets.extend(base_left)
                if "right" in allowed:
                    offsets.extend(base_right)
            else:
                offsets = ribbon_offsets

            for side in offsets:
                step = side * gs
                self._make_cell(
                    coord=(side, i),
                    world_xy=(cx + right_x * step, cy + right_y * step),
                    base_z=base_z,
                    role="path",
                    orientation=orientation,
                    is_ribbon=True,
                )

    def _sides_for_index(self, index: int) -> List[str]:
        placement = self.params.side_placement
        if placement == "left":         return ["left"]
        if placement == "right":        return ["right"]
        if placement == "both":         return ["left", "right"]
        if placement == "alternating":  return ["left"] if index % 2 == 0 else ["right"]
        return ["left", "right"]

    # ---------------- P2 lateral pockets ----------------------------------

    def _add_lateral_cells(self) -> None:
        """Branch ``lateral_density`` extra clusters off the road.

        Each lateral pocket extends perpendicular to its parent road cell
        (E or W in the cell's *local* frame), inheriting the parent's
        orientation so the pocket aligns with the road instead of the
        world axes. Pockets always extend outward from the centerline so
        they never encroach on the road's drivable surface.
        """
        density = max(0.0, min(1.0, self.params.lateral_density))
        if density <= 0.0:
            return
        depth = max(0, int(self.params.lateral_depth_cells))
        if depth <= 0:
            return

        path_cells = [c for c in self._cells.values() if c.role == "path"]
        if not path_cells:
            return

        n_branches = max(1, int(len(path_cells) * density))
        chosen = self.rng.sample(path_cells, min(n_branches, len(path_cells)))

        variation = max(0.0, min(1.0, self.params.space_size_variation))
        gs = self.params.grid_size

        for src in chosen:
            src_side = src.grid_coord[0]
            # Pick an *outward* perpendicular so pockets never cut into the road.
            if src_side > 0:
                cardinal = DIR_E
            elif src_side < 0:
                cardinal = DIR_W
            else:
                cardinal = self.rng.choice([DIR_E, DIR_W])
            di, dj = DIR_OFFSETS[cardinal]

            # Skip past any existing cell in the chosen direction.
            n = 1
            while self._cells.get((src.grid_coord[0] + di * n,
                                   src.grid_coord[1] + dj * n)) and n <= depth:
                n += 1

            this_depth = max(1, min(depth,
                                    depth - int(self.rng.random() * variation * depth)))
            cos_o = math.cos(src.orientation)
            sin_o = math.sin(src.orientation)
            for step in range(n, n + this_depth):
                coord = (src.grid_coord[0] + di * step,
                         src.grid_coord[1] + dj * step)
                if coord in self._cells:
                    continue
                # World displacement: local (di, dj) * gs, rotated by src.orientation.
                local_dx = di * step * gs
                local_dy = dj * step * gs
                world_dx = local_dx * cos_o - local_dy * sin_o
                world_dy = local_dx * sin_o + local_dy * cos_o
                world_xy = (src.world_xy[0] + world_dx,
                            src.world_xy[1] + world_dy)
                self._make_cell(
                    coord=coord,
                    world_xy=world_xy,
                    base_z=src.base_z,
                    role="lateral",
                    orientation=src.orientation,
                    is_ribbon=False,
                )

    # ---------------- P3 neighbour resolution -----------------------------

    def _resolve_neighbors(self) -> None:
        for coord, cell in self._cells.items():
            for cardinal, (di, dj) in DIR_OFFSETS.items():
                nc = (coord[0] + di, coord[1] + dj)
                nb = self._cells.get(nc)
                if nb is not None:
                    cell.neighbors[cardinal] = nb

    # ---------------- P3 elevation assignment -----------------------------

    def _assign_elevation(self) -> None:
        source = self.params.elevation_source
        max_steps = max(0, int(self.params.max_elevation_steps))

        if source == ElevationSource.FLAT.value or max_steps == 0:
            for c in self._cells.values():
                c.elevation = 0
            return

        if source == ElevationSource.SPLINE_Z.value:
            min_base = min(c.base_z for c in self._cells.values())
            sh = self.params.step_height if self.params.step_height > 0 else 1.0
            for c in self._cells.values():
                steps = int(round((c.base_z - min_base) / sh))
                c.elevation = max(0, min(max_steps, steps))
            for c in self._cells.values():
                c.base_z = min_base
            return

        # RANDOM_SMOOTHED
        for c in self._cells.values():
            c.elevation = self.rng.randint(0, max_steps)

    # ---------------- P4 elevation smoothing ------------------------------

    def _smooth_elevation(self) -> None:
        passes = max(0, int(self.params.elevation_smoothing))
        if passes == 0:
            return
        max_steps = max(0, int(self.params.max_elevation_steps))

        for _ in range(passes):
            new_values: Dict[Tuple[int, int], int] = {}
            for coord, cell in self._cells.items():
                total = cell.elevation
                count = 1
                for nb in cell.neighbors.values():
                    total += nb.elevation
                    count += 1
                new_values[coord] = max(0, min(max_steps, int(round(total / count))))
            for coord, value in new_values.items():
                self._cells[coord].elevation = value

        # Final safety: clamp neighbour deltas so ramps remain buildable.
        for coord, cell in self._cells.items():
            for cardinal, nb in cell.neighbors.items():
                if abs(cell.elevation - nb.elevation) > max(1, max_steps):
                    if cell.elevation > nb.elevation:
                        cell.elevation = nb.elevation + max(1, max_steps)
                    else:
                        nb.elevation = cell.elevation + max(1, max_steps)

    # ---------------- P5 connection assignment ----------------------------

    def _compute_connections(self) -> None:
        """Decide which edges are passable.

        Indoor: any neighbour pair is considered connected by default; this
        instructs the wall pass to cut a doorway. Disconnected pairs are
        skipped at random based on (1 - lateral_density) to keep some sealed
        rooms.

        Outdoor: all neighbour pairs are open; the wall pass decides whether
        a cover wall / drop edge / ramp is placed based on elevation deltas.

        Road continuity rule (applied in both styles):
            Edges between two ``role == "path"`` cells are ALWAYS forced open
            so the spline corridor / road is never fenced off by a random
            seal. The wall pass relies on this to keep the road walkable.
        """
        indoor = self.params.is_indoor()
        seal_chance = 0.0 if not indoor else max(0.0, 1.0 - self.params.lateral_density)

        for coord, cell in self._cells.items():
            for cardinal, nb in cell.neighbors.items():
                if cardinal in cell.connections:
                    continue
                # Road continuity: never seal a path<->path edge.
                path_to_path = (cell.role == "path" and nb.role == "path")
                connect = True
                if not path_to_path and indoor and seal_chance > 0.0 \
                        and self.rng.random() < seal_chance:
                    connect = False
                if connect:
                    cell.connections.add(cardinal)
                    nb.connections.add(OPPOSITE[cardinal])

    # ---------------- Diagnostics -----------------------------------------

    def ensure_connectivity(self, cells: List[Cell]) -> bool:
        if not cells:
            return True
        visited: Set[int] = set()
        queue: List[Cell] = [cells[0]]
        visited.add(cells[0].id)
        while queue:
            cur = queue.pop()
            for cardinal in cur.connections:
                nb = cur.neighbors.get(cardinal)
                if nb is not None and nb.id not in visited:
                    visited.add(nb.id)
                    queue.append(nb)
        return len(visited) == len(cells)
