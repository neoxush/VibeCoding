# JungleRush Project Structure

This document outlines the structure of the JungleRush game project after being converted to a standalone, offline-only application.

## Overview

JungleRush is a turn-based strategy game with side-scrolling platformer elements. The game is built using HTML5, CSS3, JavaScript, and the Phaser 3 game framework. It is designed to run completely offline without any server requirements.

## Project Structure

```
gamekit-junglerush/
├── assets/                  # Game assets
│   ├── audio/               # Sound effects and music
│   ├── images/              # Sprites and images
│   └── maps/                # Level data in JSON format
├── css/                     # Stylesheets
│   └── style.css            # Main stylesheet
├── js/                      # JavaScript files
│   ├── entities/            # Game entity classes
│   │   ├── Enemy.js         # Enemy class
│   │   └── Player.js        # Player class
│   ├── scenes/              # Game scenes
│   │   ├── BattleScene.js   # Turn-based battle scene
│   │   ├── BootScene.js     # Initial loading scene
│   │   ├── GameScene.js     # Main platformer gameplay scene
│   │   ├── PreloadScene.js  # Asset preloading scene
│   │   └── UIScene.js       # User interface scene
│   └── main.js              # Game initialization
├── .gitignore               # Git ignore file
├── art-style-guide.md       # Visual style guidelines
├── game.html               # All-in-one version of the game (main game file)
├── index.html               # Main entry point (multi-file version)
├── package.json             # Project metadata
├── PROJECT-STRUCTURE.md     # This file
├── README.md                # Project overview
├── RULE.md                  # Game rules and design
└── simple-game.html         # Simplified version for testing
```

## Game Versions

The game is available in two versions:

1. **Multi-file Version** (index.html)
   - Game code is split into multiple files
   - Easier to maintain and develop
   - Requires all files to be present

2. **Consolidated Version** (game.html)
   - All game code is in a single HTML file
   - Easier to share and distribute
   - Self-contained and portable
   - This is the main game file for playing

## How to Run

Simply open either `game.html` (recommended) or `index.html` directly in a web browser. No server or installation is required.

## Development Notes

- The game uses Phaser 3 loaded from a CDN
- Assets are generated programmatically in the code (no external assets required)
- The game is designed to be responsive and work on different screen sizes
