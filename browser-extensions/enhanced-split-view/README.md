# Enhanced Split View for Chrome

This userscript syncs navigation between two Chrome tabs: a **Source** and a **Target**. 

While originally designed to supercharge Chrome's native Side-by-Side "Split View", it functions perfectly with **any two individual Chrome tabs or windows** (e.g., dual monitors, separate windows side-by-side), allowing you to click links in one and view them in the other.

## Changelogs

### v1.0.2
- Added a Tampermonkey menu entry for **Reset Roles** (with confirmation) to clear all Source/Target roles across tabs.
- Removed the **Disconnect** item from the Tampermonkey menu to reduce misclick risk; the badge menu remains for per-tab actions.
- Auto-collapse the S/T contextual menu when the mouse leaves the UI area.

### v1.0.1
- Added a context menu to the 'S' and 'T' icons for better control.
- **Revoke**: Disconnects a single tab (either Source or Target) from the pair, allowing for more flexible control when managing multiple tab pairs.

## Features
1. **Source Creation**: Hold `CTRL` (by default) and **Middle-click** anywhere on a page to mark it as the **SOURCE** (S).
2. **Easy Pairing (Drag & Drop)**: Once you have a Source, click and hold the "S" icon, drag it, and release. The script will automatically pair with the other currently visible tab (the **TARGET**).
3. **Link Syncing**: Any link clicked in the Source tab automatically opens in the Target tab.
4. **Hotkey Customization**: Assign dedicated shortcut combos via the script configuration panel.
5. **Flexible Layouts**: Works with Chrome's native Split View, two separate windows, or dual monitors.

## How it Works
![chrome_split_view_preview](https://github.com/user-attachments/assets/cb101a97-e580-412f-9844-1cb3befa3e3b)

## Installation
1. Install a userscript manager like [Tampermonkey](https://www.tampermonkey.net) or Violentmonkey.
2. Create a new script and copy/paste the code from `enhanced-split-view-for-chrome.user.js` in this repository.
3. Save the script.

## Usage Guide
### 1. Set Up Your View
Open the two pages you want to use.
*   **Split View**: Use Chrome's native tiling if supported.
*   **Separate Windows**: Simply put two browser windows side-by-side.
    <br><img width="283" height="142" alt="image" src="https://github.com/user-attachments/assets/13fc0fae-485d-4934-aead-7fced7c3bbed" /></br>

### 2. Activate Source
In your main window, hold `CTRL` and click the **Middle Mouse Button**. A floating **S** icon will appear on the right side.
*   *Note: You can configure this shortcut in the menu.*

### 3. Activate Target
Ensure your desired Target tab/window is visible (not minimized).
*   **Drag Method**: Click and hold the **S** icon on the Source page, drag it slightly (mimicking a drag to the other side), and release. The other visible tab will detect the signal and become the **TARGET** (marked with a **T** icon).
*   **Manual Method**: If drag-pairing doesn't trigger, you can use the Tampermonkey menu command "STM: Create Source" in one tab and assign the other manually if needed (though the script is designed to auto-discover the target via the storage signal).

### 4. Browse
Click any link in the **Source** tab. It will automatically load in the **Target** tab.

## Configuration
You can customize the creation shortcuts by selecting **STM: Configure Keys** from the Tampermonkey menu.