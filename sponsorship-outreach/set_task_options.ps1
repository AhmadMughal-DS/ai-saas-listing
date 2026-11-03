$service = New-Object -ComObject("Schedule.Service")
$service.Connect()
$rootFolder = $service.GetFolder("\")

foreach ($tname in @("ToolverAI-Daily-Outreach", "ToolverAI-Hourly-Inbox")) {
    try {
        $task = $rootFolder.GetTask($tname)
        $definition = $task.Definition

        # Enable StartWhenAvailable (catch-up if missed)
        $definition.Settings.StartWhenAvailable = $true

        # Allow running on battery
        $definition.Settings.DisallowStartIfOnBatteries = $false
        $definition.Settings.StopIfGoingOnBatteries = $false

        # Execution time limit
        $definition.Settings.ExecutionTimeLimit = "PT2H"

        # Run when the laptop is switched on / user logs in, so a missed run
        # starts as soon as the machine is on (not only via StartWhenAvailable).
        # Remove any existing logon triggers first to avoid duplicates on re-run.
        for ($i = $definition.Triggers.Count; $i -ge 1; $i--) {
            if ($definition.Triggers.Item($i).Type -eq 9) {   # TASK_TRIGGER_LOGON
                $definition.Triggers.Remove($i)
            }
        }
        $logon = $definition.Triggers.Create(9)   # TASK_TRIGGER_LOGON
        $logon.Delay = "PT1M"                      # let Wi-Fi come up (runner also waits for internet)
        $logon.Enabled = $true
        # The runner is idempotent (daily send quota + run lock), so an extra
        # logon start never re-emails anyone or double-counts.

        # Update existing task definition
        $rootFolder.RegisterTaskDefinition($tname, $definition, 4, $null, $null, 3) | Out-Null
        Write-Host "SUCCESS: Configured $tname"
    } catch {
        Write-Host "Warning on $tname"
    }
}
