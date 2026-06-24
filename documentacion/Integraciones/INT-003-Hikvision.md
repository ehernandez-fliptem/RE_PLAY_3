# Documento de Integración

## Módulo Hikvision (Control de Acceso y Biometría Facial)

Especificación funcional y técnica de la integración con paneles **Hikvision**, incluyendo el submódulo de **biometría facial**, como complemento opcional del producto base de Recepción Electrónica (RE).

| Campo | Descripción |
| --- | --- |
| Tipo de documento | Documento de Integración (módulo opcional) |
| Código | INT-003 |
| Módulo | Hikvision + Biometría Facial |
| Producto base | Recepción Electrónica (RE) |
| Versión | 1.0 |
| Fecha | 2026-06-24 |
| Responsable | Área de Sistemas / Desarrollo |
| Clasificación | Uso interno |
| Estado | Vigente |

> Documento autocontenido. La biometría facial (`hikvision_biometria`) es un submódulo que **depende** de que la integración Hikvision esté habilitada.

---

## Control de versiones

| Versión | Fecha | Autor | Descripción |
| --- | --- | --- | --- |
| 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Versión inicial del documento de Hikvision + Biometría. |

---

## 1. Objetivo

Definir la integración con paneles Hikvision para sincronizar usuarios, visitantes, citas, tarjetas, fotos y eventos, y el submódulo de **validación facial** que permite el acceso por reconocimiento de rostro.

## 2. Alcance del módulo

- Administración de paneles Hikvision y cámaras.
- Sincronización de visitantes/empleados, citas, tarjetas e imágenes hacia los paneles.
- Recepción y registro de eventos de acceso desde los paneles.
- **Biometría facial**: captura/almacenamiento de descriptores y validación de acceso por rostro.
- Procesos auxiliares: `panel_server` (comunicación con paneles) y `demonio_eventos` (sincronización de eventos).

## 3. Habilitación

| Mecanismo | Valor |
| --- | --- |
| Bandera principal | `configuraciones.habilitarIntegracionHv` |
| Bandera biometría | `configuraciones.habilitarIntegracionHvBiometria` (se desactiva automáticamente si la principal está apagada) |
| Cámaras | `configuraciones.habilitarCamaras` |
| Visibilidad por cliente | `INTEGRACIONES_VISIBLES` incluye `hikvision` y/o `hikvision_biometria` |

## 4. Diferencia entre `hikvision` y `hikvision_biometria`

| Aspecto | `hikvision` | `hikvision_biometria` |
| --- | --- | --- |
| Función | Administración de paneles y sincronización (usuarios, tarjetas, citas, eventos). | Reconocimiento facial para validar acceso. |
| Endpoint clave | `/api/dispositivos-hikvision`, `/api/camaras` | `/api/eventos/validar-rostro` |
| Datos | `hikvision_dispositivos`, `camaras` | `face_descriptors` |
| Dependencia | Independiente. | Requiere `hikvision` habilitado. |

## 5. Requerimientos del módulo

| ID | Requerimiento | Prioridad |
| --- | --- | --- |
| RF-HV-001 | El módulo debe permitir crear, editar, probar y cambiar el estado de paneles Hikvision. | Alta |
| RF-HV-002 | El módulo debe permitir administrar cámaras (alta, edición, prueba de conexión). | Media |
| RF-HV-003 | El módulo debe sincronizar visitantes/empleados activos hacia los paneles (usuarios, tarjetas, fotos). | Alta |
| RF-HV-004 | El módulo debe sincronizar un visitante específico en un panel. | Media |
| RF-HV-005 | El módulo debe recibir y registrar eventos de acceso de los paneles. | Alta |
| RF-HV-006 | El módulo debe controlar el desfase de reloj de los paneles y alertar cuando aplique. | Baja |
| RF-HV-007 | El submódulo de biometría debe almacenar el descriptor facial de usuarios/visitantes. | Alta |
| RF-HV-008 | El submódulo de biometría debe validar el acceso comparando el rostro contra los descriptores almacenados. | Alta |

## 6. Descripción funcional

### 6.1 Pantallas

| Pantalla | Ruta | Función |
| --- | --- | --- |
| Dispositivos Hikvision | `/dispositivos-hikvision` | Alta, edición, detalle y prueba de paneles. |
| Cámaras | `/camaras` | Administración de cámaras. |
| Validación facial | (en operación de eventos/acceso) | Captura de rostro para validar el acceso. |

`[Foto: listado de dispositivos Hikvision]`
`[Foto: formulario de alta de panel Hikvision]`
`[Foto: pantalla de cámaras]`
`[Foto: validación de acceso por rostro]`

