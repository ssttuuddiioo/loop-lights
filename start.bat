@echo off
title Dimly - Starting Up
color 0A

echo.
echo  ========================================
echo   DIMLY - Stage Controller Startup
echo  ========================================
echo.

REM --- Step 1: Pull latest from git ---
echo  [1/4] Pulling latest from git...
echo.
cd /d "%~dp0"
git pull
echo.
timeout /t 3 /nobreak >nul

REM --- Step 2: Deploy shaders to ELM ---
echo  [2/4] Deploying shaders to ELM...
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

REM --- Step 3: Start the controller server ---
echo  [3/4] Starting Stage Controller on port 4200...
echo.
start "Dimly Server" cmd /c "title Dimly Server && node "%~dp0serve.cjs""
timeout /t 3 /nobreak >nul

REM --- Step 4: Start Cloudflare Tunnel ---
echo  [4/4] Starting Cloudflare Tunnel (loop.dimly.app)...
echo.
start "Dimly Tunnel" cmd /c "title Dimly Tunnel && C:\Users\livingwalls\Downloads\cloudflared-windows-amd64 tunnel run dimly"
timeout /t 5 /nobreak >nul

REM --- Done ---
echo.
echo  ========================================
echo   All systems go!
echo.
echo   Local:   http://localhost:4200
echo   Remote:  https://loop.dimly.app
echo   Shaders: deployed to %ELM_SHADERS%
echo  ========================================
echo.
echo  This window can be closed. Server and
echo  tunnel are running in separate windows.
echo.
pause
