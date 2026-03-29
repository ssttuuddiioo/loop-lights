@echo off
REM Deploy custom shaders to ENTTEC ELM
REM Run this after pulling from git on the Windows PC

set ELM_ZIP=C:\Program Files\ENTTEC\ELM\shaders.zip
set REPO_SHADERS=%~dp0

echo Adding shaders to "%ELM_ZIP%" ...

for %%f in ("%REPO_SHADERS%*.frag") do (
    echo   Adding %%~nxf
    powershell -Command "Compress-Archive -Path '%%f' -Update -DestinationPath '%ELM_ZIP%'"
)

echo Done. Restart ELM to pick up new shaders.
pause
