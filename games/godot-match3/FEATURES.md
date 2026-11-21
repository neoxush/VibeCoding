# ⚡ GD Match-3: Feature Reference & Terminology Guide

This document is the single source of truth for all game features, official terminology, trigger conditions, technical architecture notes, and development progress in `godot-match3`.

---

## 📖 1. Official Terminology & Glossary

Use this section to look up standard names and disambiguate terms across discussions, plans, and code.

| Standard Term | Code Reference | Common / Casual Names | Definition |
| :--- | :--- | :--- | :--- |
| **Thunder Gem** | `piece.is_thunder_gem = true` | Electric Gem, ARC Gem, Special Gem, 5-match Gem | A special overcharged candy created from a 5-match. Retains its parent shape and color, overlaid with a glowing Zeus golden lightning glyph and pulsing elemental aura. |
| **Arc Lightning** | `cast_arc_lightning()` | Chain Lightning, Elemental Arc, Targeted Zap | An electric chain reaction triggered by **manual player action** (swapping with a gem or matching in a 3-match). Leaps sequentially across the board to zap all candies of that elemental color. |
| **Cross Lightning Overcharge** | `cast_cross_lightning()` | Row & Column Blast, Plus Lightning, Cross Shockwave | A special bonus blast triggered when a Thunder Gem is **struck by another ongoing lightning chain** (user didn't choose the swap). Casts full-span horizontal and vertical lightning beams across the entire row and column. |
| **Wrath of the Thundergod** | `cast_wrath_of_thundergod()` | Double Thunder Combo, Board Wipe, Ultimate Strike | Triggered by **swapping two Thunder Gems together**. Clears both gems and delivers a staggered lightning strike across every single tile on the grid. |
| **Explosion Counter / Combo Gauge** | `scripts/explosion_counter.gd` | Skill Gauge, Energy Meter, RPG Meter | The circular HUD meter that charges up as matches and cascades occur. Once full, it casts the character's active skill (Zeus's Divine Wrath). |
| **Pentatonic Cascades** | `play_match_sfx()` | Dynamic Pitch, Musical Combo | Audio system where each consecutive cascade step increases the pitch scale along a musical pentatonic scale (C, D, E, G, A...). |

---

## ⚡ 2. Deep Dive: Core Features & Mechanics

### Feature A: Color-Infused Thunder Gem
* **Concept**: A 5-match creates a Thunder Gem that maintains the exact color and shape identity of the candies that formed it.
* **Shapes & Visual Identity**:
  * 🔴 **Red**: Circular candy (`red_candy.svg`) + Golden Zeus bolt + Crimson aura.
  * 🔵 **Blue**: Rounded square candy (`blue_candy.svg`) + Golden Zeus bolt + Electric cyan aura.
  * 🟢 **Green**: Triangular candy (`green_candy.svg`) + Golden Zeus bolt + Triangular emerald halo + Lime sparks.
  * 🟡 **Yellow**: 5-point star candy (`yellow_candy.svg`) + Golden Zeus bolt + Radiant amber aura.
* **Layering Architecture Note**:
  * The base candy sprite is rendered via `$Sprite2D`.
  * The golden Zeus bolt, contrast backing shadow, and elemental energy rings are rendered via a dedicated child node `LightningOverlay` (`z_index = 20`). This guarantees the bolt is never covered or obscured by the opaque candy texture.

---

### Feature B: Arc Lightning (Targeted Elemental Chain)
* **Trigger**: **Manual Player Action**
  1. Player swaps a Thunder Gem with any regular candy.
  2. Player lines up 3 candies of the same color containing a Thunder Gem (e.g., 2 Green candies + 1 Green Thunder Gem).
* **Targeting Logic**:
  * It detects its own elemental type (`piece.type`) or the swapped target's type.
  * Finds all matching candies across the board.
  * Uses a **nearest-neighbor chain algorithm** to compute the shortest sequential leaping path.
* **Visuals & Audio**:
  * Displays `"⚡ [COLOR] ARC LIGHTNING!"` floating text.
  * Procedural `Line2D` bolt subdivides into 8 jagged displaced segments between each target in sequence.
  * Flashes white-hot before adopting the saturated elemental color (crimson, emerald, gold, cyan).
  * Plays strike sound and explosion particles at each leap destination.

---

### Feature C: Cross Lightning Overcharge (Row & Column Blast)
* **Concept & Design Rationale**:
  * When a Thunder Gem is struck passively by an ongoing chain reaction (or Zeus skill), the player could not choose what color to target.
  * As a rewarding combo bonus, it unleashes a **full row and column clearance** instead of a single-color arc.
* **Triggers**:
  1. **Zeus Skill Strike**: `explode_at_position()` strikes a Thunder Gem.
  2. **Arc Lightning Chain Leap**: An ongoing Arc Lightning sequence encounters a Thunder Gem in its path.
  3. **Secondary Crossfire**: Another Thunder Gem caught inside an existing Cross Lightning row/column.
