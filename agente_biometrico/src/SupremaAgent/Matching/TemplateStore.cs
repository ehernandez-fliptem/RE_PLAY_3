using System.Text.Json;
using SupremaAgent.Biometrics;
using SupremaAgent.Config;
using SupremaAgent.Security;

namespace SupremaAgent.Matching;

/// <summary>
/// Plantillas del acceso, en memoria y nada mas.
///
/// Decisiones deliberadas:
/// - Nunca tocan disco. Si roban la PC de caseta apagada, no hay biometria que llevarse.
/// - TTL: si la web deja de refrescar (pestana cerrada, PC olvidada encendida),
///   las plantillas se vacian solas y el lector deja de identificar.
/// - Solo llegan las personas autorizadas en ESE acceso, no el padron completo.
/// </summary>
public sealed class TemplateStore
{
    private readonly ILogger<TemplateStore> _log;
    private readonly AgentOptions _options;
    private readonly object _sync = new();

    private List<TemplateEntry> _entries = [];
    private DateTimeOffset _loadedAt = DateTimeOffset.MinValue;
    private string _accesoId = "";
    private static readonly TimeSpan Ttl = TimeSpan.FromMinutes(30);

    public TemplateStore(ILogger<TemplateStore> log, AgentOptions options)
    {
        _log = log;
        _options = options;
    }

    private sealed record BundlePayload(string acceso, BundleItem[] items);
    private sealed record BundleItem(string personId, int finger, string template);

    /// <summary>Descifra y carga el paquete que mando el backend a traves de la web.</summary>
    public (bool ok, int count, string? error) Load(string encryptedBundle)
    {
        string json;
        try
        {
            json = AgentCrypto.DecryptBundle(encryptedBundle, _options.SharedSecret);
        }
        catch (Exception ex)
        {
            _log.LogError("Fallo al descifrar el paquete de plantillas: {Message}", ex.Message);
            return (false, 0, ex.Message);
        }

        BundlePayload? payload;
        try
        {
            payload = JsonSerializer.Deserialize<BundlePayload>(json);
        }
        catch (Exception ex)
        {
            return (false, 0, $"Paquete ilegible: {ex.Message}");
        }
        finally
        {
            json = "";
        }

        if (payload is null) return (false, 0, "Paquete vacio.");

        var entries = new List<TemplateEntry>(payload.items.Length);
        var descartadas = 0;
        foreach (var item in payload.items)
        {
            try
            {
                entries.Add(new TemplateEntry
                {
                    PersonId = item.personId,
                    Finger = item.finger,
                    Data = Convert.FromBase64String(item.template),
                });
            }
            catch
            {
                // Una plantilla corrupta no debe tumbar la caseta entera.
                descartadas++;
            }
        }

        lock (_sync)
        {
            foreach (var old in _entries) Array.Clear(old.Data);
            _entries = entries;
            _loadedAt = DateTimeOffset.UtcNow;
            _accesoId = payload.acceso;
        }

        if (descartadas > 0)
            _log.LogWarning("{Count} plantillas se descartaron por estar corruptas.", descartadas);

        _log.LogInformation("Cargadas {Count} plantillas para el acceso {Acceso}.", entries.Count, payload.acceso);
        return (true, entries.Count, null);
    }

    /// <summary>Plantillas vigentes. Vacio si expiraron o nunca se cargaron.</summary>
    public IReadOnlyList<TemplateEntry> Current
    {
        get
        {
            lock (_sync)
            {
                if (_entries.Count > 0 && DateTimeOffset.UtcNow - _loadedAt > Ttl)
                {
                    _log.LogInformation("Plantillas expiradas ({Ttl} min sin refrescar); se limpian.", Ttl.TotalMinutes);
                    ClearCore();
                }
                return _entries;
            }
        }
    }

    public (int count, string acceso, DateTimeOffset? loadedAt) Snapshot()
    {
        lock (_sync)
        {
            return (_entries.Count, _accesoId, _loadedAt == DateTimeOffset.MinValue ? null : _loadedAt);
        }
    }

    public void Clear()
    {
        lock (_sync) ClearCore();
    }

    private void ClearCore()
    {
        foreach (var e in _entries) Array.Clear(e.Data);
        _entries = [];
        _loadedAt = DateTimeOffset.MinValue;
        _accesoId = "";
    }
}
