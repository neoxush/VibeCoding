@echo off
REM Steam Trophy Hunter Launcher
REM This script sets up the virtual environment and launches the application

SETLOCAL

REM Check if Python is installed
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Python is not installed or not in PATH. Please install Python 3.9 or later.
    pause
    exit /b 1
)

echo Setting up Steam Trophy Hunter...

REM Check if virtual environment exists, if not create it
if not exist "venv\" (
    echo Creating virtual environment...
    python -m venv venv
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to create virtual environment.
        pause
        exit /b 1
    )
    
    echo Installing dependencies...
    call venv\Scripts\activate.bat
    pip install --upgrade pip
    pip install -r requirements.txt
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to install dependencies.
        pause
        exit /b 1
    )
) else (
    call venv\Scripts\activate.bat
)

echo Starting Steam Trophy Hunter...
python main.py

REM Keep the window open if there's an error
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo The application exited with an error (Code: %ERRORLEVEL%)
    pause
)

ENDLOCAL
