@echo off
echo ==========================================
echo   Rentora - Full Stack Dev Startup
echo ==========================================

:: Check if MongoDB data dir exists
if not exist "C:\data\db" (
    echo Creating MongoDB data directory...
    mkdir "C:\data\db"
)

:: Check if MongoDB is already listening on 27017
netstat -ano | findstr ":27017 " | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo [1/3] MongoDB is already active and listening on port 27017.
) else (
    echo [1/3] Starting MongoDB...
    if exist "C:\Program Files\MongoDB\Server\9.0\bin\mongod.exe" (
        start "" "C:\Program Files\MongoDB\Server\9.0\bin\mongod.exe" --dbpath "C:\data\db" --port 27017
    ) else (
        start "" mongod --dbpath "C:\data\db" --port 27017
    )
    timeout /t 3 /nobreak >nul
    echo        MongoDB started on port 27017
)

:: Start Backend
echo [2/3] Starting Backend Server (port 8000)...
start "Rentora Backend" cmd /k "cd /d %~dp0server && npm run dev"
timeout /t 2 /nobreak >nul
echo        Backend started at http://localhost:8000

:: Start Frontend
echo [3/3] Starting Frontend Dev Server (port 5173)...
start "Rentora Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 2 /nobreak >nul
echo        Frontend started at http://localhost:5173

echo.
echo ==========================================
echo   All services running!
echo   Frontend : http://localhost:5173
echo   Backend  : http://localhost:8000
echo   API Docs : http://localhost:8000/api/health
echo ==========================================
echo.
echo Press any key to exit this window...
pause >nul
