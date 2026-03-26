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
Name: "{group}\RE_PLAY_3"; Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\scripts\start.ps1"""; IconFilename: "{app}\assets\RE_PLAY_3.ico"
Name: "{commondesktop}\RE_PLAY_3"; Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\scripts\start.ps1"""; IconFilename: "{app}\assets\RE_PLAY_3.ico"

[Run]
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\scripts\start.ps1"""; Flags: nowait postinstall skipifsilent
