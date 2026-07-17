namespace SupremaAgent.Biometrics;

/// <summary>
/// Formato de plantilla biometrica. Debe coincidir con el que BioStar tiene
/// configurado en Settings -> Server -> Fingerprint Template Format, o el
/// matching contra las plantillas de BioStar dara siempre "no match".
/// </summary>
public enum TemplateFormat
{
    Suprema = 2001,
    Iso19794_2 = 2002,
    Ansi378 = 2003,
}

public sealed record DeviceStatus
{
    public bool SdkReady { get; init; }
    public bool Connected { get; init; }
    public string DeviceName { get; init; } = "";
    public string SerialNumber { get; init; } = "";
    public int DeviceCount { get; init; }
    public string Mode { get; init; } = "real";
    /// <summary>Motivo entendible cuando SdkReady o Connected son false.</summary>
    public string? Problem { get; init; }
    /// <summary>Que debe hacer el operador para resolverlo.</summary>
    public string? Hint { get; init; }
}

public sealed record CaptureResult
{
    public bool Success { get; init; }
    public int Quality { get; init; }
    public TemplateFormat Format { get; init; }
    /// <summary>Plantilla en base64. Nunca se escribe a log ni a disco.</summary>
    public string Template { get; init; } = "";
    public string? Error { get; init; }
    public string? Hint { get; init; }
}

public sealed record IdentifyResult
{
    public bool Success { get; init; }
    public bool Matched { get; init; }
    public int Quality { get; init; }
    /// <summary>Id interno de la persona (Empleados._id) que resolvio el match.</summary>
    public string? PersonId { get; init; }
    public int? Finger { get; init; }
    public int ComparedCount { get; init; }
    public long ElapsedMs { get; init; }
    public string? Error { get; init; }
    public string? Hint { get; init; }
}

/// <summary>Una plantilla cargada en memoria para el matching 1:N.</summary>
public sealed record TemplateEntry
{
    public required string PersonId { get; init; }
    public required int Finger { get; init; }
    public required byte[] Data { get; init; }
}
