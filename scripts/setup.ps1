param(
    [string]$BasePath = (Resolve-Path (Join-Path $PSScriptRoot ".."))
)

function Write-Step($msg) { Write-Host "`n==> $msg" }
function Fail($msg) { Write-Error $msg; exit 1 }

$ErrorActionPreference = "Stop"

$back = Join-Path $BasePath "back"
$front = Join-Path $BasePath "front"
$panel = Join-Path $BasePath "panel_server"
$demonio = Join-Path $BasePath "demonio_eventos"

Write-Step "Instalando dependencias"
Push-Location $back
npm install
Pop-Location

Push-Location $panel
npm install
Pop-Location

Push-Location $demonio
npm install
Pop-Location

Push-Location $front
npm install --legacy-peer-deps
Pop-Location

Write-Step "Builds"
Push-Location $front
npm run build
Pop-Location

Write-Step "Copiando dist del front al back"
$src = Join-Path $front "dist"
$dest = Join-Path $back "dist\dist"
if (!(Test-Path $src)) { Fail "No se encontró $src" }
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

Write-Step "Levantando PM2"
# back
$backServer = Join-Path $back "dist\server.js"
$backIndex = Join-Path $back "dist\index.js"
if (Test-Path $backServer) {
    pm2 start $backServer --name back
} elseif (Test-Path $backIndex) {
    pm2 start $backIndex --name back
} else {
    Fail "No se encontro server.js ni index.js en back\\dist"
}

# panel_server
$panelIndex = Join-Path $panel "dist\index.js"
if (Test-Path $panelIndex) {
    pm2 start $panelIndex --name panel_server
} else {
    pm2 start npm --name panel_server -- run start
}

# demonio_eventos
$demonioIndex = Join-Path $demonio "dist\index.js"
if (Test-Path $demonioIndex) {
    pm2 start $demonioIndex --name demonio_eventos
} else {
    Fail "No se encontro index.js en demonio_eventos\\dist"
}

pm2 save
pm2 list
