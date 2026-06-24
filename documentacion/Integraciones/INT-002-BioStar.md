# Documento de Integración

## Módulo BioStar — Control de Acceso

Especificación funcional y técnica del módulo de integración con la plataforma de control de acceso **BioStar**, como complemento opcional del producto base de Recepción Electrónica (RE).

| Campo | Descripción |
| --- | --- |
| Tipo de documento | Documento de Integración (módulo opcional) |
| Código | INT-002 |
| Módulo | BioStar — Control de Acceso |
| Producto base | Recepción Electrónica (RE) |
| Versión | 1.0 |
| Fecha | 2026-06-24 |
| Responsable | Área de Sistemas / Desarrollo |
| Clasificación | Uso interno |
| Estado | Vigente |

> Este documento es **autocontenido** y describe únicamente el módulo BioStar. Se entrega como complemento de la documentación base de RE cuando el cliente contrata esta integración. Requiere el producto base operativo.

---

## Control de versiones

| Versión | Fecha | Autor | Descripción |
| --- | --- | --- | --- |
| 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Versión inicial del documento de integración BioStar. |

---

## Contenido

1. Objetivo
2. Alcance del módulo
3. Definiciones
4. Habilitación y configuración
5. Requerimientos del módulo
6. Descripción funcional
7. Arquitectura e integración técnica
8. Modelo de datos
9. API del módulo
10. Sincronización y operación de puertas
11. Seguridad del módulo
12. Plan de pruebas
13. Riesgos del módulo
14. Control documental

---

## 1. Objetivo

Definir el funcionamiento, la arquitectura técnica, la API y los controles del **módulo de integración con BioStar**, que permite a Recepción Electrónica administrar y operar dispositivos de control de acceso de la plataforma BioStar: conexión, dispositivos, puertas, niveles de acceso, horarios, grupos y apertura/cierre de puertas asociada a eventos de acceso.

## 2. Alcance del módulo

El módulo BioStar añade a RE las siguientes capacidades:

- Configuración de una **conexión global** a BioStar y de **dispositivos** individuales.
- Descubrimiento, alta, sincronización y administración de **dispositivos remotos** de BioStar.
- Administración de **catálogos de BioStar**: grupos de dispositivos, niveles de acceso (access levels), grupos de acceso (access groups), horarios, grupos de puertas y puertas de acceso.
- Administración de **grupos de usuarios** de BioStar.
- **Apertura y cierre de puertas** vinculada a accesos y eventos de RE (modo pulso o manual).
- Sincronización de **empleados** hacia BioStar (identificador de usuario y grupo).

**Fuera de alcance:** la operación interna de la plataforma BioStar y su licenciamiento, que son responsabilidad del proveedor/instalación BioStar del cliente.

## 3. Definiciones

| Término | Definición |
| --- | --- |
| BioStar | Plataforma de control de acceso (servidor externo) con la que se integra RE mediante su API. |
| Conexión global | Configuración única de servidor BioStar (host, puerto, usuario, contraseña) usada como conexión por defecto. |
| Dispositivo | Equipo de control de acceso administrado por BioStar (lector, controladora). |
| Dispositivo main | Dispositivo marcado como principal; se usa preferentemente para operaciones de apertura. |
| Access level | Nivel de acceso: combinación de puertas y horarios que define dónde y cuándo se permite el paso. |
| Access group | Grupo de acceso de usuarios que agrupa niveles de acceso. |
| Puerta de acceso | Puerta física configurada en BioStar con relé, botón de salida y sensor. |
| Sesión BioStar | Token de sesión (`bs-session-id`) emitido por el servidor BioStar tras autenticarse. |
| Modo pulso | Apertura temporal de la puerta que se cierra automáticamente tras un tiempo configurado. |
| Modo manual | Apertura que permanece hasta una orden explícita de cierre. |

## 4. Habilitación y configuración

El módulo es **opcional** y se activa sin modificar el núcleo de RE, mediante tres mecanismos complementarios:

| Mecanismo | Dónde | Efecto |
| --- | --- | --- |
| Bandera de configuración | `configuraciones.habilitarIntegracionBiostar` | Habilita la lógica de integración BioStar en el backend. |
| Visibilidad por cliente | `INTEGRACIONES_VISIBLES` incluye `biostar` | Muestra el módulo y sus pantallas para el cliente. |
| Variables de entorno | `BIOSTAR_PORT` (por defecto 443), `BIOSTAR_DEBUG` | Puerto por defecto de los servidores BioStar y bandera de depuración. |

