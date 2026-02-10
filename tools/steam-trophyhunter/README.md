# 🏆 Steam Trophy Hunter

A beautiful web app to track your Steam game achievements across multiple games.

## 🚀 Quick Start

1. **Open `index.html`** in any modern web browser
2. **Click "+ Add Game"**
3. **Enter Steam App ID and Game Name**
4. **Watch it fetch REAL achievements from Steam!**

That's it! No installation, no setup, no dependencies.

## ✨ Features

- ✅ **Fetch Real Achievements** - Automatically pulls actual achievements from Steam
- ✅ **Multi-Game Support** - Track achievements across multiple games with tabs
- ✅ **Search & Filter** - Find achievements quickly
- ✅ **Priority System** - Mark achievements as high/medium/low priority
- ✅ **Favorites** - Star your most important achievements
- ✅ **Statistics** - See completion rates and progress
- ✅ **Persistent Storage** - Data saves automatically in your browser
- ✅ **Beautiful UI** - Modern, responsive design

## 🎮 How to Add Games

### Find the Steam App ID

Visit the game's Steam store page. The URL looks like:
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
6. Done! All real achievements are now loaded

## 📊 Popular Game IDs

- **2499860** - DRAGON QUEST VII Reimagined
- **1245620** - Elden Ring
- **1091500** - Cyberpunk 2077
- **292030** - The Witcher 3
- **413150** - Stardew Valley
- **620** - Portal 2
- **220** - Half-Life 2

## 🎯 Usage Tips

- **Click game tabs** to switch between games
- **Use search** to find specific achievements
- **Filter** by priority, favorites, or completion status
- **Stats update** automatically based on your current view
- **Data persists** - close and reopen anytime

## 🔧 Technical Details

- **Pure HTML/CSS/JavaScript** - No frameworks, no build process
- **CORS Proxy** - Uses allorigins.win to fetch Steam data
- **LocalStorage** - Saves data in your browser
- **DOMParser** - Parses Steam HTML to extract achievements
- **Responsive** - Works on desktop, tablet, and mobile

## 📝 Files

- `index.html` - Main application page
- `app.js` - Application logic and Steam fetching
- `styles.css` - Beautiful styling
- `README.md` - This file

## 🐛 Troubleshooting

**Achievements not loading?**
- Check your internet connection
- Wait a bit longer (can take 10-15 seconds)
- Try a different game
- Check browser console (F12) for errors

**CORS proxy slow?**
- The free proxy can be slow sometimes
- Just wait a bit longer
- Or try again in a few minutes

**Data disappeared?**
- Check if you cleared browser data
- Data is stored in LocalStorage
- Each browser stores data separately

## 💡 Tips

- Open browser console (F12) to see fetch progress
- Data is saved automatically
- You can export/backup data from browser DevTools
- Works offline once achievements are loaded

## 🎉 Enjoy!

Happy achievement hunting! 🎮

---

**Version:** 1.0  
**No installation required - just open and use!**
