@echo off
cd /d "%~dp0"
start "" /b node "%~dp0node_modules\electron\cli.js" "%~dp0."
exit /b
