param(
    [string]$BasePath = (Resolve-Path (Join-Path $PSScriptRoot ".."))
)

function Write-Step($msg) { Write-Host "`n==> $msg" }
function Fail($msg) { Write-Error $msg; exit 1 }
function Resolve-Pm2Cmd {
    $cmd = (Get-Command pm2 -ErrorAction SilentlyContinue).Path
    if (-not $cmd) {
        $cmd = Join-Path $env:APPDATA "npm\pm2.cmd"
    }
    return $cmd
}

function Invoke-Pm2 {
    param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Args)
    $pm2Cmd = Resolve-Pm2Cmd
    if (Test-Path $pm2Cmd) {
        & $pm2Cmd @Args
    } else {
        Fail "No se encontro pm2 en PATH ni en $env:APPDATA\\npm. Usa: npm -g i pm2"
    }
}
$ErrorActionPreference = "Stop"

$back = Join-Path $BasePath "back"
$front = Join-Path $BasePath "front"
$panel = Join-Path $BasePath "panel_server"
$demonio = Join-Path $BasePath "demonio_eventos"

Write-Step "1) PM2 global"
npm i -g pm2

Write-Step "2) Limpiar procesos PM2 anteriores"
Invoke-Pm2 delete all

Write-Step "3) FRONT (install + typescript + build)"
Push-Location $front
npm install --legacy-peer-deps
npm i -D typescript
npm run build
Pop-Location

Write-Step "4) Copiar dist del front al back"
$src = Join-Path $front "dist"
$dest = Join-Path $back "dist\dist"
if (!(Test-Path $src)) { Fail "No se encontro $src" }
if (!(Test-Path $dest)) { New-Item -ItemType Directory -Force $dest | Out-Null }
Copy-Item -Path (Join-Path $src "*") -Destination $dest -Recurse -Force

Write-Step "5) BACK (install + typescript + build + pm2)"
Push-Location $back
npm install
npm i -D typescript
npm run build
$backIndex = Join-Path $back "dist\index.js"
if (Test-Path $backIndex) {
    Invoke-Pm2 start $backIndex --name back
} else {
    Fail "No se encontro index.js en back\\dist"
}
Pop-Location

Write-Step "6) PANEL_SERVER (install + typescript + build + pm2)"
Push-Location $panel
npm install
npm i -D typescript
npm run build
$panelIndex = Join-Path $panel "dist\index.js"
if (Test-Path $panelIndex) {
    Invoke-Pm2 start $panelIndex --name panel_server
} else {
    Fail "No se encontro index.js en panel_server\\dist"
}
Pop-Location

Write-Step "7) DEMONIO_EVENTOS (install + typescript + build + pm2)"
Push-Location $demonio
npm install
npm i -D typescript
npm run build
$demonioIndex = Join-Path $demonio "dist\index.js"
if (Test-Path $demonioIndex) {
    Invoke-Pm2 start $demonioIndex --name demonio_eventos
} else {
    Fail "No se encontro index.js en demonio_eventos\\dist"
}
Pop-Location

Write-Step "8) Guardar PM2"
Invoke-Pm2 save

Write-Step "9) Estado PM2"
Invoke-Pm2 list






