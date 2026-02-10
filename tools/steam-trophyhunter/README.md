# Steam Trophy Hunter

A web application for tracking Steam game achievements across multiple games.

## Quick Start

1. Open `index.html` in any modern web browser
2. Click "+ Add Game"
3. Enter Steam App ID and Game Name
4. Watch it fetch achievements from Steam

No installation or setup required.

## Features

- **Real Achievement Data** - Automatically pulls actual achievements from Steam
- **Multi-Game Support** - Track achievements across multiple games with tabs
- **Search & Filter** - Find achievements quickly
- **Interactive Completion** - Click achievements to mark complete/incomplete
- **Theme Switching** - Light, Dark, and Auto themes
- **Data Management** - Export/import progress between devices
- **Priority System** - Mark achievements as high/medium/low priority
- **Favorites** - Star important achievements
- **Statistics** - View completion rates and progress
- **Persistent Storage** - Data saves automatically in your browser
- **Responsive Design** - Works on desktop, tablet, and mobile

## Adding Games

### Find Steam App ID

Visit the game's Steam store page. The App ID is in the URL:
```
https://store.steampowered.com/app/2499860/
                                    ^^^^^^^
                                   App ID
```

### Add to Tracker

1. Click "+ Add Game"
2. Enter the App ID (e.g., `2499860`)
3. Enter the Game Name (e.g., `DRAGON QUEST VII Reimagined`)
4. Click "Add Game"
5. Wait 5-10 seconds while it fetches from Steam

## Popular Game IDs

- **2499860** - DRAGON QUEST VII Reimagined
- **1245620** - Elden Ring
- **1091500** - Cyberpunk 2077
- **292030** - The Witcher 3
- **413150** - Stardew Valley
- **620** - Portal 2
- **220** - Half-Life 2

## Usage

- Click achievements to mark them complete/incomplete
- Use game tabs to switch between games
- Search and filter by completion status
- Delete games using the red button when a game tab is selected
- Theme button cycles through Light → Dark → Auto
- Data button opens export/import for progress backup

## Technical Details

- Pure HTML/CSS/JavaScript with no frameworks
- Uses CORS proxy (allorigins.win) to fetch Steam data
- LocalStorage for data persistence
- DOMParser to extract achievements from Steam HTML
- Responsive design for all devices

## Files

- `index.html` - Main application
- `app.js` - Application logic and Steam integration
- `styles.css` - Application styling
- `README.md` - Documentation

## Troubleshooting

**Achievements not loading**
- Check internet connection
- Wait 10-15 seconds for completion
- Try a different game
- Check browser console (F12) for errors

**Slow loading**
- The free CORS proxy can be slow at times
- Wait longer or try again in a few minutes

**Data disappeared**
- Data is stored in browser LocalStorage
- Each browser stores data separately
- Clearing browser data will remove saved progress

## Tips

- Open browser console (F12) to monitor fetch progress
- Data saves automatically
- Works offline once achievements are loaded
- Export data regularly for backup

---

**Version:** 1.2  
**Features:** Data export/import, game deletion, auto-collapse popups
