# SwapNSlash Game Art Style Guide

This document outlines the visual style, color palette, and design principles for the SwapNSlash game to ensure consistency across all game assets.

## Overall Style

SwapNSlash uses a pixel art style with the following characteristics:

- **Pixel Resolution**: Simple, blocky pixel art with minimal anti-aliasing
- **Proportions**: Characters are approximately 32x48 pixels, with a slightly "chibi" proportion (2-3 heads tall)
- **Animation**: Subtle animations for idle states, more pronounced for actions
- **Perspective**: Side-scrolling view with flat-colored backgrounds

## Color Palette

### Character Colors

| Element | Color (Hex) | RGB | Description |
|---------|-------------|-----|-------------|
| **Player** |
| Body/Shirt | `#3498db` | (52, 152, 219) | Blue shirt |
| Skin | `#f5d7b4` | (245, 215, 180) | Light skin tone |
| Hair | `#8b4513` | (139, 69, 19) | Brown hair |
| Pants | `#2c3e50` | (44, 62, 80) | Dark blue pants |
| **Slime Enemy** |
| Main Body | `#e74c3c` | (231, 76, 60) | Bright red |
| Shading | `#c0392b` | (192, 57, 43) | Darker red for depth |
| Highlights | `#f39c12` | (243, 156, 18) | Orange highlights |
| Eyes | `#ffffff` | (255, 255, 255) | White |
| Pupils | `#000000` | (0, 0, 0) | Black |
| **Goblin Enemy** |
| Body | `#8e44ad` | (142, 68, 173) | Purple body |
| Skin | `#27ae60` | (39, 174, 96) | Green skin |
| Pants | `#4a235a` | (74, 35, 90) | Dark purple pants |
| Eyes | `#ff0000` | (255, 0, 0) | Red eyes |

### Environment Colors

| Element | Color (Hex) | RGB | Description |
|---------|-------------|-----|-------------|
| **Sky** | `#87ceeb` | (135, 206, 235) | Light blue sky |
| **Mountains** | `#6c7a89` | (108, 122, 137) | Bluish-gray mountains |
| **Platforms** | `#8b4513` | (139, 69, 19) | Brown wooden platforms |
| **Grass/Bushes** |
| Main | `#2ecc71` | (46, 204, 113) | Bright green |
| Darker | `#27ae60` | (39, 174, 96) | Darker green for depth |
| Highlights | `#3ce681` | (60, 230, 129) | Light green highlights |
| **Clouds** | `#ffffff` | (255, 255, 255) | White with transparency |
| **Lava/Killzone** | `#e74c3c` | (231, 76, 60) | Bright red |

## Design Principles

### Characters

1. **Player Character**
   - Blue-themed human character with distinctive brown hair
   - Simple but recognizable silhouette
   - Subtle breathing animation when idle
   - More pronounced animations for movement and actions

2. **Slime Enemy**
   - Red color to distinguish from green grass/environment
   - Rounded, blob-like appearance
   - Pulsing animation when idle
   - Simple facial features (eyes only)

3. **Goblin Enemy**
   - Purple body with green skin for contrast
   - Humanoid with pointed ears
   - Red eyes for menacing appearance
   - Slightly taller than slimes

### Environment

1. **Platforms**
   - Brown wooden platforms with simple top texture
   - Clear, solid edges for gameplay clarity
   - Consistent height

2. **Grass/Bushes**
   - Green color palette with varied heights
   - Placed strategically to provide visual interest and gameplay mechanics
   - Characters can be partially or fully hidden when moving through them

3. **Background Elements**
   - Simple, parallax-scrolling mountains
   - Clouds for depth and movement
   - Minimal detail to keep focus on gameplay elements

4. **Killzone**
   - Bright red color to clearly indicate danger
   - Simple animation to draw attention

## Animation Guidelines

1. **Idle Animations**
   - Player: Subtle breathing (scale Y 1.03x, 1500ms duration)
   - Slime: Pulsing (scale X 1.1x, scale Y 0.9x, 1000ms duration)
   - Goblin: Subtle breathing (scale Y 1.03x, 1200ms duration)

2. **Movement Animations**
   - Walking: Bobbing up and down (±5px, 150ms duration)
   - Jumping: Squash and stretch (scale X 0.8x, scale Y 1.2x, 100ms duration)
   - Landing: Squash and stretch (scale X 1.2x, scale Y 0.8x, 100ms duration)

3. **Interaction Animations**
   - Grass rustling: Scale changes when entities enter (scale X +10%, scale Y -5%)
   - Damage: Flash red and shake
   - Death: Fade out with particle effects

## UI Elements

1. **Text**
   - Font: Monospace for pixel-perfect rendering
   - Colors: White text with black outlines for readability
   - Character names in brackets: [NAME]

2. **Panels**
   - Transparent backgrounds
   - No visible borders or boxes
   - Clear separation between different information sections

3. **Battle UI**
   - Clearly defined sections for player stats, enemy stats, and actions
   - No overlapping elements
   - Consistent font styling throughout

## Color Contrast Considerations

- **Gameplay Elements**: Ensure enemies are visually distinct from the background and environment
- **Text Readability**: Maintain high contrast for all text elements
- **Interactive Elements**: Use color and animation to indicate interactive objects
- **Danger Indicators**: Use red consistently for dangerous elements (enemies, killzones)

## Future Asset Development

When creating new assets, consider:

1. **Color Harmony**: New elements should use colors from the existing palette when possible
2. **Visual Distinction**: Ensure new enemies or objects are easily distinguishable from existing ones
3. **Consistent Scale**: Maintain the established pixel scale and proportions
4. **Performance**: Keep animations simple and efficient
5. **Accessibility**: Consider color-blind players by using shape and animation in addition to color
