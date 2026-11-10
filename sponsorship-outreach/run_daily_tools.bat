@echo off
chcp 65001 > nul
set PYTHONIOENCODING=utf-8
call "d:\company page\ai-saas-listing\sponsorship-outreach\ensure_env.bat"
set PYTHONUTF8=1
cd /d "d:\company page\ai-saas-listing\sponsorship-outreach"

echo ===================================================  >> tools_pipeline.log
echo ToolverAI Daily Tools Pipeline  >> tools_pipeline.log
echo Started at: %date% %time%  >> tools_pipeline.log
echo ===================================================  >> tools_pipeline.log

".venv-scraper\Scripts\python.exe" "daily_tools_pipeline.py" --limit 30 --sheet --db >> tools_pipeline.log 2>&1

rem Self-heal: any tool the Sheet/outreach lists as live but the website does not serve
rem is re-imported here, so a listing URL can never stay a 404 for more than a day.
echo --- Listing self-heal (restore_missing_tools) ---  >> tools_pipeline.log
".venv-scraper\Scripts\python.exe" "restore_missing_tools.py" --db --limit 40 >> tools_pipeline.log 2>&1

echo Finished at: %date% %time%  >> tools_pipeline.log
