param(
    [string]$BasePath = (Resolve-Path (Join-Path $PSScriptRoot "..")),
    [string]$ReleasePath = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")) "release")
)

function Write-Step($msg) { Write-Host "`n==> $msg" }
function Fail($msg) { Write-Error $msg; exit 1 }
function Assert-Path($path, $msg) { if (!(Test-Path $path)) { Fail $msg } }

$ErrorActionPreference = "Stop"

$back = Join-Path $BasePath "back"
$front = Join-Path $BasePath "front"
$panel = Join-Path $BasePath "panel_server"
$demonio = Join-Path $BasePath "demonio_eventos"

$nodeCmd = (Get-Command node -ErrorAction SilentlyContinue).Path
if (-not $nodeCmd) { Fail "No se encontro node en PATH. Instala Node.js para ejecutar el build local." }

Write-Step "1) Build del FRONT"
Push-Location $front
Assert-Path (Join-Path $front "node_modules") "Faltan dependencias en front. Ejecuta: npm install"
npm run build
Pop-Location
Assert-Path (Join-Path $front "dist\index.html") "El build del front no genero dist\\index.html"

Write-Step "2) Copiar build del FRONT al BACK (back\\dist\\dist)"
$srcFrontDist = Join-Path $front "dist"
$destBackDist = Join-Path $back "dist\dist"
if (!(Test-Path $srcFrontDist)) { Fail "No se encontro $srcFrontDist" }
if (!(Test-Path $destBackDist)) { New-Item -ItemType Directory -Force $destBackDist | Out-Null }
Copy-Item -Path (Join-Path $srcFrontDist "*") -Destination $destBackDist -Recurse -Force

Write-Step "3) Build del BACK"
Push-Location $back
Assert-Path (Join-Path $back "node_modules") "Faltan dependencias en back. Ejecuta: npm install"
npm run build
Pop-Location
Assert-Path (Join-Path $back "dist\index.js") "El build del back no genero dist\\index.js"

Write-Step "4) Build de PANEL_SERVER"
Push-Location $panel
Assert-Path (Join-Path $panel "node_modules") "Faltan dependencias en panel_server. Ejecuta: npm install"
npm run build
Pop-Location
Assert-Path (Join-Path $panel "dist\index.js") "El build del panel_server no genero dist\\index.js"

Write-Step "5) Build de DEMONIO_EVENTOS"
Push-Location $demonio
Assert-Path (Join-Path $demonio "node_modules") "Faltan dependencias en demonio_eventos. Ejecuta: npm install"
npm run build
Pop-Location
Assert-Path (Join-Path $demonio "dist\index.js") "El build del demonio_eventos no genero dist\\index.js"

Write-Step "6) Crear estructura release"
New-Item -ItemType Directory -Force -Path $ReleasePath | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $ReleasePath "runtime\node") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $ReleasePath "config") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $ReleasePath "scripts") | Out-Null

Write-Step "7) Copiar node.exe embebido"
$nodeExe = (Get-Command node -ErrorAction SilentlyContinue).Path
Copy-Item -Path $nodeExe -Destination (Join-Path $ReleasePath "runtime\node\node.exe") -Force

Write-Step "8) Copiar BACK (dist + assets + node_modules)"
Copy-Item -Path (Join-Path $back "dist") -Destination (Join-Path $ReleasePath "back") -Recurse -Force
if (Test-Path (Join-Path $back "public")) {
    Copy-Item -Path (Join-Path $back "public") -Destination (Join-Path $ReleasePath "back") -Recurse -Force
}
if (Test-Path (Join-Path $back "secure")) {
    Copy-Item -Path (Join-Path $back "secure") -Destination (Join-Path $ReleasePath "back") -Recurse -Force
}
Copy-Item -Path (Join-Path $back "node_modules") -Destination (Join-Path $ReleasePath "back") -Recurse -Force

Write-Step "9) Copiar PANEL_SERVER (dist + node_modules)"
Copy-Item -Path (Join-Path $panel "dist") -Destination (Join-Path $ReleasePath "panel_server") -Recurse -Force
Copy-Item -Path (Join-Path $panel "node_modules") -Destination (Join-Path $ReleasePath "panel_server") -Recurse -Force

Write-Step "10) Copiar DEMONIO_EVENTOS (dist + node_modules)"
Copy-Item -Path (Join-Path $demonio "dist") -Destination (Join-Path $ReleasePath "demonio_eventos") -Recurse -Force
Copy-Item -Path (Join-Path $demonio "node_modules") -Destination (Join-Path $ReleasePath "demonio_eventos") -Recurse -Force

Write-Step "11) Copiar .env (si existe)"
$envBack = Join-Path $back ".env"
$envRoot = Join-Path $BasePath ".env"
if (Test-Path $envBack) {
    Copy-Item -Path $envBack -Destination (Join-Path $ReleasePath ".env") -Force
} elseif (Test-Path $envRoot) {
    Copy-Item -Path $envRoot -Destination (Join-Path $ReleasePath ".env") -Force
}

Write-Step "12) Crear config.json de ejemplo (si no existe)"
$configPath = Join-Path $ReleasePath "config\config.json"
if (!(Test-Path $configPath)) {
@"
{
  "httpPort": 80,
  "httpsPort": 443,
  "openBrowser": true
}
"@ | Set-Content -Path $configPath -Encoding Ascii
}

Write-Step "13) Copiar scripts de arranque"
Copy-Item -Path (Join-Path $BasePath "scripts\start.ps1") -Destination (Join-Path $ReleasePath "scripts\start.ps1") -Force

Write-Step "Listo. Carpeta release generada en:"
Write-Host $ReleasePath
