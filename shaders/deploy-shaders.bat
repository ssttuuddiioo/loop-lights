@echo off
REM Deploy custom shaders to ENTTEC ELM
REM Run this after pulling from git on the Windows PC

set ELM_SHADERS=C:\Program Files\ENTTEC\ELM\shaders
set REPO_SHADERS=%~dp0

echo Deploying shaders to %ELM_SHADERS% ...

for %%f in ("%REPO_SHADERS%*.frag") do (
    echo   Copying %%~nxf
    copy /Y "%%f" "%ELM_SHADERS%\%%~nxf"
)

echo Done. Restart ELM or reload media to pick up new shaders.
pause
