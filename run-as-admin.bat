@echo off
REM GS Optimizer - Launch with Admin Privileges
REM Get the directory where this batch file is located
for /f "delims=" %%i in ("%~dp0.") do set "PROJECT_DIR=%%~fi"
cd /d "%PROJECT_DIR%"
powershell -NoProfile -Command "Start-Process '%COMSPEC%' -ArgumentList '/k cd /d \"%PROJECT_DIR%\" && npm run client' -WorkingDirectory '%PROJECT_DIR%' -Verb RunAs"
