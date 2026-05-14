param(
    [string]$BasePath = (Resolve-Path (Join-Path $PSScriptRoot "..")),
    [string]$Version = "",
    [string]$InnoCompilerPath = "",
    [switch]$SkipBuild,
    [switch]$ProdOnly
)

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Fail($msg) { Write-Error $msg; exit 1 }

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Version)) {
    $Version = Get-Date -Format "yyyy.MM.dd.HHmm"
}

$buildScript = Join-Path $BasePath "scripts\build.ps1"
$installerIss = Join-Path $BasePath "installer.iss"
$outputDir = Join-Path $BasePath "output"
$outputName = "RE_PLAY_3_Setup_v$Version"

if (!(Test-Path $installerIss)) {
    Fail "No se encontro installer.iss en $installerIss"
}

if (-not $SkipBuild) {
    if (!(Test-Path $buildScript)) {
        Fail "No se encontro scripts\\build.ps1"
    }
    Write-Step "Generando release (build completo)"
    if ($ProdOnly) {
        & powershell -ExecutionPolicy Bypass -File $buildScript -BasePath $BasePath -ProdOnly
    } else {
        & powershell -ExecutionPolicy Bypass -File $buildScript -BasePath $BasePath
    }
    if ($LASTEXITCODE -ne 0) {
        Fail "Fallo scripts\\build.ps1"
    }
}

$releasePath = Join-Path $BasePath "release"
if (!(Test-Path $releasePath)) {
    Fail "No existe la carpeta release. Ejecuta build primero."
}
if (!(Test-Path (Join-Path $releasePath "scripts\start.ps1"))) {
    Fail "release incompleto: falta scripts\\start.ps1"
}
$backIndexDist = Join-Path $releasePath "back\dist\index.js"
$backIndexRoot = Join-Path $releasePath "back\index.js"
if (!(Test-Path $backIndexDist) -and !(Test-Path $backIndexRoot)) {
    Fail "release incompleto: falta back\\dist\\index.js o back\\index.js"
}

if ([string]::IsNullOrWhiteSpace($InnoCompilerPath)) {
    $candidates = @(
        "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
        "C:\Program Files\Inno Setup 6\ISCC.exe"
    )
    $InnoCompilerPath = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
}

if ([string]::IsNullOrWhiteSpace($InnoCompilerPath) -or !(Test-Path $InnoCompilerPath)) {
    Fail "No se encontro ISCC.exe. Instala Inno Setup 6 o pasa -InnoCompilerPath."
}

if (!(Test-Path $outputDir)) {
    New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
}

Write-Step "Compilando installer.iss"
Push-Location $BasePath
& "$InnoCompilerPath" "/DMyAppVersion=$Version" "/DMyOutputBaseFilename=$outputName" "$installerIss"
$isccCode = $LASTEXITCODE
Pop-Location

if ($isccCode -ne 0) {
    Fail "ISCC fallo con codigo $isccCode"
}

$finalExe = Join-Path $outputDir "$outputName.exe"
if (!(Test-Path $finalExe)) {
    Fail "No se encontro el instalador esperado: $finalExe"
}

Write-Step "EXE generado correctamente"
Write-Host "Version: $Version"
Write-Host "Archivo: $finalExe"
