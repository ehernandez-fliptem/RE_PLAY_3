using System.Reflection;
using System.Runtime.InteropServices;
using SupremaAgent.Biometrics;
using SupremaAgent.Config;

namespace SupremaAgent.Endpoints;

/// <summary>
/// Auto-diagnostico. Existe porque quien instala el lector no es quien escribio
/// el codigo: en vez de depurar a distancia, la persona abre esta pagina, corre
/// las pruebas en orden y manda el resultado.
///
/// Sin token a proposito (loopback, y quien lo corre esta fisicamente frente al
/// lector). Se puede apagar con Agent:EnableSelfTest = false una vez en produccion.
/// </summary>
public static class SelfTestEndpoints
{
    public static void MapSelfTestEndpoints(this WebApplication app)
    {
        var options = app.Services.GetRequiredService<AgentOptions>();
        if (!options.EnableSelfTest) return;

        app.MapGet("/", () => Results.Content(SelfTestPage.Html, "text/html; charset=utf-8"));

        // Paso 1: entorno y SDK, sin tocar el lector.
        app.MapGet("/api/selftest/entorno", (IBiometricDevice device) =>
        {
            var dir = AppContext.BaseDirectory;
            string[] requeridas = ["UFScanner.dll", "UFMatcher.dll"];
            var dlls = requeridas.Select(name =>
            {
                var path = Path.Combine(dir, name);
                return new { archivo = name, presente = File.Exists(path), ruta = path };
            }).ToArray();

            return Results.Ok(new
            {
                agente = Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "?",
                proceso = RuntimeInformation.ProcessArchitecture.ToString(),
                so = RuntimeInformation.OSDescription,
                carpeta = dir,
                modo = device.Mode,
                formatoPlantilla = options.TemplateFormat,
                nivelSeguridad = options.SecurityLevel,
                dlls,
                faltantes = dlls.Where(d => !d.presente).Select(d => d.archivo).ToArray(),
            });
        });

        // Paso 2: el SDK inicializo y hay un BioMini conectado.
        app.MapGet("/api/selftest/lector", async (IBiometricDevice device) =>
        {
            var s = await device.GetStatusAsync();
            return Results.Ok(new
            {
                ok = s.SdkReady && s.Connected,
                sdkReady = s.SdkReady,
                conectado = s.Connected,
                modelo = s.DeviceName,
                serie = s.SerialNumber,
                lectores = s.DeviceCount,
                problema = s.Problem,
                hint = s.Hint,
            });
        });

        // Paso 3: una captura real, para ver calidad.
        app.MapPost("/api/selftest/captura", async (IBiometricDevice device, CancellationToken ct) =>
        {
            var r = await device.CaptureAsync(ct);
            return Results.Ok(new
            {
                ok = r.Success,
                calidad = r.Quality,
                formato = r.Format.ToString(),
                // Se reporta el tamano, nunca la plantilla: no queremos biometria
                // en una pantalla que alguien va a fotografiar para mandarla.
                bytesPlantilla = r.Success ? Convert.FromBase64String(r.Template).Length : 0,
                problema = r.Error,
                hint = r.Hint,
            });
        });

        // Paso 4: dos capturas del mismo dedo y verify entre ellas.
        // Prueba que scanner y matcher trabajan juntos, sin meter a BioStar todavia.
        app.MapPost("/api/selftest/match-propio", async (IBiometricDevice device, CancellationToken ct) =>
        {
            var a = await device.CaptureAsync(ct);
            if (!a.Success) return Results.Ok(new { ok = false, paso = 1, problema = a.Error, hint = a.Hint });

            await Task.Delay(1200, ct); // tiempo para levantar y reponer el dedo

            var b = await device.CaptureAsync(ct);
            if (!b.Success) return Results.Ok(new { ok = false, paso = 2, problema = b.Error, hint = b.Hint });

            var (ok, matched, error) = await device.VerifyAsync(
                Convert.FromBase64String(a.Template), Convert.FromBase64String(b.Template));

            return Results.Ok(new
            {
                ok,
                coincide = matched,
                calidad1 = a.Quality,
                calidad2 = b.Quality,
                problema = error,
                hint = ok && !matched
                    ? "Las dos lecturas del mismo dedo no coincidieron. Repite cuidando que sea el MISMO dedo y bien centrado. Si vuelve a fallar, baja Agent:SecurityLevel a 3 y reintenta."
                    : null,
            });
        });

        // Paso 5: LA PRUEBA QUE IMPORTA.
        // Compara una plantilla exportada de BioStar contra una captura del BioMini.
        // Si esto da match, todo el diseno de identificacion 1:N es viable.
        // Si no, hay que cambiar el formato de plantilla (o replantear el enfoque).
        app.MapPost("/api/selftest/match-biostar", async (
            HttpContext ctx, IBiometricDevice device, CancellationToken ct) =>
        {
            var body = await ctx.Request.ReadFromJsonAsync<BiostarMatchRequest>(ct);
            if (body is null || string.IsNullOrWhiteSpace(body.Template))
                return Results.BadRequest(new { ok = false, problema = "Pega la plantilla de BioStar primero." });

            byte[] biostarTemplate;
            try
            {
                biostarTemplate = Convert.FromBase64String(body.Template.Trim());
            }
            catch
            {
                return Results.Ok(new
                {
                    ok = false,
                    problema = "La plantilla pegada no es base64 valido.",
                    hint = "Copiala completa, sin comillas ni saltos de linea de mas.",
                });
            }

            var capture = await device.CaptureAsync(ct);
            if (!capture.Success)
                return Results.Ok(new { ok = false, problema = capture.Error, hint = capture.Hint });

            var (ok, matched, error) = await device.VerifyAsync(
                Convert.FromBase64String(capture.Template), biostarTemplate);

            return Results.Ok(new
            {
                ok,
                coincide = matched,
                calidad = capture.Quality,
                bytesBioStar = biostarTemplate.Length,
                bytesBioMini = Convert.FromBase64String(capture.Template).Length,
                problema = error,
                hint = ok && !matched
                    ? "No coincidio. Antes de concluir que los formatos son incompatibles: (1) confirma que la huella pegada es del MISMO dedo de la MISMA persona que acaba de poner el dedo; (2) revisa en BioStar el formato en Settings -> Server -> Fingerprint Template Format y pon el mismo valor en Agent:TemplateFormat del agente (suprema / iso / ansi); (3) reintenta. Si con los tres formatos no coincide, avisa al desarrollador: el diseno cambia."
                    : null,
            });
        });
    }

    private sealed record BiostarMatchRequest(string Template);
}
