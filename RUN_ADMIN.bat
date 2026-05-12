@echo off
title Lumina ERP - Admin Panel (Angular 19)
color 0B

echo ================================================
echo  LUMINA ERP - ADMIN PANEL
echo  Angular 19 - Port 4201
echo ================================================
echo.

cd /d "%~dp0"

echo Starting Admin Development Server...
echo.
echo App will be available at: http://localhost:4201
echo.
echo Press Ctrl+C to stop
echo.

call pnpm dev:admin
