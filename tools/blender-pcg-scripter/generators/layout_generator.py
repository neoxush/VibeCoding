"""Layout generator.

Produces a grid of `Cell` objects from a spline and the generation parameters.
Each Cell knows its cardinal neighbours, elevation step, and which edges are
passable (connections). This is the foundation for the multi-pass blockout
pipeline run by ``BuildingBlockGenerator.build_blockout``.

A legacy ``Space`` view is also exposed so older consumers (preview, terrain)
keep working with minimal change.
"""

from __future__ import annotations

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

# (di, dj) offsets in grid space for each cardinal.
DIR_OFFSETS: Dict[str, Tuple[int, int]] = {
    DIR_N: (0, 1),
    DIR_S: (0, -1),
    DIR_E: (1, 0),
    DIR_W: (-1, 0),
}

OPPOSITE: Dict[str, str] = {DIR_N: DIR_S, DIR_S: DIR_N, DIR_E: DIR_W, DIR_W: DIR_E}


def _snap_to_cardinal(vec: mathutils.Vector) -> str:
    """Return the cardinal closest to the given 2D-ish vector."""
    x, y = vec.x, vec.y
    if abs(x) >= abs(y):
        return DIR_E if x >= 0 else DIR_W
    return DIR_N if y >= 0 else DIR_S


def _perpendiculars(cardinal: str) -> Tuple[str, str]:
    """Two cardinals perpendicular to `cardinal` (left & right)."""
    if cardinal in (DIR_N, DIR_S):
        return DIR_W, DIR_E
    return DIR_S, DIR_N


# ---------------------------------------------------------------- Data model


@dataclass
class Cell:
    """A grid-aligned blockout cell."""

    grid_coord: Tuple[int, int]            # (i, j)
    world_xy: Tuple[float, float]          # cell-center world X, Y
    base_z: float                          # ground reference (e.g. spline z)
    elevation: int = 0                     # integer steps above base_z
    role: str = "path"                     # "path" | "lateral" | "room"
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

    @property
    def orientation(self) -> mathutils.Quaternion:
        return mathutils.Quaternion((1.0, 0.0, 0.0, 0.0))


# Legacy alias - some modules still reference "Space".
Space = Cell


# ---------------------------------------------------------- LayoutGenerator


