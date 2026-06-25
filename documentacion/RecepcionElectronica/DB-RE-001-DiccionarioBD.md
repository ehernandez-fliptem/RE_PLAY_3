# Diccionario de Base de Datos

## Recepción Electrónica (RE) — Base

Diccionario de las colecciones del núcleo de Recepción Electrónica, sus campos y relaciones.

| Campo | Descripción |
| --- | --- |
| Tipo de documento | Diccionario de Base de Datos |
| Código | DB-RE-001 |
| Producto | Recepción Electrónica (RE) — Base |
| Versión | 1.0 |
| Fecha | 2026-06-24 |
| Responsable | Área de Sistemas / Desarrollo |
| Clasificación | Uso interno |
| Estado | Vigente |

> Documento de la base. Las colecciones propias de módulos opcionales se documentan en sus respectivos documentos de integración.

---

## Control de versiones

| Versión | Fecha | Autor | Descripción |
| --- | --- | --- | --- |
| 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Versión inicial del diccionario de la base. |

---

## 1. Motor y consideraciones

- Motor: **MongoDB** mediante **Mongoose**.
- La conexión usa la variable `MONGODB_URI` (valor sensible; no se documenta).
- MongoDB es documental; en este diccionario "tabla" equivale a "colección".
- Campos comunes de auditoría: `fecha_creacion`, `creado_por`, `fecha_modificacion`, `modificado_por`, `activo` (borrado lógico).

## 2. Colecciones del núcleo

### 2.1 `usuarios`

Usuarios internos del sistema.

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id_general` | number | Identificador secuencial interno. |
| `correo` | string | Correo de acceso (único). |
| `contrasena` | string | Contraseña almacenada con hash. |
| `rol` | number | Rol del usuario. |
| `nombre`, `apellido_pat`, `apellido_mat` | string | Nombre y apellidos. |
| `id_empresa`, `id_puesto`, `id_departamento`, `id_cubiculo`, `id_piso`, `id_horario` | ObjectId | Referencias a catálogos. |
| `accesos` | ObjectId[] | Accesos autorizados. |
| `esRoot` | boolean | Usuario maestro. |
| `token_web`, `token_app` | string | Tokens de sesión activos. |
| `token_bloqueo`, `intentos` | string / number | Control de bloqueo por intentos fallidos. |
| `activo` | boolean | Estado. |

### 2.2 `empleados`

Personas sujetas a control de acceso.

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id_empleado` | number | Identificador del empleado. |
| `correo` | string | Correo. |
| `nombre`, `apellido_pat`, `apellido_mat` | string | Nombre y apellidos. |
| `id_empresa`, `id_piso`, `id_horario` | ObjectId | Referencias a catálogos. |
| `accesos` | ObjectId[] | Accesos autorizados. |
| `id_empleado_vinculado` | ObjectId | Empleado/usuario vinculado. |
| `activo` | boolean | Estado. |

> Los campos de sincronización con paneles (por ejemplo `sync_*_pendiente`, identificadores externos, huellas/tarjetas) pertenecen a los módulos de integración y se documentan en ellos.

### 2.3 `visitantes`

