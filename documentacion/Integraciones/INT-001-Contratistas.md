# Documento de Integración

## Módulo Contratistas

Especificación funcional y técnica del módulo de **Contratistas** y su portal, como complemento opcional del producto base de Recepción Electrónica (RE).

| Campo | Descripción |
| --- | --- |
| Tipo de documento | Documento de Integración (módulo opcional) |
| Código | INT-001 |
| Módulo | Contratistas |
| Producto base | Recepción Electrónica (RE) |
| Versión | 1.0 |
| Fecha | 2026-06-24 |
| Responsable | Área de Sistemas / Desarrollo |
| Clasificación | Uso interno |
| Estado | Vigente |

> Documento autocontenido. Se entrega como complemento de la base de RE cuando el cliente contrata este módulo.

---

## Control de versiones

| Versión | Fecha | Autor | Descripción |
| --- | --- | --- | --- |
| 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Versión inicial del documento de Contratistas. |

---

## 1. Objetivo

Definir el funcionamiento del módulo de Contratistas, que permite administrar empresas contratistas y habilitar un **portal** para que cada contratista gestione sus documentos, registre visitantes y envíe solicitudes de visita para revisión.

## 2. Alcance del módulo

- Alta y administración de contratistas (con usuario de portal asociado).
- Portal del contratista: documentos de la empresa, visitantes y solicitudes de visita.
- Flujo de revisión/aprobación de visitantes y solicitudes por parte del personal interno.

## 3. Habilitación

| Mecanismo | Valor |
| --- | --- |
| Bandera de configuración | `configuraciones.habilitarContratistas` |
| Visibilidad por cliente | `INTEGRACIONES_VISIBLES` incluye `contratistas` |

## 4. Roles involucrados

| Rol | Función |
| --- | --- |
| Administrador (1) / Recepción (2) | Alta de contratistas y revisión de visitantes/solicitudes. |
| Contratista (11) | Acceso al portal: documentos, visitantes y solicitudes. |

## 5. Requerimientos del módulo

| ID | Requerimiento | Prioridad |
| --- | --- | --- |
| RF-CT-001 | El módulo debe permitir crear, editar y cambiar el estado de contratistas. | Alta |
| RF-CT-002 | Al crear un contratista, el sistema debe generar un usuario de portal (rol 11), una contraseña y enviar correo de acceso. | Alta |
| RF-CT-003 | El módulo debe permitir reenviar el correo de acceso al contratista. | Media |
| RF-CT-004 | El portal debe permitir al contratista gestionar los documentos de su empresa. | Alta |
| RF-CT-005 | El portal debe permitir al contratista registrar/editar visitantes con carga de documentos. | Alta |
| RF-CT-006 | El personal interno debe poder validar (aprobar/rechazar) los visitantes del contratista. | Alta |
| RF-CT-007 | El portal debe permitir enviar solicitudes de visita con fecha, anfitriones y lista de visitantes. | Alta |
| RF-CT-008 | El personal interno debe poder revisar las solicitudes (aprobar/rechazar por visitante). | Alta |
| RF-CT-009 | El visitante aprobado del contratista debe poder vincularse a un visitante de RE. | Media |

## 6. Descripción funcional

### 6.1 Pantallas administrativas

| Pantalla | Ruta | Función |
| --- | --- | --- |
| Contratistas | `/contratistas` | Lista/alta/edición/detalle de contratistas. |

### 6.2 Portal del contratista

| Pantalla | Ruta | Función |
| --- | --- | --- |
| Documentos del Contratista | `/portal-contratistas/documentos` | Carga y consulta de documentos de la empresa. |
| Visitantes | `/portal-contratistas/visitantes` | Registro y gestión de visitantes del contratista. |
| Solicitud de Visita | `/portal-contratistas/solicitudes` | Creación y seguimiento de solicitudes de visita. |

