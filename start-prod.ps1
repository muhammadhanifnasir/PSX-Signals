<#
.SYNOPSIS
    Starts PSX Signal Intelligence in Production Mode on Windows.
#>

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   PSX Signal Intelligence - Production Startup" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan

$scriptRoot = $PSScriptRoot

Write-Host "`n[1/3] Running Database Migrations..." -ForegroundColor Yellow
python -m backend.app.db.migrate

Write-Host "`n[2/3] Starting FastAPI Production Backend (2 workers)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptRoot'; uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --workers 2"

Write-Host "`n[3/3] Starting Next.js Production Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptRoot/frontend'; npm start"

Write-Host "`nProduction servers started!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "Health:   http://localhost:8000/api/health" -ForegroundColor Cyan
