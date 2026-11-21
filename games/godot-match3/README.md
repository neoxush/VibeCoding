# GD Match3 - Prototype

A colorful Match-3 puzzle game prototype built with **Godot 4.x**. Swap candies to create matches of 3 or more and watch them explode with satisfying particle effects!

> 📖 **Feature Documentation**: For a complete list of mechanics, terms (Thunder Gem, Arc Lightning, Cross Lightning Overcharge), triggers, and notes, see [FEATURES.md](FEATURES.md).

![Godot 4.x](https://img.shields.io/badge/Godot-4.x-blue?logo=godotengine&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🎮 How to Run

1. **Open Godot 4.x**.
2. Click **Import**.
3. Browse to this project folder and select the `project.godot` file.
4. Click **Import & Edit**.
5. Once the editor opens, press **F5** (or the Play button in the top right) to run the game.

---

## 📁 Project Structure

```
godot-match3/
├── assets/
│   ├── background.svg          # Game background graphic
│   ├── blue_candy.svg          # Blue candy sprite
│   ├── green_candy.svg         # Green candy sprite
│   ├── red_candy.svg           # Red candy sprite
│   ├── yellow_candy.svg        # Yellow candy sprite
│   └── gem.gdshader            # Shader for gem visual effects
├── scenes/
│   ├── main.tscn               # Main entry scene
│   ├── game.tscn               # Game scene with Grid and gameplay
│   ├── tile.tscn               # Individual candy tile scene
│   └── explosion_particles.tscn # Particle effect for matches
├── scripts/
│   ├── grid.gd                 # Core game logic: board generation, input, matching
│   ├── tile.gd                 # Candy piece behavior and interactions
│   └── explosion.gd            # Particle effect management
└── project.godot               # Godot project configuration
```

---

## ✨ Game Features

- 🍬 **Match-3 Mechanics** – Swap adjacent candies to create matches of 3 or more
- 💥 **Explosion Effects** – Satisfying particle effects when matches are cleared
- 🎨 **4 Candy Types** – Red, Blue, Green, and Yellow candies with custom SVG graphics
- 🖱️ **Mouse & Touch Support** – Works seamlessly with both input methods
- 📐 **6x8 Grid Layout** – Optimized board size for engaging gameplay
- ⚡ **Automatic Match Detection** – Instant detection and clearing of valid matches
- 🌟 **Custom Shader Effects** – Enhanced gem visuals with GLSL shaders

---

## 🕹️ Controls

| Input | Action |
|-------|--------|
| **Click + Drag** | Swap a candy with an adjacent piece |
| **Touch + Swipe** | Same as above (mobile-friendly) |

- Matches of **3 or more** candies in a row or column will be cleared
- Particle effects trigger on successful matches
- Invalid swaps (no match created) are automatically reverted

---

## 🛠️ Development

This project was built using **Godot 4.x** with GDScript. Key implementation details:

- **Grid-based Logic**: The game board is managed as a 2D array for efficient match detection
- **Tween Animations**: Smooth candy swapping and falling animations
- **Particle System**: GPU-accelerated particle effects for match explosions
- **SVG Assets**: Vector graphics for crisp visuals at any resolution

---

## 📜 License

This project is open source and available under the MIT License.
