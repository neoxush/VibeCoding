# Enhanced Split View for Chrome

This userscript syncs navigation between two Chrome tabs: a **Source** and a **Target**. 

While originally designed to supercharge Chrome's native Side-by-Side "Split View", it functions perfectly with **any two individual Chrome tabs or windows** (e.g., dual monitors, separate windows side-by-side), allowing you to click links in one and view them in the other.

## Changelogs

### v1.0.3
- **Improved Drag-and-Drop Accuracy**: Implemented a cross-tab bidding system to prevent overlapping windows from both claiming a role.
- **Focus-Aware Bidding**: Tabs now track interaction (clicks/focus) to ensure the "top-most" window wins the role assignment.
- **Debug Logging**: Added console logging for bidding conflicts to help troubleshoot complex window layouts.

### v1.0.2
- Added a Tampermonkey menu entry for **Reset Roles** (with confirmation) to clear all Source/Target roles across tabs.
- Removed the **Disconnect** item from the Tampermonkey menu to reduce misclick risk; the badge menu remains for per-tab actions.
- Auto-collapse the S/T contextual menu when the mouse leaves the UI area.
- Improved state persistence using GM_saveTab API for more reliable tab state management.
- Enhanced drag-and-drop pairing with screen coordinate detection for more accurate tab pairing.
- Added configurable mouse shortcuts with visual configuration panel.

### v1.0.1
- Added a context menu to the 'S' and 'T' icons for better control.
- **Revoke**: Disconnects a single tab (either Source or Target) from the pair, allowing for more flexible control when managing multiple tab pairs.

## Features
1. **Source Creation**: Hold `CTRL` + **Middle-click** (default) anywhere on a page to mark it as the **SOURCE** (S).
2. **Target Creation**: Hold `ALT` + **Middle-click** (default) to mark current tab as **TARGET** (T) and connect to the most recent Source.
3. **Easy Pairing (Drag & Drop)**: Once you have a Source, click and hold the "S" icon, drag it, and release. The script will automatically pair with the other currently visible tab (the **TARGET**).
4. **Link Syncing**: Any link clicked in the Source tab automatically opens in the Target tab.
5. **Visual Interface**: Floating "S" (Source) and "T" (Target) indicators with context menus for control.
6. **Hotkey Customization**: Fully configurable mouse shortcuts via the visual configuration panel.
7. **Flexible Layouts**: Works with Chrome's native Split View, two separate windows, or dual monitors.
8. **Group Management**: Multiple Source tabs can be grouped together, with Targets joining existing groups.
9. **State Persistence**: Tab roles and connections survive page refreshes and navigation changes.
10. **Context Menu Controls**: Right-click on S/T indicators for options like Revoke, Disconnect, and Join as Source.

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
In your main window, hold `CTRL` + **Middle Mouse Button** (default). A floating **S** icon will appear on the right side.
*   *Note: You can configure this shortcut by selecting "Configure Keys" from the Tampermonkey menu.*

### 3. Activate Target
Ensure your desired Target tab/window is visible (not minimized).
*   **Drag Method**: Click and hold the **S** icon on the Source page, drag it slightly, and release. The other visible tab will detect the signal and become the **TARGET** (marked with a **T** icon on the left side).
*   **Manual Method**: Hold `ALT` + **Middle Mouse Button** (default) in any tab to make it a Target connected to the most recent Source.
*   **Join Existing Group**: Use the "Join as Source" option from the S/T context menu to add additional Source tabs to an existing group.

### 4. Browse
Click any link in the **Source** tab. It will automatically load in the **Target** tab.

### 5. Manage Connections
- **Revoke**: Right-click the S/T indicator and select "Revoke" to disconnect just this tab.
- **Disconnect**: Right-click the S/T indicator and select "Disconnect" to break the connection between both tabs.
- **Reset All**: Use "Reset Roles" from the Tampermonkey menu to clear all connections across all tabs.

## Configuration
You can customize the mouse shortcuts by selecting **Configure Keys** from the Tampermonkey menu:
- **Source Key**: Default is `CTRL` + `Middle Mouse Button`
- **Target Key**: Default is `ALT` + `Middle Mouse Button`
- Both support Left (0), Middle (1), and Right (2) mouse buttons with Ctrl/Alt/Shift modifiers.

## Tampermonkey Menu Commands
- **Create Source**: Manually set current tab as a Source
- **Configure Keys**: Open the visual configuration panel
- **Reset Roles**: Clear all Source/Target connections across all tabs
