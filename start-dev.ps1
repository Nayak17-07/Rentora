# Rentora - Full Stack Dev Startup Script (PowerShell)
# Run with: powershell -ExecutionPolicy Bypass -File start-dev.ps1

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
$MONGO_DATA = "C:\data\db"

# Find installed mongod.exe
$MONGO_BIN = Get-ChildItem "C:\Program Files\MongoDB\Server\*\bin\mongod.exe" -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
if (-not $MONGO_BIN) {
    $MONGO_BIN = "C:\Program Files\MongoDB\Server\9.0\bin\mongod.exe"
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   Rentora - Full Stack Dev Startup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Ensure MongoDB data dir
if (-not (Test-Path $MONGO_DATA)) {
    New-Item -ItemType Directory -Path $MONGO_DATA -Force | Out-Null
    Write-Host "[+] Created MongoDB data dir: $MONGO_DATA" -ForegroundColor Yellow
}

# 2. Check if MongoDB is already running
$mongoActive = Get-NetTCPConnection -LocalPort 27017 -State Listen -ErrorAction SilentlyContinue
if ($mongoActive) {
    Write-Host "`n[1/3] MongoDB is already active and listening on port 27017." -ForegroundColor Green
} else {
    Write-Host "`n[1/3] Starting MongoDB on port 27017 using: $MONGO_BIN..." -ForegroundColor Green
    if (Test-Path $MONGO_BIN) {
        Start-Process -FilePath $MONGO_BIN -ArgumentList "--dbpath `"$MONGO_DATA`" --port 27017" -WindowStyle Minimized
        Start-Sleep -Seconds 2
    } else {
        Write-Host "   WARNING: mongod.exe not found at $MONGO_BIN. Assuming external MongoDB service." -ForegroundColor Yellow
    }
}

# Verify MongoDB is up
try {
    $result = python -c "import pymongo; c=pymongo.MongoClient('mongodb://127.0.0.1:27017/',serverSelectionTimeoutMS=3000); c.admin.command('ping'); print('ok')" 2>&1
    if ($result -match "ok") {
        Write-Host "   MongoDB connected OK" -ForegroundColor Green
    }
} catch {
    Write-Host "   WARNING: Could not verify MongoDB connection" -ForegroundColor Yellow
}

# 3. Start Backend
Write-Host "`n[2/3] Starting Backend (port 8000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT\server'; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 2

# 4. Start Frontend
Write-Host "`n[3/3] Starting Frontend (port 5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT\frontend'; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "   All Services Running!" -ForegroundColor Cyan
Write-Host "   Frontend : http://localhost:5173" -ForegroundColor White
Write-Host "   Backend  : http://localhost:8000" -ForegroundColor White
Write-Host "   Health   : http://localhost:8000/api/health" -ForegroundColor White
Write-Host "==========================================" -ForegroundColor Cyan
