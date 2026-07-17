using System.Runtime.InteropServices;
using System.Text;

namespace SupremaAgent.Biometrics.Interop;

/// <summary>
/// P/Invoke contra UFMatcher.dll del SDK de Suprema.
///
/// Mismo aviso que UFScanner: firmas segun la API publica documentada, sin
/// compilar contra los headers reales. Verifica contra UFMatcher.h del SDK.
///
/// Aqui vive el 1:N. Con ~100 empleados y ~2 plantillas por persona, UFM_Identify
/// resuelve en milisegundos; no hace falta indexar ni paralelizar.
/// </summary>
internal static class UFMatcher
{
    private const string Dll = "UFMatcher.dll";

    public const int UFM_OK = 0;

    // UFM_PARAM_*
    public const int UFM_PARAM_SECURITY_LEVEL = 400; // 1..7, mas alto = menos falsos positivos
    public const int UFM_PARAM_FAST_MODE = 401;

    [DllImport(Dll, CallingConvention = CallingConvention.StdCall)]
    public static extern int UFM_Create(out IntPtr hMatcher);

    [DllImport(Dll, CallingConvention = CallingConvention.StdCall)]
    public static extern int UFM_Delete(IntPtr hMatcher);

    [DllImport(Dll, CallingConvention = CallingConvention.StdCall)]
    public static extern int UFM_SetParameter(IntPtr hMatcher, int nParam, ref int pValue);

    [DllImport(Dll, CallingConvention = CallingConvention.StdCall)]
    public static extern int UFM_Verify(
        IntPtr hMatcher,
        [In] byte[] pTemplate1, int nTemplate1Size,
        [In] byte[] pTemplate2, int nTemplate2Size,
        out int pVerifySucceed);

    /// <param name="ppTemplateList">Array de punteros a cada plantilla candidata.</param>
    /// <param name="pTemplateIndex">Indice dentro de ppTemplateList que hizo match, o -1.</param>
    [DllImport(Dll, CallingConvention = CallingConvention.StdCall)]
    public static extern int UFM_Identify(
        IntPtr hMatcher,
        [In] byte[] pTemplate, int nTemplateSize,
        [In] IntPtr[] ppTemplateList, [In] int[] pTemplateSizeList, int nTemplateNumber,
        int nTimeout,
        out int pTemplateIndex);

    [DllImport(Dll, CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi)]
    public static extern int UFM_GetErrorString(int nErrorCode, StringBuilder sErrorString);

    public static string ErrorText(int status)
    {
        try
        {
            var sb = new StringBuilder(256);
            if (UFM_GetErrorString(status, sb) == UFM_OK && sb.Length > 0)
                return $"{sb} (UFM_STATUS {status})";
        }
        catch
        {
            // Sin SDK cargado no hay texto; devolvemos el codigo.
        }
        return $"UFM_STATUS {status}";
    }
}
