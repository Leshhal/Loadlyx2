@echo off
setlocal

REM ============================================================
REM Loadlyx Windows Double-Click Launcher
REM Starts Docker Desktop, project-specific PostgreSQL, migrations, backend,
REM and frontend through the automatic Git Bash setup script.
REM ============================================================

set "SCRIPT_DIR=%~dp0"
set "AUTO_SCRIPT=%SCRIPT_DIR%run_loadlyx_auto.sh"
set "COMPOSE_FILE=%SCRIPT_DIR%docker-compose.local.yml"

if not exist "%AUTO_SCRIPT%" (
    echo ERROR: Could not find run_loadlyx_auto.sh in:
    echo %SCRIPT_DIR%
    call :KEEP_OPEN
    exit /b 1
)

if not exist "%COMPOSE_FILE%" (
    echo ERROR: Could not find docker-compose.local.yml in:
    echo %SCRIPT_DIR%
    call :KEEP_OPEN
    exit /b 1
)

set "GIT_BASH=%ProgramFiles%\Git\bin\bash.exe"
if not exist "%GIT_BASH%" set "GIT_BASH=%ProgramFiles(x86)%\Git\bin\bash.exe"
if not exist "%GIT_BASH%" set "GIT_BASH=C:\Program Files\Git\bin\bash.exe"
if not exist "%GIT_BASH%" set "GIT_BASH=C:\Program Files (x86)\Git\bin\bash.exe"

if not exist "%GIT_BASH%" (
    echo ERROR: Git Bash was not found.
    echo Please install Git for Windows first:
    echo https://git-scm.com/download/win
    call :KEEP_OPEN
    exit /b 1
)

echo.
echo ==============================================
echo Loadlyx Full Local Environment Launcher
echo ==============================================
echo.
echo Choose one option:
echo 1. Use a ZIP file
echo 2. Use an extracted project folder
echo 3. Use current folder
echo.

set /p CHOICE=Enter 1, 2, or 3: 

if "%CHOICE%"=="1" goto ZIPMODE
if "%CHOICE%"=="2" goto FOLDERMODE
if "%CHOICE%"=="3" goto CURRENTMODE

echo Invalid choice.
call :KEEP_OPEN
exit /b 1

:ZIPMODE
set /p INPUT_PATH=Paste full path to your Loadlyx ZIP file: 
goto RUNSCRIPT

:FOLDERMODE
set /p INPUT_PATH=Paste full path to your extracted Loadlyx folder: 
goto RUNSCRIPT

:CURRENTMODE
set "INPUT_PATH=%SCRIPT_DIR%"
goto RUNSCRIPT

:RUNSCRIPT
echo.
echo Starting Loadlyx, Docker, and its dedicated PostgreSQL database...
echo.

"%GIT_BASH%" "%AUTO_SCRIPT%" "%INPUT_PATH%"

echo.
echo ==============================================
echo Script finished.
echo Check the output above for URLs and any errors.
echo ==============================================
echo.
call :KEEP_OPEN
endlocal
exit /b 0

:KEEP_OPEN
echo.
echo This window will stay open so you can review the results.
echo Type EXIT and press Enter when you want to close it.
:KEEP_OPEN_LOOP
set "KEEP_OPEN_COMMAND="
set /p KEEP_OPEN_COMMAND=Loadlyx launcher^> 
if /i "%KEEP_OPEN_COMMAND%"=="EXIT" exit /b 0
echo Type EXIT and press Enter to close this window.
goto KEEP_OPEN_LOOP
