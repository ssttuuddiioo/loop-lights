# ============================================================
#  Dimly Watchdog — keeps stage controller + tunnel alive
#  Run manually or via Task Scheduler (see install-watchdog.bat)
# ============================================================

# --- Configuration -----------------------------------------------------------

$RepoDir        = "C:\Users\livingwalls\loop-lights"
$ServerScript   = Join-Path $RepoDir "serve.cjs"
$CloudflaredExe = "C:\Tools\cloudflared.exe"
$TunnelName     = "dimly"
$ElmProject     = "C:\Users\livingwalls\Desktop\loop\loop-dimly.elm"
$ElmHealthUrl   = "http://localhost:8057"
$HealthUrl      = "http://localhost:4200/healthz"
$LogFile        = Join-Path $RepoDir "watchdog.log"

$CheckInterval  = 30          # seconds between checks
$HealthTimeout  = 5           # seconds to wait for HTTP response
$ElmStartupWait = 15          # seconds to wait for ELM to initialize
$MaxLogSize     = 1MB         # rotate log when it exceeds this

# --- Helpers -----------------------------------------------------------------

function Write-Log {
    param([string]$Message)
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "$ts  $Message"
    Write-Host $line
    Add-Content -Path $LogFile -Value $line

    # Rotate: keep last 500 lines when file gets too big
    if ((Test-Path $LogFile) -and (Get-Item $LogFile).Length -gt $MaxLogSize) {
        $tail = Get-Content $LogFile -Tail 500
        Set-Content -Path $LogFile -Value $tail
        Add-Content -Path $LogFile -Value "$ts  [log rotated]"
    }
}

function Get-ServerProcess {
    Get-Process node -ErrorAction SilentlyContinue |
        Where-Object {
            try {
                $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId=$($_.Id)" -ErrorAction SilentlyContinue).CommandLine
                $cmd -and $cmd -like "*serve.cjs*"
            } catch { $false }
        }
}

function Get-TunnelProcess {
    Get-Process cloudflared -ErrorAction SilentlyContinue |
        Where-Object {
            try {
                $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId=$($_.Id)" -ErrorAction SilentlyContinue).CommandLine
                $cmd -and $cmd -like "*tunnel*run*$TunnelName*"
            } catch { $false }
        }
}

function Start-Server {
    Write-Log "Starting node serve.cjs ..."
    $proc = Start-Process -FilePath "node" -ArgumentList "`"$ServerScript`"" `
        -WorkingDirectory $RepoDir -WindowStyle Hidden -PassThru
    Write-Log "Server started (PID $($proc.Id))"
    return $proc
}

function Start-Tunnel {
    if (-not (Test-Path $CloudflaredExe)) {
        Write-Log "ERROR: cloudflared not found at $CloudflaredExe"
        return $null
    }
    Write-Log "Starting cloudflared tunnel ..."
    $proc = Start-Process -FilePath $CloudflaredExe -ArgumentList "tunnel run $TunnelName" `
        -WorkingDirectory $RepoDir -WindowStyle Hidden -PassThru
    Write-Log "Tunnel started (PID $($proc.Id))"
    return $proc
}

function Test-ElmAlive {
    try {
        $response = Invoke-WebRequest -Uri $ElmHealthUrl -TimeoutSec $HealthTimeout `
            -UseBasicParsing -ErrorAction Stop
        return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
    } catch {
        return $false
    }
}

function Start-Elm {
    if (-not (Test-Path $ElmProject)) {
        Write-Log "ERROR: ELM project not found at $ElmProject"
        return
    }
    Write-Log "Starting ELM (opening project file) ..."
    Start-Process -FilePath $ElmProject
    Write-Log "ELM launch requested — waiting ${ElmStartupWait}s for startup"
    Start-Sleep -Seconds $ElmStartupWait
}

function Test-ServerHealth {
    try {
        $response = Invoke-WebRequest -Uri $HealthUrl -TimeoutSec $HealthTimeout `
            -UseBasicParsing -ErrorAction Stop
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

# --- Main loop ---------------------------------------------------------------

Write-Log "========== Dimly Watchdog started =========="

# Initial startup
$serverProc = $null
$tunnelProc = $null
$consecutiveHealthFailures = 0
$maxHealthFailures = 3  # restart server after this many consecutive failures

while ($true) {
    # --- Check ELM (must be up before server matters) ---
    if (-not (Test-ElmAlive)) {
        Write-Log "ELM not responding on port 8057 — starting"
        Start-Elm
    }

    # --- Check server process ---
    $alive = Get-ServerProcess
    if (-not $alive) {
        Write-Log "Server process not found — restarting"
        $serverProc = Start-Server
        $consecutiveHealthFailures = 0
        Start-Sleep -Seconds 3  # give it a moment to bind the port
    }

    # --- Check tunnel process ---
    $tunnelAlive = Get-TunnelProcess
    if (-not $tunnelAlive) {
        Write-Log "Tunnel process not found — restarting"
        $tunnelProc = Start-Tunnel
    }

    # --- HTTP health check (only if server process is running) ---
    $alive = Get-ServerProcess
    if ($alive) {
        if (Test-ServerHealth) {
            $consecutiveHealthFailures = 0
        } else {
            $consecutiveHealthFailures++
            Write-Log "Health check failed ($consecutiveHealthFailures/$maxHealthFailures)"
            if ($consecutiveHealthFailures -ge $maxHealthFailures) {
                Write-Log "Server unresponsive — killing and restarting"
                $alive | Stop-Process -Force -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 2
                $serverProc = Start-Server
                $consecutiveHealthFailures = 0
                Start-Sleep -Seconds 3
            }
        }
    }

    Start-Sleep -Seconds $CheckInterval
}
