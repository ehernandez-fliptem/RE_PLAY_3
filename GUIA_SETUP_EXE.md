# GUIA - GENERAR SETUP.EXE ACTUALIZADO (RE_PLAY_3)

Esta guia deja listo el instalador con la version actual del sistema.

## 1) Requisitos

- Node.js instalado y en `PATH`.
- Inno Setup 6 instalado (`ISCC.exe`).

## 2) Comando recomendado (todo en uno)

Desde la raiz del repo:

```powershell
PowerShell -ExecutionPolicy Bypass -File scripts\make-exe.ps1
```

Esto hace:

1. Build de `front`, `back`, `panel_server`, `demonio_eventos`.
2. Genera carpeta `release` limpia.
3. Compila `installer.iss` con version automatica.
4. Crea el instalador en `output`.

## 3) Version manual (opcional)

Si quieres controlar la version del instalador:

```powershell
PowerShell -ExecutionPolicy Bypass -File scripts\make-exe.ps1 -Version 2026.05.14.01
```

El resultado sera:

```text
output\RE_PLAY_3_Setup_v2026.05.14.01.exe
```

## 4) Opciones utiles

- Compilar EXE sin reconstruir release:

```powershell
PowerShell -ExecutionPolicy Bypass -File scripts\make-exe.ps1 -SkipBuild
```

- Build release recortando dependencias dev:

```powershell
PowerShell -ExecutionPolicy Bypass -File scripts\make-exe.ps1 -ProdOnly
```

- Si `ISCC.exe` no esta en ruta estandar:

```powershell
PowerShell -ExecutionPolicy Bypass -File scripts\make-exe.ps1 -InnoCompilerPath "C:\Ruta\ISCC.exe"
```

## 5) Instalacion y uso

1. Ejecuta el `.exe` generado en `output`.
2. Define puertos en el asistente de instalacion.
3. Al terminar, se inicia `scripts\start.ps1`.

## 6) Operacion post-instalacion

- Arrancar manual:

```powershell
PowerShell -ExecutionPolicy Bypass -File "C:\Program Files\RE_PLAY_3\scripts\start.ps1"
```

- Detener manual:

```powershell
PowerShell -ExecutionPolicy Bypass -File "C:\Program Files\RE_PLAY_3\scripts\stop.ps1"
```

## 7) Notas de versionado del instalador

- `installer.iss` ahora acepta version dinamica por parametro (`MyAppVersion`).
- Si no pasas `-Version`, se usa timestamp (`yyyy.MM.dd.HHmm`).
