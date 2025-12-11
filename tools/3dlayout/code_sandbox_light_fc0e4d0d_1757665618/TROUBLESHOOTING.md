# 🔧 Troubleshooting Guide

## Common Launch Issues

### Issue: Application Stuck on "Initialization Status" Screen

**Symptoms:**
- Page loads but shows diagnostic panel with all steps showing hourglass icons
- No 3D viewport appears
- Console may show errors

**Possible Causes & Solutions:**

#### 1. WebGL Not Supported/Enabled
**Check:** Visit [webglreport.com](https://webglreport.com) to verify WebGL support
**Solutions:**
- Enable hardware acceleration in browser settings
- Update graphics drivers
- Try a different browser (Chrome recommended)
- Check if WebGL is disabled in browser flags

#### 2. Network/CDN Issues
**Check:** Open browser console (F12) and look for network errors
**Solutions:**
- Ensure stable internet connection
- Try refreshing the page (Ctrl+F5)
- Check if CDN resources are blocked by firewall/antivirus
- Try accessing the page from a different network

#### 3. Canvas Sizing Issues
**Check:** Browser console for "Canvas has invalid dimensions" error
**Solutions:**
- Ensure the page has fully loaded before the script runs
- Try refreshing the page
- Check if CSS is loading properly
- Resize browser window to trigger layout recalculation

#### 4. JavaScript Module Loading Issues
**Check:** Console for import/module errors
**Solutions:**
- Ensure you're accessing via HTTP/HTTPS (not file://)
- Use a local web server for development
- Check browser support for ES6 modules

### Issue: Black Screen or No 3D Content

**Symptoms:**
- Application loads but 3D viewport is black
- Diagnostic shows success but no objects visible

**Solutions:**
1. **Reset Camera:** Press `Space` key to reset camera position
2. **Check WebGL Context:** Open console and look for WebGL errors
3. **Try Creating Objects:** Press `1` to create a cube
4. **Check Lighting:** The scene should have automatic lighting

### Issue: Poor Performance or Lag

**Symptoms:**
- Slow response to interactions
- Low frame rate
- Browser becomes unresponsive

**Solutions:**
1. **Reduce Object Count:** Delete unnecessary objects
2. **Close Other Tabs:** Free up system memory
3. **Lower Screen Resolution:** Reduce browser window size
4. **Check System Resources:** Use Task Manager to monitor usage
5. **Disable Shadows:** May be added in future versions

### Issue: Controls Not Working

**Symptoms:**
- Keyboard shortcuts don't work
- Mouse interactions fail
- Transform tools don't respond

**Solutions:**
1. **Click in Viewport:** Ensure 3D viewport has focus
2. **Select Object First:** Many tools require object selection
3. **Check Transform Mode:** Press G/R/S to activate tools
4. **Verify Object Selection:** Click on objects to select them

## Browser-Specific Issues

### Chrome
- **Best compatibility** - recommended browser
- Enable hardware acceleration in Settings > Advanced > System
- Check chrome://flags for WebGL settings

### Firefox
- Good compatibility
- Enable WebGL in about:config (webgl.force-enabled = true)
- May have performance differences from Chrome

### Safari
- Generally works but may have performance limitations
- Ensure latest version for best WebGL support
- Some advanced features may not work

### Edge
- Modern Edge (Chromium-based) works well
- Legacy Edge may have compatibility issues
- Update to latest version

## Development Issues

### Local Development Server Required
**Problem:** File:// URLs don't work with ES6 modules
**Solutions:**
```bash
# Python
python -m http.server 8000

# Node.js
npx serve .

# PHP
php -S localhost:8000
```

### CORS Issues
**Problem:** Cross-origin resource sharing errors
**Solution:** Always use a proper web server, not file:// protocol

### Cache Issues
**Problem:** Old versions of files being loaded
**Solution:** Hard refresh with Ctrl+F5 or clear browser cache

## Performance Optimization

### Recommended Limits
- **Objects:** Keep under 100 for smooth performance
- **Browser tabs:** Close unnecessary tabs
- **System RAM:** 4GB+ recommended
- **Graphics:** Dedicated GPU preferred

### Performance Monitoring
1. Open browser Task Manager (Shift+Esc in Chrome)
2. Monitor memory usage of the tab
3. Check frame rate in browser dev tools
4. Use browser's performance profiler for detailed analysis

## Getting Help

### Information to Collect
When reporting issues, please provide:
1. **Browser and version** (e.g., Chrome 120.0.6099.109)
2. **Operating system** (e.g., Windows 11, macOS 14)
3. **Console errors** (F12 > Console tab)
4. **WebGL report** from webglreport.com
5. **Steps to reproduce** the issue

### Console Commands for Debugging
Open browser console (F12) and try:
```javascript
// Check if Three.js is loaded
console.log(THREE);

// Check if toolkit is initialized
console.log(window.toolkit);

// Check WebGL context
const canvas = document.getElementById('viewport3d');
const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
console.log('WebGL context:', gl);

// Check canvas dimensions
console.log('Canvas size:', canvas.clientWidth, 'x', canvas.clientHeight);
```

### Emergency Reset
If the application becomes unresponsive:
1. **Refresh page** (F5 or Ctrl+F5)
2. **Clear browser cache** for the site
3. **Restart browser** completely
4. **Try incognito/private mode** to rule out extensions

## Known Limitations

### Mobile Devices
- **Limited support** - desktop recommended
- **Touch controls** may not work perfectly
- **Performance** may be poor on older devices
- **WebGL support** varies by device

### Large Scenes
- **Memory usage** increases with object count
- **Performance degradation** with 100+ objects
- **Export/import** may be slow for complex scenes

### Browser Extensions
- **Ad blockers** may interfere with CDN resources
- **Privacy extensions** may block external scripts
- **Developer tools** may affect performance

---

**If none of these solutions work, the issue may be with your specific system configuration. Try the application on a different device or browser to isolate the problem.**