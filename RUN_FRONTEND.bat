@echo off
title Lumina ERP - Frontend (Angular 17)
color 0A

echo ================================================
echo  LUMINA ERP - FRONTEND APP
echo  Angular 17 - Port 4200
echo ================================================
echo.

cd /d "%~dp0"

echo Starting Frontend Development Server...
echo.
echo App will be available at: http://localhost:4200
echo.
echo Press Ctrl+C to stop
echo.

call pnpm dev:frontend