> El modo de visibilidad se controla con `INTEGRACIONES_VISIBILIDAD_MODO` (`ALL` o `CLIENT`). Cuando el módulo está deshabilitado, sus rutas y pantallas no se exponen y el producto base opera normalmente.

## 5. Requerimientos del módulo

### 5.1 Funcionales

| ID | Requerimiento | Prioridad |
| --- | --- | --- |
| RF-BS-001 | El módulo debe permitir configurar y probar una conexión global a BioStar (host, puerto, usuario, contraseña). | Alta |
| RF-BS-002 | El módulo debe permitir crear, editar, activar/inactivar y eliminar dispositivos BioStar locales. | Alta |
| RF-BS-003 | El módulo debe permitir marcar un único dispositivo como principal (main) por estado. | Media |
| RF-BS-004 | El módulo debe permitir descubrir, buscar, agregar, reconectar y sincronizar dispositivos remotos desde BioStar. | Alta |
| RF-BS-005 | El módulo debe permitir sincronizar de forma masiva los dispositivos existentes en BioStar hacia la configuración local. | Media |
| RF-BS-006 | El módulo debe administrar grupos de dispositivos, niveles de acceso, grupos de acceso, horarios, grupos de puertas y puertas de acceso. | Alta |
| RF-BS-007 | El módulo debe administrar grupos de usuarios de BioStar. | Media |
| RF-BS-008 | El módulo debe abrir la puerta asociada a un acceso al validar un evento, en modo pulso o manual. | Alta |
| RF-BS-009 | El módulo debe permitir el cierre manual de la puerta cuando el acceso está en modo manual. | Media |
| RF-BS-010 | El módulo debe sincronizar empleados hacia BioStar y registrar su identificador y grupo. | Media |

### 5.2 No funcionales

| ID | Requerimiento |
| --- | --- |
| RNF-BS-001 | El módulo debe reutilizar la sesión BioStar mientras sea válida (TTL ~10 minutos) y re-autenticar automáticamente al expirar o ante respuestas 401/419. |
| RNF-BS-002 | Las contraseñas de conexión y dispositivos deben almacenarse cifradas y descifrarse solo para los formularios de edición. |
| RNF-BS-003 | El acceso a todas las funciones del módulo debe restringirse al rol Administrador. |
| RNF-BS-004 | La apertura de puertas debe aplicar una ventana de anti-rebote para evitar aperturas repetidas en pocos segundos. |

## 6. Descripción funcional

El módulo agrega un conjunto de pantallas bajo la sección **BioStar** del sistema, visibles para el rol Administrador cuando la integración está habilitada.

| Pantalla | Ruta frontend | Función |
| --- | --- | --- |
| Conexión | `/biostarar/conexion` | Configura y prueba la conexión global; dispara la sincronización de dispositivos. |
| Dispositivos | `/biostarar/dispositivos` | Lista, crea, edita, elimina, cambia estado y marca principal; gestiona dispositivos remotos. |
| Permisos de Acceso | `/biostarar/permisos-acceso` | Administra reglas/permisos de acceso (grupos de acceso). |
| Puertas de Acceso | `/biostarar/puertas-acceso` | Administra puertas físicas con relé, botón de salida y sensor. |
| Niveles de Acceso | `/biostarar/access-levels` | Administra niveles de acceso (puertas + horarios). |
| Horarios | `/biostarar/horarios` | Administra horarios. |
| Grupos de Usuarios | `/biostarar/grupos` | Administra grupos de usuarios de BioStar. |
| Grupos de Dispositivos | `/biostarar/grupos-dispositivos` | Administra grupos de dispositivos. |
| Grupos de Puertas | `/biostarar/puertas` | Administra grupos de puertas. |

### 6.1 Flujo de apertura de puerta por evento

1. Un visitante/empleado valida su acceso (por ejemplo, por QR) en RE.
2. RE identifica el acceso y verifica si tiene apertura BioStar habilitada.
3. El módulo localiza el dispositivo con ese acceso y la puerta destino configurada.
4. Resuelve la conexión activa (dispositivo main → dispositivo activo → conexión global).
5. Envía la orden de **apertura** a BioStar.
6. En **modo pulso**, programa el **cierre** automático tras el tiempo configurado (1–30 s, por defecto 3 s).
7. En **modo manual**, la puerta permanece abierta hasta una orden de cierre manual.

## 7. Arquitectura e integración técnica

