@echo off
REM ==========================================================================
REM  win-toolkit launcher
REM  Runs the MacroTool environment check, then launches Live Preview
REM  (which includes the Automate feature). Zero dependencies.
REM ==========================================================================
setlocal
set "PS1=%~dp0MacroTool.ps1"
set "LP=%~dp0LivePreview.ps1"

echo Checking environment...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%" checkenv
if errorlevel 1 (
    echo.
    echo Environment check FAILED. Please resolve the issues above.
    echo.
    pause
    exit /b 1
)

echo.
echo Launching Live Preview + Automate...
start "" powershell -NoProfile -ExecutionPolicy Bypass -File "%LP%"
endlocal
