@echo off
REM Double-click on the venue PC (where ELM runs) to check that the app's
REM effects/media line up with the loaded ELM project. Override host/port by
REM setting ELM_HOST / ELM_PORT before running.
cd /d "%~dp0.."
node scripts\check-elm-sync.cjs
echo.
pause
