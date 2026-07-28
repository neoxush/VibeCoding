<#
.SYNOPSIS
    LivePreview - A live window preview tool for Windows.
    Shows a real-time DWM thumbnail of any running window in a floating, movable, pin-to-top overlay.

.DESCRIPTION
    Features:
    - Live hardware-accelerated window preview (DWM Thumbnail API)
    - Drag to move anywhere on screen
    - Resize by dragging edges/corners
    - Pin to stay always-on-top
    - Adjustable opacity (click opacity button to cycle)
    - Window picker with search/filter
    - Double-click title bar to snap to mini size (compact monitoring view)
    - Right-click title bar to pick a new window

.NOTES
    Requires Windows Vista+ with Desktop Window Manager enabled (default on modern Windows).
    Run with: powershell -ExecutionPolicy Bypass -File LivePreview.ps1
#>

# ============================================================
# Console Information - Do Not Close This Window
# ============================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Write-Host ""
Write-Host "  ============================================================" -ForegroundColor DarkCyan
Write-Host "    LivePreview(win) - Live Window Preview Tool" -ForegroundColor Cyan
Write-Host "  ============================================================" -ForegroundColor DarkCyan
Write-Host ""
Write-Host "  [!] This window keeps the LivePreview function alive." -ForegroundColor Yellow
Write-Host "      Do NOT close this window, or the preview will stop." -ForegroundColor Yellow
Write-Host ""
Write-Host "  [!] 此窗口用于保持 LivePreview 实时预览功能运行。" -ForegroundColor Yellow
Write-Host "      请勿关闭此窗口，否则预览将停止工作。" -ForegroundColor Yellow
Write-Host ""
Write-Host "  ============================================================" -ForegroundColor DarkCyan
Write-Host ""

# ============================================================
# Environment & System Pre-check
# ============================================================
$script:checksPassed = $true
$script:checkErrors = @()

# 1. Check OS - Windows Vista (6.0) or later required for DWM Thumbnail API
$osVersion = [System.Environment]::OSVersion
if ($osVersion.Platform -ne [System.PlatformID]::Win32NT) {
    $script:checkErrors += "This tool only runs on Windows (requires Win32NT platform)."
    $script:checksPassed = $false
}
elseif ($osVersion.Version.Major -lt 6) {
    $script:checkErrors += "Windows Vista or later is required (detected: $($osVersion.VersionString)). DWM Thumbnail API is not available."
    $script:checksPassed = $false
}

# 2. Check if Desktop Window Manager (DWM) service is running
try {
    $dwmService = Get-Service -Name "uxsms" -ErrorAction Stop
    if ($dwmService.Status -ne "Running") {
        $script:checkErrors += "Desktop Window Manager service (uxsms) is not running. DWM is required for live thumbnails."
        $script:checksPassed = $false
    }
} catch {
    # On Windows 8+, DWM cannot be disabled, so missing service check is acceptable
    if ([System.Environment]::OSVersion.Version.Major -lt 6 -or
        ([System.Environment]::OSVersion.Version.Major -eq 6 -and [System.Environment]::OSVersion.Version.Minor -lt 2)) {
        $script:checkErrors += "Cannot verify Desktop Window Manager service. DWM may not be available."
        $script:checksPassed = $false
    }
}

# 3. Check PowerShell version (need 3.0+ for reliable WPF support)
if ($PSVersionTable.PSVersion.Major -lt 3) {
    $script:checkErrors += "PowerShell 3.0 or later is required (detected: $($PSVersionTable.PSVersion)). Please update PowerShell."
    $script:checksPassed = $false
}

# 4. Check required .NET assemblies are loadable
$requiredAssemblies = @("PresentationFramework", "PresentationCore", "WindowsBase", "System.Windows.Forms")
foreach ($asm in $requiredAssemblies) {
    try {
        [void][System.Reflection.Assembly]::LoadWithPartialName($asm)
        if (-not ([System.AppDomain]::CurrentDomain.GetAssemblies() | Where-Object { $_.GetName().Name -eq $asm })) {
            throw "Assembly not found"
        }
    } catch {
        $script:checkErrors += "Required .NET assembly '$asm' is not available. Ensure .NET Framework 3.5+ or .NET Desktop Runtime is installed."
        $script:checksPassed = $false
    }
}

