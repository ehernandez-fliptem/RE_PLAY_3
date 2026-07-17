using System.Security.Cryptography;

namespace SupremaAgent.Biometrics;

/// <summary>
/// Lector simulado para desarrollar la web sin BioMini conectado.
///
/// SOLO DESARROLLO. Se activa con Agent:Mode = "mock" en appsettings y el
/// agente lo grita en el log y en /status (Mode = "mock") para que nadie lo
/// confunda con el real. El instalador de produccion publica en modo "real".
///
/// No imita el matching de Suprema: identifica devolviendo la primera plantilla
/// cargada. Sirve para probar la UI y el flujo de autorizacion del backend,
/// no para evaluar precision biometrica.
/// </summary>
public sealed class MockBiometricDevice : IBiometricDevice
{
    private readonly ILogger<MockBiometricDevice> _log;
    private CancellationTokenSource? _current;

    public string Mode => "mock";

    public MockBiometricDevice(ILogger<MockBiometricDevice> log)
    {
        _log = log;
        _log.LogWarning("Agente en modo MOCK: no hay hardware real. No usar en produccion.");
    }

    public Task<DeviceStatus> GetStatusAsync() => Task.FromResult(new DeviceStatus
    {
        SdkReady = true,
        Connected = true,
        DeviceCount = 1,
        DeviceName = "BioMini Slim 2 (simulado)",
        SerialNumber = "MOCK-0000",
        Mode = Mode,
    });

    public async Task<CaptureResult> CaptureAsync(CancellationToken ct)
    {
        _current = CancellationTokenSource.CreateLinkedTokenSource(ct);
        try
        {
            // Simula el tiempo que tarda una persona en poner el dedo.
            await Task.Delay(700, _current.Token);
        }
        catch (OperationCanceledException)
        {
            return new CaptureResult { Success = false, Error = "Captura cancelada." };
        }

        var template = RandomNumberGenerator.GetBytes(384);
        return new CaptureResult
        {
            Success = true,
            Quality = 88,
            Format = TemplateFormat.Suprema,
            Template = Convert.ToBase64String(template),
        };
    }

    public void Cancel() => _current?.Cancel();

    public Task<(bool ok, bool matched, string? error)> VerifyAsync(byte[] a, byte[] b)
        => Task.FromResult<(bool, bool, string?)>((true, a.SequenceEqual(b), null));

    public async Task<IdentifyResult> IdentifyAsync(IReadOnlyList<TemplateEntry> candidates, CancellationToken ct)
    {
        var capture = await CaptureAsync(ct);
        if (!capture.Success)
            return new IdentifyResult { Success = false, Error = capture.Error };

        if (candidates.Count == 0)
        {
            return new IdentifyResult
            {
                Success = false,
                Quality = capture.Quality,
                Error = "No hay plantillas cargadas en el agente.",
                Hint = "En modo mock tambien hace falta que la web sincronice las huellas del acceso.",
            };
        }

        var hit = candidates[0];
        return new IdentifyResult
        {
            Success = true,
            Matched = true,
            PersonId = hit.PersonId,
            Finger = hit.Finger,
            Quality = capture.Quality,
            ComparedCount = candidates.Count,
            ElapsedMs = 12,
        };
    }

    public void Dispose() => _current?.Dispose();
}
