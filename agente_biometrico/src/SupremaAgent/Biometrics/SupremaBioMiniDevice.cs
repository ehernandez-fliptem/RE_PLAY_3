using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using SupremaAgent.Biometrics.Interop;
using SupremaAgent.Config;

namespace SupremaAgent.Biometrics;

/// <summary>
/// Implementacion real contra el BioMini via SDK de Suprema.
///
/// Serializa todo el acceso al SDK con un semaforo: UFScanner no es thread-safe
/// y dos capturas simultaneas corrompen el estado del lector. Un solo BioMini
/// por caseta, asi que una operacion a la vez es tambien lo correcto de negocio.
/// </summary>
public sealed class SupremaBioMiniDevice : IBiometricDevice
{
    private const int TemplateBufferSize = 1024;

    private readonly SemaphoreSlim _gate = new(1, 1);
    private readonly ILogger<SupremaBioMiniDevice> _log;
    private readonly AgentOptions _options;

    private bool _sdkInitialized;
    private string? _sdkProblem;
    private string? _sdkHint;
    private IntPtr _scanner = IntPtr.Zero;
    private IntPtr _matcher = IntPtr.Zero;
    private volatile bool _capturing;
    private bool _disposed;

    public string Mode => "real";

    public SupremaBioMiniDevice(ILogger<SupremaBioMiniDevice> log, AgentOptions options)
    {
        _log = log;
        _options = options;
        TryInitSdk();
    }

    /// <summary>
    /// Inicializa UFScanner y UFMatcher. No lanza: guarda el problema para que
    /// /status y /selftest lo reporten en texto entendible.
    /// </summary>
    private void TryInitSdk()
    {
        try
        {
            var st = UFScanner.UFS_Init();
            if (st != UFScanner.UFS_OK)
            {
                _sdkProblem = $"UFS_Init fallo: {UFScanner.ErrorText(st)}";
                _sdkHint = "El SDK cargo pero no pudo inicializar. Suele ser el driver del BioMini: reinstala el driver de Suprema y reconecta el lector.";
                return;
            }

            var mst = UFMatcher.UFM_Create(out _matcher);
            if (mst != UFMatcher.UFM_OK)
            {
                _sdkProblem = $"UFM_Create fallo: {UFMatcher.ErrorText(mst)}";
                _sdkHint = "UFScanner.dll cargo pero UFMatcher.dll no. Verifica que ambas DLL esten juntas y sean de la misma version y arquitectura del SDK.";
                UFScanner.UFS_Uninit();
                return;
            }

            var level = Math.Clamp(_options.SecurityLevel, 1, 7);
            UFMatcher.UFM_SetParameter(_matcher, UFMatcher.UFM_PARAM_SECURITY_LEVEL, ref level);

            _sdkInitialized = true;
            _log.LogInformation("SDK Suprema inicializado. Nivel de seguridad del matcher: {Level}", level);
        }
        catch (DllNotFoundException ex)
        {
            _sdkProblem = $"No se encontro una DLL del SDK: {ex.Message}";
            _sdkHint = "Falta UFScanner.dll o UFMatcher.dll junto al ejecutable. Copialas desde el SDK de Suprema a la carpeta del agente. Ver agente_biometrico/sdk/LEEME.md.";
        }
        catch (BadImageFormatException ex)
        {
            _sdkProblem = $"Arquitectura incorrecta del SDK: {ex.Message}";
            _sdkHint = "Las DLL son x86 y el agente corre en x64 (o al reves). Usa las DLL x64 del SDK, o recompila el agente con PlatformTarget x86.";
        }
        catch (EntryPointNotFoundException ex)
        {
            _sdkProblem = $"La DLL cargo pero falta una funcion esperada: {ex.Message}";
            _sdkHint = "La version del SDK no coincide con las firmas del agente. Manda este mensaje al desarrollador junto con la version del SDK.";
        }
        catch (Exception ex)
        {
            _sdkProblem = $"Error inesperado inicializando el SDK: {ex.Message}";
            _sdkHint = "Manda el detalle completo al desarrollador.";
        }
    }

