@echo off
cd /d "%~dp0"
echo Starting SSMS Frontend...
echo.
echo Installing dependencies (if needed)...
call npm install
echo.
echo Starting React development server...
npm start
pause
