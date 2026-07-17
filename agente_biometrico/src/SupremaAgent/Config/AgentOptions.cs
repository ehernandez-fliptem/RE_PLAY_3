using SupremaAgent.Biometrics;

namespace SupremaAgent.Config;

public sealed class AgentOptions
{
    public const string SectionName = "Agent";

    /// <summary>"real" (SDK Suprema) o "mock" (desarrollo sin hardware).</summary>
    public string Mode { get; set; } = "real";

    /// <summary>Puerto en 127.0.0.1. Debe coincidir con el que usa la web.</summary>
    public int Port { get; set; } = 8790;

    /// <summary>
    /// Secreto compartido con el backend de RE_PLAY. Sirve para dos cosas:
    /// validar el token que manda la web y descifrar el paquete de plantillas.
    /// Debe ser identico a AGENTE_BIOMETRICO_SECRET en el .env del backend.
    /// </summary>
    public string SharedSecret { get; set; } = "";

    /// <summary>Origenes web autorizados a hablar con el agente (CORS).</summary>
    public string[] AllowedOrigins { get; set; } = [];

    /// <summary>
    /// Formato de plantilla. Debe coincidir con BioStar
    /// (Settings -> Server -> Fingerprint Template Format).
    /// Valores: "suprema", "iso", "ansi".
    /// </summary>
    public string TemplateFormat { get; set; } = "suprema";

    /// <summary>Nivel de seguridad del matcher, 1-7. Mas alto = menos falsos positivos.</summary>
    public int SecurityLevel { get; set; } = 4;

    /// <summary>Calidad minima aceptable de captura, 0-100.</summary>
    public int MinQuality { get; set; } = 50;

    /// <summary>Timeout del 1:N en milisegundos.</summary>
    public int IdentifyTimeoutMs { get; set; } = 5000;

    /// <summary>
    /// Expone la pagina de auto-diagnostico en http://127.0.0.1:{Port}/.
    /// Se deja encendido durante la instalacion y las pruebas; una vez que la
    /// caseta opera, conviene apagarlo (permite capturar sin token).
    /// </summary>
    public bool EnableSelfTest { get; set; } = true;

    public TemplateFormat ResolvedTemplateFormat => TemplateFormat.Trim().ToLowerInvariant() switch
    {
        "iso" or "iso19794" or "iso19794-2" => Biometrics.TemplateFormat.Iso19794_2,
        "ansi" or "ansi378" => Biometrics.TemplateFormat.Ansi378,
        _ => Biometrics.TemplateFormat.Suprema,
    };

    public bool IsMock => Mode.Trim().Equals("mock", StringComparison.OrdinalIgnoreCase);
}
