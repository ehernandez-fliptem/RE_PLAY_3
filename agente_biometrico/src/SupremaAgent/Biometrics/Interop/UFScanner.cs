using System.Runtime.InteropServices;
using System.Text;

namespace SupremaAgent.Biometrics.Interop;

/// <summary>
/// P/Invoke contra UFScanner.dll del SDK de Suprema (BioMini).
///
/// IMPORTANTE PARA QUIEN TENGA EL SDK:
/// Estas firmas siguen la API publica documentada de UFScanner, pero NO han
/// sido compiladas contra los headers reales. Antes de la primera prueba,
/// compara contra UFScanner.h del SDK descargado. Si alguna firma no coincide,
/// el sintoma tipico es EntryPointNotFoundException (nombre distinto) o una
/// AccessViolationException (tamano/tipo de parametro distinto).
///
/// El self-test (/api/biometric/selftest) reporta exactamente cual de estas
/// llamadas fallo y con que codigo, para no depurar a ciegas.
/// </summary>
internal static class UFScanner
{
    private const string Dll = "UFScanner.dll";

    // UFS_STATUS: 0 = OK. El resto se traduce con UFS_GetErrorString para no
    // hardcodear una tabla de errores que puede cambiar entre versiones del SDK.
    public const int UFS_OK = 0;

    // UFS_PARAM_* — parametro para fijar el formato de plantilla del scanner.
    public const int UFS_PARAM_TEMPLATE_TYPE = 300;

    [DllImport(Dll, CallingConvention = CallingConvention.StdCall)]
    public static extern int UFS_Init();

    [DllImport(Dll, CallingConvention = CallingConvention.StdCall)]
    public static extern int UFS_Uninit();

    [DllImport(Dll, CallingConvention = CallingConvention.StdCall)]
    public static extern int UFS_Update();

    [DllImport(Dll, CallingConvention = CallingConvention.StdCall)]
    public static extern int UFS_GetScannerNumber(out int nScannerNumber);

    [DllImport(Dll, CallingConvention = CallingConvention.StdCall)]
    public static extern int UFS_GetScannerHandle(int nScannerIndex, out IntPtr hScanner);

    [DllImport(Dll, CallingConvention = CallingConvention.StdCall)]
    public static extern int UFS_GetScannerType(IntPtr hScanner, out int pScannerType);

    [DllImport(Dll, CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi)]
    public static extern int UFS_GetScannerSN(IntPtr hScanner, StringBuilder sSerial, out int nLength);

    [DllImport(Dll, CallingConvention = CallingConvention.StdCall)]
    public static extern int UFS_SetParameter(IntPtr hScanner, int nParam, ref int pValue);

    [DllImport(Dll, CallingConvention = CallingConvention.StdCall)]
    public static extern int UFS_CaptureSingleImage(IntPtr hScanner);

    [DllImport(Dll, CallingConvention = CallingConvention.StdCall)]
    public static extern int UFS_CancelCapture(IntPtr hScanner);

    /// <param name="pQuality">Calidad del enrolamiento, 0-100.</param>
    [DllImport(Dll, CallingConvention = CallingConvention.StdCall)]
    public static extern int UFS_ExtractEx(
        IntPtr hScanner,
        int nTemplateBufferSize,
        [Out] byte[] pTemplate,
        out int pTemplateSize,
        out int pQuality);

    [DllImport(Dll, CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi)]
    public static extern int UFS_GetErrorString(int nErrorCode, StringBuilder sErrorString);

    /// <summary>Traduce un UFS_STATUS a texto usando el propio SDK.</summary>
    public static string ErrorText(int status)
    {
        try
        {
            var sb = new StringBuilder(256);
            if (UFS_GetErrorString(status, sb) == UFS_OK && sb.Length > 0)
                return $"{sb} (UFS_STATUS {status})";
        }
        catch
        {
            // Si ni GetErrorString resuelve, devolvemos el codigo crudo.
        }
        return $"UFS_STATUS {status}";
    }
}
