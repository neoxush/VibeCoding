# WebGL Typing Game

A 3D typing game built with Three.js and TypeScript featuring immersive 3D environments and engaging gameplay mechanics.

## Features

- **3D Word Rain Mode**: Type falling words before they hit the ground
- **Real-time Performance Tracking**: WPM, accuracy, and score tracking
- **Immersive 3D Environment**: WebGL-powered 3D scene with lighting and effects
- **Responsive Design**: Works on different screen sizes
- **Progressive Difficulty**: Game gets more challenging as you improve

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:3000`

### How to Play

1. **Word Rain Mode**: Words will fall from the sky
2. **Type the highlighted word** (shown in the bottom center)
3. **Complete words** before they hit the ground
4. **Track your progress** with the stats panel in the top-left corner

### Controls

- **Type letters** to match the current word
- **Backspace** to correct mistakes
- **Focus on accuracy** for higher scores

### Scoring

- Base points for each completed word
- Accuracy bonus (higher accuracy = more points)
- Speed bonus (higher WPM = more points)
- Combo bonus for consecutive perfect words

## Development

### Build for Production

```bash
npm run build
```

### Run Tests

```bash
npm test
```

### Project Structure

```
src/
├── core/           # Core game engine components
│   ├── GameEngine.ts
│   ├── SceneManager.ts
│   ├── InputHandler.ts
│   ├── TextRenderer.ts
│   └── PerformanceTracker.ts
├── modes/          # Game modes
│   └── WordRainMode.ts
└── main.ts         # Entry point
```

## Technical Details

- **Rendering**: Three.js with WebGL
- **Language**: TypeScript
- **Build Tool**: Vite
- **Performance**: 60 FPS target with optimized rendering

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

WebGL support required.

## License

MIT License