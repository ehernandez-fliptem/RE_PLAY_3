param(
    [string]$BasePath = (Resolve-Path (Join-Path $PSScriptRoot "..")),
    [ValidateSet("all", "back", "panel", "demonio", "backfront")]
    [string]$Target = "all"
)

function Write-Step($msg) { Write-Host "`n==> $msg" }

$ErrorActionPreference = "Stop"

$back = Join-Path $BasePath "back"
$front = Join-Path $BasePath "front"
$panel = Join-Path $BasePath "panel_server"
$demonio = Join-Path $BasePath "demonio_eventos"

function Build-Front {
    Write-Step "Front build"
    Push-Location $front
    npm run build
    Pop-Location
}

function Copy-Front-To-Back {
    Write-Step "Copiando dist del front al back"
    $src = Join-Path $front "dist"
    $dest = Join-Path $back "dist\dist"
    if (!(Test-Path $src)) { throw "No se encontró $src" }
    if (!(Test-Path $dest)) { New-Item -ItemType Directory -Force $dest | Out-Null }
    Copy-Item -Path (Join-Path $src "*") -Destination $dest -Recurse -Force
}

function Build-Back {
    Write-Step "Back build"
    Push-Location $back
    npm run build
    Pop-Location
}

function Build-Panel {
    Write-Step "Panel build"
    Push-Location $panel
    npm run build
    Pop-Location
}

function Build-Demonio {
    Write-Step "Demonio build"
    Push-Location $demonio
    npm run build
    Pop-Location
}

switch ($Target) {
    "back" {
        Build-Back
    }
    "panel" {
        Build-Panel
    }
    "demonio" {
        Build-Demonio
    }
    "backfront" {
        Build-Front
        Copy-Front-To-Back
        Build-Back
    }
    "all" {
        Build-Front
        Copy-Front-To-Back
        Build-Back
        Build-Panel
        Build-Demonio
    }
}

Write-Step "Reiniciando PM2"
pm2 restart all
pm2 list
