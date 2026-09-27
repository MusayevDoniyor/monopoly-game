@echo off
title Monopoly Master - Launching PC Game
cd /d "%~dp0"

echo ========================================================
echo   [MONOPOLY MASTER: DELUXE PC GAME EDITION]
echo   Launching Standalone PC App Window...
echo ========================================================

:: Check if server is running or start it in background
powershell -Command "try { (Invoke-WebRequest -Uri http://localhost:8080 -UseBasicParsing -TimeoutSec 1).StatusCode } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo Starting local game server...
  start /B node server.js
  timeout /t 1 /nobreak >nul
)

:: Launch in native PC App window mode (Zero browser address bar, pure game window)
start msedge --app="http://localhost:8080" --window-size=1440,940 || start chrome --app="http://localhost:8080" --window-size=1440,940 || start http://localhost:8080

echo Game launched successfully! Enjoy playing!
