# How to Use the New Preview Feature

## Quick Start Guide

### Step 1: Reload the Addon

Since we added new features, you need to reload:

**Option A: Quick Reload**
1. `Edit > Preferences > Add-ons`
2. Find "PCG Level Blockout"
3. Uncheck to disable
4. Check again to enable

**Option B: Restart Blender**
1. Save your work
2. Close Blender
3. Reopen Blender

---

### Step 2: Open the Panel

1. In 3D Viewport, press `N` to open sidebar
2. Click "PCG Blockout" tab
3. You'll see the new "Preview" section!

---

### Step 3: Create or Select a Spline

**Option A: Use Default**
```
Click "Create Default Spline" button
→ An S-curve appears
```

**Option B: Draw Your Own**
```
Shift + A > Curve > Bezier
→ Edit the curve shape
→ Select it in the panel
```

---

### Step 4: Show Preview

```
Click "Show Preview" button
```

**What You'll See:**
- 🔵 **Cyan spheres** appear along your curve
  - These show where spaces will be generated
  - Count matches your spacing parameter
  
- 🔵 **Blue transparent tube** around the curve
  - Shows the generation area (path width)
  - Content will appear within this zone

- ℹ️ **Info text** in the panel
  - "Preview: 12 sample points"
  - Shows how many spaces will be created

---

### Step 5: Adjust and Preview Again

**Try changing parameters:**

1. **Adjust Spacing:**
   ```
   Change "Spacing" slider (e.g., from 10m to 5m)
   → See: "Will generate ~24 spaces"
   → Click "Show Preview" again
   → More cyan spheres appear!
   ```

2. **Adjust Path Width:**
   ```
   Change "Path Width" slider (e.g., from 20m to 30m)
   → Click "Show Preview" again
   → Blue tube gets wider!
   ```

---

### Step 6: Generate

When you're happy with the preview:

```
Click "Generate" button
→ Full level blockout is created
→ Preview remains visible for reference
```

**Result:**
- Structures appear at the cyan sphere locations
- Terrain fills the blue tube area
- Everything matches the preview!

---

### Step 7: Clean Up

When done:

```
Click "Clear" button (next to Show Preview)
→ All preview elements disappear
→ Only generated content remains
```

---

## Visual Guide

### What the Preview Shows:

```
     Cyan Sphere = Sample Point (where a space will be)
          ↓
    🔵───🔵───🔵───🔵───🔵
    │                   │
    │  Blue Tube =      │
    │  Generation Area  │
    │  (path width)     │
    └───────────────────┘
         ↑
    Orange Curve = Your Spline
```

### Before vs After:

**Before Preview Feature:**
```
Draw Spline → ??? → Generate → "Hmm, not what I expected"
```

**With Preview Feature:**
```
Draw Spline → Show Preview → See Exactly What Will Happen → Generate → "Perfect!"
```

---

## Tips & Tricks

### Tip 1: Use Preview to Experiment
```
1. Show Preview
2. Adjust spacing slider
3. See estimated count change
4. Show Preview again to update
5. Repeat until satisfied
```

### Tip 2: Preview Before Every Generation
```
Always click "Show Preview" before "Generate"
→ Avoid surprises
→ Save time
```

### Tip 3: Keep Preview Visible During Generation
```
Don't clear preview before generating
→ Use it as a reference
→ Compare preview vs actual result
```

### Tip 4: Toggle Preview Collection Visibility
```
In Outliner:
→ Find "PCG_Preview" collection
→ Click eye icon to hide/show
→ Useful for comparing with generated content
```

### Tip 5: Edit Spline with Preview Visible
```
1. Show Preview
2. Select your spline
3. Enter Edit Mode (Tab)
4. Move control points
5. Exit Edit Mode
6. Show Preview again to update
```

---

## Troubleshooting

### Preview doesn't appear?

**Check:**
- ✓ Is a spline selected?
- ✓ Is it a valid curve object?
- ✓ Does the curve have at least 2 points?
- ✓ Is spacing > 0?

**Try:**
- Click "Clear" then "Show Preview" again
- Check the system console for errors
- Restart Blender

### Preview looks wrong?

**Common issues:**
- **Too few spheres:** Increase spacing or make spline longer
- **Too many spheres:** Decrease spacing or make spline shorter
- **Tube too narrow:** Increase path_width
- **Tube too wide:** Decrease path_width

### Can't see the blue tube?

**Check:**
- Material viewport shading (top right icons)
- Try "Solid" or "Material Preview" mode
- The tube is semi-transparent, so it's subtle

---

## What's Next?

This is Phase 1 of the preview system. Future updates will add:

- **Space boundary wireframes** (show exact space sizes)
- **Connection lines** (show relationships)
- **Real-time auto-update** (no need to click Show Preview again)
- **Color-coding** (different colors for different space types)

---

## Enjoy! 🎉

The preview feature makes the spline→mesh connection crystal clear!

**Happy level designing!** 🎮
