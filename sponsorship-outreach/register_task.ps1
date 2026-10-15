# PowerShell script to register ToolverAI Daily Outreach in Windows Task Scheduler
# Schedule:
#   1. Daily at 10:00 PM (22:00) Pakistan Standard Time
#   2. At user logon / boot-up (checks if scheduled run was missed or quota incomplete)
# Settings:
#   - StartWhenAvailable ($true): Automatically runs as soon as laptop is turned on if 10 PM was missed
#   - AllowStartIfOnBatteries ($true): Runs even when running on laptop battery
#   - DontStopIfGoingOnBatteries ($true): Keeps running if power cord is unplugged

$TaskName = "ToolverAI-Daily-Outreach"
$BatchPath = "d:\company page\ai-saas-listing\sponsorship-outreach\run_daily.bat"
$WorkingDirectory = "d:\company page\ai-saas-listing"

Write-Host "Registering Windows Scheduled Task: $TaskName..." -ForegroundColor Cyan

$Action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$BatchPath`"" -WorkingDirectory $WorkingDirectory

$TriggerDaily = New-ScheduledTaskTrigger -Daily -At "22:00"
$TriggerLogon = New-ScheduledTaskTrigger -AtLogOn

$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit (New-TimeSpan -Hours 2)

# Unregister if previously exists
try {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
} catch {}

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger @($TriggerDaily, $TriggerLogon) `
    -Settings $Settings `
    -Description "Runs daily ToolverAI sponsorship outreach and PrivateEmail inbox monitoring at 10:00 PM PKT, with automatic catch-up if laptop was offline."

Write-Host "`n✅ Scheduled Task '$TaskName' registered successfully!" -ForegroundColor Green
Write-Host "   Triggers:" -ForegroundColor Yellow
Write-Host "     1. Daily at 22:00 (10:00 PM PKT)" -ForegroundColor White
Write-Host "     2. At Windows Logon / Laptop Wake (Auto Catch-Up)" -ForegroundColor White
Write-Host "   Safety Settings:" -ForegroundColor Yellow
Write-Host "     - StartWhenAvailable: YES (runs missed schedule immediately on laptop turn-on)" -ForegroundColor White
Write-Host "     - Battery Support:    YES (runs and continues on battery power)" -ForegroundColor White
Write-Host "     - Spacing:            Strictly 5.0 to 6.0 minutes between emails" -ForegroundColor White
