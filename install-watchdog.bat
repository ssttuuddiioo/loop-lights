@echo off
title Dimly - Install Watchdog
color 0A
echo.
echo  ========================================
echo   Dimly Watchdog Installer
echo  ========================================
echo.

REM --- Must run as admin for schtasks ---
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo  ERROR: Run this as Administrator.
    echo  Right-click ^> Run as administrator
    echo.
    pause
    exit /b 1
)

REM --- Step 1: Move cloudflared to a stable path ---
set STABLE_PATH=C:\Tools\cloudflared.exe
set DOWNLOAD_PATH=C:\Users\loop\Downloads\cloudflared-windows-amd64

if exist "%STABLE_PATH%" (
    echo  [1/3] cloudflared already at %STABLE_PATH% - skipping
) else (
    if exist "%DOWNLOAD_PATH%" (
        echo  [1/3] Moving cloudflared to %STABLE_PATH% ...
        if not exist "C:\Tools" mkdir "C:\Tools"
        copy /Y "%DOWNLOAD_PATH%" "%STABLE_PATH%" >nul
        echo        Done.
    ) else (
        echo  [1/3] WARNING: cloudflared not found at %DOWNLOAD_PATH%
        echo        Download it or install via: winget install Cloudflare.cloudflared
        echo        Then copy cloudflared.exe to %STABLE_PATH%
    )
)
echo.

REM --- Step 2: Register scheduled task ---
echo  [2/3] Creating scheduled task "Dimly Watchdog" ...
schtasks /delete /tn "Dimly Watchdog" /f >nul 2>&1

schtasks /create /tn "Dimly Watchdog" ^
    /tr "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File \"C:\Users\loop\loop-lights\watchdog.ps1\"" ^
    /sc onlogon ^
    /rl highest ^
    /delay 0000:15 ^
    /f
if %errorLevel% equ 0 (
    echo        Task created - runs at login with 15s delay.
) else (
    echo        ERROR: Failed to create task. Check permissions.
)
echo.

REM --- Step 3: Verify ---
echo  [3/3] Verifying ...
schtasks /query /tn "Dimly Watchdog" /fo list | findstr /i "TaskName Status"
echo.
echo  ========================================
echo   Install complete!
echo.
echo   The watchdog will auto-start on login.
echo   To run it now:
echo     powershell -File watchdog.ps1
echo.
echo   To remove it later:
echo     schtasks /delete /tn "Dimly Watchdog" /f
echo  ========================================
echo.
pause
