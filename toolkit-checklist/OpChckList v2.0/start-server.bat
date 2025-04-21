@echo off
echo ===================================================
echo OpChckList Server Setup
echo ===================================================
echo.

echo Step 1: Checking your local IP address...
echo.

ipconfig | findstr /i "IPv4"
echo.
echo ===================================================
echo IMPORTANT: Please copy your local IP address from above
echo (usually starts with 192.168, 10., or 172.)
echo and paste it into the OpChckList connection section.
echo ===================================================
echo.

echo Step 2: Starting the server...
echo.
echo The server will now start. Keep this window open while using OpChckList.
echo.
echo Press Ctrl+C to stop the server when you're done.
echo.
echo ===================================================
echo.

cd "%~dp0"
node server.js

pause
