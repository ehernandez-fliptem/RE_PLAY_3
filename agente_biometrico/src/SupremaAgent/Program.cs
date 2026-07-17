using System.Net;
using SupremaAgent.Biometrics;
using SupremaAgent.Config;
using SupremaAgent.Endpoints;
using SupremaAgent.Matching;
using SupremaAgent.Security;

var builder = WebApplication.CreateBuilder(args);

// El secreto vive aqui y no en appsettings.json porque ese si se versiona.
// appsettings.Local.json esta en .gitignore. En caseta, el secreto se pone
// directo en el appsettings.json de la carpeta publicada (que no es el repo).
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: false);

var options = new AgentOptions();
builder.Configuration.GetSection(AgentOptions.SectionName).Bind(options);
builder.Services.AddSingleton(options);

// Solo loopback. El agente nunca debe ser alcanzable desde la red: la unica
// pagina que le habla corre en el navegador de esta misma PC.
//
// Se usa HTTP y no HTTPS a proposito: los navegadores tratan http://127.0.0.1
// como origen confiable, asi que una pagina servida por HTTPS (la app en
// https://<ip>:8443) puede llamarlo sin que se bloquee por contenido mixto.
// Eso nos evita instalar y renovar un certificado en cada caseta.
builder.WebHost.ConfigureKestrel(k => k.Listen(IPAddress.Loopback, options.Port));

builder.Services.AddSingleton<TemplateStore>();
builder.Services.AddSingleton<IBiometricDevice>(sp => options.IsMock
    ? new MockBiometricDevice(sp.GetRequiredService<ILogger<MockBiometricDevice>>())
    : new SupremaBioMiniDevice(sp.GetRequiredService<ILogger<SupremaBioMiniDevice>>(), options));

builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
{
    if (options.AllowedOrigins.Length > 0) p.WithOrigins(options.AllowedOrigins);
    else p.SetIsOriginAllowed(_ => true); // sin configurar, el token es la unica defensa
    p.AllowAnyHeader().AllowAnyMethod();
}));

var app = builder.Build();

var log = app.Services.GetRequiredService<ILogger<Program>>();

if (string.IsNullOrWhiteSpace(options.SharedSecret))
{
    log.LogError(
        "Agent:SharedSecret esta vacio en appsettings.json. El agente no puede validar a la web " +
        "ni descifrar plantillas. Configuralo con el mismo valor de AGENTE_BIOMETRICO_SECRET del backend.");
}

app.UseCors();

// Chrome exige un preflight extra cuando una pagina de red privada (la app en
// https://<ip-servidor>:8443) llama a loopback. Sin esta respuesta el fetch
// falla antes de llegar a los endpoints, con un error de CORS enganoso.
app.Use(async (ctx, next) =>
{
    if (HttpMethods.IsOptions(ctx.Request.Method) &&
        ctx.Request.Headers.ContainsKey("Access-Control-Request-Private-Network"))
    {
        ctx.Response.Headers["Access-Control-Allow-Private-Network"] = "true";
    }
    await next();
});

app.MapBiometricEndpoints();
app.MapSelfTestEndpoints();

log.LogInformation(
    "Agente biometrico escuchando en http://127.0.0.1:{Port} (modo {Mode}). Auto-diagnostico: {Url}",
    options.Port, options.Mode, $"http://127.0.0.1:{options.Port}/");

app.Run();