| Componente | Archivo | Responsabilidad |
| --- | --- | --- |
| Clase de integración | `back/classes/Biostar.ts` | Login/sesión, envío de peticiones HTTP a BioStar, reintento ante expiración, prueba de conexión. |
| Utilidad de apertura | `back/utils/biostarApertura.ts` | `abrirPuertaPorAccesoBiostar()` y `cerrarPuertaPorAccesoBiostar()`; resolución de conexión, modo y tiempo. |
| Controlador de dispositivos | `back/controllers/dispositivosBiostar.controller.ts` | Alta/edición/estado de dispositivos, conexión global, sincronización y dispositivos remotos. |
| Controlador de catálogos | `back/controllers/biostarCatalogos.controller.ts` | Grupos de dispositivos, niveles/grupos de acceso, horarios, grupos de puertas y puertas. |
| Controlador de grupos | `back/controllers/biostarGrupos.controller.ts` | Grupos de usuarios de BioStar. |
| Rutas | `back/routes/dispositivosBiostar.routes.ts`, `biostarCatalogos.routes.ts`, `biostarGrupos.routes.ts` | Definición de endpoints (rol Administrador). |
| Pantallas | `front/src/components/.../biostarar/*` | Interfaz de las nueve pantallas listadas. |

### 7.1 Comunicación con el servidor BioStar

- Protocolo: **HTTPS** hacia `https://{direccion_ip}:{puerto}` (puerto por defecto 443), con manejo de certificados autofirmados.
- Autenticación: `POST /api/login` con `{User: {login_id, password}}`; la sesión se recibe en el header `bs-session-id`.
- Gestión de sesión: la sesión se persiste con su expiración; se reutiliza mientras sea válida (margen de 15 s) y se renueva automáticamente ante expiración o respuestas 401/419.
- Tiempo de espera: 10 segundos por petición.

## 8. Modelo de datos

### 8.1 Colección `biostar_conexion_global` (conexión global)

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `nombre` | string | Nombre de la conexión (por defecto "Conexion Global BioStar"). |
| `direccion_ip` | string | IP del servidor BioStar. |
| `puerto` | number | Puerto (por defecto `BIOSTAR_PORT` = 443). |
| `usuario` | string | Usuario de BioStar. |
| `contrasena` | string | Contraseña cifrada (hook previo a guardar). |
| `session_id` | string? | Token de sesión vigente. |
| `session_expira` | Date? | Expiración de la sesión. |
| `activo` | boolean | Conexión habilitada. |
| `fecha_creacion` / `fecha_modificacion` | Date? | Auditoría. |

### 8.2 Colección `biostar_dispositivos` (dispositivos)

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `nombre` | string | Nombre único del dispositivo. |
| `direccion_ip` | string | IP única del dispositivo. |
| `puerto` | number | Puerto (por defecto `BIOSTAR_PORT`). |
| `id_acceso` | ObjectId? | Acceso de RE vinculado (ref. `accesos`). |
| `modo_acceso` | enum | `entrada` / `salida` / `ambos`. |
| `apertura_destino_habilitada` | boolean? | Habilita la apertura de puerta destino. |
| `apertura_puerta_id` | string? | ID de la puerta destino en BioStar. |
| `apertura_puerta_nombre` | string? | Nombre de la puerta destino. |
| `usuario` | string | Usuario de BioStar del dispositivo. |
| `contrasena` | string | Contraseña cifrada. |
| `session_id` / `session_expira` | string? / Date? | Sesión del dispositivo. |
| `es_main` | boolean? | Dispositivo principal. |
| `creado_por` | ObjectId? | Creador (`null` = creado por sincronización). |
| `modificado_por` | ObjectId? | Último modificador. |
| `activo` | boolean | Habilitado. |
| `fecha_creacion` / `fecha_modificacion` | Date? | Auditoría. |

### 8.3 Campos de sincronización en `empleados`

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `biostar_user_id` | string? | Identificador del usuario en BioStar. |
| `biostar_group_id` | string? | Identificador del grupo en BioStar. |
| `biostar_group_name` | string? | Nombre del grupo en BioStar. |
| `sync_biostar_pendiente` | boolean? | Indica sincronización pendiente. |
| `sync_biostar_error` | string? | Último error de sincronización. |

## 9. API del módulo

Todas las rutas requieren autenticación y **rol Administrador (1)**.

### 9.1 Dispositivos — `/api/dispositivos-biostar`

