$service = New-Object -ComObject("Schedule.Service")
$service.Connect()
$rootFolder = $service.GetFolder("\")
$task = $rootFolder.GetTask("ToolverAI-Daily-Outreach")
$definition = $task.Definition

# Enable StartWhenAvailable (catch-up if missed)
$definition.Settings.StartWhenAvailable = $true

# Allow running on battery
$definition.Settings.DisallowStartIfOnBatteries = $false
$definition.Settings.StopIfGoingOnBatteries = $false

# Allow up to 2 hours
$definition.Settings.ExecutionTimeLimit = "PT2H"

# Update existing task definition
$rootFolder.RegisterTaskDefinition("ToolverAI-Daily-Outreach", $definition, 4, $null, $null, 3) | Out-Null

Write-Host "✅ SUCCESS: Configured ToolverAI-Daily-Outreach with StartWhenAvailable=True, BatterySupport=True!" -ForegroundColor Green
