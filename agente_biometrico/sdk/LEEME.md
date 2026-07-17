# SDK de Suprema — qué falta y dónde va

Las DLL del SDK **no están en el repositorio** (licencia de Suprema, no son redistribuibles).
Hay que descargarlas y copiarlas aquí antes de compilar o publicar el agente.

## Qué se necesita

| Archivo | Para qué | Obligatorio |
|---|---|---|
| `UFScanner.dll` | Hablar con el BioMini: detectar, capturar, extraer plantilla | Sí |
| `UFMatcher.dll` | Comparar plantillas (el 1:1 y el 1:N) | Sí |
| DLL auxiliares del SDK | Dependencias internas de las dos anteriores | Copiar todas las que traiga el paquete |
| Driver del BioMini | Que Windows reconozca el lector por USB | Sí, se instala aparte |

## Dónde conseguirlas

Portal de partners de Suprema (`biostar2.supremainc.com` / BioMini SDK). Requiere cuenta.
El paquete se llama típicamente **BioMini SDK** e incluye `UFScanner`, `UFMatcher`, drivers y headers.

## Arquitectura — importante

El SDK viene en carpetas separadas para **x86** y **x64**. El agente está fijado a **x64**
(`PlatformTarget` en `SupremaAgent.csproj`).

- Copia las DLL de la carpeta **x64** del SDK.
- Si solo tienes x86, cambia `<PlatformTarget>x64</PlatformTarget>` y `<RuntimeIdentifier>win-x64</RuntimeIdentifier>` a `x86` / `win-x86` y vuelve a publicar.
- Mezclar arquitecturas da `BadImageFormatException`. El paso 1 del auto-diagnóstico lo detecta y lo dice con esas palabras.

## Dónde copiarlas

Aquí, en `agente_biometrico/sdk/`:

```
agente_biometrico/
  sdk/
    UFScanner.dll
    UFMatcher.dll
    (las demás DLL del paquete)
```

El `.csproj` las copia junto al ejecutable al compilar. Esta carpeta está en `.gitignore`
para que las DLL no acaben en el repo.

## Runtime

El agente se publica **self-contained** (`SelfContained=true`), así que la PC de caseta
**no necesita instalar .NET**. Todo va dentro de la carpeta publicada.

## Qué no se puede probar sin el hardware

Escrito en claro para que nadie asuma que está verificado:

1. **Las firmas P/Invoke** (`Biometrics/Interop/UFScanner.cs` y `UFMatcher.cs`) siguen la API
   pública documentada, pero **no se compilaron contra los headers reales**. Si el SDK cambió
   algún nombre o tipo, el síntoma es `EntryPointNotFoundException` (nombre distinto) o
   `AccessViolationException` (tipo/tamaño distinto). El paso 2 del diagnóstico lo reporta.
2. **Los valores de `UFS_PARAM_TEMPLATE_TYPE` (300) y `UFM_PARAM_SECURITY_LEVEL` (400)** salen
   de la documentación; conviene confirmarlos contra `UFScanner.h` / `UFMatcher.h`.
3. **La compatibilidad de plantillas entre BioMini y BioStar.** Es la incógnita grande y la
   única que no se puede razonar desde el código: hay que ponerle un dedo. Paso 5 del diagnóstico.

## Cómo probar

```powershell
cd agente_biometrico\src\SupremaAgent
dotnet run
```

Y abre <http://127.0.0.1:8790/> — ahí está el diagnóstico paso a paso.

Sin lector conectado, para probar la web:

```powershell
dotnet run --Agent:Mode=mock
```
