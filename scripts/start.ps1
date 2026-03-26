param(
    [string]$BasePath = (Resolve-Path (Join-Path $PSScriptRoot ".."))
)

function Write-Step($msg) { Write-Host "`n==> $msg" }
function Fail($msg) { Write-Error $msg; exit 1 }
function Assert-Path($path, $msg) { if (!(Test-Path $path)) { Fail $msg } }

$ErrorActionPreference = "Stop"

$nodeExe = Join-Path $BasePath "runtime\node\node.exe"
Assert-Path $nodeExe "No se encontro runtime\\node\\node.exe"

$backDir = Join-Path $BasePath "back"
$panelDir = Join-Path $BasePath "panel_server"
$demonioDir = Join-Path $BasePath "demonio_eventos"

$backIndex = Join-Path $backDir "dist\index.js"
$panelIndex = Join-Path $panelDir "dist\index.js"
$demonioIndex = Join-Path $demonioDir "dist\index.js"

Assert-Path $backIndex "No se encontro $backIndex"
Assert-Path $panelIndex "No se encontro $panelIndex"
Assert-Path $demonioIndex "No se encontro $demonioIndex"

$configPath = Join-Path $BasePath "config\config.json"
$httpPort = 80
$httpsPort = 443
$openBrowser = $true
$configFound = $false
if (Test-Path $configPath) {
    $configFound = $true
    try {
        $cfg = Get-Content $configPath -Raw | ConvertFrom-Json
        if ($cfg.httpPort) { $httpPort = [int]$cfg.httpPort }
        if ($cfg.httpsPort) { $httpsPort = [int]$cfg.httpsPort }
        if ($null -ne $cfg.openBrowser) { $openBrowser = [bool]$cfg.openBrowser }
    } catch {
        Write-Host "No se pudo leer config\\config.json. Se usa httpPort=80."
    }
}

Write-Host ""
Write-Host "Ruta node.exe      : $nodeExe"
Write-Host "Ruta back/index.js : $backIndex"
Write-Host "Config encontrada  : $configFound"
Write-Host "Puerto HTTP        : $httpPort"
Write-Host "Puerto HTTPS       : $httpsPort"

$logsDir = Join-Path $BasePath "logs"
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

$backOut = Join-Path $logsDir "back.out.log"
$backErr = Join-Path $logsDir "back.err.log"
$panelOut = Join-Path $logsDir "panel.out.log"
$panelErr = Join-Path $logsDir "panel.err.log"
$demonioOut = Join-Path $logsDir "demonio.out.log"
$demonioErr = Join-Path $logsDir "demonio.err.log"

Write-Step "Iniciando BACK (con logs)"
Start-Process -FilePath $nodeExe -ArgumentList "`"$backIndex`"" -WorkingDirectory $backDir `
    -RedirectStandardOutput $backOut -RedirectStandardError $backErr -WindowStyle Hidden

Write-Step "Iniciando PANEL_SERVER (con logs)"
Start-Process -FilePath $nodeExe -ArgumentList "`"$panelIndex`"" -WorkingDirectory $panelDir `
    -RedirectStandardOutput $panelOut -RedirectStandardError $panelErr -WindowStyle Hidden

Write-Step "Iniciando DEMONIO_EVENTOS (con logs)"
Start-Process -FilePath $nodeExe -ArgumentList "`"$demonioIndex`"" -WorkingDirectory $demonioDir `
    -RedirectStandardOutput $demonioOut -RedirectStandardError $demonioErr -WindowStyle Hidden

function Test-PortOpen {
    param([int]$Port)
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $iar = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
        $success = $iar.AsyncWaitHandle.WaitOne(1000)
        if ($success -and $client.Connected) {
            $client.Close()
            return $true
        }
        $client.Close()
        return $false
    } catch {
        return $false
    }
}

Write-Step "Esperando a que el puerto HTTPS responda"
$maxWaitSec = 20
$ready = $false
for ($i = 0; $i -lt $maxWaitSec; $i++) {
    if (Test-PortOpen -Port $httpsPort) {
        $ready = $true
        break
    }
    Start-Sleep -Seconds 1
}

if ($ready) {
    Write-Step "Puerto $httpsPort activo"
    if ($openBrowser) {
        Start-Process "https://localhost:$httpsPort"
    }
} else {
    Write-Host ""
    Write-Host "No responde el puerto $httpsPort. Intentando HTTP ($httpPort)..."
    $httpReady = $false
    for ($i = 0; $i -lt $maxWaitSec; $i++) {
        if (Test-PortOpen -Port $httpPort) {
            $httpReady = $true
            break
        }
        Start-Sleep -Seconds 1
    }
    if ($httpReady) {
        Write-Step "Puerto $httpPort activo"
        if ($openBrowser) {
            Start-Process "http://localhost:$httpPort"
        }
    } else {
        Write-Host "No responde HTTPS ni HTTP. Revisa los logs en:"
        Write-Host "  $backErr"
        Write-Host "  $panelErr"
        Write-Host "  $demonioErr"
    }
}
