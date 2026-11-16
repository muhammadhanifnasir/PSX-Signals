@echo off
echo ========================================================
echo   PSX Signal Intelligence - Development Environment
echo ========================================================
echo.

REM Start FastAPI Backend
echo [1/2] Starting Python FastAPI Backend on http://localhost:8000...
start "PSX Backend - FastAPI" cmd /k "cd /d %~dp0 && python backend\run.py"

REM Start Next.js Frontend
echo [2/2] Starting Next.js App Router on http://localhost:3000...
start "PSX Frontend - Next.js" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Both servers are launching in separate windows!
echo - Backend API & Docs: http://localhost:8000/docs
echo - Frontend Dashboard:  http://localhost:3000
echo ========================================================
pause
