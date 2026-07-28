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
# Create Main Window
# ============================================================
$reader = [System.Xml.XmlNodeReader]::new($MainXaml)
$mainWindow = [System.Windows.Markup.XamlReader]::Load($reader)

$titleBar      = $mainWindow.FindName("TitleBar")
$titleText     = $mainWindow.FindName("TitleText")
$btnSelect     = $mainWindow.FindName("BtnSelect")
$btnNew        = $mainWindow.FindName("BtnNew")
$btnPin        = $mainWindow.FindName("BtnPin")
$btnClose      = $mainWindow.FindName("BtnClose")
$previewBorder = $mainWindow.FindName("PreviewBorder")
$placeholderText = $mainWindow.FindName("PlaceholderText")
$outerBorder   = $mainWindow.FindName("OuterBorder")

# State variables
$script:thumbnailHandle = [IntPtr]::Zero
$script:targetHandle    = [IntPtr]::Zero
$script:isPinned        = $false
$script:timer           = $null
$script:titleBarVisible = $true
$script:scriptPath      = $PSCommandPath

# Mini size constants (the compact monitoring size)
$script:MINI_WIDTH  = 320
$script:MINI_HEIGHT = 210

# ============================================================
# Helper Functions
# ============================================================
function Update-Thumbnail {
    if ($script:thumbnailHandle -eq [IntPtr]::Zero) { return }

    $sourceSize = New-Object PSIZE
    $hr = [NativeMethods]::DwmQueryThumbnailSourceSize($script:thumbnailHandle, [ref]$sourceSize)
    if ($hr -ne 0) { return }

    # Get the preview area position relative to the window
    $point = $previewBorder.TranslatePoint([System.Windows.Point]::new(0, 0), $mainWindow)

    # Account for DPI
    $source = [System.Windows.PresentationSource]::FromVisual($mainWindow)
    $dpiX = 1.0; $dpiY = 1.0
    if ($null -ne $source) {
        $dpiX = $source.CompositionTarget.TransformToDevice.M11
        $dpiY = $source.CompositionTarget.TransformToDevice.M22
    }

    $destLeft   = [int]($point.X * $dpiX)
    $destTop    = [int]($point.Y * $dpiY)
    $destRight  = [int](($point.X + $previewBorder.ActualWidth) * $dpiX)
    $destBottom = [int](($point.Y + $previewBorder.ActualHeight) * $dpiY)

    # Maintain aspect ratio
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

    [void][NativeMethods]::DwmUpdateThumbnailProperties($script:thumbnailHandle, [ref]$props)
}

function Unregister-Thumbnail {
    if ($script:thumbnailHandle -ne [IntPtr]::Zero) {
        [void][NativeMethods]::DwmUnregisterThumbnail($script:thumbnailHandle)
        $script:thumbnailHandle = [IntPtr]::Zero
    }
}

function Set-TargetWindow {
    param([IntPtr]$Handle, [string]$Title)

    Unregister-Thumbnail

    $script:targetHandle = $Handle
    $titleText.Text = "  $Title"
    $placeholderText.Visibility = [System.Windows.Visibility]::Collapsed

    # Get our window handle
    $helper = [System.Windows.Interop.WindowInteropHelper]::new($mainWindow)
    $thisHandle = $helper.Handle

    $thumbOut = [IntPtr]::Zero
    $hr = [NativeMethods]::DwmRegisterThumbnail($thisHandle, $Handle, [ref]$thumbOut)
    if ($hr -ne 0) {
        [System.Windows.MessageBox]::Show("Failed to register thumbnail. Error: 0x$($hr.ToString('X8'))`nThe target window may have been closed.", "Error")
        return
    }
    $script:thumbnailHandle = $thumbOut
    Update-Thumbnail
}

