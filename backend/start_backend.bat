@echo off
cd /d "%~dp0"
echo Starting SSMS Backend Server...
echo.
python -m uvicorn server:app --reload --port 8000
pause