`[Foto: pantalla de alta de contratista]`
`[Foto: portal del contratista — documentos]`
`[Foto: portal del contratista — registro de visitante]`
`[Foto: portal del contratista — solicitud de visita]`
`[Foto: pantalla de revisión de solicitudes por el personal interno]`

### 6.3 Flujo general

1. El administrador da de alta al contratista; el sistema crea su usuario de portal y envía el correo de acceso.
2. El contratista ingresa al portal y completa los documentos de su empresa.
3. El contratista registra a sus visitantes y adjunta documentos.
4. El personal interno valida los visitantes (aprobado/rechazado con motivo).
5. El contratista envía una solicitud de visita (fecha, anfitriones, visitantes).
6. El personal interno revisa la solicitud por visitante y la aprueba o rechaza.

## 7. Arquitectura e integración técnica

| Componente | Archivo | Responsabilidad |
| --- | --- | --- |
| Controladores | `back/controllers/contratistas.controller.ts`, `contratistasVisitantes.controller.ts`, `contratistasSolicitudes.controller.ts`, `contratistasDocumentos.controller.ts` | Lógica de contratistas, visitantes, solicitudes y documentos. |
| Rutas | `back/routes/contratistas.routes.ts` y las 3 rutas asociadas | Endpoints del módulo. |
| Pantallas | `front/src/components/contratistas/*` y `.../portal/*` | Interfaz administrativa y portal. |

## 8. Modelo de datos

### 8.1 `contratistas`

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `empresa` | string | Nombre de la empresa (único). |
| `correos` | string[] | Correos de contacto. |
| `telefono` | string? | Teléfono. |
| `id_usuario` | ObjectId | Usuario de portal (rol 11). |
| `id_empresa` | ObjectId | Empresa de RE asociada. |
| `activo` | boolean | Estado. |

### 8.2 `contratistas_visitantes`

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id_contratista`, `id_empresa`, `empresa` | ObjectId/string | Relación con el contratista. |
| `nombre`, `apellido_pat`, `apellido_mat`, `correo`, `telefono` | string | Datos del visitante. |
| `documentos_checks` | Map | Checklist de documentos cargados. |
| `documentos_archivos` | Map | Archivos de documentos. |
| `estado_validacion` | number | 1=Pendiente, 2=Aprobado, 3=Rechazado. |
| `motivo_rechazo` | string | Motivo de rechazo. |
| `fecha_validacion`, `validado_por` | Date/ObjectId | Validación. |
| `id_visitante_re` | ObjectId | Visitante de RE vinculado al aprobar. |
| `activo` | boolean | Estado. |

### 8.3 `contratistas_solicitudes`

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id_contratista`, `id_empresa` | ObjectId | Relación. |
| `fecha_visita` | Date | Fecha planeada. |
| `comentario` | string? | Observaciones. |
| `anfitriones` | ObjectId[] | Anfitriones internos. |
| `estado` | number | 1=Pendiente, 2=Aprobado, 3=Rechazado, 4=Parcial. |
| `items` | array | Estado por visitante (`id_visitante`, `estado`, `motivo`). |
| `enviado_por`, `revisado_por`, `fecha_revision` | ObjectId/Date | Trazabilidad. |
| `activo` | boolean | Estado. |