### 6.2 Flujo de sincronización

1. Se da de alta el panel Hikvision con su IP, credenciales, acceso y tipo de evento.
2. Al crear/editar visitantes/empleados, el sistema marca la sincronización pendiente.
3. El sistema (o el proceso auxiliar) sincroniza usuarios, tarjetas y fotos hacia el panel.
4. El panel reporta eventos de acceso, que se registran en RE.

### 6.3 Flujo de biometría facial

1. Se captura la imagen del usuario/visitante y se extrae su **descriptor facial** (vector de 128 dimensiones).
2. El descriptor se almacena en `face_descriptors` (separado de la imagen).
3. En el acceso, se compara el rostro contra los descriptores almacenados (umbral de similitud configurado).
4. Si coincide, se autoriza el acceso y se registra el evento.

## 7. Arquitectura e integración técnica

| Componente | Archivo | Responsabilidad |
| --- | --- | --- |
| Clase Hikvision (backend) | `back/classes/Hikvision.ts` | Autenticación, sincronización de usuarios/tarjetas/imágenes, contadores. |
| Clase Hikvision (panel) | `panel_server/classes/Hikvision.ts` | Comunicación directa con el panel (login, carga de imágenes/tarjetas). |
| Reconocimiento facial | `back/classes/FaceDetector.ts` (face-api.js) | Extracción y comparación de descriptores faciales. |
| Controladores | `back/controllers/dispositivosHv.controller.ts`, `camaras.controller.ts` | Gestión de paneles y cámaras. |
| Rutas | `back/routes/dispositivoshv.routes.ts`, `camaras.routes.ts`, `eventos.routes.ts` | Endpoints del módulo. |
| Proceso panel | `panel_server/` | Microservicio de comunicación con paneles en la red local. |
| Demonio de eventos | `demonio_eventos/supervisor.ts` | Sincroniza eventos/usuarios/imágenes de los paneles a MongoDB. |
| Pantallas | `front/src/components/catalogos/dispositivos/*`, `.../camaras/*` | Interfaz de paneles y cámaras. |

## 8. Modelo de datos

### 8.1 `hikvision_dispositivos`

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `nombre` | string | Nombre único del panel. |
| `direccion_ip` | string | IP única del panel. |
| `usuario`, `contrasena` | string | Credenciales (cifradas). |
| `habilitar_citas` | boolean | Habilita la función de citas en el panel. |
| `tipo_evento` | number | Tipo de evento asociado. |
| `id_acceso` | ObjectId | Acceso vinculado. |
| `es_panel_maestro` | boolean? | Panel maestro para orquestación multi-panel. |
| `reloj_offset_segundos`, `reloj_alerta_activa`, `reloj_ultimo_desfase_segundos`, `reloj_ultima_muestra` | mixto | Control de desfase de reloj. |
| `activo` | boolean | Estado. |

### 8.2 `camaras`

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `nombre`, `direccion_ip`, `usuario`, `contrasena` | string | Datos de la cámara (credenciales cifradas). |
| `habilitar_citas`, `tipo_evento`, `id_acceso` | mixto | Configuración de operación. |
| `activo` | boolean | Estado. |

