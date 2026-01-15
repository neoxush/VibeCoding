@echo off
setlocal enabledelayedexpansion

:GET_GODOT_DIR
:: Always ask for Godot directory
echo Please provide your Godot installation directory
echo.
set "GODOT_DIR="
set /p "GODOT_DIR=Enter Godot directory path: "

:: Remove surrounding quotes if present
if "!GODOT_DIR:~0,1!"=="\"" if "!GODOT_DIR:~-1!"=="\"" set "GODOT_DIR=!GODOT_DIR:~1,-1!"

:: Remove trailing backslash if present
if "!GODOT_DIR:~-1!"=="\" set "GODOT_DIR=!GODOT_DIR:~0,-1!"

:: Validate directory exists
if not exist "!GODOT_DIR!\" (
    echo ERROR: Directory does not exist: !GODOT_DIR!
    echo.
    goto :GET_GODOT_DIR
)

:: Find the latest Godot executable by version number
echo Searching for Godot executables in: %GODOT_DIR%
echo.

set "LATEST_GODOT="
set "LATEST_MAJOR=0"
set "LATEST_MINOR=0"
set "LATEST_PATCH=0"

for /f "delims=" %%f in ('dir /b "%GODOT_DIR%\Godot*.exe" 2^>nul') do (
    set "FILENAME=%%~f"
    
    :: Extract version using PowerShell
    for /f "tokens=1-3 delims=." %%a in ('powershell -Command "if ('%%~f' -match 'Godot_v?(\d+)[._](\d+)[._]?(\d*)') { $matches[1] + '.' + $matches[2] + '.' + $matches[3] } else { '0.0.0' }"') do (
        set "MAJOR=%%a"
        set "MINOR=%%b"
        set "PATCH=%%~c"
        if "!PATCH!"=="" set "PATCH=0"
        
        :: Compare versions
        if !MAJOR! gtr !LATEST_MAJOR! (
            set "LATEST_MAJOR=!MAJOR!"
            set "LATEST_MINOR=!MINOR!"
            set "LATEST_PATCH=!PATCH!"
            set "LATEST_GODOT=%GODOT_DIR%\%%f"
        ) else if !MAJOR! equ !LATEST_MAJOR! (
            if !MINOR! gtr !LATEST_MINOR! (
                set "LATEST_MAJOR=!MAJOR!"
                set "LATEST_MINOR=!MINOR!"
                set "LATEST_PATCH=!PATCH!"
                set "LATEST_GODOT=%GODOT_DIR%\%%f"
            ) else if !MINOR! equ !LATEST_MINOR! (
                if !PATCH! gtr !LATEST_PATCH! (
                    set "LATEST_MAJOR=!MAJOR!"
                    set "LATEST_MINOR=!MINOR!"
                    set "LATEST_PATCH=!PATCH!"
                    set "LATEST_GODOT=%GODOT_DIR%\%%f"
                )
            )
        )
    )
)

if not defined LATEST_GODOT (
    echo ERROR: No Godot executable found in %GODOT_DIR%
    echo Please check the directory and try again.
    pause
    exit /b 1
)

echo Found Godot v%LATEST_MAJOR%.%LATEST_MINOR%.%LATEST_PATCH%: %LATEST_GODOT%
echo.

:: Create desktop shortcut using PowerShell with version number
set "DESKTOP=%USERPROFILE%\Desktop"
set "SHORTCUT=%DESKTOP%\Godot_%LATEST_MAJOR%.%LATEST_MINOR%.%LATEST_PATCH%.lnk"

echo Creating desktop shortcut to Godot v%LATEST_MAJOR%.%LATEST_MINOR%.%LATEST_PATCH%...

powershell -ExecutionPolicy Bypass -Command "$WS = New-Object -ComObject WScript.Shell; $SC = $WS.CreateShortcut('%SHORTCUT%'); $SC.TargetPath = '%LATEST_GODOT%'; $SC.WorkingDirectory = '%GODOT_DIR%'; $SC.IconLocation = '%LATEST_GODOT%,0'; $SC.Save()"

if exist "%SHORTCUT%" (
    echo.
    echo SUCCESS: Desktop shortcut created: "%SHORTCUT%"
    echo Launching Godot...
    echo.
    @REM start "" "%LATEST_GODOT%"
) else (
    echo ERROR: Failed to create shortcut
    pause
    exit /b 1
)

endlocal
exit /b 0
