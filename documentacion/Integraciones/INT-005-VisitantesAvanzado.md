# Documento de Integración

## Módulo Visitantes Avanzado

Especificación funcional y técnica del módulo **Visitantes Avanzado**, que amplía las capacidades del módulo base de visitantes, como complemento opcional del producto base de Recepción Electrónica (RE).

| Campo | Descripción |
| --- | --- |
| Tipo de documento | Documento de Integración (módulo opcional) |
| Código | INT-005 |
| Módulo | Visitantes Avanzado |
| Producto base | Recepción Electrónica (RE) |
| Versión | 1.0 |
| Fecha | 2026-06-24 |
| Responsable | Área de Sistemas / Desarrollo |
| Clasificación | Uso interno |
| Estado | Vigente |

> Documento autocontenido. Este módulo **extiende** el módulo base de visitantes; no lo reemplaza.

---

## Control de versiones

| Versión | Fecha | Autor | Descripción |
| --- | --- | --- | --- |
| 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Versión inicial del documento de Visitantes Avanzado. |

---

## 1. Objetivo

Definir las capacidades avanzadas de gestión de visitantes que se habilitan con el módulo Visitantes Avanzado: autorización de acceso por QR, verificación, bloqueo/desbloqueo, programación masiva, reversión de creación, lectura de identificación por OCR y, cuando aplique, registro de vehículo.

## 2. Alcance del módulo

- Autorización de acceso por QR de visitantes.
- Verificación de visitantes antes del acceso.
- Bloqueo y desbloqueo de visitantes.
- Programación masiva de visitantes mediante archivo.
- Reversión de creación de un visitante.
- Lectura de datos de identificación (INE) mediante **OCR**.
- Funciones de vehículo del visitante (cuando la bandera de vehículo está activa).
- Re-sincronización del visitante con paneles (cuando exista integración de paneles).

## 3. Habilitación

| Mecanismo | Valor |
| --- | --- |
| Bandera de configuración | `configuraciones.habilitarVisitantesAvanzado` |
| Bandera de vehículo | `configuraciones.habilitarVisitantesVehiculo` (requiere avanzado) |
| Visibilidad por cliente | `INTEGRACIONES_VISIBLES` incluye `visitantes_avanzado` |

> Las pantallas base de visitantes permanecen disponibles; las operaciones avanzadas se habilitan a nivel de API según la bandera.

## 4. Requerimientos del módulo

| ID | Requerimiento | Prioridad |
| --- | --- | --- |
| RF-VA-001 | El módulo debe permitir autorizar el acceso por QR de un visitante. | Alta |
| RF-VA-002 | El módulo debe permitir verificar a un visitante. | Alta |
| RF-VA-003 | El módulo debe permitir bloquear y desbloquear visitantes. | Media |
| RF-VA-004 | El módulo debe permitir la programación masiva de visitantes mediante archivo. | Media |
| RF-VA-005 | El módulo debe permitir revertir la creación de un visitante. | Baja |
| RF-VA-006 | El módulo debe extraer datos de identificación (INE) mediante OCR. | Alta |
| RF-VA-007 | El módulo debe permitir registrar datos de vehículo cuando la función esté activa. | Baja |
| RF-VA-008 | El módulo debe permitir re-sincronizar al visitante con paneles cuando exista esa integración. | Media |

## 5. Descripción funcional

### 5.1 Operaciones avanzadas

| Operación | Descripción |
| --- | --- |
| Autorizar QR | Autoriza el acceso del visitante por código QR. |
| Verificar | Marca al visitante como verificado antes del acceso. |
| Bloquear/Desbloquear | Restringe o habilita el acceso del visitante. |
| Programación | Carga masiva de visitantes programados desde archivo. |
| Revertir creación | Deshace el registro de un visitante. |
| OCR de INE | Extrae número y nombre de la identificación a partir de la imagen. |
| Resync paneles | Re-sincroniza al visitante con los paneles de acceso. |

`[Foto: pantalla de verificación de visitante]`
`[Foto: captura de INE con OCR]`
`[Foto: lector de QR de visitantes]`
`[Foto: carga de programación de visitantes]`

### 5.2 Flujo de OCR de identificación

1. En el registro del visitante, se captura la imagen de la identificación.
2. El módulo procesa la imagen con OCR (Tesseract) y extrae número y nombre.
3. Los datos extraídos pre-llenan el formulario para su confirmación.

## 6. Arquitectura e integración técnica