| Método | Ruta | Propósito |
| --- | --- | --- |
| GET | `/` | Lista de dispositivos creados manualmente. |
| GET | `/conexion-global` | Configuración de la conexión global. |
| GET | `/catalogos-formulario` | Catálogos (accesos, puertas) para formularios. |
| GET | `/form-editar/:id` | Datos de dispositivo para edición (descifra contraseña). |
| GET | `/:id` | Detalle de un dispositivo. |
| GET | `/remotos` | Dispositivos remotos desde BioStar. |
| GET | `/remotos/grupos` | Grupos de dispositivos remotos. |
| PUT | `/conexion-global` | Actualiza la conexión global. |
| POST | `/conexion-global/probar` | Prueba la conexión global. |
| POST | `/sincronizar-dispositivos` | Sincroniza dispositivos desde BioStar. |
| POST | `/` | Crea un dispositivo local. |
| POST | `/probar-conexion` | Prueba credenciales nuevas. |
| POST | `/probar-conexion/:id` | Prueba la conexión de un dispositivo existente. |
| POST | `/remotos/descubrir` | Descubrimiento de dispositivos (UDP/TCP). |
| POST | `/remotos/buscar` | Búsqueda de dispositivo por IP. |
| POST | `/remotos` | Agrega un dispositivo remoto. |
| POST | `/remotos/:id/reconnect` | Reconecta un dispositivo remoto. |
| POST | `/remotos/:id/sync` | Sincroniza un dispositivo remoto. |
| PUT | `/:id` | Actualiza un dispositivo. |
| PUT | `/remotos/:id` | Actualiza un dispositivo remoto. |
| PATCH | `/:id` | Activa/inactiva un dispositivo. |
| PATCH | `/:id/main` | Establece el dispositivo como principal. |
| DELETE | `/:id` | Elimina un dispositivo. |
| DELETE | `/remotos/:id` | Elimina un dispositivo remoto. |

### 9.2 Catálogos — `/api/biostar-catalogos`

| Método | Ruta | Propósito |
| --- | --- | --- |
| GET | `/grupos-dispositivos` | Lista de grupos de dispositivos. |
| GET | `/access-levels` · `/access-levels/:id` · `/access-levels/catalogos` | Niveles de acceso y catálogos de su formulario. |
| GET | `/access-groups` · `/access-groups/:id` · `/access-groups/catalogos` | Grupos de acceso y catálogos. |
| GET | `/horarios` · `/horarios/:id` | Horarios. |
| GET | `/puertas` | Grupos de puertas. |
| GET | `/puertas-acceso` · `/puertas-acceso/:id` · `/puertas-acceso/catalogos` | Puertas de acceso y catálogos. |
| GET | `/puertas-acceso/opciones-alta` · `/opciones-dispositivo` | Opciones de alta y puertos (relé/entradas) por dispositivo. |
| POST | `/grupos-dispositivos` · `/access-levels` · `/access-levels/horarios` · `/access-groups` · `/horarios` · `/puertas` · `/puertas-acceso` | Altas de cada catálogo. |
| PUT | `/{catalogo}/:id` | Edición de cada catálogo. |
| DELETE | `/{catalogo}/:id` | Eliminación (con migración a grupo por defecto cuando aplica). |

### 9.3 Grupos de usuarios — `/api/biostar-grupos`

| Método | Ruta | Propósito |
| --- | --- | --- |
| GET | `/` | Lista de grupos de usuarios. |
| POST | `/` | Crea un grupo de usuarios. |
| PUT | `/:id` | Edita un grupo de usuarios. |
| DELETE | `/:id` | Elimina un grupo de usuarios. |

### 9.4 Apertura/cierre por evento — `/api/eventos`

| Método | Ruta | Propósito |
| --- | --- | --- |
| POST | `/biostar/cerrar-manual` | Cierre manual de la puerta del acceso (modo manual). Roles 1, 2, 5, 13. |

## 10. Sincronización y operación de puertas

### 10.1 Sincronización de dispositivos

- **Masiva:** `POST /sincronizar-dispositivos` consulta los dispositivos de BioStar y crea/actualiza la configuración local. Los registros importados se marcan con `creado_por = null` para distinguirlos de los creados manualmente.
- **Remota:** descubrimiento por UDP/TCP, búsqueda por IP, alta, reconexión y sincronización individual.

### 10.2 Operación de puertas (`back/utils/biostarApertura.ts`)

