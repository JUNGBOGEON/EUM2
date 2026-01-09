@echo off
setlocal

echo ========================================================
echo               EUM2 Unified Start Script
echo ========================================================
echo.
echo [1/3] Backend (NestJS)   - Starting...
echo [2/3] Frontend (Next.js) - Starting...
echo [3/3] Browser            - Opening in 5 seconds...
echo.
echo Press Ctrl+C to stop all processes.
echo.

cd /d "%~dp0"

echo [Checking Dependencies...]
if not exist "backend\node_modules" (
    echo [Backend] node_modules not found. Installing...
    cd backend && npm install && cd ..
)

if not exist "frontend\node_modules" (
    echo [Frontend] node_modules not found. Installing...
    cd frontend && npm install && cd ..
)

echo.
echo [Starting Services...]
echo.

:: Use npx concurrently to run all commands in parallel in one terminal
npx -y concurrently -n "BACK,FRONT,BROWSER" -c "cyan,magenta,yellow" ^
    "cd backend && npm run start:dev" ^
    "cd frontend && npm run dev" ^
    "ping 127.0.0.1 -n 6 > nul && start chrome http://localhost:3000"

endlocal
pause
