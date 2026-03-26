# GUIA - GENERAR SETUP.EXE (RE_PLAY_3)

Esta guia explica **paso a paso** como generar el instalador `.exe` usando tu carpeta `release` y `installer.iss`.

---
## 0) Requisitos previos

- Tener Node.js instalado (para correr `build.ps1`)
- Tener Inno Setup instalado (para compilar `installer.iss`)

---
## 1) Generar la carpeta release

Desde la raiz del repo:

```
PowerShell -ExecutionPolicy Bypass -File scripts\build.ps1
```

Verifica que exista:

- `release\back\dist\index.js`
- `release\scripts\start.ps1`

---
## 2) Compilar el instalador (Inno Setup)

### Opcion A: GUI

1. Abre **Inno Setup**.
2. Abre el archivo `installer.iss`.
3. Click en **Compile**.

### Opcion B: Linea de comando (ISCC)

```
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer.iss
```

> Ajusta la ruta si Inno Setup esta en otra carpeta.

---
## 3) Resultado

El instalador queda en:

```
output\RE_PLAY_3_Setup.exe
```

---
## 4) Instalar y ejecutar

1. Ejecuta `output\RE_PLAY_3_Setup.exe`
2. Al terminar, la app se inicia automaticamente.

---
## 5) Comandos extra utiles

### Apagar la app

```
PowerShell -ExecutionPolicy Bypass -File "C:\Program Files\RE_PLAY_3\scripts\stop.ps1"
```

### Arrancar manualmente

```
PowerShell -ExecutionPolicy Bypass -File "C:\Program Files\RE_PLAY_3\scripts\start.ps1"
```

---
## 6) Archivo installer.iss (referencia actual)

```
[Setup]
AppName=RE_PLAY_3
AppVersion=1.0
DefaultDirName={pf}\RE_PLAY_3
DefaultGroupName=RE_PLAY_3
OutputDir=output
OutputBaseFilename=RE_PLAY_3_Setup
Compression=lzma
SolidCompression=yes
SetupIconFile=assets\RE_PLAY_3.ico

[Files]
Source: "release\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs; Excludes: "*.log;*.map;*.ts;*.tsx;*.md;*.pdf;logs\*;back\logs\*;demonio_eventos\logs\*;test\*;tests\*;__tests__\*;docs\*;doc\*;.cache\*;coverage\*;.git\*;.vscode\*"
Source: "assets\RE_PLAY_3.ico"; DestDir: "{app}\assets"

[Icons]
Name: "{group}\RE_PLAY_3"; Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -NoExit -File ""{app}\scripts\start.ps1"""; IconFilename: "{app}\assets\RE_PLAY_3.ico"
Name: "{commondesktop}\RE_PLAY_3"; Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -NoExit -File ""{app}\scripts\start.ps1"""; IconFilename: "{app}\assets\RE_PLAY_3.ico"

[Run]
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\scripts\start.ps1"""; Flags: nowait postinstall skipifsilent
```

