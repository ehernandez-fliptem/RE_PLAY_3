[Setup]
AppName=RE_PLAY_3
AppVersion=1.0
DefaultDirName={autopf}\RE_PLAY_3
DefaultGroupName=RE_PLAY_3
DisableDirPage=no
UsePreviousAppDir=no
OutputDir=output
OutputBaseFilename=RE_PLAY_3_Setup
Compression=lzma
SolidCompression=no
SetupIconFile=assets\RE_PLAY_3.ico
AppId=RE_PLAY_3

[Files]
Source: "release\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs; Excludes: "*.log;*.map;*.ts;*.tsx;*.d.ts;*.md;*.markdown;*.pdf;*.pdb;logs\*;back\logs\*;demonio_eventos\logs\*;test\*;tests\*;__tests__\*;docs\*;doc\*;.cache\*;coverage\*;.git\*;.vscode\*;.github\*"
Source: "assets\RE_PLAY_3.ico"; DestDir: "{app}\assets"

[Icons]
Name: "{group}\RE_PLAY_3"; Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\scripts\start.ps1"""; IconFilename: "{app}\assets\RE_PLAY_3.ico"
Name: "{commondesktop}\RE_PLAY_3"; Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\scripts\start.ps1"""; IconFilename: "{app}\assets\RE_PLAY_3.ico"

[Run]
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\scripts\start.ps1"""; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}\logs"
Type: filesandordirs; Name: "{commonappdata}\RE_PLAY_3\logs"

[Code]
var
  PortsPage: TInputQueryWizardPage;

function IsValidPort(Value: string): Boolean;
var
  P: Integer;
begin
  Result := False;
  if (Length(Value) < 2) or (Length(Value) > 5) then
    Exit;
  P := StrToIntDef(Value, -1);
  if (P < 1) or (P > 65535) then
    Exit;
  Result := True;
end;

procedure InitializeWizard();
begin
  PortsPage := CreateInputQueryPage(wpSelectDir,
    'Puertos HTTP/HTTPS',
    'Configura los puertos del servidor',
    'Ingresa los puertos que deseas usar. Deben ser numeros entre 1 y 65535.');

  PortsPage.Add('Puerto HTTP:', False);
  PortsPage.Add('Puerto HTTPS:', False);
  PortsPage.Values[0] := '3000';
  PortsPage.Values[1] := '443';
end;

function NextButtonClick(CurPageID: Integer): Boolean;
var
  RC: Integer;
begin
  Result := True;
  if CurPageID = PortsPage.ID then
  begin
    WizardForm.StatusLabel.Caption := 'Verificando puertos...';
    WizardForm.StatusLabel.Refresh;

    if not IsValidPort(PortsPage.Values[0]) then
    begin
      MsgBox('Puerto HTTP invalido. Debe ser un numero entre 1 y 65535.', mbError, MB_OK);
      WizardForm.StatusLabel.Caption := '';
      Result := False;
      Exit;
    end;
    if not IsValidPort(PortsPage.Values[1]) then
    begin
      MsgBox('Puerto HTTPS invalido. Debe ser un numero entre 1 y 65535.', mbError, MB_OK);
      WizardForm.StatusLabel.Caption := '';
      Result := False;
      Exit;
    end;

    { Verificar si el puerto HTTP esta en uso }
    Exec('powershell.exe',
      '-NoProfile -Command "try { $p=' + PortsPage.Values[0] + '; $c = New-Object System.Net.Sockets.TcpClient; $iar=$c.BeginConnect(''127.0.0.1'',$p,$null,$null); if ($iar.AsyncWaitHandle.WaitOne(200)) { if ($c.Connected) { exit 1 } } $c.Close(); exit 0 } catch { exit 0 }"',
      '', SW_HIDE, ewWaitUntilTerminated, RC);
    if RC <> 0 then
    begin
      MsgBox('Puerto HTTP ocupado. Elige otro.', mbError, MB_OK);
      WizardForm.StatusLabel.Caption := '';
      Result := False;
      Exit;
    end;

    { Verificar si el puerto HTTPS esta en uso }
    Exec('powershell.exe',
      '-NoProfile -Command "try { $p=' + PortsPage.Values[1] + '; $c = New-Object System.Net.Sockets.TcpClient; $iar=$c.BeginConnect(''127.0.0.1'',$p,$null,$null); if ($iar.AsyncWaitHandle.WaitOne(200)) { if ($c.Connected) { exit 1 } } $c.Close(); exit 0 } catch { exit 0 }"',
      '', SW_HIDE, ewWaitUntilTerminated, RC);
    if RC <> 0 then
    begin
      MsgBox('Puerto HTTPS ocupado. Elige otro.', mbError, MB_OK);
      WizardForm.StatusLabel.Caption := '';
      Result := False;
      Exit;
    end;

    WizardForm.StatusLabel.Caption := '';
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  ConfigPath: string;
  JsonText: string;
begin
  if CurStep = ssPostInstall then
  begin
    ConfigPath := ExpandConstant('{app}\config\config.json');
    JsonText :=
      '{' + #13#10 +
      '  "httpPort": ' + PortsPage.Values[0] + ',' + #13#10 +
      '  "httpsPort": ' + PortsPage.Values[1] + ',' + #13#10 +
      '  "openBrowser": true' + #13#10 +
      '}';
    SaveStringToFile(ConfigPath, JsonText, False);
  end;
end;
