# Agente Biométrico — BioMini Slim 2

Programa local de Windows que conecta el lector de huella **Suprema BioMini Slim 2**
con RE_PLAY. Se instala **solo en las PCs de caseta que tengan un BioMini conectado**.

## Qué hace y qué no

El agente **solo habla con el hardware**. No decide quién entra.

```
Persona pone el dedo
        ↓
Agente: captura + identifica (1:N)  ← aquí vive el SDK de Suprema
        ↓ "es el empleado X"
Backend RE_PLAY: ¿tiene permiso en este acceso? ¿entrada o salida?
        ↓
BioStar abre la pluma
```

Las reglas de acceso están en el backend (`back/utils/accesoEmpleado.ts`), **las mismas
que usa el QR**. El agente nunca decide, y nunca habla con BioStar.

## Por qué existe

El navegador no puede tocar un USB. El BioMini se conecta por USB a la PC de caseta,
así que hace falta un programa local que sí pueda.

El **1:N vive aquí** y no en el backend porque el matcher de Suprema es una DLL nativa
de Windows; meterla en Node exigiría bindings nativos.

---

## Instalación

### 1. DLLs del SDK

No están en el repositorio (licencia de Suprema). Ver [`sdk/LEEME.md`](sdk/LEEME.md).
Resumen: copiar `UFScanner.dll` y `UFMatcher.dll` **x64** a `agente_biometrico/sdk/`.

También hay que instalar el **driver del BioMini** (viene en el mismo paquete del SDK).

### 2. Configurar el secreto

En `src/SupremaAgent/appsettings.json`:

```json
{ "Agent": { "SharedSecret": "<el mismo valor que AGENTE_BIOMETRICO_SECRET del backend>" } }
```

Ese valor sale de `back/.env.biometria` en el servidor. Si no coinciden, el agente
rechaza las plantillas y lo dice con ese mensaje exacto.

### 3. Correr

```powershell
cd agente_biometrico\src\SupremaAgent
dotnet run
```

Se publica **self-contained**: la PC de caseta **no necesita instalar .NET**.

```powershell
dotnet publish -c Release -o C:\AgenteBiometrico
```

---

## Probar — empieza por aquí

Con el agente corriendo, abre en esa PC:

**<http://127.0.0.1:8790/>**

Hay 5 pasos. **Córrelos en orden.** Si uno falla, para: los siguientes también fallarán.

| Paso | Qué prueba |
|---|---|
| 1 | Que las DLLs estén y la arquitectura coincida. No toca el lector. |
| 2 | Que el SDK inicialice y se vea el BioMini. |
| 3 | Que capture, y con qué calidad. |
| 4 | Que dos lecturas del mismo dedo se reconozcan entre sí. |
| 5 | **Que una huella de BioStar coincida con el BioMini.** |

Al final, **"Copiar reporte completo"** y mándalo.

### El paso 5 es el que importa

Es la única pregunta que no se puede responder leyendo código: **¿las plantillas de
BioStar y las del BioMini son compatibles?**

Si **sí** → todo lo demás ya está construido y debería funcionar.

Si **no** → antes de concluir nada:
1. Confirma que la huella pegada es del **mismo dedo de la misma persona**.
2. Mira en BioStar: `Settings → Server → Fingerprint Template Format`. Pon ese mismo
   valor en `appsettings.json` → `Agent:TemplateFormat` (`suprema`, `iso` o `ansi`),
   reinicia el agente y repite.
3. Si con los tres formatos falla, avísame: el diseño cambia (habría que re-enrolar
   a todos con el BioMini y dejar BioStar solo como abre-puertas).

Para conseguir la plantilla de BioStar que se pega en el paso 5, pídesela a quien
administra el servidor (sale de `GET /api/users/{id}` de BioStar, campo `template0`).

---

## Sin lector, para probar la web

```powershell
dotnet run --Agent:Mode=mock
```

El modo mock **no imita el matching**: identifica devolviendo la primera plantilla
cargada. Sirve para probar la pantalla y el flujo de autorización, no la precisión.
Lo grita en el log y la pantalla de caseta lo muestra en naranja.

---

## Qué NO está verificado

Escrito en claro para que nadie lo dé por hecho:

- **Las firmas P/Invoke** (`Biometrics/Interop/`) siguen la API pública documentada
  del SDK, pero no se compilaron contra los headers reales. Si algo cambió, el paso 2
  del diagnóstico lo reporta (`EntryPointNotFoundException` = nombre distinto).
- **`UFS_PARAM_TEMPLATE_TYPE` (300) y `UFM_PARAM_SECURITY_LEVEL` (400)** salen de la
  documentación; vale confirmarlos contra los headers.
- **La compatibilidad BioStar ↔ BioMini.** Paso 5.

Todo lo que sí está verificado: el agente compila, corre, el modo mock funciona
end-to-end, el token rechaza lo que debe rechazar, y el cifrado de plantillas entre
Node y .NET se entiende en ambos sentidos (probado con paquetes reales).

---

## Seguridad

| Decisión | Por qué |
|---|---|
| Solo escucha en `127.0.0.1` | Nunca alcanzable desde la red. |
| HTTP, no HTTPS | El navegador trata `http://127.0.0.1` como origen confiable: una página HTTPS puede llamarlo sin bloqueo de contenido mixto. Evita instalar certificados en cada caseta. |
| Token firmado (HMAC) del backend | CORS no es autenticación: restringe páginas, pero cualquier programa local puede pegarle al agente. El token no. |
| Plantillas solo en memoria, nunca en disco | Si se roban la PC apagada, no hay biometría que llevarse. |
| TTL de 30 min | Si la pestaña se cierra, el lector deja de identificar solo. |
| Solo las huellas de *ese* acceso | No el padrón completo. |
| AES-256-GCM del backend al agente | El navegador transporta el paquete sin poder leerlo. |
| La plantilla capturada nunca sale del agente | Solo viaja el id de la persona. |
| Nunca se loguea una plantilla | Ni en logs ni en la pantalla de diagnóstico (solo el tamaño en bytes). |

Una vez operando, conviene apagar el diagnóstico: `Agent:EnableSelfTest = false`
(permite capturar sin token).

### Lo que este diseño NO resuelve

El agente **afirma** la identidad y el backend no la puede re-verificar (no tiene
matcher). Un agente comprometido podría decir "soy el empleado X". Es el mismo nivel
de confianza que la tablet con QR hoy, que afirma haber leído un código — no empeora
nada, pero tampoco lo mejora.
