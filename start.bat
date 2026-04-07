@echo off
title Dimly - Starting Up
color 0A

echo.
echo  ========================================
echo   DIMLY - Stage Controller Startup
echo  ========================================
echo.

REM --- Step 0: Kill any existing processes ---
echo  [0/6] Cleaning up old processes...
echo.
echo   Killing node...
taskkill /F /IM node.exe >nul 2>&1
echo   Killing cloudflared...
taskkill /F /IM cloudflared.exe >nul 2>&1
echo   Waiting for ports to free up...
timeout /t 5 /nobreak >nul

REM --- Verify port 4200 is free ---
netstat -ano | findstr ":4200 " >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo   Port 4200 still in use, waiting longer...
    timeout /t 5 /nobreak >nul
)
echo   Done.
echo.

REM --- Step 1: Pull latest from git ---
echo  [1/6] Pulling latest from git...
echo.
cd /d "%~dp0"
git checkout -- scenes.json >nul 2>&1
git pull
echo.
timeout /t 3 /nobreak >nul

REM --- Step 2: Install dependencies ---
echo  [2/6] Installing dependencies...
echo.
call npm install
echo.
timeout /t 2 /nobreak >nul

REM --- Step 3: Build the app ---
echo  [3/6] Building the app...
echo.
call npm run build
if %ERRORLEVEL% neq 0 (
    echo.
    echo  !! BUILD FAILED !! Check errors above.
    echo  Server will NOT start with broken build.
    echo.
    pause
    exit /b 1
)
echo.
timeout /t 2 /nobreak >nul

REM --- Step 4: Deploy shaders to ELM ---
echo  [4/6] Deploying shaders to ELM...
echo.
set ELM_SHADERS=C:\ProgramData\ELM\shaders
for %%f in ("%~dp0shaders\*.frag") do (
    echo   Copying %%~nxf
    copy /Y "%%f" "%ELM_SHADERS%\%%~nxf" >nul
)
for %%f in ("%~dp0shaders\*.frag.thumb.jpg") do (
    echo   Copying %%~nxf
    copy /Y "%%f" "%ELM_SHADERS%\%%~nxf" >nul
)
echo   Shaders deployed.
echo.
timeout /t 2 /nobreak >nul

REM --- Create logs directory + clear old server log ---
if not exist "%~dp0logs" mkdir "%~dp0logs"
echo [%date% %time%] Dimly starting up >> "%~dp0logs\startup.log"
echo. > "%~dp0logs\server.log"

REM --- Step 5: Start the controller server ---
echo  [5/6] Starting Stage Controller on port 4200...
echo.
start "Dimly Server" /min cmd /c "title Dimly Server && node "%~dp0serve.cjs" >> "%~dp0logs\server.log" 2>&1"
timeout /t 5 /nobreak >nul

REM --- Step 6: Start Cloudflare Tunnel ---
echo  [6/6] Starting Cloudflare Tunnel (ctrl.dimly.app)...
echo.
start "Dimly Tunnel" /min cmd /c "title Dimly Tunnel && C:\Tools\cloudflared.exe tunnel run dimly >> "%~dp0logs\tunnel.log" 2>&1"
timeout /t 5 /nobreak >nul

REM --- Done ---
echo.
echo  ========================================
echo   All systems go!
echo.
echo   Local:   http://localhost:4200
echo   Remote:  https://ctrl.dimly.app
echo   Shaders: deployed to %ELM_SHADERS%
echo   Logs:    %~dp0logs\
echo  ========================================
echo.
echo  Server and tunnel running in background.
echo  Closing in 5 seconds...
echo.
timeout /t 5 /nobreak >nul
