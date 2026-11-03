@echo off
chcp 65001 > nul
set PYTHONIOENCODING=utf-8
cd /d "d:\company page\ai-saas-listing"

"C:\Users\HP\AppData\Local\Python\bin\python.exe" "sponsorship-outreach\hourly_inbox_runner.py"
