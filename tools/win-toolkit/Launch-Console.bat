@echo off
REM Launch the MacroTool visual console (HTA), after verifying the environment.
REM No dependencies - uses built-in Windows PowerShell and mshta.exe.

setlocal
set "PS1=%~dp0MacroTool.ps1"
set "HTA=%~dp0MacroTool.hta"

echo Checking environment...
echo.

REM Run the environment check. Exit code 0 = OK (possibly with warnings), 1 = failed.
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%" checkenv
if errorlevel 1 (
    echo.
    echo Environment check FAILED. The console will not be launched.
    echo Please resolve the issues above and try again.
    echo.
    pause
    exit /b 1
)

echo.
echo Launching MacroTool console...
start "" mshta.exe "%HTA%"
endlocal