    public Task<DeviceStatus> GetStatusAsync()
    {
        if (!_sdkInitialized)
        {
            return Task.FromResult(new DeviceStatus
            {
                SdkReady = false,
                Connected = false,
                Mode = Mode,
                Problem = _sdkProblem ?? "SDK no inicializado.",
                Hint = _sdkHint,
            });
        }

        try
        {
            // UFS_Update refresca la lista de scanners conectados; sin esto no se
            // detecta un BioMini que se conecto despues de arrancar el agente.
            UFScanner.UFS_Update();

            var st = UFScanner.UFS_GetScannerNumber(out var count);
            if (st != UFScanner.UFS_OK)
            {
                return Task.FromResult(new DeviceStatus
                {
                    SdkReady = true,
                    Connected = false,
                    Mode = Mode,
                    Problem = $"UFS_GetScannerNumber fallo: {UFScanner.ErrorText(st)}",
                    Hint = "El SDK responde pero no puede enumerar lectores. Reconecta el BioMini.",
                });
            }

            if (count <= 0)
            {
                _scanner = IntPtr.Zero;
                return Task.FromResult(new DeviceStatus
                {
                    SdkReady = true,
                    Connected = false,
                    DeviceCount = 0,
                    Mode = Mode,
                    Problem = "No se detecta ningun lector conectado.",
                    Hint = "Conecta el BioMini Slim 2 por USB. Si ya esta conectado, pruebalo en otro puerto USB (de preferencia USB 2.0 directo, sin hub) y revisa que aparezca en el Administrador de dispositivos de Windows.",
                });
            }

            var hst = UFScanner.UFS_GetScannerHandle(0, out _scanner);
            if (hst != UFScanner.UFS_OK || _scanner == IntPtr.Zero)
            {
                return Task.FromResult(new DeviceStatus
                {
                    SdkReady = true,
                    Connected = false,
                    DeviceCount = count,
                    Mode = Mode,
                    Problem = $"UFS_GetScannerHandle fallo: {UFScanner.ErrorText(hst)}",
                    Hint = "Windows ve el lector pero el SDK no puede tomarlo. Cierra BioStar u otro programa que este usando el BioMini; solo un proceso puede tomarlo a la vez.",
                });
            }

            // El formato de plantilla se fija por scanner, no globalmente.
            var templateType = (int)_options.ResolvedTemplateFormat;
            UFScanner.UFS_SetParameter(_scanner, UFScanner.UFS_PARAM_TEMPLATE_TYPE, ref templateType);

            var serial = ReadSerial(_scanner);

            return Task.FromResult(new DeviceStatus
            {
                SdkReady = true,
                Connected = true,
                DeviceCount = count,
                DeviceName = ReadModel(_scanner),
                SerialNumber = serial,
                Mode = Mode,
            });
        }
        catch (Exception ex)
        {
            return Task.FromResult(new DeviceStatus
            {
                SdkReady = _sdkInitialized,
                Connected = false,
                Mode = Mode,
                Problem = $"Error consultando el lector: {ex.Message}",
                Hint = "Reconecta el BioMini y reinicia el agente.",
            });
        }
    }

    private static string ReadSerial(IntPtr scanner)
    {
        try
        {
            var sb = new StringBuilder(64);
            var st = UFScanner.UFS_GetScannerSN(scanner, sb, out _);
            return st == UFScanner.UFS_OK ? sb.ToString().Trim() : "";
        }
        catch
        {
            // El numero de serie es informativo; su ausencia no bloquea nada.
            return "";
        }
    }

    private static string ReadModel(IntPtr scanner)
    {
        try
        {
            var st = UFScanner.UFS_GetScannerType(scanner, out var type);
            if (st != UFScanner.UFS_OK) return "Lector Suprema";
            // El mapa de UFS_SCANNER_TYPE varia entre versiones del SDK; el
            // codigo crudo basta para identificar el modelo en soporte.
            return $"Lector Suprema (type {type})";
        }
        catch
        {
            return "Lector Suprema";
        }
    }

    public async Task<CaptureResult> CaptureAsync(CancellationToken ct)
    {
        if (!await _gate.WaitAsync(TimeSpan.FromSeconds(1), ct))
        {
            return new CaptureResult
            {
                Success = false,
                Error = "Ya hay una captura en curso.",
                Hint = "Espera a que termine la lectura anterior.",
            };
        }

        try
        {
            var status = await GetStatusAsync();
            if (!status.Connected)
            {
                return new CaptureResult { Success = false, Error = status.Problem, Hint = status.Hint };
            }

            return await Task.Run(() => CaptureCore(ct), ct);
        }
        finally
        {
            _gate.Release();
        }
    }

    private CaptureResult CaptureCore(CancellationToken ct)
    {
        _capturing = true;
        try
        {
            var st = UFScanner.UFS_CaptureSingleImage(_scanner);
            if (ct.IsCancellationRequested)
                return new CaptureResult { Success = false, Error = "Captura cancelada." };

            if (st != UFScanner.UFS_OK)
            {
                return new CaptureResult
                {
                    Success = false,
                    Error = $"No se pudo leer la huella: {UFScanner.ErrorText(st)}",
                    Hint = "Coloca el dedo plano cubriendo toda la ventana del lector y no lo muevas.",
                };
            }

            var buffer = new byte[TemplateBufferSize];
            var est = UFScanner.UFS_ExtractEx(_scanner, TemplateBufferSize, buffer, out var size, out var quality);
            if (est != UFScanner.UFS_OK || size <= 0)
            {
                return new CaptureResult
                {
                    Success = false,
                    Quality = quality,
                    Error = $"No se pudo extraer la plantilla: {UFScanner.ErrorText(est)}",
                    Hint = "La huella se leyo pero no tiene suficientes puntos. Limpia la ventana del lector, seca el dedo y vuelve a intentar.",
                };
            }

            if (quality < _options.MinQuality)
            {
                return new CaptureResult
                {
                    Success = false,
                    Quality = quality,
                    Error = $"Calidad insuficiente ({quality}, minimo {_options.MinQuality}).",
                    Hint = "Presiona un poco mas fuerte y cubre toda la ventana con la yema del dedo.",
                };
            }

            var template = new byte[size];
            Buffer.BlockCopy(buffer, 0, template, 0, size);
            Array.Clear(buffer);

            return new CaptureResult
            {
                Success = true,
                Quality = quality,
                Format = _options.ResolvedTemplateFormat,
                Template = Convert.ToBase64String(template),
            };
        }
        catch (Exception ex)
        {
            return new CaptureResult
            {
                Success = false,
                Error = $"Error durante la captura: {ex.Message}",
                Hint = "Reconecta el lector y reinicia el agente.",
            };
        }
        finally
        {
            _capturing = false;
        }
    }

