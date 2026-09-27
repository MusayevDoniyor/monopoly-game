@echo off
title Monopoly Master Deluxe Launcher
cd /d "%~dp0"

echo ========================================================
echo   🎩 MONOPOLY MASTER: DELUXE PC GAME EDITION
echo ========================================================

:: Start local game server in background
start /B node server.js

:: Wait for server
timeout /t 1 /nobreak >nul

:: Launch in native standalone PC window mode (no browser URL bar or tabs)
start msedge --app="http://localhost:8080" --window-size=1400,920 || start chrome --app="http://localhost:8080" --window-size=1400,920 || start http://localhost:8080
