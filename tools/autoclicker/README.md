# MacroTool — PID-targeted keyboard/mouse macro recorder

**Records** a series of keyboard and mouse actions, then **replays** them
against a specific process (by PID) with optional delay / repeat scheduling.

Two implementations are included:

| Version              | File                     | Requirements                          |
|----------------------|--------------------------|---------------------------------------|
| **PowerShell (zero-install)** | `MacroTool.ps1` | Nothing — built-in Windows PowerShell 5.1+ |
| Python               | `macro_tool/` package    | Python 3.10+, `pip install -r requirements.txt` |

---

## Visual console (recommended, no installation)

A point-and-click UI built in HTML/CSS/JS, hosted by Windows' built-in
`mshta.exe`, with `MacroTool.ps1` doing the work. **No dependencies** — nothing
to install.

- Double-click **`Launch-Console.bat`**, or double-click `MacroTool.hta` directly.
  The launcher first runs an **environment check** (OS, PowerShell 5.1+, Win32
  interop, `mshta.exe`, writable macros folder) and only opens the console if it
  passes. You can run the check on its own with:
  `powershell -NoProfile -ExecutionPolicy Bypass -File .\MacroTool.ps1 checkenv`
- Pick the program you started from a list of open windows (friendly names
  like "Google Chrome", "Nexon Launcher client") &mdash; click a row to select
  it. The PID is resolved automatically; no PID hunting.
- Record a macro (a recorder window opens; press **F9** to stop).
- Pick a macro, set delay/repeat/interval/speed, and play against the PID.
- A status log shows what's happening.

Note: the HTA renders with the built-in legacy (Trident/MSHTML) engine, so the
styling uses classic CSS. This is a rendering constraint, not a dependency — a
modern browser engine (WebView2) would need a separate runtime and is not used.

---

## PowerShell version (no installation required)

Pure PowerShell + Win32 P/Invoke. No Python, no pip, no dependencies.

```powershell
cd tools\autoclicker

# List open program windows (friendly name + title + PID) - pick what you started
powershell -NoProfile -ExecutionPolicy Bypass -File .\MacroTool.ps1 windows
# ...optionally filter:
powershell -NoProfile -ExecutionPolicy Bypass -File .\MacroTool.ps1 windows -ProcName chrome

# (advanced) list raw processes / PIDs by name
powershell -NoProfile -ExecutionPolicy Bypass -File .\MacroTool.ps1 pids -ProcName notepad

# Record (press F9 to stop). -NoMove skips mouse-move capture.
powershell -NoProfile -ExecutionPolicy Bypass -File .\MacroTool.ps1 record -Name login

# Replay against PID 12345: wait 5s, run 3 times, 10s apart
powershell -NoProfile -ExecutionPolicy Bypass -File .\MacroTool.ps1 play -Name login -TargetPid 12345 -Delay 5 -Repeat 3 -Interval 10

# List saved macros
powershell -NoProfile -ExecutionPolicy Bypass -File .\MacroTool.ps1 list
```

PowerShell parameters for `play`: `-TargetPid`, `-Delay`, `-Repeat` (0 = infinite),
`-Interval`, `-Speed`. Press **Esc** to abort playback; **F9** stops recording.

How it works: recording polls input state (`GetAsyncKeyState` + `GetCursorPos`)
at ~120 Hz — no message pump needed. Playback uses `SendInput` with absolute
mouse coordinates. PID targeting enumerates windows (`EnumWindows`), matches the
process id, and focuses via `AttachThreadInput` + `SetForegroundWindow`.

---

## Python version

```powershell
cd tools\autoclicker
pip install -r requirements.txt
```

Requires Python 3.10+ on Windows. Dependencies: `pynput`, `pywin32`, `psutil`.

## Usage

All commands are run as a module from the `tools\autoclicker` directory:

```powershell
python -m macro_tool.cli <command> [options]
```

### 1. Record a macro

```powershell
python -m macro_tool.cli record --name login-sequence
```

- Perform your keyboard/mouse actions.
- Press **F9** to stop; events are saved to `macros\login-sequence.json`.
- Add `--no-move` to skip recording mouse movement (smaller files, only
  clicks/scrolls/keys are captured).

### 2. Find the target PID

```powershell
python -m macro_tool.cli pids --name notepad
```

```
     PID  PROCESS                    WINDOW TITLE
   12345  notepad.exe                Untitled - Notepad
```

(You can also read the PID from Task Manager > Details.)

### 3. Replay against the PID

```powershell
python -m macro_tool.cli play --name login-sequence --pid 12345 `
    --delay 10 --repeat 5 --interval 30 --speed 1.0
```

| Option        | Meaning                                             |
|---------------|-----------------------------------------------------|
| `--pid`       | Target process id (its window is focused first)     |
| `--delay`     | Seconds to wait before the first run                |
| `--repeat`    | Number of runs; `0` = loop forever                  |
| `--interval`  | Seconds between runs                                |
| `--speed`     | Playback speed multiplier (2.0 = twice as fast)     |
| `--abort-key` | Key to cancel playback (default `esc`)              |

Before every run the target window is re-focused. Press **Esc** (or your
`--abort-key`) at any time to stop.

### 4. List saved macros

```powershell
python -m macro_tool.cli list
```

## How it works

- **Recording** uses global `pynput` listeners; mouse moves are throttled to
  ~30 Hz. Events store a relative timestamp `t` (seconds) so natural timing is
  preserved on playback.
- **PID targeting** enumerates top-level windows (`EnumWindows`) and matches
  the process id, then brings the window to the foreground using
  `AttachThreadInput` + `SetForegroundWindow` to work around Windows focus
  restrictions.
- **Playback** replays events through `pynput` controllers, sleeping to match
  the recorded timing.

## Caveats / limitations

- **Foreground injection**: the target window must be focusable. DirectX
  exclusive-fullscreen games may ignore synthesized input.
- **Privileges**: to drive an elevated (admin) application, run this tool
  elevated too. Windows blocks input from lower to higher integrity processes.
- **Absolute coordinates**: clicks are recorded in absolute screen pixels.
  Replay assumes the same screen resolution and window position as when
  recorded. If the window moves/resizes, coordinates will be off.
  (A future enhancement is to record coordinates relative to the target
  window's client rect.)

## Macro file format

See `macro_tool/macro.py` for the JSON schema. Files live in `macros\`.
