param(
    [string]$BasePath = (Resolve-Path (Join-Path $PSScriptRoot "..")),
    [string]$ReleasePath = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")) "release"),
    [switch]$ProdOnly
)

function Write-Step($msg) { Write-Host "`n==> $msg" }
function Fail($msg) { Write-Error $msg; exit 1 }
function Assert-Path($path, $msg) { if (!(Test-Path $path)) { Fail $msg } }

function Ensure-Install($path, $args) {
    Push-Location $path
    if (!(Test-Path (Join-Path $path "node_modules"))) {
        Write-Step "Instalando dependencias en $path"
        npm install @args
    }
    Pop-Location
}

function Ensure-ProdOnlySafe($pkgPath, $moduleName) {
    if (-not $ProdOnly) { return }
    if (!(Test-Path $pkgPath)) { return }
    $pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
    if ($pkg.devDependencies -and $pkg.devDependencies.express) {
        Fail "No puedo usar -ProdOnly en $moduleName porque 'express' esta en devDependencies. Muevelo a dependencies y vuelve a intentar."
    }
}

function Remove-DirsByName($root, $names) {
    foreach ($name in $names) {
        Get-ChildItem -Path $root -Recurse -Directory -Filter $name -ErrorAction SilentlyContinue | ForEach-Object {
            Remove-Item -Recurse -Force $_.FullName
        }
    }
}

function Remove-FilesByExt($root, $exts) {
    foreach ($ext in $exts) {
        Get-ChildItem -Path $root -Recurse -File -Filter "*$ext" -ErrorAction SilentlyContinue | ForEach-Object {
            Remove-Item -Force $_.FullName
        }
    }
}

function Copy-PackageFiles($src, $dst) {
    if (Test-Path (Join-Path $src "package.json")) {
        Copy-Item -Path (Join-Path $src "package.json") -Destination $dst -Force
    }
    if (Test-Path (Join-Path $src "package-lock.json")) {
        Copy-Item -Path (Join-Path $src "package-lock.json") -Destination $dst -Force
    }
}

