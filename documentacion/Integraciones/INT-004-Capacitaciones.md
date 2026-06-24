# Documento de Integración

## Módulo Capacitaciones (Públicas)

Especificación funcional y técnica del módulo de **Capacitaciones públicas**, como complemento opcional del producto base de Recepción Electrónica (RE).

| Campo | Descripción |
| --- | --- |
| Tipo de documento | Documento de Integración (módulo opcional) |
| Código | INT-004 |
| Módulo | Capacitaciones Públicas |
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
| 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Versión inicial del documento de Capacitaciones. |

---

## 1. Objetivo

Definir el módulo de Capacitaciones, que permite crear contenidos de capacitación por pasos y bloques, publicarlos mediante una **liga pública** y registrar los resultados de quienes los completan.

## 2. Alcance del módulo

- Creación y edición de capacitaciones con pasos y bloques de contenido.
- Estados de capacitación: borrador, publicada, inactiva.
- Vista previa y publicación mediante slug público.
- Acceso público (sin autenticación) a la capacitación publicada.
- Registro y consulta de resultados de participantes.

## 3. Habilitación

| Mecanismo | Valor |
| --- | --- |
| Bandera de configuración | `configuraciones.habilitarCapacitacionPublica` |
| Visibilidad por cliente | `INTEGRACIONES_VISIBLES` incluye `capacitacion_publica` |
| Middleware | `back/middlewares/capacitacionPublica.ts` bloquea el acceso público si el módulo está deshabilitado. |

## 4. Requerimientos del módulo

| ID | Requerimiento | Prioridad |
| --- | --- | --- |
| RF-CP-001 | El módulo debe permitir crear, editar, duplicar y eliminar capacitaciones. | Alta |
| RF-CP-002 | El módulo debe permitir organizar la capacitación en pasos y bloques de distintos tipos. | Alta |
| RF-CP-003 | El módulo debe permitir cambiar el estado entre borrador, publicada e inactiva. | Alta |
| RF-CP-004 | El módulo debe ofrecer una vista previa antes de publicar. | Media |
| RF-CP-005 | El módulo debe exponer la capacitación publicada mediante una liga pública (slug) sin requerir login. | Alta |
| RF-CP-006 | El módulo debe registrar el resultado/avance de cada participante. | Alta |
| RF-CP-007 | El módulo debe permitir consultar los resultados de cada capacitación. | Media |
| RF-CP-008 | El módulo debe permitir configurar reglas de avance por paso (tiempo mínimo, ver bloques, preguntas, etc.). | Media |

## 5. Descripción funcional

### 5.1 Pantallas

| Pantalla | Ruta | Función |
| --- | --- | --- |
| Capacitaciones | `/capacitaciones` | Lista de capacitaciones por estado. |
| Nueva / Editar | `/capacitaciones/nueva`, `/capacitaciones/:id/editar` | Editor de pasos y bloques. |
| Vista previa | `/capacitaciones/:id/vista-previa` | Previsualización antes de publicar. |
| Resultados | `/capacitaciones/:id/resultados` | Consulta de resultados. |
| Vista pública | `/capacitaciones/publica/:slug` | Acceso público a la capacitación. |

`[Foto: listado de capacitaciones]`
`[Foto: editor de capacitación con pasos y bloques]`
`[Foto: vista previa de la capacitación]`
`[Foto: vista pública de la capacitación]`
`[Foto: pantalla de resultados]`

### 5.2 Tipos de bloque

Identificación, texto, imagen, video, link, checklist, tarjetas, acordeón, pregunta, separador, documento y aviso.

### 5.3 Flujo público

1. El administrador crea la capacitación, define pasos y bloques, y la **publica**.
2. Se comparte la liga pública (`/capacitaciones/publica/:slug`).
3. El participante abre la liga (sin login), completa los pasos según las reglas de avance.
4. Al finalizar, se envía el resultado y se almacena.

## 6. Arquitectura e integración técnica

| Componente | Archivo | Responsabilidad |
| --- | --- | --- |
| Controlador | `back/controllers/capacitaciones.controller.ts` | CRUD, publicación, resultados. |
| Rutas | `back/routes/capacitaciones.routes.ts` | Endpoints públicos y administrativos. |
| Middleware | `back/middlewares/capacitacionPublica.ts` | Validación de módulo público activo. |
| Pantallas | `front/src/components/capacitaciones/*` | Editor, vista previa, vista pública y resultados. |