* **Mechanics**:
  * Emits two full-span, jagged lightning beams (`cross_h_line` and `cross_v_line` at `z_index = 660`).
  * Destroys **all tiles in the entire horizontal row** (left and right to board boundaries).
  * Destroys **all tiles in the entire vertical column** (up and down to board boundaries).
  * Chain Reaction: Any other Thunder Gem hit in that row/column triggers its own Cross Lightning!

---

### Feature D: Double Thunder Combo (Wrath of the Thundergod)
* **Trigger**: Player swaps two adjacent Thunder Gems directly with each other.
* **Mechanics**:
  * Displays `"⚡ THUNDERGOD'S WRATH! ⚡"` across the board center.
  * Plays the ultimate skill audio cue.
  * Consumes both gems and triggers a staggered lightning wipe that explodes **every single piece on the board**.
  * Followed by a complete column collapse and board refill.

---

## 🎯 3. Trigger & Requirement Matrix

| Feature | Trigger Precondition | Player Input | Resulting Action & Target |
| :--- | :--- | :--- | :--- |
| **Spawn Thunder Gem** | Any horizontal or vertical 5-in-a-row match | Swap or cascade | Spawns a Thunder Gem matching the 5-match color at the anchor position |
| **Arc Lightning (Swap)** | Thunder Gem + Normal Gem | Player drag/swap | Leaps to and destroys **all gems of that elemental color** on the board |
| **Arc Lightning (Match)** | 3-match containing a Thunder Gem | Player swap or cascade | Detonates and arcs through all gems of that same element |
| **Cross Lightning** | Thunder Gem hit by active lightning chain or Zeus strike | Passive / Chain hit | Blasts **entire row + entire column** in both axes (+ shape) |
| **Wrath of the Thundergod** | Two Thunder Gems adjacent | Player drag/swap | **Full-board wipe** + staggered lightning strikes |

---

## 🛠️ 4. Key Architecture & Design Notes (Worth Noting Down)

1. **Candy Shape & Color Retention over SVG Swapping**:
   * Rather than swapping to a generic blue `thunder_gem.svg` that causes color confusion, pieces retain their loaded SVG asset (`[color]_candy.svg`).
   * Avoids asset import lag or fallback mismatches during runtime.
2. **Overlay Drawing Pipeline (`LightningOverlay`)**:
   * Godot executes a node's `_draw()` *before* drawing its children. Setting `show_behind_parent` on `$Sprite2D` does not place it behind custom canvas commands reliably when shaders are active.
   * Solution: An inner `LightningOverlay (Node2D)` child with `z_index = 20` executes its own `_draw()` explicitly on top of `$Sprite2D`.
3. **Chain Reaction Safeguard**:
   * When `cast_cross_lightning()` executes, the origin piece is immediately removed from `all_pieces` before secondary cross-explosions are evaluated, preventing infinite circular recursion.
4. **Musical Cascade Feedback**:
   * Cascades cycle through `const PENTATONIC_SEMITONES = [0, 2, 4, 7, 9, 12, 14, 16]`. The pitch scales via `pow(2.0, semitone / 12.0)` to give a rewarding, harmonious audio feel to combos.

---

## 📌 5. Codebase Implementation Map

| System / Feature | File | Key Functions / Nodes |
| :--- | :--- | :--- |
| **Thunder Gem Rendering & Overlay** | [`scripts/tile.gd`](file:///d:/Github/VibeCoding/games/godot-match3/scripts/tile.gd) | `make_thunder_gem()`, `LightningOverlay`, `_draw_thunder_effects()` |
| **Thunder Gem 5-Match Detection** | [`scripts/grid.gd`](file:///d:/Github/VibeCoding/games/godot-match3/scripts/grid.gd) | `find_matches()`, `choose_thunder_gem_spawn()`, `destroy_matches()` |
| **Arc Lightning Execution** | [`scripts/grid.gd`](file:///d:/Github/VibeCoding/games/godot-match3/scripts/grid.gd) | `cast_arc_lightning()`, `draw_electric_arc()` |
| **Cross Lightning Overcharge** | [`scripts/grid.gd`](file:///d:/Github/VibeCoding/games/godot-match3/scripts/grid.gd) | `cast_cross_lightning()`, `generate_lightning_path()`, `explode_at_position()` |
| **Double Gem Board Wipe** | [`scripts/grid.gd`](file:///d:/Github/VibeCoding/games/godot-match3/scripts/grid.gd) | `cast_wrath_of_thundergod()` |
| **Combo & Skill Charge Counter** | [`scripts/explosion_counter.gd`](file:///d:/Github/VibeCoding/games/godot-match3/scripts/explosion_counter.gd) | `add_explosion()`, `trigger_skill()` |

---

## 📜 6. Progress & Change History

* **Commit `641733c3`**:
  * Implemented color-infused Thunder Gems retaining base candy geometry (Circle, Square, Triangle, Star).
  * Added `LightningOverlay` with `z_index = 20` to prevent sprite texture clipping.
  * Implemented **Cross Lightning Overcharge** for passive lightning hits (full row & column clearance).
  * Added chain-reaction triggers for secondary Thunder Gems caught in crossfire.
* **Initial Zeus Mechanics**:
  * Implemented 5-match detection and special gem state.
  * Implemented nearest-neighbor Arc Lightning leaping and audio queuing.