### 8.3 `face_descriptors`

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id_usuario` | ObjectId? | Usuario asociado. |
| `id_visitante` | ObjectId? | Visitante asociado. |
| `descriptor` | number[] | Vector facial (128 dimensiones). |
| `activo` | boolean | Estado. |

### 8.4 Campos de sincronización en `empleados`/`visitantes`

Indicadores `sync_hikvision_pendiente` (y equivalentes) que marcan la necesidad de re-sincronizar con los paneles.

## 9. API del módulo

### 9.1 Paneles — `/api/dispositivos-hikvision` (rol 1, root)

| Método | Ruta | Propósito |
| --- | --- | --- |
| GET | `/` · `/:id` · `/form-nuevo` · `/form-editar/:id` | Lista, detalle y catálogos de formulario. |
| GET | `/demonio` | Paneles activos para el demonio de eventos. |
| GET | `/sincronizar/:id` | Sincroniza todos los visitantes activos al panel. |
| GET | `/sincronizar-visitante/:panelId/:visitanteId` | Sincroniza un visitante en un panel. |
| POST | `/` | Crea panel. |
| POST | `/probar-conexion` · `/probar-conexion/:id` | Prueba de conexión. |
| PUT | `/:id` | Actualiza. |
| PATCH | `/:id` | Cambia estado. |

### 9.2 Cámaras — `/api/camaras` (rol 1)

| Método | Ruta | Propósito |
| --- | --- | --- |
| GET | `/` · `/:id` · `/form-nuevo` · `/form-editar/:id` | Lista, detalle y catálogos. |
| POST | `/` · `/probar-conexion` | Crear / probar conexión. |
| PUT | `/:id` | Actualizar. |
| PATCH | `/:id` | Cambiar estado. |

### 9.3 Validación facial — `/api/eventos`

| Método | Ruta | Propósito | Rol |
| --- | --- | --- | --- |
| POST | `/validar-rostro` | Valida el acceso por reconocimiento facial. | 1, 2, 5 |

### 9.4 Panel server — `panel_server`

| Método | Ruta | Propósito |
| --- | --- | --- |
| POST | `/panel` · `/panel/seguridad` | Prueba de conexión / token de sesión. |
| POST/PUT | `/usuarios` | Crea/actualiza usuario en el panel. |
| POST/PUT | `/citas` | Gestiona citas en el panel. |

## 10. Procesos auxiliares

- **panel_server**: microservicio que se comunica directamente con los paneles en la red local (carga de usuarios, tarjetas, imágenes y citas).
- **demonio_eventos**: proceso en segundo plano que consulta paneles activos y sincroniza sus eventos, usuarios e imágenes a MongoDB.

> Ambos procesos se instalan según el manual de despliegue cuando el módulo está contratado.

## 11. Seguridad del módulo

| Control | Aplicación | Referencia |
| --- | --- | --- |
| Mínimo privilegio | Gestión de paneles restringida al rol Administrador root. | PSI.05 |
| Protección de credenciales | Credenciales de paneles/cámaras cifradas en reposo. | PSI.05 / 8.11 |
| Datos biométricos | Descriptores faciales almacenados separados de la imagen; acceso restringido. | Control 8.11 |
| Comunicación | Comunicación controlada con paneles; tiempos de espera configurados. | PSI.12 |
| No exposición | Las respuestas no exponen contraseñas de paneles. | Control 8.11 |

## 12. Plan de pruebas

| ID | Caso | Resultado esperado |
| --- | --- | --- |
| PT-HV-01 | Alta y prueba de conexión de panel. | Conexión exitosa. |
| PT-HV-02 | Sincronización completa de visitantes al panel. | Usuarios/tarjetas/fotos sincronizados. |
| PT-HV-03 | Sincronización de un visitante específico. | Visitante reflejado en el panel. |
| PT-HV-04 | Recepción de evento desde el panel. | Evento registrado en RE. |
| PT-HV-05 | Alerta por desfase de reloj. | Alerta generada cuando el desfase supera el umbral. |
| PT-HV-06 | Registro de descriptor facial. | Descriptor almacenado en `face_descriptors`. |
| PT-HV-07 | Validación de acceso por rostro. | Acceso autorizado al coincidir; rechazado si no. |
| PT-HV-08 | Biometría con Hikvision deshabilitado. | Submódulo de biometría inactivo. |

> Las evidencias no deben exponer IP, credenciales de paneles ni imágenes/biometría de personas reales sin necesidad.
`[Foto: panel Hikvision configurado, con credenciales enmascaradas]`

## 13. Riesgos del módulo

| ID | Riesgo | Impacto | Prob. | Mitigación |
| --- | --- | --- | --- | --- |
| R-HV-01 | Indisponibilidad de paneles. | Alto | Media | Reintentos, demonio de sincronización y operación base no bloqueada. |
| R-HV-02 | Exposición de credenciales de paneles. | Alto | Baja | Cifrado en reposo y ocultamiento en respuestas. |
| R-HV-03 | Tratamiento indebido de datos biométricos. | Alto | Media | Almacenamiento de descriptores separados, acceso restringido y consentimiento (Control 8.11). |
| R-HV-04 | Desincronización RE ↔ paneles. | Medio | Media | Banderas de sincronización pendiente y re-sync manual. |
| R-HV-05 | Desfase de reloj que afecta eventos. | Medio | Media | Monitoreo de reloj y alertas. |
| R-HV-06 | Falsos positivos/negativos en reconocimiento facial. | Medio | Media | Umbral de similitud ajustado y validación complementaria por QR. |

## 14. Control documental

| Documento | Código | Versión | Fecha | Responsable | Estado |
| --- | --- | --- | --- | --- | --- |
| Documento de Integración — Módulo Hikvision + Biometría | INT-003 | 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Vigente |

**Documento base relacionado:** DR-RE-001, MT-RE-001, DB-RE-001, API-RE-001, MI-RE-001.
