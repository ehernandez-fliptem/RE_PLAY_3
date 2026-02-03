param(
    [string]$BasePath = (Resolve-Path (Join-Path $PSScriptRoot ".."))
)

function Write-Step($msg) { Write-Host "`n==> $msg" }

$ErrorActionPreference = "Stop"

$back = Join-Path $BasePath "back"
$front = Join-Path $BasePath "front"
$panel = Join-Path $BasePath "panel_server"
$demonio = Join-Path $BasePath "demonio_eventos"

Write-Step "Builds"
Push-Location $front
npm run build
Pop-Location

Write-Step "Copiando dist del front al back"
$src = Join-Path $front "dist"
$dest = Join-Path $back "dist\dist"
if (!(Test-Path $src)) { throw "No se encontró $src" }
if (!(Test-Path $dest)) { New-Item -ItemType Directory -Force $dest | Out-Null }
Copy-Item -Path (Join-Path $src "*") -Destination $dest -Recurse -Force

Push-Location $back
npm run build
Pop-Location

Push-Location $panel
npm run build
Pop-Location

Push-Location $demonio
npm run build
Pop-Location

Write-Step "Reiniciando PM2"
pm2 restart all
pm2 list