### 8.4 `contratistas_documentos`

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id_contratista` | ObjectId | Relación. |
| `documentos_checks`, `documentos_archivos` | Map | Documentos de la empresa. |
| `estado_validacion`, `motivo_rechazo` | number/string | Validación. |
| `activo` | boolean | Estado. |

## 9. API del módulo

### 9.1 Contratistas — `/api/contratistas` (roles 1, 2)

| Método | Ruta | Propósito |
| --- | --- | --- |
| GET | `/` · `/activos` · `/:id` | Lista, activos y detalle. |
| POST | `/` | Crea contratista (y usuario de portal). |
| PUT | `/:id` | Actualiza. |
| PATCH | `/:id` · `/reenviar/:id` | Cambia estado / reenvía correo de acceso. |

### 9.2 Visitantes del contratista — `/api/contratistas-visitantes` (roles 1, 11)

| Método | Ruta | Propósito |
| --- | --- | --- |
| GET/POST/PUT/PATCH | `/` y rutas asociadas | Gestión de visitantes del contratista, carga y validación. |

### 9.3 Solicitudes — `/api/contratistas-solicitudes`

| Método | Ruta | Propósito | Rol |
| --- | --- | --- | --- |
| GET | `/` | Solicitudes del contratista. | 1, 11 |
| POST | `/` | Crea solicitud. | 1, 11 |
| POST | `/:id/revisar` | Revisa (aprueba/rechaza) la solicitud. | 1, 2 |

### 9.4 Documentos del contratista — `/api/contratistas-documentos`

| Método | Ruta | Propósito | Rol |
| --- | --- | --- | --- |
| GET/PUT | `/` (mi documentación) | Consulta/guarda documentos del contratista. | 1, 11 |
| PATCH | `/verificar/:id` · `/rechazar/:id` | Verifica/rechaza documento. | 1 |

## 10. Configuración de documentos

Los documentos requeridos al contratista se configuran en `configuraciones.documentos_contratistas` (por ejemplo: identificación oficial, SUA, permiso de entrada, REPSE, constancias). Se admiten documentos personalizados (obligatorios/opcionales) por cliente.

## 11. Seguridad del módulo

| Control | Aplicación | Referencia |
| --- | --- | --- |
| Mínimo privilegio | Portal limitado al rol 11; revisión solo personal interno. | PSI.05 |
| Protección de credenciales | Contraseña del portal con hash; correo de acceso controlado. | PSI.05 / 8.11 |
| Validación de documentos | Estados de validación y motivos de rechazo trazables. | PSI.12 |
| Protección de datos | Documentos y datos personales con acceso restringido por rol. | Control 8.11 |

## 12. Plan de pruebas

| ID | Caso | Resultado esperado |
| --- | --- | --- |
| PT-CT-01 | Alta de contratista. | Contratista y usuario de portal creados; correo enviado. |
| PT-CT-02 | Ingreso al portal por el contratista. | Acceso al portal con rol 11. |
| PT-CT-03 | Carga de documentos de empresa. | Documentos guardados. |
| PT-CT-04 | Registro de visitante con documentos. | Visitante creado en estado pendiente. |
| PT-CT-05 | Validación (aprobar/rechazar) de visitante. | Estado y motivo actualizados; vínculo a visitante RE al aprobar. |
| PT-CT-06 | Envío de solicitud de visita. | Solicitud creada con anfitriones y visitantes. |
| PT-CT-07 | Revisión de solicitud por personal interno. | Estado por visitante actualizado. |
| PT-CT-08 | Acceso al portal con rol no autorizado. | Acceso denegado. |

## 13. Riesgos del módulo

| ID | Riesgo | Impacto | Prob. | Mitigación |
| --- | --- | --- | --- | --- |
| R-CT-01 | Exposición de documentos sensibles del contratista. | Alto | Media | Acceso restringido por rol y validación controlada. |
| R-CT-02 | Suplantación de cuenta de portal. | Alto | Baja | Contraseña con hash, correo de acceso controlado. |
| R-CT-03 | Aprobación de visitantes sin documentación completa. | Medio | Media | Checklist de documentos y estados de validación. |
| R-CT-04 | Datos personales de visitantes mal protegidos. | Alto | Media | Minimización/enmascaramiento (Control 8.11). |

## 14. Control documental

| Documento | Código | Versión | Fecha | Responsable | Estado |
| --- | --- | --- | --- | --- | --- |
| Documento de Integración — Módulo Contratistas | INT-001 | 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Vigente |

**Documento base relacionado:** DR-RE-001, DB-RE-001, API-RE-001.
