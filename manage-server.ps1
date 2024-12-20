param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("start", "stop", "restart")]
    [string]$Action
)

# Function to find and stop the Node.js process running on port 3000
function Stop-ExpressServer {
    $nodeProcess = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | 
                  Where-Object { $_.State -eq "Listen" } | 
                  ForEach-Object { Get-Process -Id $_.OwningProcess }
    
    if ($nodeProcess) {
        Write-Host "Stopping Express server (PID: $($nodeProcess.Id))"
        Stop-Process -Id $nodeProcess.Id -Force
        Write-Host "Express server stopped successfully"
    } else {
        Write-Host "No Express server found running on port 3000"
    }
}

# Function to start the Express server
function Start-ExpressServer {
    Write-Host "Starting Express server..."
    $scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
    Set-Location $scriptPath
    Start-Process -NoNewWindow -FilePath "node" -ArgumentList "--experimental-modules", "server.js"
    Write-Host "Express server started"
}

# Execute based on the action parameter
switch ($Action) {
    "start" {
        Start-ExpressServer
    }
    "stop" {
        Stop-ExpressServer
    }
    "restart" {
        Stop-ExpressServer
        Start-Sleep -Seconds 2
        Start-ExpressServer
    }
}