# 5. Check DWM composition is enabled (relevant for Vista/7 where it can be disabled)
if ($script:checksPassed) {
    try {
        Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class DwmCheck {
    [DllImport("dwmapi.dll")]
    public static extern int DwmIsCompositionEnabled(out bool enabled);
}
"@ -ErrorAction Stop
        $compositionEnabled = $false
        $hr = [DwmCheck]::DwmIsCompositionEnabled([ref]$compositionEnabled)
        if ($hr -eq 0 -and -not $compositionEnabled) {
            $script:checkErrors += "DWM Desktop Composition is disabled. Please enable Aero theme or Desktop Composition in system settings."
            $script:checksPassed = $false
        }
    } catch {
        # If we can't check, dwmapi.dll might not be available at all
        $script:checkErrors += "Cannot load dwmapi.dll. DWM Thumbnail API may not be available on this system."
        $script:checksPassed = $false
    }
}

# Report results and exit if checks failed
if (-not $script:checksPassed) {
    Write-Host ""
    Write-Host "  [X] Environment check FAILED / 环境检查未通过" -ForegroundColor Red
    Write-Host "  ============================================================" -ForegroundColor Red
    foreach ($err in $script:checkErrors) {
        Write-Host "  - $err" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "  LivePreview cannot start. Please fix the issues above."
    Write-Host "  LivePreview 无法启动，请先解决以上问题。"
    Write-Host ""
    Write-Host "  Press any key to exit / 按任意键退出..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host "  [OK] Environment check passed / 环境检查通过" -ForegroundColor Green
Write-Host "  Starting LivePreview... / 正在启动 LivePreview..." -ForegroundColor Cyan
Write-Host ""

# ============================================================
# Main Program Start
# ============================================================
Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase
Add-Type -AssemblyName System.Windows.Forms

# P/Invoke definitions for DWM and Win32 APIs
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;

public struct RECT {
    public int Left, Top, Right, Bottom;
    public RECT(int l, int t, int r, int b) { Left=l; Top=t; Right=r; Bottom=b; }
}

public struct PSIZE {
    public int x, y;
}

[StructLayout(LayoutKind.Sequential)]
public struct DWM_THUMBNAIL_PROPERTIES {
    public int dwFlags;
    public RECT rcDestination;
    public RECT rcSource;
    public byte opacity;
    [MarshalAs(UnmanagedType.Bool)] public bool fVisible;
    [MarshalAs(UnmanagedType.Bool)] public bool fSourceClientAreaOnly;
}

public class NativeMethods {
    public const int DWM_TNP_RECTDESTINATION = 0x00000001;
    public const int DWM_TNP_RECTSOURCE      = 0x00000002;
    public const int DWM_TNP_OPACITY         = 0x00000004;
    public const int DWM_TNP_VISIBLE         = 0x00000008;
    public const int DWM_TNP_SOURCECLIENTAREAONLY = 0x00000010;

    public const int GWL_EXSTYLE = -20;
    public const int GW_OWNER = 4;
    public const int WS_EX_TOOLWINDOW = 0x00000080;
    public const int WS_EX_APPWINDOW  = 0x00040000;

    [DllImport("dwmapi.dll")]
    public static extern int DwmRegisterThumbnail(IntPtr dest, IntPtr src, out IntPtr thumb);

    [DllImport("dwmapi.dll")]
    public static extern int DwmUnregisterThumbnail(IntPtr thumb);

    [DllImport("dwmapi.dll")]
    public static extern int DwmQueryThumbnailSourceSize(IntPtr thumb, out PSIZE size);

    [DllImport("dwmapi.dll")]
    public static extern int DwmUpdateThumbnailProperties(IntPtr thumb, ref DWM_THUMBNAIL_PROPERTIES props);

    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern int GetWindowTextLength(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    [DllImport("user32.dll")]
    public static extern IntPtr GetWindow(IntPtr hWnd, uint uCmd);

    [DllImport("user32.dll")]
    public static extern int GetWindowLong(IntPtr hWnd, int nIndex);

    [DllImport("user32.dll")]
    public static extern IntPtr GetShellWindow();

    [DllImport("user32.dll")]
    public static extern bool IsIconic(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    public static List<KeyValuePair<IntPtr, string>> GetVisibleWindows(IntPtr excludeHandle) {
        var windows = new List<KeyValuePair<IntPtr, string>>();
        IntPtr shell = GetShellWindow();

        EnumWindows((hWnd, lParam) => {
            if (!IsWindowVisible(hWnd)) return true;
            if (hWnd == shell) return true;
            if (hWnd == excludeHandle) return true;

            int exStyle = GetWindowLong(hWnd, GWL_EXSTYLE);
            if ((exStyle & WS_EX_TOOLWINDOW) != 0 && (exStyle & WS_EX_APPWINDOW) == 0)
                return true;

            int titleLen = GetWindowTextLength(hWnd);
            if (titleLen == 0) return true;

            IntPtr owner = GetWindow(hWnd, GW_OWNER);
            if (owner != IntPtr.Zero && (exStyle & WS_EX_APPWINDOW) == 0)
                return true;

            var sb = new StringBuilder(titleLen + 1);
            GetWindowText(hWnd, sb, sb.Capacity);

            windows.Add(new KeyValuePair<IntPtr, string>(hWnd, sb.ToString()));
            return true;
        }, IntPtr.Zero);

        windows.Sort((a, b) => string.Compare(a.Value, b.Value, StringComparison.OrdinalIgnoreCase));
        return windows;
    }
}
"@ -ReferencedAssemblies @()

# ============================================================
# XAML for the Main Window
# ============================================================
[xml]$MainXaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Live Preview"
        Width="320" Height="210"
        MinWidth="160" MinHeight="120"
        WindowStyle="None"
        AllowsTransparency="True"
        Background="Transparent"
        ResizeMode="CanResizeWithGrip"
        ShowInTaskbar="True">
    <Border Name="OuterBorder" Background="#E0222222" CornerRadius="6" BorderBrush="#555555" BorderThickness="1">
        <Grid>
            <Grid.RowDefinitions>
                <RowDefinition Height="Auto"/>
                <RowDefinition Height="*"/>
            </Grid.RowDefinitions>

            <!-- Title Bar (auto-hides when mouse leaves window) -->
            <Border Grid.Row="0" Background="#E0333333" CornerRadius="6,6,0,0" Name="TitleBar" Height="28">
                <Grid>
                    <Grid.ColumnDefinitions>
                        <ColumnDefinition Width="*"/>
                        <ColumnDefinition Width="Auto"/>
                    </Grid.ColumnDefinitions>

                    <TextBlock Grid.Column="0" Name="TitleText"
                               Text="  Live Preview - Right-click to select window"
                               Foreground="#CCCCCC" FontSize="11"
                               VerticalAlignment="Center" Margin="6,0,0,0"
                               TextTrimming="CharacterEllipsis"/>

                    <StackPanel Grid.Column="1" Orientation="Horizontal" Margin="0,2,4,2">
                        <Button Name="BtnSelect" Content="&#x1F50D;" ToolTip="Select Window (Ctrl+W)"
                                Width="26" Height="20" FontSize="10"
                                Background="Transparent" Foreground="#CCCCCC" BorderThickness="0" Cursor="Hand"/>
                        <Button Name="BtnNew" Content="&#x2795;" ToolTip="New Instance (Ctrl+N)"
                                Width="26" Height="20" FontSize="10"
                                Background="Transparent" Foreground="#CCCCCC" BorderThickness="0" Cursor="Hand"/>
                        <Button Name="BtnPin" Content="&#x1F4CC;" ToolTip="Pin on Top (Ctrl+T)"
                                Width="26" Height="20" FontSize="10"
                                Background="Transparent" Foreground="#CCCCCC" BorderThickness="0" Cursor="Hand"/>
                        <Button Name="BtnClose" Content="&#x2715;" ToolTip="Close"
                                Width="26" Height="20" FontSize="10"
                                Background="Transparent" Foreground="#CCCCCC" BorderThickness="0" Cursor="Hand"/>
                    </StackPanel>
                </Grid>
            </Border>

            <!-- Preview Area -->
            <Border Grid.Row="1" Name="PreviewBorder" Background="#FF111111" CornerRadius="0,0,6,6" ClipToBounds="True">
                <TextBlock Name="PlaceholderText"
                           Text="Right-click title bar or click the magnifying glass to select a window to preview"
                           Foreground="#888888" FontSize="12"
                           HorizontalAlignment="Center" VerticalAlignment="Center"
                           TextWrapping="Wrap" TextAlignment="Center" Margin="20"/>
            </Border>
        </Grid>
    </Border>
</Window>
"@

# ============================================================
# XAML for the Window Picker
# ============================================================
[xml]$PickerXaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Select Window to Preview"
        Width="460" Height="420"
        WindowStartupLocation="CenterOwner"
        Background="#222222"
        ResizeMode="CanResize">
    <Grid Margin="10">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>

        <Grid Grid.Row="0" Margin="0,0,0,8">
            <Grid.ColumnDefinitions>
                <ColumnDefinition Width="*"/>
                <ColumnDefinition Width="Auto"/>
            </Grid.ColumnDefinitions>
            <TextBox Name="SearchBox" Grid.Column="0"
                     Background="#333333" Foreground="#EEEEEE"
                     BorderBrush="#555555" Padding="6,4" FontSize="12"/>
            <Button Name="BtnRefresh" Grid.Column="1" Content="Refresh" Margin="6,0,0,0"
                    Padding="10,4" Background="#444444" Foreground="#CCCCCC" BorderBrush="#666666"/>
        </Grid>

        <ListBox Name="WindowList" Grid.Row="1"
                 Background="#1A1A1A" BorderBrush="#555555"
                 Foreground="#EEEEEE" FontSize="12"/>

        <StackPanel Grid.Row="2" Orientation="Horizontal" HorizontalAlignment="Right" Margin="0,8,0,0">
            <Button Name="BtnOk" Content="OK" Width="80" Height="28" Margin="0,0,8,0"
                    IsEnabled="False" Background="#0078D4" Foreground="White" BorderBrush="#0078D4"/>
            <Button Name="BtnCancel" Content="Cancel" Width="80" Height="28"
                    Background="#444444" Foreground="#CCCCCC" BorderBrush="#666666"/>
        </StackPanel>
    </Grid>
</Window>
"@

# ============================================================
# Global State & Helpers
# ============================================================
$script:firstTargetSet  = $false
$script:openWindowCount = 0
$script:MINI_WIDTH  = 320
$script:MINI_HEIGHT = 210

# Console window helper for minimizing cmd.exe
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class ConsoleHelper {
    [DllImport("kernel32.dll")]
    public static extern IntPtr GetConsoleWindow();
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    public const int SW_MINIMIZE = 6;
    public static void MinimizeConsole() {
        IntPtr hwnd = GetConsoleWindow();
        if (hwnd != IntPtr.Zero) {
            ShowWindow(hwnd, SW_MINIMIZE);
        }
    }
}
"@

# ============================================================
# Per-Window Functions (operate on context stored in Window.Tag)
# ============================================================

function Get-Ctx($sender) {
    $wnd = [System.Windows.Window]::GetWindow($sender)
    if ($null -eq $wnd) { return $null }
    return $wnd.Tag
}

function Update-Thumbnail($ctx) {
    if ($null -eq $ctx -or $ctx.ThumbnailHandle -eq [IntPtr]::Zero) { return }
    $wnd = $ctx.Window
    $previewBorder = $ctx.PreviewBorder

    $sourceSize = New-Object PSIZE
    $hr = [NativeMethods]::DwmQueryThumbnailSourceSize($ctx.ThumbnailHandle, [ref]$sourceSize)
    if ($hr -ne 0) { return }

    $point = $previewBorder.TranslatePoint([System.Windows.Point]::new(0, 0), $wnd)
    $source = [System.Windows.PresentationSource]::FromVisual($wnd)
    $dpiX = 1.0; $dpiY = 1.0
    if ($null -ne $source) {
        $dpiX = $source.CompositionTarget.TransformToDevice.M11
        $dpiY = $source.CompositionTarget.TransformToDevice.M22
    }

    $destLeft   = [int]($point.X * $dpiX)
    $destTop    = [int]($point.Y * $dpiY)
    $destRight  = [int](($point.X + $previewBorder.ActualWidth) * $dpiX)
    $destBottom = [int](($point.Y + $previewBorder.ActualHeight) * $dpiY)

    $destWidth  = $destRight - $destLeft
    $destHeight = $destBottom - $destTop

    if ($sourceSize.y -gt 0 -and $destHeight -gt 0) {
        $sourceAspect = [double]$sourceSize.x / [double]$sourceSize.y
        $destAspect   = [double]$destWidth / [double]$destHeight
        if ($sourceAspect -gt $destAspect) {
            $newHeight = [int]($destWidth / $sourceAspect)
            $offset = [int](($destHeight - $newHeight) / 2)
            $destTop += $offset
            $destBottom = $destTop + $newHeight
        } else {
            $newWidth = [int]($destHeight * $sourceAspect)
            $offset = [int](($destWidth - $newWidth) / 2)
            $destLeft += $offset
            $destRight = $destLeft + $newWidth
        }
    }

    $props = New-Object DWM_THUMBNAIL_PROPERTIES
    $props.dwFlags = [NativeMethods]::DWM_TNP_RECTDESTINATION -bor [NativeMethods]::DWM_TNP_VISIBLE -bor [NativeMethods]::DWM_TNP_OPACITY -bor [NativeMethods]::DWM_TNP_SOURCECLIENTAREAONLY
    $props.rcDestination = New-Object RECT -ArgumentList $destLeft, $destTop, $destRight, $destBottom
    $props.fVisible = $true
    $props.fSourceClientAreaOnly = $false
    $props.opacity = 255
    [void][NativeMethods]::DwmUpdateThumbnailProperties($ctx.ThumbnailHandle, [ref]$props)
}

function Unregister-Thumbnail($ctx) {
    if ($null -eq $ctx) { return }
    if ($ctx.ThumbnailHandle -ne [IntPtr]::Zero) {
        [void][NativeMethods]::DwmUnregisterThumbnail($ctx.ThumbnailHandle)
        $ctx.ThumbnailHandle = [IntPtr]::Zero
    }
}

function Set-TargetWindow($ctx, [IntPtr]$Handle, [string]$Title) {
    Unregister-Thumbnail $ctx

    $ctx.TargetHandle = $Handle
    $ctx.TitleText.Text = "  $Title"
    $ctx.PlaceholderText.Visibility = [System.Windows.Visibility]::Collapsed

    $helper = [System.Windows.Interop.WindowInteropHelper]::new($ctx.Window)
    $thisHandle = $helper.Handle

    $thumbOut = [IntPtr]::Zero
    $hr = [NativeMethods]::DwmRegisterThumbnail($thisHandle, $Handle, [ref]$thumbOut)
    if ($hr -ne 0) {
        [System.Windows.MessageBox]::Show("Failed to register thumbnail. Error: 0x$($hr.ToString('X8'))`nThe target window may have been closed.", "Error")
        return
    }
    $ctx.ThumbnailHandle = $thumbOut
    Update-Thumbnail $ctx

    # Minimize cmd.exe on first target selection (any window)
    if (-not $script:firstTargetSet) {
        $script:firstTargetSet = $true
        [ConsoleHelper]::MinimizeConsole()
    }
}

function Show-WindowPicker($ctx) {
    $reader2 = [System.Xml.XmlNodeReader]::new($PickerXaml)
    $picker = [System.Windows.Markup.XamlReader]::Load($reader2)
    $picker.Owner = $ctx.Window

    $searchBox  = $picker.FindName("SearchBox")
    $windowList = $picker.FindName("WindowList")
    $btnOk2     = $picker.FindName("BtnOk")
    $btnCancel2 = $picker.FindName("BtnCancel")
    $btnRefresh = $picker.FindName("BtnRefresh")

    $script:_pickerWindows = $null
    $script:_pickerResult  = $null

    $refreshAction = {
        $helper = [System.Windows.Interop.WindowInteropHelper]::new($ctx.Window)
        $excludeHandle = $helper.Handle
        $script:_pickerWindows = [NativeMethods]::GetVisibleWindows($excludeHandle)
        $windowList.Items.Clear()
        foreach ($w in $script:_pickerWindows) {
            [void]$windowList.Items.Add($w.Value)
        }
    }

    & $refreshAction

    $searchBox.Add_TextChanged({
        $filter = $searchBox.Text.ToLowerInvariant().Trim()
        $windowList.Items.Clear()
        foreach ($w in $script:_pickerWindows) {
            if ([string]::IsNullOrEmpty($filter) -or $w.Value.ToLowerInvariant().Contains($filter)) {
                [void]$windowList.Items.Add($w.Value)
            }
        }
    })

    $btnRefresh.Add_Click({ & $refreshAction })

    $windowList.Add_SelectionChanged({
        $btnOk2.IsEnabled = ($windowList.SelectedIndex -ge 0)
    })

    $windowList.Add_MouseDoubleClick({
        if ($windowList.SelectedIndex -ge 0) {
            $selectedTitle = $windowList.SelectedItem.ToString()
            foreach ($w in $script:_pickerWindows) {
                if ($w.Value -eq $selectedTitle) {
                    $script:_pickerResult = $w
                    break
                }
            }
            $picker.DialogResult = $true
            $picker.Close()
        }
    })

    $btnOk2.Add_Click({
        if ($windowList.SelectedIndex -ge 0) {
            $selectedTitle = $windowList.SelectedItem.ToString()
            foreach ($w in $script:_pickerWindows) {
                if ($w.Value -eq $selectedTitle) {
                    $script:_pickerResult = $w
                    break
                }
            }
            $picker.DialogResult = $true
            $picker.Close()
        }
    })

    $btnCancel2.Add_Click({
        $picker.DialogResult = $false
        $picker.Close()
    })

    $searchBox.Focus() | Out-Null

    $result = $picker.ShowDialog()
    if ($result -eq $true -and $null -ne $script:_pickerResult) {
        Set-TargetWindow $ctx $script:_pickerResult.Key $script:_pickerResult.Value
    }
}

function Show-TitleBar($ctx) {
    if ($ctx.TitleBarVisible) { return }
    $ctx.TitleBarVisible = $true
    $ctx.TitleBar.Visibility = [System.Windows.Visibility]::Visible
    $ctx.PreviewBorder.CornerRadius = [System.Windows.CornerRadius]::new(0, 0, 6, 6)
    $ctx.Window.Height = $ctx.Window.Height + 28
    Update-Thumbnail $ctx
}

function Hide-TitleBar($ctx) {
    if (-not $ctx.TitleBarVisible) { return }
    $ctx.TitleBarVisible = $false
    $ctx.TitleBar.Visibility = [System.Windows.Visibility]::Collapsed
    $ctx.PreviewBorder.CornerRadius = [System.Windows.CornerRadius]::new(6)

    if ($ctx.ThumbnailHandle -ne [IntPtr]::Zero) {
        $sourceSize = New-Object PSIZE
        $hr = [NativeMethods]::DwmQueryThumbnailSourceSize($ctx.ThumbnailHandle, [ref]$sourceSize)
        if ($hr -eq 0 -and $sourceSize.x -gt 0 -and $sourceSize.y -gt 0) {
            $source = [System.Windows.PresentationSource]::FromVisual($ctx.Window)
            $dpiX = 1.0; $dpiY = 1.0
            if ($null -ne $source) {
                $dpiX = $source.CompositionTarget.TransformToDevice.M11
                $dpiY = $source.CompositionTarget.TransformToDevice.M22
            }
            $sourceAspect = [double]$sourceSize.x / [double]$sourceSize.y
            $contentWidth = $ctx.Window.Width - 2
            $exactHeight = $contentWidth / $sourceAspect
            $ctx.Window.Height = [Math]::Max($exactHeight + 2, 120)
        }
    } else {
        $ctx.Window.Height = [Math]::Max($ctx.Window.Height - 28, 120)
    }
    Update-Thumbnail $ctx
}

# ============================================================
# New-PreviewWindow: Creates an independent preview window
# ============================================================
function New-PreviewWindow {
    $reader = [System.Xml.XmlNodeReader]::new($MainXaml)
    $wnd = [System.Windows.Markup.XamlReader]::Load($reader)

    # Build per-window context (stored in Window.Tag)
    $ctx = @{
        Window          = $wnd
        TitleBar        = $wnd.FindName("TitleBar")
        TitleText       = $wnd.FindName("TitleText")
        BtnSelect       = $wnd.FindName("BtnSelect")
        BtnNew          = $wnd.FindName("BtnNew")
        BtnPin          = $wnd.FindName("BtnPin")
        BtnClose        = $wnd.FindName("BtnClose")
        PreviewBorder   = $wnd.FindName("PreviewBorder")
        PlaceholderText = $wnd.FindName("PlaceholderText")
        OuterBorder     = $wnd.FindName("OuterBorder")
        ThumbnailHandle = [IntPtr]::Zero
        TargetHandle    = [IntPtr]::Zero
        IsPinned        = $false
        Timer           = $null
        TitleBarVisible = $true
    }
    $wnd.Tag = $ctx

    # ==========================================================
    # Event Handlers (all use Get-Ctx to retrieve per-window state)
    # ==========================================================

    # Title bar drag / double-click to snap to mini size
    $ctx.TitleBar.Add_MouseLeftButtonDown({
        param($sender, $e)
        $c = Get-Ctx $sender
        if ($e.ClickCount -eq 2) {
            if ($c.ThumbnailHandle -ne [IntPtr]::Zero) {
                $sourceSize = New-Object PSIZE
                $hr = [NativeMethods]::DwmQueryThumbnailSourceSize($c.ThumbnailHandle, [ref]$sourceSize)
                if ($hr -eq 0 -and $sourceSize.x -gt 0 -and $sourceSize.y -gt 0) {
                    $titleBarHeight = 30
                    $availableHeight = $script:MINI_HEIGHT - $titleBarHeight
                    $sourceAspect = [double]$sourceSize.x / [double]$sourceSize.y
                    $fitWidth = $script:MINI_WIDTH
                    $fitHeight = [int]($fitWidth / $sourceAspect)
                    if ($fitHeight -gt $availableHeight) {
                        $fitHeight = $availableHeight
                        $fitWidth = [int]($fitHeight * $sourceAspect)
                    }
                    $c.Window.Width = [Math]::Max($fitWidth + 2, 160)
                    $c.Window.Height = [Math]::Max($fitHeight + $titleBarHeight + 2, 120)
                }
            } else {
                $c.Window.Width = $script:MINI_WIDTH
                $c.Window.Height = $script:MINI_HEIGHT
            }
        } else {
            $c.Window.DragMove()
        }
    })

    # Right-click to pick window
    $ctx.TitleBar.Add_MouseRightButtonDown({
        param($sender, $e)
        $c = Get-Ctx $sender
        Show-WindowPicker $c
    })

    # Select window button
    $ctx.BtnSelect.Add_Click({
        param($sender, $e)
        $c = Get-Ctx $sender
        Show-WindowPicker $c
    })

    # New instance button
    $ctx.BtnNew.Add_Click({
        New-PreviewWindow
    })

    # Pin button
    $ctx.BtnPin.Add_Click({
        param($sender, $e)
        $c = Get-Ctx $sender
        $c.IsPinned = -not $c.IsPinned
        $c.Window.Topmost = $c.IsPinned
        if ($c.IsPinned) {
            $c.BtnPin.Foreground = [System.Windows.Media.Brushes]::Gold
            $c.BtnPin.ToolTip = "Unpin from Top (Ctrl+T)"
        } else {
            $c.BtnPin.Foreground = [System.Windows.Media.SolidColorBrush]::new([System.Windows.Media.Color]::FromRgb(204,204,204))
            $c.BtnPin.ToolTip = "Pin on Top (Ctrl+T)"
        }
    })

    # Close button
    $ctx.BtnClose.Add_Click({
        param($sender, $e)
        $c = Get-Ctx $sender
        $c.Window.Close()
    })

    # Keyboard shortcuts
    $wnd.Add_KeyDown({
        param($sender, $e)
        $c = $sender.Tag
        if ($e.Key -eq [System.Windows.Input.Key]::W -and
            [System.Windows.Input.Keyboard]::Modifiers -eq [System.Windows.Input.ModifierKeys]::Control) {
            Show-WindowPicker $c
            $e.Handled = $true
        }
        elseif ($e.Key -eq [System.Windows.Input.Key]::N -and
                [System.Windows.Input.Keyboard]::Modifiers -eq [System.Windows.Input.ModifierKeys]::Control) {
            New-PreviewWindow
            $e.Handled = $true
        }
        elseif ($e.Key -eq [System.Windows.Input.Key]::T -and
                [System.Windows.Input.Keyboard]::Modifiers -eq [System.Windows.Input.ModifierKeys]::Control) {
            $c.BtnPin.RaiseEvent([System.Windows.RoutedEventArgs]::new([System.Windows.Controls.Primitives.ButtonBase]::ClickEvent))
            $e.Handled = $true
        }
        elseif ($e.Key -eq [System.Windows.Input.Key]::Escape) {
            $c.Window.Close()
        }
    })

    # Size changed - update thumbnail
    $wnd.Add_SizeChanged({
        param($sender, $e)
        Update-Thumbnail $sender.Tag
    })

    # Title bar auto-hide
    $wnd.Add_MouseEnter({
        param($sender, $e)
        Show-TitleBar $sender.Tag
    })
    $wnd.Add_MouseLeave({
        param($sender, $e)
        Hide-TitleBar $sender.Tag
    })
    $wnd.Add_Deactivated({
        param($sender, $e)
        Hide-TitleBar $sender.Tag
    })
    $wnd.Add_Activated({
        param($sender, $e)
        Show-TitleBar $sender.Tag
    })

    # Window closed - cleanup
    $wnd.Add_Closed({
        param($sender, $e)
        $c = $sender.Tag
        if ($null -ne $c.Timer) { $c.Timer.Stop() }
        Unregister-Thumbnail $c
        $script:openWindowCount--
        if ($script:openWindowCount -le 0) {
            [System.Windows.Threading.Dispatcher]::CurrentDispatcher.InvokeShutdown()
        }
    })

    # Show window and start timer
    $script:openWindowCount++
    $wnd.Show()

    # Timer for continuous thumbnail updates
    $timer = [System.Windows.Threading.DispatcherTimer]::new()
    $timer.Interval = [TimeSpan]::FromMilliseconds(100)
    $timer.Tag = $ctx
    $timer.Add_Tick({
        param($sender, $e)
        Update-Thumbnail $sender.Tag
    })
    $timer.Start()
    $ctx.Timer = $timer
}

# ============================================================
# Launch
# ============================================================
New-PreviewWindow
[System.Windows.Threading.Dispatcher]::Run()
