@echo off
echo Testing OpenClaw Installation
echo.

REM Check if OpenClaw is installed
where openclaw >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] OpenClaw not installed
    echo.
    echo Install with: npm install -g openclaw@latest
    echo.
    exit /b 1
)

echo [OK] OpenClaw installed

REM Check version
echo.
echo OpenClaw version:
openclaw --version

REM Check if gateway is running
echo.
echo Checking if gateway is running...
curl -s http://127.0.0.1:18789/ >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Gateway is running at http://127.0.0.1:18789/
    echo.
    echo Open in browser: http://127.0.0.1:18789/
) else (
    echo [INFO] Gateway not running
    echo.
    echo Start with: openclaw gateway --port 18789 --verbose
)

echo.
echo ========================================
echo.
echo Next steps:
echo 1. If gateway not running: openclaw gateway --port 18789 --verbose
echo 2. Open UI: http://127.0.0.1:18789/
echo 3. Setup Telegram: openclaw channels add --channel telegram --token "TOKEN"
echo 4. Copy configs: See OPENCLAW_QUICKSTART.md
echo.
