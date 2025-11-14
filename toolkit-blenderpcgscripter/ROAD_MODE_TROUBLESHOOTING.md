# Road Mode Troubleshooting

## Problem: Buildings Still Centered on Spline

If you see buildings centered on the spline instead of on the sides, here's how to fix it:

### Step 1: Verify Road Mode is Enabled

In the UI, check:
- [ ] "Road Mode: ON" button is highlighted/active
- [ ] Road Width shows a value (e.g., 5m)
- [ ] Side shows "Both" (or Left/Right/Alternating)
- [ ] You see "→ Buildings on path sides" hint

### Step 2: Reload the Addon (CRITICAL!)

**The most common issue is Blender hasn't reloaded the code.**

Try these methods in order:

**Method 1: Reload Scripts (Fastest)**
1. Press `F3` (search menu)
2. Type "Reload Scripts"
3. Press Enter
4. Wait 2 seconds
5. Try generating again

**Method 2: Disable/Enable Addon**
1. Edit → Preferences → Add-ons
2. Find "PCG Level Blockout"
3. **Uncheck** the checkbox (disable)
4. Wait 2 seconds
5. **Check** the checkbox again (enable)
6. Close Preferences
7. Try generating again

**Method 3: Restart Blender (Most Reliable)**
1. Save your work
2. Close Blender completely
3. Reopen Blender
4. Try generating again

### Step 3: Clear Old Generation

Before generating again:
1. Delete the old generated collection
2. Clear the preview (click "Clear" button)
3. Now generate fresh

### Step 4: Verify Parameters

Make sure:
- **Road Width**: 5-10m (not too small)
- **Path Width**: 5m or more
- **Spacing**: 2m or more
- **Side**: Set to "Both" for testing

### Step 5: Test with Simple Spline

1. Delete existing spline
2. Click "Create Default Spline"
3. Enable Road Mode
4. Set Road Width to 10m
5. Set Side to "Both"
6. Click "Generate"

### Expected Result:

**Road Mode ON:**
```
[Building]  ====clear path====  [Building]
                   |
[Building]  ====clear path====  [Building]
                   |
[Building]  ====clear path====  [Building]
```

**Road Mode OFF:**
```
      [Building]
          |
      [Building]
          |
      [Building]
```

### Diagnostic Checklist:

Run through this checklist:

1. [ ] Road Mode checkbox is ON in UI
2. [ ] Reloaded addon (F3 → Reload Scripts)
3. [ ] Cleared old generation
4. [ ] Road Width is 5m or more
5. [ ] Side is set to "Both"
6. [ ] Generated fresh (not using old generation)
7. [ ] Can see buildings on BOTH sides of spline
8. [ ] Clear space in the middle

### Still Not Working?

If buildings are still centered after all steps:

**Check the Console for Errors:**
1. Window → Toggle System Console
2. Look for Python errors
3. Share any error messages

**Verify File Changes:**
1. Check that `layout_generator.py` has `_create_road_side_spaces` method
2. Check that `parameters.py` has `road_mode_enabled` field
3. Check that `ui_panel.py` has Road Mode section

**Test Standard Mode:**
1. Turn Road Mode OFF
2. Generate
3. Buildings should be centered (this is correct)
4. Turn Road Mode ON
5. Generate
6. Buildings should be on sides (if not, addon didn't reload)

### Common Mistakes:

❌ **Forgot to reload addon** - Most common!
❌ **Road Width too small** - Set to 10m for testing
❌ **Looking at old generation** - Delete and regenerate
❌ **Preview vs Generation** - Preview shows wireframes, generation shows solid blocks
❌ **Terrain disabled** - Won't see road surface without terrain

### Success Indicators:

✓ Buildings appear on LEFT side of spline
✓ Buildings appear on RIGHT side of spline  
✓ Clear gap in the MIDDLE
✓ Gap width matches Road Width parameter
✓ Terrain is flat along the path (if terrain enabled)

---

## Quick Test Procedure:

1. **Reload addon** (F3 → Reload Scripts)
2. **Create default spline**
3. **Enable Road Mode** (big button)
4. **Set Road Width to 10m**
5. **Set Side to Both**
6. **Click Generate**
7. **Look from top view** (Numpad 7)
8. **Verify buildings on both sides**

If this works, road mode is functioning correctly!

---

**Last Updated:** 2025-11-14
