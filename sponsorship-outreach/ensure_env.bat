@echo off
rem Self-heal for the two gitignored .env files (called by every scheduled runner).
rem   - live file present and non-empty  -> refresh its backup
rem   - live file missing or 0 bytes     -> restore it from the backup
rem A 0-byte .env is what a write on a full disk leaves behind, so it is
rem treated as missing and never copied over a good backup.
rem Backups live outside the repo: d:\company page\ai-saas-listing-env
setlocal
set "BK=d:\company page\ai-saas-listing-env"
set "APP=d:\company page\ai-saas-listing"
set "LOG=%APP%\sponsorship-outreach\env_restore.log"
if not exist "%BK%" mkdir "%BK%"

call :heal "%APP%\.env" "%BK%\root.env"
call :heal "%APP%\sponsorship-outreach\.env" "%BK%\sponsorship-outreach.env"
endlocal
goto :eof

:heal
set "LIVE=%~1"
set "BACK=%~2"
set "SZ=0"
if exist "%LIVE%" for %%A in ("%LIVE%") do set "SZ=%%~zA"
if not "%SZ%"=="0" (
  copy /y "%LIVE%" "%BACK%" > nul
  goto :eof
)
if exist "%BACK%" (
  copy /y "%BACK%" "%LIVE%" > nul
  echo [ensure_env] %date% %time% restored "%LIVE%" from backup >> "%LOG%"
) else (
  echo [ensure_env] %date% %time% WARNING "%LIVE%" missing and no backup >> "%LOG%"
)
goto :eof