    public void Cancel()
    {
        if (!_sdkInitialized || _scanner == IntPtr.Zero || !_capturing) return;
        try { UFScanner.UFS_CancelCapture(_scanner); }
        catch (Exception ex) { _log.LogWarning(ex, "UFS_CancelCapture fallo"); }
    }

    public Task<(bool ok, bool matched, string? error)> VerifyAsync(byte[] a, byte[] b)
    {
        if (!_sdkInitialized)
            return Task.FromResult<(bool, bool, string?)>((false, false, _sdkProblem ?? "SDK no inicializado."));

        try
        {
            var st = UFMatcher.UFM_Verify(_matcher, a, a.Length, b, b.Length, out var matched);
            if (st != UFMatcher.UFM_OK)
                return Task.FromResult<(bool, bool, string?)>((false, false, UFMatcher.ErrorText(st)));

            return Task.FromResult<(bool, bool, string?)>((true, matched != 0, null));
        }
        catch (Exception ex)
        {
            return Task.FromResult<(bool, bool, string?)>((false, false, ex.Message));
        }
    }

    public async Task<IdentifyResult> IdentifyAsync(IReadOnlyList<TemplateEntry> candidates, CancellationToken ct)
    {
        var capture = await CaptureAsync(ct);
        if (!capture.Success)
        {
            return new IdentifyResult { Success = false, Error = capture.Error, Hint = capture.Hint, Quality = capture.Quality };
        }

        if (candidates.Count == 0)
        {
            return new IdentifyResult
            {
                Success = false,
                Quality = capture.Quality,
                Error = "No hay plantillas cargadas en el agente.",
                Hint = "La pantalla de caseta aun no ha sincronizado las huellas. Recarga la pagina; si persiste, revisa que haya empleados con huella enrolada en este acceso.",
            };
        }

        var probe = Convert.FromBase64String(capture.Template);
        var sw = Stopwatch.StartNew();

        // UFM_Identify quiere un array de punteros nativos. Los fijamos con
        // GCHandle y liberamos siempre en el finally, incluso si el SDK lanza.
        var handles = new GCHandle[candidates.Count];
        var pointers = new IntPtr[candidates.Count];
        var sizes = new int[candidates.Count];
        try
        {
            for (var i = 0; i < candidates.Count; i++)
            {
                handles[i] = GCHandle.Alloc(candidates[i].Data, GCHandleType.Pinned);
                pointers[i] = handles[i].AddrOfPinnedObject();
                sizes[i] = candidates[i].Data.Length;
            }

            var st = UFMatcher.UFM_Identify(
                _matcher, probe, probe.Length,
                pointers, sizes, candidates.Count,
                _options.IdentifyTimeoutMs,
                out var index);

            sw.Stop();

            if (st != UFMatcher.UFM_OK)
            {
                return new IdentifyResult
                {
                    Success = false,
                    Quality = capture.Quality,
                    ComparedCount = candidates.Count,
                    ElapsedMs = sw.ElapsedMilliseconds,
                    Error = $"El matcher fallo: {UFMatcher.ErrorText(st)}",
                    Hint = "Si esto ocurre siempre, el formato de plantilla del agente y el de BioStar probablemente no coinciden. Corre el self-test.",
                };
            }

            if (index < 0 || index >= candidates.Count)
            {
                return new IdentifyResult
                {
                    Success = true,
                    Matched = false,
                    Quality = capture.Quality,
                    ComparedCount = candidates.Count,
                    ElapsedMs = sw.ElapsedMilliseconds,
                };
            }

            var hit = candidates[index];
            return new IdentifyResult
            {
                Success = true,
                Matched = true,
                PersonId = hit.PersonId,
                Finger = hit.Finger,
                Quality = capture.Quality,
                ComparedCount = candidates.Count,
                ElapsedMs = sw.ElapsedMilliseconds,
            };
        }
        catch (Exception ex)
        {
            return new IdentifyResult
            {
                Success = false,
                Quality = capture.Quality,
                ComparedCount = candidates.Count,
                Error = $"Error identificando: {ex.Message}",
            };
        }
        finally
        {
            foreach (var h in handles)
                if (h.IsAllocated) h.Free();
            Array.Clear(probe);
        }
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        try
        {
            if (_matcher != IntPtr.Zero) UFMatcher.UFM_Delete(_matcher);
            if (_sdkInitialized) UFScanner.UFS_Uninit();
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Error liberando el SDK");
        }
        _gate.Dispose();
    }
}