## 7. Modelo de datos

### 7.1 `capacitaciones`

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `titulo`, `descripcion` | string | Datos generales. |
| `slug` | string | Identificador público (único). |
| `estado` | enum | `borrador` / `publicada` / `inactiva`. |
| `color_principal`, `logo_url`, `portada_url` | string | Presentación. |
| `configuracion` | objeto | Barra de progreso, navegación, layout, requerir identificación, permitir anónimo, etc. |
| `pasos` | array | Pasos con sus bloques y reglas de avance. |
| `activo` | boolean | Estado. |

Estructura de **paso**: `titulo`, `descripcion`, `orden`, `tiempo_minimo_segundos`, `confirmacion_requerida`, `reglas_avance`, `bloques[]`.
Estructura de **bloque**: `id`, `tipo`, `orden`, `titulo`, `contenido`, `configuracion`, `reglas`, `estilos`.

### 7.2 `capacitaciones_resultados`

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id_capacitacion` | ObjectId | Capacitación. |
| `participante` | objeto | Datos del participante (según configuración). |
| `respuestas` | array | Respuestas/avance. |
| `calificacion` | number | Calificación obtenida (si aplica). |
| `fecha_creacion` | Date | Fecha del resultado. |

## 8. API del módulo — `/api/capacitaciones`

| Método | Ruta | Propósito | Acceso |
| --- | --- | --- | --- |
| GET | `/publica/:slug` | Obtiene la capacitación publicada. | Público |
| POST | `/publica/:id/resultados` | Registra el resultado del participante. | Público |
| GET | `/` · `/:id` · `/:id/resultados` | Lista, detalle y resultados. | Roles 1, 2 |
| POST | `/` · `/:id/duplicar` | Crear / duplicar. | Roles 1, 2 |
| PUT | `/:id` | Editar. | Roles 1, 2 |
| PATCH | `/:id/estado` | Cambiar estado. | Roles 1, 2 |
| DELETE | `/:id` | Eliminar. | Roles 1, 2 |

> Las rutas públicas están protegidas por el middleware que las desactiva (404 con código `CAPACITACION_PUBLICA_DESACTIVADA`) si el módulo está apagado.

## 9. Seguridad del módulo

| Control | Aplicación | Referencia |
| --- | --- | --- |
| Acceso público controlado | Solo capacitaciones publicadas y con el módulo activo. | PSI.05 |
| Mínimo privilegio | Administración limitada a roles 1 y 2. | PSI.05 |
| Protección de datos | Datos del participante minimizados; opción de participación anónima. | Control 8.11 |
| Validación de entradas | Validación de datos del participante y respuestas. | PSI.12 |

## 10. Plan de pruebas

| ID | Caso | Resultado esperado |
| --- | --- | --- |
| PT-CP-01 | Crear capacitación con pasos y bloques. | Capacitación guardada en borrador. |
| PT-CP-02 | Vista previa. | Contenido previsualizado correctamente. |
| PT-CP-03 | Publicar y acceder por liga pública. | Capacitación accesible sin login. |
| PT-CP-04 | Completar y enviar resultado. | Resultado almacenado. |
| PT-CP-05 | Consultar resultados. | Resultados visibles para el administrador. |
| PT-CP-06 | Acceso público con módulo deshabilitado. | 404 controlado. |
| PT-CP-07 | Duplicar y eliminar capacitación. | Operaciones correctas. |

`[Foto: evidencia de capacitación publicada y completada]`

## 11. Riesgos del módulo

| ID | Riesgo | Impacto | Prob. | Mitigación |
| --- | --- | --- | --- | --- |
| R-CP-01 | Exposición indebida de capacitación interna por liga pública. | Medio | Media | Publicación controlada por estado y slug; desactivación por módulo. |
| R-CP-02 | Captura excesiva de datos personales del participante. | Medio | Media | Minimización y opción anónima (Control 8.11). |
| R-CP-03 | Carga de contenido no autorizado en bloques. | Bajo | Baja | Revisión antes de publicar. |

## 12. Control documental

| Documento | Código | Versión | Fecha | Responsable | Estado |
| --- | --- | --- | --- | --- | --- |
| Documento de Integración — Módulo Capacitaciones | INT-004 | 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Vigente |

**Documento base relacionado:** DR-RE-001, API-RE-001, DB-RE-001.