- `abrirPuertaPorAccesoBiostar()`: valida acceso, aplica ventana anti-rebote (~7 s), localiza el dispositivo con `apertura_destino_habilitada`, resuelve modo (`pulso`/`manual`) y tiempo (1–30 s), y envía la orden de apertura. En modo pulso programa el cierre automático.
- `cerrarPuertaPorAccesoBiostar()`: ejecuta el cierre de la puerta del acceso.
- Resolución de conexión activa: dispositivo **main** activo → cualquier dispositivo activo → conexión global.

## 11. Seguridad del módulo

| Control | Aplicación en el módulo | Referencia |
| --- | --- | --- |
| Mínimo privilegio | Todas las rutas exigen rol Administrador. | PSI.05 |
| Protección de credenciales | Contraseñas de conexión y dispositivos cifradas en reposo; se descifran solo para el formulario de edición. | PSI.05 / Control 8.11 |
| No exposición de secretos | Las respuestas de listado/detalle ocultan contraseña y `session_id`. | Control 8.11 |
| Comunicación segura | HTTPS hacia BioStar; sesión por token con expiración y renovación automática. | PSI.05 / PSI.12 |
| Configuración por variables | Puerto y depuración por variables de entorno; sin secretos en el código. | PSI.12 |
| Operación destructiva controlada | La eliminación crítica valida contraseña y migra dependencias antes de borrar. | PSI.12 |

## 12. Plan de pruebas

| ID | Caso de prueba | Resultado esperado |
| --- | --- | --- |
| PT-BS-01 | Configurar y probar la conexión global con credenciales válidas. | Conexión exitosa; sesión emitida. |
| PT-BS-02 | Probar conexión con credenciales inválidas. | Error controlado sin exponer datos sensibles. |
| PT-BS-03 | Crear, editar, inactivar y eliminar un dispositivo. | Operaciones reflejadas; main reasignado si aplica. |
| PT-BS-04 | Sincronizar dispositivos desde BioStar. | Dispositivos creados/actualizados con `creado_por = null`. |
| PT-BS-05 | Descubrir y agregar un dispositivo remoto. | Dispositivo agregado y sincronizado. |
| PT-BS-06 | Crear nivel de acceso, horario y puerta de acceso. | Catálogos creados correctamente en BioStar. |
| PT-BS-07 | Validar un evento de acceso en modo pulso. | Puerta abre y cierra automáticamente tras el tiempo configurado. |
| PT-BS-08 | Validar acceso en modo manual y cerrar manualmente. | Puerta permanece abierta y cierra con la orden manual. |
| PT-BS-09 | Reutilización y expiración de sesión BioStar. | Sesión reutilizada mientras es válida; re-login automático al expirar. |
| PT-BS-10 | Acceso al módulo con rol no administrador. | Acceso denegado. |

> Las evidencias de prueba deben capturarse sin exponer IP, usuarios, contraseñas ni `session_id` reales.
`[Foto: pantalla de Conexión BioStar con secretos enmascarados]`
`[Foto: listado de dispositivos BioStar]`
`[Foto: administración de puertas de acceso BioStar]`

## 13. Riesgos del módulo

| ID | Riesgo | Impacto | Probabilidad | Mitigación |
| --- | --- | --- | --- | --- |
| R-BS-01 | Indisponibilidad del servidor BioStar. | Alto | Media | Reintento de sesión, manejo de errores y operación base de RE no bloqueada. |
| R-BS-02 | Exposición de credenciales de dispositivos. | Alto | Baja | Cifrado en reposo, ocultamiento en respuestas, acceso solo administrador. |
| R-BS-03 | Apertura indebida o repetida de puertas. | Alto | Baja | Ventana anti-rebote, validación de evento y modos controlados. |
| R-BS-04 | Desincronización entre RE y BioStar. | Medio | Media | Banderas `sync_biostar_pendiente`/`sync_biostar_error` y sincronización manual. |
| R-BS-05 | Certificados autofirmados / TLS no verificado. | Medio | Media | Comunicación HTTPS; recomendable certificado válido en producción. |
| R-BS-06 | Eliminación de catálogos en uso. | Medio | Baja | Validación de contraseña y migración a grupo por defecto antes de eliminar. |

## 14. Control documental

| Documento | Código | Versión | Fecha | Responsable | Estado |
| --- | --- | --- | --- | --- | --- |
| Documento de Integración — Módulo BioStar | INT-002 | 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Vigente |

**Documento base relacionado:** DR-RE-001 (Requerimientos RE), MT-RE-001 (Técnico RE), API-RE-001 (API RE), DB-RE-001 (Diccionario de BD RE).
