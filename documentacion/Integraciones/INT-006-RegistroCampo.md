# Documento de Integración

## Módulo Registro de Campo

Especificación funcional y técnica del módulo **Registro de Campo**, como complemento opcional del producto base de Recepción Electrónica (RE).

| Campo | Descripción |
| --- | --- |
| Tipo de documento | Documento de Integración (módulo opcional) |
| Código | INT-006 |
| Módulo | Registro de Campo |
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
| 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Versión inicial del documento de Registro de Campo. |

---

## 1. Objetivo

Definir el módulo de Registro de Campo, que permite a los **empleados de campo** registrar sus movimientos de entrada y salida desde la web, capturando ubicación geográfica y fotografía, y al administrador consultar los reportes correspondientes.

## 2. Alcance del módulo

- Registro de movimientos de entrada (IN) y salida (OUT) de empleados de campo.
- Captura de geolocalización (latitud, longitud y precisión) y fotografía.
- Consulta del estado actual y de los registros propios del empleado.
- Reportes de movimientos para el administrador.

## 3. Habilitación

| Mecanismo | Valor |
| --- | --- |
| Bandera de configuración | `configuraciones.habilitarRegistroCampo` |
| Visibilidad por cliente | `INTEGRACIONES_VISIBLES` incluye `registro_campo` |

## 4. Roles involucrados

| Rol | Función |
| --- | --- |
| Empleado Campo (12) | Registra sus movimientos y consulta su estado/registros. |
| Administrador (1) | Consulta reportes de todos los movimientos de campo. |

## 5. Requerimientos del módulo

| ID | Requerimiento | Prioridad |
| --- | --- | --- |
| RF-RC-001 | El módulo debe permitir registrar un movimiento de entrada o salida con fecha, ubicación y fotografía. | Alta |
| RF-RC-002 | El módulo debe mostrar el estado actual del empleado (último movimiento y siguiente acción). | Alta |
| RF-RC-003 | El módulo debe permitir al empleado consultar sus propios registros. | Media |
| RF-RC-004 | El módulo debe permitir al administrador consultar reportes de todos los movimientos. | Media |
| RF-RC-005 | El módulo debe capturar la precisión del GPS cuando esté disponible. | Baja |

## 6. Descripción funcional

### 6.1 Pantalla

| Pantalla | Ruta | Función |
| --- | --- | --- |
| Registro Campo | `/campo` | Interfaz de registro de entrada/salida del empleado de campo. |

La pantalla muestra el nombre del empleado, su último movimiento (IN/OUT) y hora, la acción siguiente requerida, su ubicación actual y la precisión del GPS. Incluye los botones **Registrar Entrada** / **Registrar Salida**, que capturan fotografía y ubicación al enviar.

`[Foto: pantalla de Registro de Campo con ubicación y botón de registro]`
`[Foto: captura de fotografía al registrar movimiento]`
`[Foto: reporte de movimientos de campo para el administrador]`

### 6.2 Flujo de registro

1. El empleado de campo abre la pantalla `/campo`.
2. El sistema obtiene su ubicación (latitud/longitud y precisión).
3. El empleado presiona Registrar Entrada o Salida según corresponda.
4. Se captura la fotografía y se envía el movimiento al backend.
5. El sistema almacena el registro y actualiza el estado.

## 7. Arquitectura e integración técnica

| Componente | Archivo | Responsabilidad |
| --- | --- | --- |
| Controlador | `back/controllers/campo.controller.ts` | Estado, registro y reportes de campo. |
| Rutas | `back/routes/campo.routes.ts` | Endpoints del módulo. |
| Pantalla | `front/src/components/campo/Campo.tsx` | Interfaz del empleado de campo. |

## 8. Modelo de datos — `registros_campo`

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id_empleado` | ObjectId | Empleado (indexado). |
| `id_usuario` | ObjectId | Usuario asociado. |
| `tipo` | enum | `IN` (entrada) / `OUT` (salida). |
| `fecha_hora_servidor` | Date | Fecha y hora del servidor (indexada). |
| `latitud`, `longitud` | number | Geolocalización. |
| `precision` | number? | Precisión del GPS (metros). |
| `foto` | string | Fotografía (base64, requerida). |
| `origen` | string | Origen del registro (`web`). |
| `estatus` | string | Estado (`ok`). |
| `fecha_creacion` | Date | Fecha de creación. |

## 9. API del módulo — `/api/campo`

| Método | Ruta | Propósito | Rol |
| --- | --- | --- | --- |
| GET | `/estado` | Estado actual del empleado (último/siguiente movimiento). | 1, 12 |
| GET | `/mis-registros` | Registros propios del empleado. | 1, 12 |
| POST | `/registrar` | Registra un movimiento (entrada/salida) con ubicación y foto. | 1, 12 |
| GET | `/reportes` | Reportes de movimientos de campo. | 1 |

## 10. Seguridad del módulo

| Control | Aplicación | Referencia |
| --- | --- | --- |
| Mínimo privilegio | Empleado de campo solo opera sus propios registros; reportes solo administrador. | PSI.05 |
| Protección de datos | Ubicación y fotografía tratadas como datos personales; acceso restringido. | Control 8.11 |
| Validación de entradas | Validación de fotografía, coordenadas y tipo de movimiento. | PSI.12 |
| Trazabilidad | Fecha/hora del servidor y origen registrados. | PSI.12 |

## 11. Plan de pruebas

| ID | Caso | Resultado esperado |
| --- | --- | --- |
| PT-RC-01 | Registrar entrada con ubicación y foto. | Movimiento `IN` almacenado. |
| PT-RC-02 | Registrar salida. | Movimiento `OUT` almacenado. |
| PT-RC-03 | Consultar estado actual. | Último y siguiente movimiento correctos. |
| PT-RC-04 | Consultar registros propios. | Lista de movimientos del empleado. |
| PT-RC-05 | Reporte de administrador. | Movimientos de todos los empleados. |
| PT-RC-06 | Registro sin ubicación/foto. | Validación de error controlada. |
| PT-RC-07 | Acceso con rol no autorizado. | Acceso denegado. |

`[Foto: evidencia de un registro de campo con mapa/ubicación]`

## 12. Riesgos del módulo

| ID | Riesgo | Impacto | Prob. | Mitigación |
| --- | --- | --- | --- | --- |
| R-RC-01 | Exposición de ubicación y fotografías de empleados. | Alto | Media | Acceso restringido por rol y minimización (Control 8.11). |
| R-RC-02 | Registros falsos o manipulación de ubicación. | Medio | Media | Fecha/hora del servidor, captura de foto y precisión de GPS. |
| R-RC-03 | Falta de cobertura GPS. | Bajo | Media | Captura de precisión y validación de coordenadas. |
| R-RC-04 | Almacenamiento de fotos sin control. | Medio | Media | Control de acceso y políticas de conservación. |

## 13. Control documental

| Documento | Código | Versión | Fecha | Responsable | Estado |
| --- | --- | --- | --- | --- | --- |
| Documento de Integración — Módulo Registro de Campo | INT-006 | 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Vigente |

**Documento base relacionado:** DR-RE-001, DB-RE-001, API-RE-001.