| Componente | Archivo | Responsabilidad |
| --- | --- | --- |
| Controlador de visitantes | `back/controllers/visitantes.controller.ts` | Operaciones avanzadas (autorizar QR, verificar, bloquear, programación, revertir, resync). |
| Controlador OCR | `back/controllers/ocr.controller.ts` | Extracción de datos de identificación. |
| Rutas | `back/routes/visitantes.routes.ts`, `ocr.routes.ts` | Endpoints del módulo. |
| Pantallas | `front/src/components/recepcion/visitantes/*` | Verificación, lector QR y captura de identificación. |

## 7. Modelo de datos

Este módulo opera sobre la colección **`visitantes`** del núcleo, utilizando entre otros: estado de acceso QR (`acceso_qr_estado`, `acceso_qr_modo`), verificación (`verificado`), bloqueo (`bloqueado`), documentos y, cuando aplica, campos de vehículo y de sincronización con paneles.

> No introduce colecciones nuevas; amplía el uso de la colección base de visitantes.

## 8. API del módulo

### 8.1 Operaciones avanzadas — `/api/visitantes`

| Método | Ruta | Propósito | Rol |
| --- | --- | --- | --- |
| POST | `/autorizar-qr` | Autoriza acceso por QR. | 1, 2, 5, 13 |
| POST | `/programacion` | Programación masiva de visitantes. | 1, 2 |
| PATCH | `/verificar/:id` | Verifica al visitante. | 1, 2, 4, 5, 13 |
| PATCH | `/resync/:id` | Re-sincroniza con paneles. | 1, 2, 4, 5, 13 |
| PATCH | `/revertir-creacion/:id` | Revierte la creación. | 1, 2, 4, 5, 13 |
| PATCH | `/bloquear/:id` | Bloquea al visitante. | 1, 2 |
| PATCH | `/desbloquear/:id` | Desbloquea al visitante. | 1, 2, 5, 13 |

### 8.2 OCR — `/api/ocr`

| Método | Ruta | Propósito | Rol |
| --- | --- | --- | --- |
| POST | `/` | Extrae número de identificación. | 1, 2, 4, 5 |
| POST | `/nombre` | Extrae nombre de la identificación. | 1, 2, 4, 5 |

## 9. Seguridad del módulo

| Control | Aplicación | Referencia |
| --- | --- | --- |
| Mínimo privilegio | Operaciones restringidas por rol. | PSI.05 |
| Protección de datos de identificación | Datos de INE minimizados; no exponer imágenes/identificadores innecesariamente. | Control 8.11 |
| Validación de entradas | Validación de imágenes y datos extraídos por OCR. | PSI.12 |
| Trazabilidad | Registro de verificación, bloqueo y reversión. | PSI.12 |

## 10. Plan de pruebas

| ID | Caso | Resultado esperado |
| --- | --- | --- |
| PT-VA-01 | Autorizar acceso por QR. | Acceso autorizado y evento registrado. |
| PT-VA-02 | Verificar visitante. | Visitante marcado como verificado. |
| PT-VA-03 | Bloquear y desbloquear. | Estado de acceso actualizado. |
| PT-VA-04 | Programación masiva. | Visitantes importados; errores reportados. |
| PT-VA-05 | Revertir creación. | Registro revertido. |
| PT-VA-06 | OCR de INE. | Número y nombre extraídos y confirmables. |
| PT-VA-07 | Operación avanzada con módulo deshabilitado. | Operación no disponible. |

`[Foto: evidencia de OCR extrayendo datos de la identificación]`

## 11. Riesgos del módulo

| ID | Riesgo | Impacto | Prob. | Mitigación |
| --- | --- | --- | --- | --- |
| R-VA-01 | Exposición de datos de identificación (INE). | Alto | Media | Minimización/enmascaramiento y acceso por rol (Control 8.11). |
| R-VA-02 | Autorización indebida de acceso por QR. | Alto | Baja | Validación de estado y verificación previa. |
| R-VA-03 | Error de OCR que captura datos incorrectos. | Medio | Media | Confirmación manual de los datos extraídos. |
| R-VA-04 | Carga masiva con datos inválidos. | Medio | Media | Validación de archivo y reporte de errores. |

## 12. Control documental

| Documento | Código | Versión | Fecha | Responsable | Estado |
| --- | --- | --- | --- | --- | --- |
| Documento de Integración — Módulo Visitantes Avanzado | INT-005 | 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Vigente |

**Documento base relacionado:** DR-RE-001, DF-RE-001, API-RE-001.
