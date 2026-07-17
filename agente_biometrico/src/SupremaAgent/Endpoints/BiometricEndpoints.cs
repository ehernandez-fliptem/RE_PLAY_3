using SupremaAgent.Biometrics;
using SupremaAgent.Config;
using SupremaAgent.Matching;
using SupremaAgent.Security;

namespace SupremaAgent.Endpoints;

public static class BiometricEndpoints
{
    /// <summary>
    /// Valida el token emitido por el backend de RE_PLAY.
    /// CORS no sirve como autenticacion: restringe a paginas web, pero cualquier
    /// programa local puede pegarle al agente sin navegador. El token si.
    /// </summary>
    private static IResult? RequireToken(HttpContext ctx, AgentOptions options)
    {
        if (string.IsNullOrWhiteSpace(options.SharedSecret))
            return Results.Json(new { estado = false, mensaje = "El agente no tiene secreto configurado." }, statusCode: 503);

        var token = ctx.Request.Headers["x-agent-token"].ToString();
        var (ok, error) = AgentCrypto.VerifyToken(token, options.SharedSecret);
        return ok ? null : Results.Json(new { estado = false, mensaje = error ?? "No autorizado." }, statusCode: 401);
    }

    public static void MapBiometricEndpoints(this WebApplication app)
    {
        var g = app.MapGroup("/api/biometric");

        // Estado del lector. Sin token: la web lo consulta para pintar el
        // indicador de "lector conectado" y no expone nada sensible.
        g.MapGet("/status", async (IBiometricDevice device, TemplateStore store) =>
        {
            var status = await device.GetStatusAsync();
            var (count, acceso, loadedAt) = store.Snapshot();
            return Results.Ok(new
            {
                available = true,
                connected = status.Connected,
                sdkReady = status.SdkReady,
                deviceName = status.DeviceName,
                serialNumber = status.SerialNumber,
                mode = status.Mode,
                problem = status.Problem,
                hint = status.Hint,
                templates = new { count, acceso, loadedAt },
            });
        });

        // Carga el paquete cifrado de plantillas del acceso. La web solo lo
        // transporta: el contenido va cifrado del backend al agente, el
        // navegador nunca ve una huella en claro.
        g.MapPost("/templates", async (HttpContext ctx, AgentOptions options, TemplateStore store) =>
        {
            if (RequireToken(ctx, options) is { } deny) return deny;

            var body = await ctx.Request.ReadFromJsonAsync<LoadTemplatesRequest>();
            if (body is null || string.IsNullOrWhiteSpace(body.Bundle))
                return Results.BadRequest(new { estado = false, mensaje = "Falta el paquete de plantillas." });

            var (ok, count, error) = store.Load(body.Bundle);
            return ok
                ? Results.Ok(new { estado = true, cargadas = count })
                : Results.Json(new { estado = false, mensaje = error }, statusCode: 400);
        });

        // Captura e identifica (1:N). Devuelve solo el id interno de la persona;
        // la plantilla capturada nunca sale del agente.
        g.MapPost("/identify", async (HttpContext ctx, AgentOptions options, IBiometricDevice device, TemplateStore store) =>
        {
            if (RequireToken(ctx, options) is { } deny) return deny;

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ctx.RequestAborted);
            cts.CancelAfter(TimeSpan.FromSeconds(30));

            var result = await device.IdentifyAsync(store.Current, cts.Token);
            return Results.Ok(new
            {
                estado = result.Success,
                identificado = result.Matched,
                personId = result.PersonId,
                dedo = result.Finger,
                calidad = result.Quality,
                comparadas = result.ComparedCount,
                ms = result.ElapsedMs,
                mensaje = result.Error,
                hint = result.Hint,
            });
        });

        // Captura cruda. La usa el enrolamiento, que si necesita la plantilla
        // para mandarla a BioStar via backend.
        g.MapPost("/capture", async (HttpContext ctx, AgentOptions options, IBiometricDevice device) =>
        {
            if (RequireToken(ctx, options) is { } deny) return deny;

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ctx.RequestAborted);
            cts.CancelAfter(TimeSpan.FromSeconds(30));

            var result = await device.CaptureAsync(cts.Token);
            return Results.Ok(new
            {
                estado = result.Success,
                calidad = result.Quality,
                formato = result.Format.ToString(),
                template = result.Success ? result.Template : null,
                mensaje = result.Error,
                hint = result.Hint,
            });
        });

        g.MapPost("/cancel", (HttpContext ctx, AgentOptions options, IBiometricDevice device) =>
        {
            if (RequireToken(ctx, options) is { } deny) return deny;
            device.Cancel();
            return Results.Ok(new { estado = true });
        });
    }

    private sealed record LoadTemplatesRequest(string Bundle);
}
