# LivePreview - 实时窗口预览工具

## 简介

LivePreview 是一个 Windows 桌面小工具，可以将任意运行中的窗口以实时缩略图的形式显示在一个可移动、可置顶的浮动窗口中。使用 Windows DWM (Desktop Window Manager) 硬件加速缩略图 API，零 CPU 开销，实时刷新。

## 系统要求

- Windows 7 / 8 / 10 / 11（需要开启 DWM 桌面合成，现代 Windows 默认开启）
- PowerShell 5.1（Windows 自带，无需额外安装）
- **无需任何第三方依赖**

## 使用方法

双击 `LivePreview.bat` 即可启动。

或在 PowerShell 中运行：
```powershell
powershell -ExecutionPolicy Bypass -File LivePreview.ps1
```

## 功能

| 操作 | 方式 |
|------|------|
| 选择监控窗口 | 点击放大镜按钮 或 右键标题栏 或 `Ctrl+W` |
| 新建实例 | 点击 `+` 按钮 或 `Ctrl+N`（可同时监控多个窗口） |
| 置顶 | 点击图钉按钮 或 `Ctrl+T` |
| 移动窗口 | 拖拽标题栏 |
| 调整大小 | 拖拽窗口边缘/角落 |
| 恢复迷你尺寸 | 双击标题栏 |
| 关闭 | 点击 X 或 `Esc` |

## 自动隐藏标题栏

当鼠标离开预览窗口时，标题栏自动隐藏，窗口自动调整为精确匹配源窗口比例的纯画面显示（无黑边）。鼠标移入时标题栏恢复。

## 技术原理

使用 `DwmRegisterThumbnail` / `DwmUpdateThumbnailProperties` API — 与 Windows 任务栏悬停预览使用相同的硬件加速合成技术，GPU 直接渲染，不截屏、不录制。

---

# LivePreview - Live Window Preview Tool

## About

LivePreview is a Windows desktop utility that displays a live thumbnail of any running window in a floating, movable, always-on-top overlay. It uses the Windows DWM (Desktop Window Manager) hardware-accelerated Thumbnail API with zero CPU capture overhead.

## Requirements

- Windows 7 / 8 / 10 / 11 (DWM desktop composition must be enabled — default on modern Windows)
- PowerShell 5.1 (built into Windows, no extra installation needed)
- **No third-party dependencies required**

## How to Run

Double-click `LivePreview.bat` to launch.

Or run in PowerShell:
```powershell
powershell -ExecutionPolicy Bypass -File LivePreview.ps1
```

## Features

| Action | How |
|--------|-----|
| Select window to monitor | Click magnifier button, right-click title bar, or `Ctrl+W` |
| New instance | Click `+` button or `Ctrl+N` (monitor multiple windows simultaneously) |
| Pin on top | Click pin button or `Ctrl+T` |
| Move | Drag the title bar |
| Resize | Drag window edges/corners |
| Snap to mini size | Double-click title bar |
| Close | Click X or `Esc` |

## Auto-hide Title Bar

When the cursor leaves the preview window, the title bar automatically hides and the window resizes to exactly match the source window's aspect ratio (no black bars — pure content). Move the cursor back in to restore the title bar.

## How It Works

Uses `DwmRegisterThumbnail` / `DwmUpdateThumbnailProperties` API — the same hardware-accelerated compositing technology used by the Windows taskbar hover previews. GPU-rendered, no screen capture, no recording.
