param(
    [Parameter(Mandatory = $true)]
    [string]$IP,
    [int]$BackendPort = 80,
    [int]$HttpsPort = 8443
)

function Write-Step($msg) { Write-Host "`n==> $msg" }
function Fail($msg) { Write-Error $msg; exit 1 }

$ErrorActionPreference = "Stop"

$mkcertDir = Join-Path $env:USERPROFILE "AppData\Local\mkcert"
$mkcertExe = Join-Path $mkcertDir "mkcert.exe"
$caddyDir = "C:\caddy"
$caddyExe = Join-Path $caddyDir "caddy.exe"
$certPem = Join-Path $env:USERPROFILE "$IP.pem"
$certKey = Join-Path $env:USERPROFILE "$IP-key.pem"
$caddyfile = Join-Path $caddyDir "Caddyfile"

Write-Step "1) Mkcert"
if (!(Test-Path $mkcertExe)) {
    New-Item -ItemType Directory -Force -Path $mkcertDir | Out-Null
    $url = "https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-windows-amd64.exe"
    Invoke-WebRequest -Uri $url -OutFile $mkcertExe
}
& $mkcertExe -version | Out-Host

Write-Step "2) Instalar CA local"
& $mkcertExe -install | Out-Host

Write-Step "3) Generar certificado para $IP"
if (!(Test-Path $certPem) -or !(Test-Path $certKey)) {
    Push-Location $env:USERPROFILE
    & $mkcertExe $IP | Out-Host
    Pop-Location
}

Write-Step "4) Caddy"
if (!(Test-Path $caddyExe)) {
    New-Item -ItemType Directory -Force -Path $caddyDir | Out-Null
    $zip = Join-Path $env:TEMP "caddy_2.10.2_windows_amd64.zip"
    $url = "https://github.com/caddyserver/caddy/releases/download/v2.10.2/caddy_2.10.2_windows_amd64.zip"
    Invoke-WebRequest -Uri $url -OutFile $zip
    Expand-Archive -Force -Path $zip -DestinationPath $caddyDir
}

Write-Step "5) Escribir Caddyfile"
$cfg = @"
{
  auto_https disable_redirects
}

https://$IP`:$HttpsPort {
  tls `"$($certPem -replace '\\','/')`" `"$($certKey -replace '\\','/')`"
  reverse_proxy 127.0.0.1:$BackendPort
}
"@
Set-Content -Path $caddyfile -Value $cfg -Encoding Ascii

Write-Step "6) Arrancar Caddy"
& $caddyExe start --config $caddyfile | Out-Host

Write-Step "7) Resultado"
Write-Host "HTTPS listo:"
Write-Host "https://$IP`:$HttpsPort"
Write-Host ""
Write-Host "Certificado raiz (para iPhone/iPad):"
Write-Host (Join-Path $mkcertDir "rootCA.pem")
