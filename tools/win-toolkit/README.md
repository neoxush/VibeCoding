# win-toolkit — Live Preview + Macro Automation for Windows

A zero-dependency Windows toolkit that combines two features into one:

1. **Live Preview** — a floating, always-on-top live thumbnail of any running
   window (hardware-accelerated DWM Thumbnail API, no screen capture).
2. **Automate** — record keyboard/mouse macros and replay them against the
   window you are previewing (by PID/HWND), with delay/repeat scheduling and
   multiple playback modes.

Both are driven by built-in Windows PowerShell 5.1 + Win32 APIs. **No installs,
no pip, no drivers.**

---

## Requirements

- Windows 7 / 8 / 10 / 11 (DWM desktop composition enabled — default on modern Windows)
- PowerShell 5.1 (built into Windows)
- No third-party dependencies

---

## Quick start

Double-click **`Launch-Toolkit.bat`**. It runs an environment check, then opens
Live Preview. Use the toolbar to pick a window; click the **▶ Automate** button
in the title bar to record/play macros against it.

Alternatively:
- `LivePreview.bat` — launch Live Preview directly.
- `Launch-Console.bat` — launch the standalone **MacroTool console** (HTA), an
  alternative UI for the automation features without the live preview.

---

## Live Preview + Automate

Live Preview shows a real-time thumbnail of any window in a movable, resizable,
pin-to-top overlay.

| Action | How |
|--------|-----|
| Select window to monitor | Magnifier button, right-click title bar, or `Ctrl+W` |
| New instance | `+` button or `Ctrl+N` (monitor multiple windows at once) |
| Scale size | `1x` button or `Ctrl+S` (cycles 1x/2x/3x/4x) |
| Pin on top | Pin button or `Ctrl+T` |
| **Automate this window** | **▶ button in the title bar** |
| Move | Drag the title bar |
| Resize | Drag edges/corners |
| Close | X or `Esc` |

### The Automate flyout
Clicking **▶** opens a panel docked under the title bar that targets the exact
window currently being previewed (no separate window picker needed):

- **Macro** — pick a saved macro (dropdown).
- **Delay / Repeat / Interval / Speed** — scheduling.
- **Playback mode** — Foreground / Flash-restore / Background (see below).
- **Record** — capture a new macro (press **F9** to stop).
- **Play** — replay against the previewed window.
- **Stop** — abort a running job (also sends Esc).
- **📁** — open the macro folder.
- A status line streams the job output live.

Because you are watching the target in the preview, you can see the macro run in
real time.

---

## Playback modes

| Mode | Behaviour | Works with |
|------|-----------|-----------|
| **Foreground** | Brings target to front, injects real input (SendInput). | Everything — most reliable |
| **Flash-restore** | Focuses target briefly, injects real input, then restores focus to your window. | Everything (games, Chromium, context menus); small flicker |
| **Background** | Posts messages without focusing (PostMessage). No flicker. | Classic Win32 apps only; games/DirectX/Chromium/context menus ignore it |

Press **Esc** at any time to abort playback.

---

## CLI reference (`MacroTool.ps1`)

```powershell
# Environment check
powershell -NoProfile -ExecutionPolicy Bypass -File .\MacroTool.ps1 checkenv

# List open program windows (friendly name + title + PID)
... .\MacroTool.ps1 windows [-ProcName chrome]

# Record (F9 to stop)
... .\MacroTool.ps1 record -Name mymacro [-NoMove]

# Play against a PID or exact window handle
... .\MacroTool.ps1 play -Name mymacro -TargetPid 12345 -Delay 3 -Repeat 5 [-FlashRestore | -Background]
... .\MacroTool.ps1 play -Name mymacro -TargetHwnd 0x1234 ...

# List saved macros
... .\MacroTool.ps1 list
```

---

## How it works

- **Live Preview**: `DwmRegisterThumbnail` / `DwmUpdateThumbnailProperties` — the
  same GPU-composited technology as taskbar hover previews. No screen capture.
- **Recording**: polls input state (`GetAsyncKeyState` / `GetCursorPos`).
- **Playback**: `SendInput` (foreground/flash) or `PostMessage` (background),
  with window-relative coordinate mapping.
- **Window targeting**: `EnumWindows` + friendly-name resolution
  (FileDescription → window title → process name).

---

## Optional Python version

`macro_tool/` contains an alternative Python implementation of the automation
engine (`pip install -r requirements.txt`; needs `pynput`, `pywin32`, `psutil`).
Not required for the PowerShell toolkit.

---

## Non-goals

- **Controller/gamepad emulation** — Windows has no built-in API to synthesize
  virtual gamepad input; it would require a signed kernel driver (ViGEmBus/vJoy),
  which breaks the zero-dependency guarantee. Intentionally excluded.
- **Webpage/DOM automation** — would require a browser extension, CDP debug port,
  or a heavy runtime (Playwright/Selenium). Out of scope.
