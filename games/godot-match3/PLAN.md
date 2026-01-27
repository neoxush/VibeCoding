# Project Overhaul Plan: Match-3 RPG

## 1. Current Parameter Inventory (Difficulty & Feel)
**Grid & Logic (`grid.gd`):**
- `width` (6): Number of columns.
- `height` (8): Number of rows.
- `piece_types` (4): ["red", "blue", "green", "yellow"]. Adding more types increases difficulty.
- `swap_speed` (0.4s): Animation duration for swapping.
- `collapse_speed` (0.4s): Delay before columns collapse.
- `refill_speed` (0.4s): Delay before new pieces spawn.

**Skill & Counter (`scripts/explosion_counter.gd`):**
- `max_volume` (4): Matches needed to trigger the first skill.
- `RESET_TIME` (5.0s): Time before the combo counter resets.
- `max_volume_increase` (+2): How much the requirement increases after each cast.
- `lingering_time` (0.5s): Grace period after a skill cast before the counter fades.

**Active Skills (`scripts/skills/`):**
- **Thundergod's Wrath** (`scripts/skills/skill_thundergod.gd`):
    - `energy_cost` (4): Base cost to cast.
    - `icon`: `res://assets/skill_zuus_thundergods_wrath.png`
    - `targets`: `floor(energy / 2.0)` random tiles.
    - `visuals`: Lightning chain effect using `Line2D`.

**Visuals (Juice):**
- `scale_punch`: How much the counter grows on impact (1.8x) in `explosion_counter.gd`.
- `shake_intensity`: Hardcoded random range (-10, 10).

**Audio Assets:**
- `res://assets/skill-lightning-4s.mp3`: Skill activation (Thundergod's Wrath).
- `res://assets/skill-lightning-1s.mp3`: Lightning strike hit.
- `res://assets/explosion-clinking.mp3`: Successful match on the board.

---

## 2. Proposed Features & Roadmap

### Phase 1: The RPG Core (Logic)
*Focus: Establishing the "Battle" loop.*
- [ ] **Player & Enemy Stats:**
    - Implement `Health`, `Attack`, `Defense`, and `Mana` stats.
    - Create a `BattleManager` to handle turn logic (Player Move -> Enemy Reaction).
- [ ] **Meaningful Matches:**
    - **Red Tiles:** Direct Attack (Damage based on match size).
    - **Green Tiles:** Heal Player HP.
    - **Blue Tiles:** Charge Mana/Skill Meter.
    - **Yellow Tiles:** Gold/Defense (TBD).
- [ ] **Win/Lose Conditions:**
    - Win: Deplete Enemy HP.
    - Lose: Player HP reaches 0.

### Phase 2: Enhanced Match-3 Mechanics
*Focus: Adding strategic options to the grid.*
- [x] **Active Skills:**
    - Refactored `explosion_counter.gd` to use a modular `Skill` resource system.
    - Implemented "Thundergod's Wrath" as the first `Skill` resource.
    - Added support for custom skill icons (PNG).
    - *Next:* Add UI for selecting/activating different skills.
- [ ] **Special Tiles:**
    - **Bombs:** Created by matching 4+. Explode for area damage.
    - **Locked Tiles:** Created by Enemy debuffs. Must be matched to clear.
- [ ] **Enemy AI:**
    - Enemy attacks every N turns or on a timer.
    - Enemy can disrupt the board (lock tiles, shuffle grid).

### Phase 3: Visual & Audio Polish (Display)
*Focus: Making the numbers feel good.*
- [ ] **Damage Numbers:** Pop-up text for damage dealt/taken.
- [ ] **Health Bars:** Visual HP gauges for Player and Enemy.
- [ ] **Skill Animations:** Unique visual effects for different skills (Fire, Ice, Lightning).
- [x] **Feedback Loop:** Screen shake on hits, sound effects for matches and skills.
    - Added match clinking sound.
    - Added skill activation and strike sounds with queuing logic.

### Phase 4: Data Center (Configuration & State Management)
*Focus: Centralized control for game balance and monitoring.*
- [ ] **GameConfig Resource:**
    - A centralized `Resource` or `Singleton` to store all game parameters (e.g., `MAX_HP`, `BASE_DAMAGE`, `GAUGE_MAX_VOLUME`).
    - Allows for easy tweaking of balance without hunting through scripts.
- [ ] **Skill Registry:**
    - A database of all available skills, their costs, effects, and cooldowns.
    - Example: `LightningChain` -> { Cost: 10, Targets: 3, Damage: 50 }.
- [ ] **Debug/Monitor Dashboard:**
    - An in-game or editor-based view to see current state (Active Buffs, Current Gauge Levels, Skill Cooldowns) in real-time.
    - "What we have done" log: A history of triggered effects for debugging.

---

## 3. Immediate Action Items (Next Steps)
1.  **Refactor `grid.gd` & Skill System:**
    - [x] Extract "Lightning cast" logic into a dedicated `Skill` system (Done).
    - [ ] Move remaining RPG logic (stats, damage) to `BattleManager`.
2.  **Define the "Battle Scene":** Create a layout that accommodates the Grid (bottom) and the Battle View (top - Player vs Enemy).
3.  **Implement Basic Stats:** Add HP variables and make Red matches reduce Enemy HP.

## 4. Discussion Points
- **Turn System:** Should it be strictly turn-based (Player moves, then Enemy attacks) or Real-Time (Enemy attacks on a timer while Player matches frantically)?
- **Progression:** Do we want a map/level selector, or an "Endless Mode" with scaling difficulty?
