# Registers "ToolverAI-Daily-Tools" in Windows Task Scheduler.
# Runs the daily tool engine: picks 30 new tools, researches them, uploads
# logos to S3, writes a Medium blog, appends to the Google Sheet and inserts
# into toolver_db (live on the website). Daily at 09:00 PKT (before the 11 AM report).

$TaskName = "ToolverAI-Daily-Tools"
$BatchPath = "d:\company page\ai-saas-listing\sponsorship-outreach\run_daily_tools.bat"
$WorkingDirectory = "d:\company page\ai-saas-listing\sponsorship-outreach"

Write-Host "Registering Windows Scheduled Task: $TaskName..." -ForegroundColor Cyan

$Action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$BatchPath`"" -WorkingDirectory $WorkingDirectory

# Daily at 09:00; StartWhenAvailable catches up if the laptop was off at 09:00.
$TriggerDaily = New-ScheduledTaskTrigger -Daily -At "09:00"

$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1)

try {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
} catch {}

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $TriggerDaily `
    -Settings $Settings `
    -Description "Adds 30 new AI tools daily to ToolverAI (research + S3 logo + Medium blog + Google Sheet + toolver_db). Runs 09:00 PKT with auto catch-up."

Write-Host "`n[OK] Scheduled Task '$TaskName' registered." -ForegroundColor Green
Write-Host "   Trigger: Daily at 09:00 (StartWhenAvailable catch-up)" -ForegroundColor White
Write-Host "   Action : run_daily_tools.bat  (--limit 30 --sheet --db)" -ForegroundColor White
