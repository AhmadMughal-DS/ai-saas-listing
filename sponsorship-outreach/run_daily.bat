@echo off
chcp 65001 > nul
set PYTHONIOENCODING=utf-8
cd /d "d:\company page\ai-saas-listing"

echo ===================================================
echo ToolverAI Daily 10 PM Outreach Runner
echo Started at: %date% %time%
echo ===================================================

"C:\Users\HP\AppData\Local\Python\bin\python.exe" "sponsorship-outreach\daily_runner.py" --live

echo Finished at: %date% %time%