function Show-WindowPicker {
    $reader2 = [System.Xml.XmlNodeReader]::new($PickerXaml)
    $picker = [System.Windows.Markup.XamlReader]::Load($reader2)
    $picker.Owner = $mainWindow

    $searchBox  = $picker.FindName("SearchBox")
    $windowList = $picker.FindName("WindowList")
    $btnOk2     = $picker.FindName("BtnOk")
    $btnCancel2 = $picker.FindName("BtnCancel")
    $btnRefresh = $picker.FindName("BtnRefresh")

    $script:allWindows = $null
    $script:pickerResult = $null

    $refreshList = {
        $helper = [System.Windows.Interop.WindowInteropHelper]::new($mainWindow)
        $excludeHandle = $helper.Handle
        $script:allWindows = [NativeMethods]::GetVisibleWindows($excludeHandle)
        $windowList.Items.Clear()
        foreach ($w in $script:allWindows) {
            [void]$windowList.Items.Add($w.Value)
        }
    }

    & $refreshList

    $filterList = {
        $filter = $searchBox.Text.ToLowerInvariant().Trim()
        $windowList.Items.Clear()
        foreach ($w in $script:allWindows) {
            if ([string]::IsNullOrEmpty($filter) -or $w.Value.ToLowerInvariant().Contains($filter)) {
                [void]$windowList.Items.Add($w.Value)
            }
        }
    }

    $searchBox.Add_TextChanged({ & $filterList })
    $btnRefresh.Add_Click({ & $refreshList })

    $windowList.Add_SelectionChanged({
        $btnOk2.IsEnabled = ($windowList.SelectedIndex -ge 0)
    })

    $windowList.Add_MouseDoubleClick({
        if ($windowList.SelectedIndex -ge 0) {
            $selectedTitle = $windowList.SelectedItem.ToString()
            foreach ($w in $script:allWindows) {
                if ($w.Value -eq $selectedTitle) {
                    $script:pickerResult = $w
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
            foreach ($w in $script:allWindows) {
                if ($w.Value -eq $selectedTitle) {
                    $script:pickerResult = $w
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
    if ($result -eq $true -and $null -ne $script:pickerResult) {
        Set-TargetWindow -Handle $script:pickerResult.Key -Title $script:pickerResult.Value
    }
}

# ============================================================
# Event Handlers
# ============================================================

# Title bar drag / double-click to snap to mini size
$titleBar.Add_MouseLeftButtonDown({
    param($sender, $e)
    if ($e.ClickCount -eq 2) {
        # Snap to mini monitoring size, preserving source aspect ratio
        if ($script:thumbnailHandle -ne [IntPtr]::Zero) {
            $sourceSize = New-Object PSIZE
            $hr = [NativeMethods]::DwmQueryThumbnailSourceSize($script:thumbnailHandle, [ref]$sourceSize)
            if ($hr -eq 0 -and $sourceSize.x -gt 0 -and $sourceSize.y -gt 0) {
                # Calculate mini size that fits within MINI_WIDTH x MINI_HEIGHT
                # while preserving the source aspect ratio
                $titleBarHeight = 30
                $availableHeight = $script:MINI_HEIGHT - $titleBarHeight
                $sourceAspect = [double]$sourceSize.x / [double]$sourceSize.y

                # Fit within the mini box
                $fitWidth = $script:MINI_WIDTH
                $fitHeight = [int]($fitWidth / $sourceAspect)

                if ($fitHeight -gt $availableHeight) {
                    $fitHeight = $availableHeight
                    $fitWidth = [int]($fitHeight * $sourceAspect)
                }

                $mainWindow.Width = [Math]::Max($fitWidth + 2, 160)
                $mainWindow.Height = [Math]::Max($fitHeight + $titleBarHeight + 2, 120)
            }
        } else {
            # No preview active - reset to default mini size
            $mainWindow.Width = $script:MINI_WIDTH
            $mainWindow.Height = $script:MINI_HEIGHT
        }
    } else {
        $mainWindow.DragMove()
    }
})

# Right-click to pick window
$titleBar.Add_MouseRightButtonDown({
    Show-WindowPicker
})

# Select window button
$btnSelect.Add_Click({ Show-WindowPicker })

# New instance button - spawn a new independent preview window
$btnNew.Add_Click({
    Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$($script:scriptPath)`""
})

# Pin button
$btnPin.Add_Click({
    $script:isPinned = -not $script:isPinned
    $mainWindow.Topmost = $script:isPinned
    if ($script:isPinned) {
        $btnPin.Foreground = [System.Windows.Media.Brushes]::Gold
        $btnPin.ToolTip = "Unpin from Top (Ctrl+T)"
    } else {
        $btnPin.Foreground = [System.Windows.Media.SolidColorBrush]::new([System.Windows.Media.Color]::FromRgb(204,204,204))
        $btnPin.ToolTip = "Pin on Top (Ctrl+T)"
    }
})

# Close button
$btnClose.Add_Click({
    $mainWindow.Close()
})

# Keyboard shortcuts
$mainWindow.Add_KeyDown({
    param($sender, $e)
    if ($e.Key -eq [System.Windows.Input.Key]::W -and
        [System.Windows.Input.Keyboard]::Modifiers -eq [System.Windows.Input.ModifierKeys]::Control) {
        Show-WindowPicker
        $e.Handled = $true
    }
    elseif ($e.Key -eq [System.Windows.Input.Key]::N -and
            [System.Windows.Input.Keyboard]::Modifiers -eq [System.Windows.Input.ModifierKeys]::Control) {
        $btnNew.RaiseEvent([System.Windows.RoutedEventArgs]::new([System.Windows.Controls.Primitives.ButtonBase]::ClickEvent))
        $e.Handled = $true
    }
    elseif ($e.Key -eq [System.Windows.Input.Key]::T -and
            [System.Windows.Input.Keyboard]::Modifiers -eq [System.Windows.Input.ModifierKeys]::Control) {
        $btnPin.RaiseEvent([System.Windows.RoutedEventArgs]::new([System.Windows.Controls.Primitives.ButtonBase]::ClickEvent))
        $e.Handled = $true
    }
    elseif ($e.Key -eq [System.Windows.Input.Key]::Escape) {
        $mainWindow.Close()
    }
})

# Size changed - update thumbnail
$mainWindow.Add_SizeChanged({ Update-Thumbnail })

# ============================================================
# Title bar auto-hide: hide when mouse leaves, show on enter
# When hidden, resize window to exactly fit the source aspect ratio (no black bars)
# ============================================================
function Show-TitleBar {
    if ($script:titleBarVisible) { return }
    $script:titleBarVisible = $true
    $titleBar.Visibility = [System.Windows.Visibility]::Visible
    # Restore corner radius: title bar has top corners, preview has bottom corners
    $previewBorder.CornerRadius = [System.Windows.CornerRadius]::new(0, 0, 6, 6)

    # Grow window height to accommodate title bar
    $mainWindow.Height = $mainWindow.Height + 28

    Update-Thumbnail
}

function Hide-TitleBar {
    if (-not $script:titleBarVisible) { return }
    $script:titleBarVisible = $false
    $titleBar.Visibility = [System.Windows.Visibility]::Collapsed
    # Preview now takes the full window - give it all rounded corners
    $previewBorder.CornerRadius = [System.Windows.CornerRadius]::new(6)

    # Resize window to exactly match source aspect ratio (no letterboxing)
    if ($script:thumbnailHandle -ne [IntPtr]::Zero) {
        $sourceSize = New-Object PSIZE
        $hr = [NativeMethods]::DwmQueryThumbnailSourceSize($script:thumbnailHandle, [ref]$sourceSize)
        if ($hr -eq 0 -and $sourceSize.x -gt 0 -and $sourceSize.y -gt 0) {
            # Account for DPI
            $source = [System.Windows.PresentationSource]::FromVisual($mainWindow)
            $dpiX = 1.0; $dpiY = 1.0
            if ($null -ne $source) {
                $dpiX = $source.CompositionTarget.TransformToDevice.M11
                $dpiY = $source.CompositionTarget.TransformToDevice.M22
            }

            $sourceAspect = [double]$sourceSize.x / [double]$sourceSize.y

            # Use current window width, calculate exact height to fill without black bars
            # Subtract border thickness (1px each side = 2px total)
            $contentWidth = $mainWindow.Width - 2
            $exactHeight = $contentWidth / $sourceAspect
            # Add back border
            $mainWindow.Height = [Math]::Max($exactHeight + 2, 120)
        }
    } else {
        # No preview - just shrink by title bar height
        $mainWindow.Height = [Math]::Max($mainWindow.Height - 28, 120)
    }

    Update-Thumbnail
}

$mainWindow.Add_MouseEnter({
    Show-TitleBar
})

$mainWindow.Add_MouseLeave({
    Hide-TitleBar
})

# Also handle window deactivation/activation
$mainWindow.Add_Deactivated({
    Hide-TitleBar
})

$mainWindow.Add_Activated({
    Show-TitleBar
})

# Window loaded - start update timer
$mainWindow.Add_Loaded({
    $script:timer = [System.Windows.Threading.DispatcherTimer]::new()
    $script:timer.Interval = [TimeSpan]::FromMilliseconds(100)
    $script:timer.Add_Tick({ Update-Thumbnail })
    $script:timer.Start()
})

# Window closed - cleanup
$mainWindow.Add_Closed({
    if ($null -ne $script:timer) { $script:timer.Stop() }
    Unregister-Thumbnail
})

# ============================================================
# Launch
# ============================================================
$mainWindow.ShowDialog() | Out-Null
