@echo off
echo ================================================
echo  LUMINA ERP - STARTING BOTH APPS
echo ================================================
echo.

cd /d "%~dp0"

echo Starting Frontend on port 4200...
start "Lumina Frontend (Angular 17)" cmd /k "color 0A && pnpm dev:frontend"

timeout /t 3 /nobreak >nul

echo Starting Admin on port 4201...
start "Lumina Admin (Angular 19)" cmd /k "color 0B && pnpm dev:admin"

echo.
echo ================================================
echo  BOTH APPS STARTING
echo ================================================
echo.
echo Frontend: http://localhost:4200
echo Admin:    http://localhost:4201
echo.
echo Close this window to keep both apps running
echo Or press any key to exit (apps will continue running)
echo.
pause >nul
