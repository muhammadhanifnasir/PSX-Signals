<#
.SYNOPSIS
    Starts both PSX Signal Intelligence FastAPI backend and Next.js frontend concurrently.
#>

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   PSX Signal Intelligence - Development Environment" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan

$scriptRoot = $PSScriptRoot

Write-Host "`n[1/2] Launching FastAPI Backend on http://localhost:8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptRoot'; python backend/run.py"

Write-Host "[2/2] Launching Next.js Frontend on http://localhost:3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptRoot/frontend'; npm run dev"

Write-Host "`nAll services initiated successfully!" -ForegroundColor Green
Write-Host " - Frontend Dashboard: http://localhost:3000" -ForegroundColor Cyan
Write-Host " - Backend API Docs:   http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host " - WebSocket Stream:  ws://localhost:8000/ws/live-signals`n" -ForegroundColor Cyan
