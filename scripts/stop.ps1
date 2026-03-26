param()

$ErrorActionPreference = "Stop"

Write-Host "`n==> Deteniendo procesos node.exe"
taskkill /F /IM node.exe
