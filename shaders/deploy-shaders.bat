@echo off
REM Deploy custom shaders to ENTTEC ELM
REM Run this after pulling from git on the Windows PC

set ELM_SHADERS=C:\ProgramData\ELM\shaders
set REPO_SHADERS=%~dp0

echo Deploying shaders to %ELM_SHADERS% ...

for %%f in ("%REPO_SHADERS%*.frag") do (
    echo   Copying %%~nxf
    copy /Y "%%f" "%ELM_SHADERS%\%%~nxf"
)

for %%f in ("%REPO_SHADERS%*.frag.thumb.jpg") do (
    echo   Copying %%~nxf
    copy /Y "%%f" "%ELM_SHADERS%\%%~nxf"
)

echo Done. Restart ELM to pick up new shaders.
pause
