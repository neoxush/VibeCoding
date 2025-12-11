# Match-3 Tower Defense

A browser-based match-3 tower defense game built with Three.js and WebGL.

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
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

3. Open your browser to `http://localhost:8080`

### Build for Production

```bash
npm run build
```

## Features

- WebGL-powered 3D graphics with Canvas fallback
- Mobile-responsive design
- Touch and mouse input support
- Match-3 puzzle mechanics
- Tower defense gameplay
- Fantasy art style inspired by Kingdom Rush

## Development

The project is structured as follows:

- `src/` - Source code
  - `core/` - Core game engine and systems
  - `styles/` - CSS styles
- `dist/` - Built files (generated)

## Browser Support

- Modern browsers with WebGL support
- Fallback support for older browsers
- Mobile browsers (iOS Safari, Chrome Mobile, etc.)