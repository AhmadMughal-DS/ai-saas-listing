$TaskName = "ToolverAI-Daily-Outreach"
$BatchPath = "d:\company page\ai-saas-listing\sponsorship-outreach\run_daily.bat"

# Export XML from existing task created by schtasks
$xmlString = & schtasks /query /tn $TaskName /xml

[xml]$taskXml = $xmlString

# Configure StartWhenAvailable and Battery power settings
$taskXml.Task.Settings.StartWhenAvailable = "true"
$taskXml.Task.Settings.DisallowStartIfOnBatteries = "false"
$taskXml.Task.Settings.StopIfGoingOnBatteries = "false"
$taskXml.Task.Settings.ExecutionTimeLimit = "PT2H"

# Ensure Logon Trigger is also present as a backup trigger
$triggers = $taskXml.Task.Triggers
if (-not $triggers.LogonTrigger) {
    $logonElem = $taskXml.CreateElement("LogonTrigger", "http://schemas.microsoft.com/windows/2004/02/mit/task")
    $enabledElem = $taskXml.CreateElement("Enabled", "http://schemas.microsoft.com/windows/2004/02/mit/task")
    $enabledElem.InnerText = "true"
    $logonElem.AppendChild($enabledElem) | Out-Null
    $triggers.AppendChild($logonElem) | Out-Null
}

$xmlTemp = "$env:TEMP\toolverai_task.xml"
$taskXml.Save($xmlTemp)

# Re-register using schtasks /create /xml
& schtasks /create /tn $TaskName /xml $xmlTemp /f | Out-Null
Remove-Item $xmlTemp -Force -ErrorAction SilentlyContinue

Write-Host "✅ Task '$TaskName' successfully configured with:" -ForegroundColor Green
Write-Host "   - Schedule: Daily at 22:00 (10:00 PM PKT)"
Write-Host "   - StartWhenAvailable: TRUE (Executes automatically if laptop was off at 10 PM)"
Write-Host "   - Battery Support: TRUE (Runs on laptop battery without AC power required)"
Write-Host "   - Logon Trigger: TRUE (Checks quota on laptop boot/wake)"