function Assert-ModuleExists($root, $moduleName) {
    $p = Join-Path $root ("node_modules\" + $moduleName)
    if (!(Test-Path $p)) {
        Fail "Falta el modulo requerido '$moduleName' en $root\\node_modules"
    }
}

$ErrorActionPreference = "Stop"

$back = Join-Path $BasePath "back"
$front = Join-Path $BasePath "front"
$panel = Join-Path $BasePath "panel_server"
$demonio = Join-Path $BasePath "demonio_eventos"

$nodeCmd = (Get-Command node -ErrorAction SilentlyContinue).Path
if (-not $nodeCmd) { Fail "No se encontro node en PATH. Instala Node.js para ejecutar el build local." }

Write-Step "1) Build del FRONT"
Ensure-Install $front @("--legacy-peer-deps")
Push-Location $front
npm run build
Pop-Location
Assert-Path (Join-Path $front "dist\index.html") "El build del front no genero dist\\index.html"

Write-Step "2) Build del BACK"
Ensure-ProdOnlySafe (Join-Path $back "package.json") "back"
Ensure-Install $back @()
Push-Location $back
npm run build
Pop-Location
Assert-Path (Join-Path $back "dist\index.js") "El build del back no genero dist\\index.js"

Write-Step "3) Copiar build del FRONT al BACK (back\\dist\\dist)"
$srcFrontDist = Join-Path $front "dist"
$destBackDist = Join-Path $back "dist\dist"
if (!(Test-Path $srcFrontDist)) { Fail "No se encontro $srcFrontDist" }
if (Test-Path $destBackDist) { Remove-Item -Recurse -Force $destBackDist }
New-Item -ItemType Directory -Force $destBackDist | Out-Null
Copy-Item -Path (Join-Path $srcFrontDist "*") -Destination $destBackDist -Recurse -Force

Write-Step "4) Build de PANEL_SERVER"
Ensure-ProdOnlySafe (Join-Path $panel "package.json") "panel_server"
Ensure-Install $panel @()
Push-Location $panel
npm run build
Pop-Location
Assert-Path (Join-Path $panel "dist\index.js") "El build del panel_server no genero dist\\index.js"

Write-Step "5) Build de DEMONIO_EVENTOS"
Ensure-ProdOnlySafe (Join-Path $demonio "package.json") "demonio_eventos"
Ensure-Install $demonio @()
Push-Location $demonio
npm run build
Pop-Location
Assert-Path (Join-Path $demonio "dist\index.js") "El build del demonio_eventos no genero dist\\index.js"

Write-Step "6) Limpiar y crear estructura release"
if (Test-Path $ReleasePath) { Remove-Item -Recurse -Force $ReleasePath }
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
Copy-PackageFiles $back (Join-Path $ReleasePath "back")

Write-Step "9) Copiar PANEL_SERVER (dist + node_modules)"
Copy-Item -Path (Join-Path $panel "dist") -Destination (Join-Path $ReleasePath "panel_server") -Recurse -Force
Copy-Item -Path (Join-Path $panel "node_modules") -Destination (Join-Path $ReleasePath "panel_server") -Recurse -Force
Copy-PackageFiles $panel (Join-Path $ReleasePath "panel_server")

Write-Step "10) Copiar DEMONIO_EVENTOS (dist + node_modules)"
Copy-Item -Path (Join-Path $demonio "dist") -Destination (Join-Path $ReleasePath "demonio_eventos") -Recurse -Force
Copy-Item -Path (Join-Path $demonio "node_modules") -Destination (Join-Path $ReleasePath "demonio_eventos") -Recurse -Force
Copy-PackageFiles $demonio (Join-Path $ReleasePath "demonio_eventos")

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
if (Test-Path (Join-Path $BasePath "scripts\stop.ps1")) {
    Copy-Item -Path (Join-Path $BasePath "scripts\stop.ps1") -Destination (Join-Path $ReleasePath "scripts\stop.ps1") -Force
}

if ($ProdOnly) {
    Write-Step "14) Reducir node_modules a solo produccion (omit=dev)"
    Push-Location (Join-Path $ReleasePath "back")
    if (Test-Path "package.json") { npm prune --omit=dev }
    Pop-Location
    Push-Location (Join-Path $ReleasePath "panel_server")
    if (Test-Path "package.json") { npm prune --omit=dev }
    Pop-Location
    Push-Location (Join-Path $ReleasePath "demonio_eventos")
    if (Test-Path "package.json") { npm prune --omit=dev }
    Pop-Location

    Assert-ModuleExists (Join-Path $ReleasePath "back") "mongoose"
    Assert-ModuleExists (Join-Path $ReleasePath "back") "express"
    Assert-ModuleExists (Join-Path $ReleasePath "panel_server") "express"
    Assert-ModuleExists (Join-Path $ReleasePath "panel_server") "mongoose"
    Assert-ModuleExists (Join-Path $ReleasePath "demonio_eventos") "mongoose"
}

Write-Step "15) Limpieza de archivos innecesarios en release"
if (Test-Path (Join-Path $ReleasePath "logs")) { Remove-Item -Recurse -Force (Join-Path $ReleasePath "logs") }
if (Test-Path (Join-Path $ReleasePath "back\\logs")) { Remove-Item -Recurse -Force (Join-Path $ReleasePath "back\\logs") }
if (Test-Path (Join-Path $ReleasePath "demonio_eventos\\logs")) { Remove-Item -Recurse -Force (Join-Path $ReleasePath "demonio_eventos\\logs") }

Remove-DirsByName $ReleasePath @("test", "tests", "__tests__", ".cache", "coverage", ".git", ".github", ".vscode", "@types")
Remove-FilesByExt $ReleasePath @(".map", ".ts", ".tsx", ".d.ts", ".md", ".markdown", ".pdf", ".pdb")

Write-Step "Listo. Carpeta release generada en:"
Write-Host $ReleasePath
