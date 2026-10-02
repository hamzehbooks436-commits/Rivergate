@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is needed to launch Rivergate.
  pause
  exit /b 1
)
if not exist "node_modules\three\package.json" (
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
node server.mjs --open
pause