Visitantes registrados.

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id_visitante` | number | Identificador del visitante. |
| `codigo`, `card_code` | string | Código/credencial del visitante. |
| `correo`, `contrasena` | string | Acceso temporal del visitante. |
| `nombre`, `apellido_pat`, `apellido_mat`, `telefono`, `empresa` | string | Datos del visitante. |
| `documentos` | ObjectId[] | Documentos asociados. |
| `verificado`, `bloqueado` | boolean | Estado de verificación/bloqueo. |
| `acceso_qr_estado`, `acceso_qr_modo` | mixto | Estado y modo de acceso por QR. |
| `activo` | boolean | Estado. |

### 2.4 `registros`

Citas/registros de visita.

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `codigo` | string | Código del registro. |
| `tipo_registro` | number | Tipo (cita/registro). |
| `correo`, `nombre` | string | Datos del visitante. |
| `id_anfitrion` | ObjectId | Anfitrión (usuario). |
| `fecha_entrada`, `fecha_salida` | Date | Fechas de la visita. |
| `accesos` | array | Accesos autorizados de la visita. |
| `estatus` | ObjectId[] | Eventos asociados al registro. |
| `documentos` | ObjectId[] | Documentos de la visita. |
| `actividades`, `comentarios`, `placas` | string | Datos adicionales. |
| `id_pase` | ObjectId | Pase asociado. |
| `activo` | boolean | Estado. |

### 2.5 `eventos`

Eventos de entrada/salida/autorización.

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `tipo_dispositivo` | number | Origen del evento (sistema, QR, panel). |
| `img_evento` | string | Imagen del evento (si aplica). |
| `qr`, `tipo_check` | mixto | Datos de validación. |
| `id_registro`, `id_acceso`, `id_empleado`, `id_usuario`, `id_visitante`, `id_panel` | ObjectId | Referencias del evento. |
| `esAutorizado` | boolean | Resultado de autorización. |
| `comentario` | string | Observaciones. |
| `fecha_creacion` | Date | Fecha del evento. |
| `activo` | boolean | Estado. |

### 2.6 `documentos`

Documentos de visitantes/usuarios.

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `tipo` | number | Tipo de documento. |
| `estatus` | number | Estado (pendiente/validado/rechazado). |
| `documento`, `imagenes` | string/array | Archivo(s) del documento. |
| `tiempo_indefinido`, `fecha_entrada`, `fecha_salida` | boolean/Date | Vigencia. |
| `motivo` | string | Motivo de rechazo/observación. |
| `fecha_validacion`, `validado_por` | Date/ObjectId | Validación. |
| `activo` | boolean | Estado. |

### 2.7 `roles`

Catálogo de roles.

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `rol` | number | Número de rol. |
| `nombre` | string | Nombre del rol. |
| `color` | string | Color de presentación. |
| `activo` | boolean | Estado. |

### 2.8 `configuraciones`

Parámetros generales del sistema.

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `appNombre` | string | Nombre de la aplicación. |
| `zonaHoraria` | string | Zona horaria. |
| `correo_cuentas` | string | Correo para cuentas. |
| `permisos_roles` | objeto | Permisos por rol y rol personalizado. |
| `tiempoCancelacionRegistros` | number | Tiempo de auto-cancelación. |
| `habilitar*` | boolean | Banderas de módulos opcionales (ver documentos de integración). |
| `documentos_visitantes` | objeto | Configuración de documentos requeridos. |
| `palette` | objeto | Tema visual. |
| `activo` | boolean | Estado. |

### 2.9 Catálogos base

| Colección | Campos principales |
| --- | --- |
| `empresas` | `nombre`, `rfc`, `contactos`, `documentos`, `activo`. |
| `pisos` | `nombre`, `descripcion`, `activo`. |
| `accesos` | `identificador`, `nombre`, `id_piso`, `modos`, `activo`. |
| `puestos` | `nombre`, `descripcion`, `activo`. |
| `departamentos` | `nombre`, `descripcion`, `activo`. |
| `cubiculos` | `nombre`, `descripcion`, `activo`. |
| `horarios` | `nombre`, rangos horarios, `activo`. |
| `pases` | datos del pase, `activo`. |

### 2.10 Colecciones de soporte

| Colección | Propósito | Campos principales |
| --- | --- | --- |
| `tokens` | Tokens temporales (ligas de registro). | `token`, `tipo`, `creado_por`, `activo`. |
| `recuperaciones` | Códigos de recuperación de contraseña. | `correo`, `codigo`, `fecha_creacion`, `activo`. |
| `tipos_registros` | Catálogo de tipos de registro. | `tipo`, `nombre`, `descripcion`, `color`, `activo`. |
| `tipos_documentos` | Catálogo de tipos de documento. | `tipo`, `nombre`, `extensiones`, `activo`. |
| `tipos_eventos` | Catálogo de tipos de evento. | `tipo`, `nombre`, `color`, `activo`. |
| `tipos_dispositivos` | Catálogo de tipos de dispositivo. | `tipo`, `nombre`, `color`, `activo`. |
| `logs` | Bitácora técnica de peticiones HTTP. | `metodo`, `endpoint`, `status`, `ip`, `id_usuario`, `duracion_ms`, `fecha_creacion`. |
| `contadores` | Secuencias numéricas internas. | `nombre`, `secuencia`. |

## 3. Relaciones principales

| Origen | Campo | Destino |
| --- | --- | --- |
| `usuarios` | `id_empresa`, `id_puesto`, `id_departamento`, `id_cubiculo`, `id_piso`, `id_horario` | catálogos respectivos |
| `usuarios` | `accesos[]` | `accesos` |
| `empleados` | `id_empresa`, `id_piso`, `id_horario`, `accesos[]` | catálogos respectivos |
| `visitantes` | `documentos[]` | `documentos` |
| `registros` | `id_anfitrion` | `usuarios` |
| `registros` | `documentos[]`, `id_pase`, `estatus[]` | `documentos`, `pases`, `eventos` |
| `eventos` | `id_registro`, `id_acceso`, `id_empleado`, `id_usuario`, `id_visitante` | colecciones respectivas |
| `documentos` | `validado_por` | `usuarios` |

## 4. Inicialización automática

`back/connection.ts` inicializa catálogos base si están vacíos: tipos de registro (Cita, Registro), tipos de documento (Identificación oficial, SUA, Permiso de entrada, etc.), tipos de evento (Pendiente, Accedió, Salida, Cancelada, Finalizada, etc.) y tipos de dispositivo (Sistema, QR, Panel AC).

## 5. Consideraciones de protección de datos

- `contrasena` de usuarios: almacenada cifrada (hash); nunca en claro (PSI.05).
- Datos personales: minimización/enmascaramiento según perfil (PSI.05 — Enmascaramiento).
- `logs`: no deben almacenar contraseñas, tokens ni datos personales completos (PSI.05 / PSI.12).
- **Anonimización de empleados dados de baja:** sobrescritura **física** (no lógica) de `correo`, `nombre` y `telefono`, para evitar su recuperación (PSI.05).

`[Foto: vista de MongoDB Compass mostrando las colecciones del núcleo]`

## 6. Control documental

| Documento | Código | Versión | Fecha | Responsable | Estado |
| --- | --- | --- | --- | --- | --- |
| Diccionario de Base de Datos — RE | DB-RE-001 | 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Vigente |