class LayoutGenerator:
    """Build a grid of `Cell`s along a spline.

    Pipeline (all internal to ``generate``):
        P1  Rasterize spline samples onto a global axis-aligned grid.
        P2  Expand each centerline cell sideways by ``path_width_cells``.
        P3  Add lateral pockets controlled by ``lateral_density``.
        P4  Resolve neighbours; assign elevation via ``elevation_source``.
        P5  Smooth elevation across neighbours.
        P6  Decide which edges are connections (doorways/open) per style.
    """

    def __init__(self, seed: int, params: GenerationParams,
                 spline_points: List[SplinePoint]):
        self.seed = seed
        self.params = params
        self.spline_points = spline_points
        self.rng = random.Random(seed)
        self._cells: Dict[Tuple[int, int], Cell] = {}
        self._next_id = 0
        # Origin around which we rasterize the grid (use first sample if any).
        if spline_points:
            origin = spline_points[0].position
            self._origin_xy = (float(origin.x), float(origin.y))
        else:
            self._origin_xy = (0.0, 0.0)

    # ---------------- Public API ------------------------------------------

    def generate(self) -> List[Cell]:
        """Run the full pipeline and return the cell list."""
        self._rasterize_path()
        self._expand_path_width()
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

    # ---------------- P1 path rasterization -------------------------------

    def _grid_coord(self, x: float, y: float) -> Tuple[int, int]:
        gs = self.params.grid_size
        ox, oy = self._origin_xy
        return (int(round((x - ox) / gs)), int(round((y - oy) / gs)))

    def _world_xy(self, coord: Tuple[int, int]) -> Tuple[float, float]:
        gs = self.params.grid_size
        ox, oy = self._origin_xy
        return (ox + coord[0] * gs, oy + coord[1] * gs)

    def _make_cell(self, coord: Tuple[int, int], base_z: float, role: str) -> Cell:
        existing = self._cells.get(coord)
        if existing is not None:
            # Prefer 'path' role over 'lateral' for shared cells.
            if existing.role == "lateral" and role == "path":
                existing.role = "path"
            return existing
        cell = Cell(
            grid_coord=coord,
            world_xy=self._world_xy(coord),
            base_z=base_z,
            role=role,
            id=self._next_id,
        )
        self._next_id += 1
        self._cells[coord] = cell
        return cell

    def _rasterize_path(self) -> None:
        """Convert spline samples into a chain of unique grid cells."""
        if not self.spline_points:
            return

        for point in self.spline_points:
            coord = self._grid_coord(point.position.x, point.position.y)
            self._make_cell(coord, float(point.position.z), role="path")

    # ---------------- P2 corridor width -----------------------------------

    def _expand_path_width(self) -> None:
        """Widen the corridor sideways by ``path_width_cells``.

        ``path_width_cells`` of 1 keeps just the centre line. Higher values
        add cells on each side, snapped to the nearest cardinal perpendicular
        of the local spline tangent.
        """
        width = max(1, int(self.params.path_width_cells))
        if width <= 1 and not self.params.road_mode_enabled:
            return

        # Use the spline points to know the local tangent for each path cell.
        # Build a quick map from coord -> last-seen tangent.
        coord_tangent: Dict[Tuple[int, int], mathutils.Vector] = {}
        coord_base_z: Dict[Tuple[int, int], float] = {}
        for point in self.spline_points:
            c = self._grid_coord(point.position.x, point.position.y)
            coord_tangent[c] = point.tangent
            coord_base_z[c] = float(point.position.z)

        sides_per_index: Dict[Tuple[int, int], List[str]] = {}
        i = 0
        for coord, _ in coord_tangent.items():
            sides_per_index[coord] = self._sides_for_index(i)
            i += 1

        # In road mode, the centerline is the road -- drop those cells.
        cells_to_remove: List[Tuple[int, int]] = []

        for coord, tangent in coord_tangent.items():
            cardinal = _snap_to_cardinal(tangent)
            left, right = _perpendiculars(cardinal)
            base_z = coord_base_z[coord]

            half_extra = (width - 1)  # cells per side beyond the centre
            if self.params.road_mode_enabled:
                # Centre row becomes the road; build only on selected side(s).
                allowed = sides_per_index[coord]
                if "left" in allowed:
                    for n in range(1, half_extra + 2):
                        nc = self._neighbor_coord(coord, left, n)
                        self._make_cell(nc, base_z, role="path")
                if "right" in allowed:
                    for n in range(1, half_extra + 2):
                        nc = self._neighbor_coord(coord, right, n)
                        self._make_cell(nc, base_z, role="path")
                cells_to_remove.append(coord)
            else:
                # Standard corridor: keep the centerline plus extra on both sides.
                for n in range(1, half_extra + 1):
                    self._make_cell(self._neighbor_coord(coord, left, n), base_z, role="path")
                    self._make_cell(self._neighbor_coord(coord, right, n), base_z, role="path")

        for c in cells_to_remove:
            self._cells.pop(c, None)

    @staticmethod
    def _neighbor_coord(coord: Tuple[int, int], cardinal: str, n: int = 1) -> Tuple[int, int]:
        di, dj = DIR_OFFSETS[cardinal]
        return (coord[0] + di * n, coord[1] + dj * n)

    def _sides_for_index(self, index: int) -> List[str]:
        placement = self.params.side_placement
        if placement == "left":         return ["left"]
        if placement == "right":        return ["right"]
        if placement == "both":         return ["left", "right"]
        if placement == "alternating":  return ["left"] if index % 2 == 0 else ["right"]
        return ["left", "right"]

    # ---------------- P3 lateral pockets ----------------------------------

    def _add_lateral_cells(self) -> None:
        """Branch ``lateral_density`` extra clusters off the corridor."""
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

        for src in chosen:
            cardinal = self.rng.choice(CARDINALS)
            # Skip into open ground if the chosen side already has a path cell.
            n = 1
            cur = src.grid_coord
            while self._cells.get(self._neighbor_coord(cur, cardinal, n)) and n <= depth:
                n += 1

            # Random depth between 1 and ``depth``, biased by size variation.
            this_depth = max(1, min(depth, depth - int(self.rng.random() * variation * depth)))
            for step in range(n, n + this_depth):
                coord = self._neighbor_coord(src.grid_coord, cardinal, step)
                self._make_cell(coord, src.base_z, role="lateral")

    # ---------------- P4 neighbour resolution -----------------------------

    def _resolve_neighbors(self) -> None:
        for coord, cell in self._cells.items():
            for cardinal, (di, dj) in DIR_OFFSETS.items():
                nc = (coord[0] + di, coord[1] + dj)
                nb = self._cells.get(nc)
                if nb is not None:
                    cell.neighbors[cardinal] = nb

    # ---------------- P4 elevation assignment -----------------------------

    def _assign_elevation(self) -> None:
        source = self.params.elevation_source
        max_steps = max(0, int(self.params.max_elevation_steps))

        if source == ElevationSource.FLAT.value or max_steps == 0:
            for c in self._cells.values():
                c.elevation = 0
            return

        if source == ElevationSource.SPLINE_Z.value:
            # Use cell.base_z (already set from spline at rasterize time).
            # Normalize to integer steps relative to the lowest cell.
            min_base = min(c.base_z for c in self._cells.values())
            sh = self.params.step_height if self.params.step_height > 0 else 1.0
            for c in self._cells.values():
                steps = int(round((c.base_z - min_base) / sh))
                c.elevation = max(0, min(max_steps, steps))
            # Reset base_z so world_position math is consistent.
            for c in self._cells.values():
                c.base_z = min_base
            return

        # RANDOM_SMOOTHED
        for c in self._cells.values():
            c.elevation = self.rng.randint(0, max_steps)

    # ---------------- P5 elevation smoothing ------------------------------

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

        # Final safety: clamp neighbour deltas to at most ``max_steps`` step
        # difference so ramps remain buildable. Single pass over each pair.
        for coord, cell in self._cells.items():
            for cardinal, nb in cell.neighbors.items():
                if abs(cell.elevation - nb.elevation) > max(1, max_steps):
                    # Pull the higher one down toward the lower.
                    if cell.elevation > nb.elevation:
                        cell.elevation = nb.elevation + max(1, max_steps)
                    else:
                        nb.elevation = cell.elevation + max(1, max_steps)

    # ---------------- P6 connection assignment ----------------------------

    def _compute_connections(self) -> None:
        """Decide which edges are passable.

        Indoor: any neighbour pair is considered connected by default; this
        instructs the wall pass to cut a doorway. Disconnected pairs are
        skipped at random based on (1 - lateral_density) to keep some sealed
        rooms.

        Outdoor: all neighbour pairs are open; the wall pass decides whether
        a cover wall / drop edge / ramp is placed based on elevation deltas.
        """
        indoor = self.params.is_indoor()
        seal_chance = 0.0 if not indoor else max(0.0, 1.0 - self.params.lateral_density)

        for coord, cell in self._cells.items():
            for cardinal, nb in cell.neighbors.items():
                if cardinal in cell.connections:
                    continue
                connect = True
                if indoor and seal_chance > 0.0 and self.rng.random() < seal_chance:
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
