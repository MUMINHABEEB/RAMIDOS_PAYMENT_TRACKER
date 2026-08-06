@echo off
title Payment Recording System
echo ========================================================
echo   Starting Payment Recording System Server...
echo ========================================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not added to PATH.
    echo Please install Node.js from https://nodejs.org/ and try again.
    echo.
    pause
    exit /b 1
)

:: Check if node_modules folder exists
if not exist "node_modules\" (
    echo [INFO] node_modules folder not found. Installing dependencies...
    call npm install
    echo.
)

echo [INFO] Express server is starting on http://localhost:5000
echo [INFO] Opening default browser...
echo.

:: Automatically open browser after launching server
start http://localhost:5000

:: Run node server
node server.js

pause
