namespace SupremaAgent.Biometrics;

public interface IBiometricDevice : IDisposable
{
    /// <summary>Modo real (SDK Suprema) o mock (desarrollo sin hardware).</summary>
    string Mode { get; }

    /// <summary>
    /// Estado del lector. Nunca lanza: si el SDK no carga o no hay lector,
    /// devuelve SdkReady/Connected en false con Problem y Hint explicando que hacer.
    /// </summary>
    Task<DeviceStatus> GetStatusAsync();

    /// <summary>Captura una huella y extrae la plantilla en el formato configurado.</summary>
    Task<CaptureResult> CaptureAsync(CancellationToken ct);

    /// <summary>Cancela una captura en curso.</summary>
    void Cancel();

    /// <summary>Compara dos plantillas (1:1). Usado por el self-test contra BioStar.</summary>
    Task<(bool ok, bool matched, string? error)> VerifyAsync(byte[] a, byte[] b);

    /// <summary>Captura e identifica (1:N) contra las plantillas cargadas.</summary>
    Task<IdentifyResult> IdentifyAsync(IReadOnlyList<TemplateEntry> candidates, CancellationToken ct);
}
