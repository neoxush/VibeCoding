@echo off
chcp 65001 > nul
echo ===================================================
echo OpChckList 服务器设置 / OpChckList Server Setup
echo ===================================================
echo.

echo 步骤 1: 检查本地IP地址... / Step 1: Checking your local IP address...
echo.

echo 您的IP地址 / Your IP addresses:
echo ---------------------------------------------------

REM Display IPv4 addresses in a clean format
echo 本地网络IP地址 / Local Network IP addresses:
echo.
ipconfig | findstr /i "IPv4"

echo.
echo ---------------------------------------------------
echo.
echo ===================================================
echo 重要提示 / IMPORTANT:
echo.
echo [中文说明]
echo 1. 查看上面列出的IP地址
echo 2. 选择您当前活动网络连接的IP地址（通常是Wi-Fi或以太网）
echo 3. 使用以192.168.x.x、10.x.x.x或172.x.x.x开头的IP地址
echo 4. 不要使用127.0.0.1或169.254.x.x等地址
echo 5. 只复制数字部分（例如：192.168.1.100），不要包含空格
echo 6. 将此IP地址粘贴到OpChckList的连接输入框中
echo.
echo [English Instructions]
echo 1. Look at the IP addresses listed above
echo 2. Select the one from your active network connection
echo    (usually Wi-Fi or Ethernet)
echo 3. Use an IP that starts with 192.168.x.x, 10.x.x.x, or 172.x.x.x
echo 4. DO NOT use addresses like 127.0.0.1 or 169.254.x.x
echo 5. Copy ONLY the numbers (e.g., 192.168.1.100) without any spaces
echo 6. Paste this IP address into the OpChckList connection section
echo ===================================================
echo.

echo 步骤 2: 启动服务器... / Step 2: Starting the server...
echo.
echo 服务器即将启动。使用OpChckList时请保持此窗口打开。
echo The server will now start. Keep this window open while using OpChckList.
echo.
echo 完成后按Ctrl+C停止服务器。/ Press Ctrl+C to stop the server when you're done.
echo.
echo ===================================================
echo.

cd "%~dp0"
node server.js

pause
