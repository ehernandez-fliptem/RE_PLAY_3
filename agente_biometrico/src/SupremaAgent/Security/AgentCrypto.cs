using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace SupremaAgent.Security;

/// <summary>
/// Cripto compartida con el backend de RE_PLAY. Cualquier cambio aqui debe
/// reflejarse en back/utils/agenteBiometrico.ts o el agente dejara de entender
/// al backend.
///
/// Deliberadamente NO reutiliza el esquema de crypto-js del proyecto
/// (encryptPassword/decryptPassword): ese usa el KDF legacy de OpenSSL
/// (EVP_BytesToKey con MD5) y no tiene autenticacion. Para plantillas
/// biometricas usamos AES-256-GCM con PBKDF2, que ademas detecta manipulacion.
/// </summary>
public static class AgentCrypto
{
    private const int SaltSize = 16;
    private const int IvSize = 12;
    private const int TagSize = 16;
    private const int KeySize = 32;
    private const int Iterations = 100_000;

    /// <summary>
    /// Descifra un paquete producido por el backend.
    /// Formato: base64( salt(16) | iv(12) | tag(16) | ciphertext ).
    /// </summary>
    public static string DecryptBundle(string base64Bundle, string secret)
    {
        var raw = Convert.FromBase64String(base64Bundle);
        if (raw.Length <= SaltSize + IvSize + TagSize)
            throw new CryptographicException("El paquete de plantillas esta truncado o corrupto.");

        var salt = raw.AsSpan(0, SaltSize).ToArray();
        var iv = raw.AsSpan(SaltSize, IvSize).ToArray();
        var tag = raw.AsSpan(SaltSize + IvSize, TagSize).ToArray();
        var cipher = raw.AsSpan(SaltSize + IvSize + TagSize).ToArray();

        var key = DeriveKey(secret, salt);
        var plain = new byte[cipher.Length];
        try
        {
            using var aes = new AesGcm(key, TagSize);
            aes.Decrypt(iv, cipher, tag, plain);
            return Encoding.UTF8.GetString(plain);
        }
        catch (CryptographicException)
        {
            // GCM no distingue "llave equivocada" de "paquete alterado": ambos
            // fallan igual al verificar el tag. Se nombran los dos casos en vez
            // de adivinar, con el probable primero.
            throw new CryptographicException(
                "No se pudo descifrar el paquete de plantillas. Casi siempre es que Agent:SharedSecret " +
                "del agente no coincide con AGENTE_BIOMETRICO_SECRET del backend; si los dos son iguales, " +
                "el paquete llego alterado o incompleto.");
        }
        finally
        {
            Array.Clear(key);
            Array.Clear(plain);
        }
    }

    private static byte[] DeriveKey(string secret, byte[] salt)
        => Rfc2898DeriveBytes.Pbkdf2(Encoding.UTF8.GetBytes(secret), salt, Iterations, HashAlgorithmName.SHA256, KeySize);

    /// <summary>
    /// Valida el token que la web obtuvo del backend.
    /// Formato: base64url(payloadJson) "." base64url(HMAC-SHA256(secret, payloadJson)).
    /// </summary>
    public static (bool ok, string? error) VerifyToken(string token, string secret)
    {
        if (string.IsNullOrWhiteSpace(token)) return (false, "Token vacio.");

        var parts = token.Split('.');
        if (parts.Length != 2) return (false, "Token con formato invalido.");

        byte[] payloadBytes;
        byte[] signature;
        try
        {
            payloadBytes = FromBase64Url(parts[0]);
            signature = FromBase64Url(parts[1]);
        }
        catch
        {
            return (false, "Token con formato invalido.");
        }

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var expected = hmac.ComputeHash(payloadBytes);

        // Comparacion en tiempo constante: evita distinguir firmas por latencia.
        if (!CryptographicOperations.FixedTimeEquals(expected, signature))
            return (false, "Firma del token invalida.");

        try
        {
            using var doc = JsonDocument.Parse(payloadBytes);
            if (!doc.RootElement.TryGetProperty("exp", out var expProp))
                return (false, "Token sin expiracion.");

            var exp = expProp.GetInt64();
            if (DateTimeOffset.UtcNow.ToUnixTimeSeconds() > exp)
                return (false, "Token expirado.");
        }
        catch
        {
            return (false, "Token ilegible.");
        }

        return (true, null);
    }

    private static byte[] FromBase64Url(string value)
    {
        var s = value.Replace('-', '+').Replace('_', '/');
        return Convert.FromBase64String(s.PadRight(s.Length + (4 - s.Length % 4) % 4, '='));
    }
}
