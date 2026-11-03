@echo off
chcp 65001 > nul
set PYTHONIOENCODING=utf-8
set PYTHONUTF8=1
cd /d "d:\company page\ai-saas-listing\sponsorship-outreach"

echo ===================================================  >> tools_pipeline.log
echo ToolverAI Daily Tools Pipeline  >> tools_pipeline.log
echo Started at: %date% %time%  >> tools_pipeline.log
echo ===================================================  >> tools_pipeline.log

".venv-scraper\Scripts\python.exe" "daily_tools_pipeline.py" --limit 30 --sheet --db >> tools_pipeline.log 2>&1

echo Finished at: %date% %time%  >> tools_pipeline.log
