# VibeCoding

A curated collection of interactive web applications, games, and development tools, each crafted with modern web technologies and designed for both entertainment and productivity.

## 🌐 Browser Extensions

### [Enhanced Split View](./browser-extensions/enhanced-split-view/)
A powerful browser extension that provides an enhanced split-view experience for comparing web content side by side.

## 🎮 Games

### [godot-match3](./games/puzzle-rpg/)
A puzzle-based RPG prototype built with Godot 4.x, combining match-3 mechanics with role-playing elements. Swap candies to create matches and clear the board in this engaging puzzle adventure game.

<details>
    <summary>Deprecated Ones</summary>

### [JungleRush](./games/junglerush/)
A turn-based strategy game with side-scrolling elements, combining platformer mechanics with tactical combat. Navigate through jungle environments and engage in strategic turn-based battles with various enemies.

### [Match3Craft](./games/match3craft/)
An innovative browser-based match-3 tower defense game built with Three.js and WebGL. Match gems to build defenses and protect your base from waves of enemies.

### [TypingFeast](./games/typingfeast/)
An immersive 3D typing game featuring word rain mechanics, real-time performance tracking, and progressively challenging gameplay. Built with Three.js and TypeScript.

### [Wordly](./games/wordly/)
A modern word puzzle game that challenges your vocabulary and problem-solving skills with daily puzzles and multiple difficulty levels.
</details>

## 🛠️ Tools

### [3D Layout](./tools/3dlayout/)
A powerful tool for creating 3D blockouts and layouts, perfect for game level design and architectural visualization.

### [Blender PCG Scripter](./tools/blender-pcg-scripter/)
A Blender 3.6+ addon for procedural content generation, featuring spline-driven level design, modular building blocks, and terrain generation for game development.

### [Checklist](./tools/checklist/)
A versatile checklist application with multiple versions, designed to help you stay organized and productive.

### [Drafter](./tools/drafter/)
A sketch-to-3D conversion tool that helps transform 2D drawings into 3D models with ease.

### 📦 Installing Dependencies

Some projects require dependencies to be installed before running. After cloning this repository:

**For Node.js projects** (Match3Craft, TypingFeast):
```bash
# Navigate to the project folder
cd games/match3craft
# or
cd games/typingfeast

# Install dependencies
npm install
```

**For Godot projects** (Puzzle RPG):
```bash
# Requires Godot 4.x to be installed
# Open the project.godot file in Godot editor
# No additional dependencies needed
```

**Projects with dependencies:**
- `games/match3craft` - Requires Node.js and npm
- `games/typingfeast` - Requires Node.js and npm
- `games/puzzle-rpg` - Requires Godot 4.x

**Projects without dependencies:**
- `games/junglerush` - Pure HTML/CSS/JS (no installation needed)
- `games/wordly` - Pure HTML/CSS/JS (no installation needed)
- `tools/*` - Most tools are standalone
- `browser-extensions/*` - Follow browser-specific installation

## 💻 Development

This repository showcases various web technologies and development approaches. Feel free to explore, learn, and contribute to any project that interests you.

## 📝 License

Unless otherwise specified, all projects are open-source and available under the MIT License.
