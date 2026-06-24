# Plan y Evidencia de Pruebas

## Recepción Electrónica (RE) — Base

Casos de prueba y evidencia de validación del núcleo de Recepción Electrónica.

| Campo | Descripción |
| --- | --- |
| Tipo de documento | Plan / Evidencia de Pruebas |
| Código | PT-RE-001 |
| Producto | Recepción Electrónica (RE) — Base |
| Versión | 1.0 |
| Fecha | 2026-06-24 |
| Responsable | Área de Sistemas / Desarrollo |
| Clasificación | Uso interno |
| Estado | Vigente |

---

## Control de versiones

| Versión | Fecha | Autor | Descripción |
| --- | --- | --- | --- |
| 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Versión inicial del plan de pruebas de la base. |

---

## 1. Objetivo y alcance

Validar que el producto base cumple con los requerimientos funcionales (DR-RE-001) y mantiene los controles de seguridad. Las pruebas de módulos opcionales se documentan en sus respectivos documentos.

## 2. Tipos de prueba

- Funcionales: verifican el comportamiento esperado.
- De permisos: verifican el acceso por rol.
- De errores: verifican manejo controlado de errores.
- De reportes: verifican generación y exportación.

## 3. Casos de prueba

### 3.1 Autenticación

| ID | Caso | Resultado esperado | Estado |
| --- | --- | --- | --- |
| PT-001 | Login con credenciales válidas. | Acceso concedido y token emitido. | |
| PT-002 | Login con credenciales inválidas. | Acceso denegado con mensaje controlado. | |
| PT-003 | Bloqueo tras intentos fallidos. | Cuenta bloqueada; desbloqueo por administrador. | |
| PT-004 | Recuperación de contraseña. | Código enviado, validado y contraseña cambiada. | |
| PT-005 | Cierre de sesión. | Token invalidado. | |

### 3.2 Usuarios y empleados

| ID | Caso | Resultado esperado | Estado |
| --- | --- | --- | --- |
| PT-010 | Alta de usuario/empleado. | Registro creado con datos y accesos. | |
| PT-011 | Edición y cambio de estado. | Cambios reflejados. | |
| PT-012 | Carga masiva con formato. | Registros importados; errores reportados. | |
| PT-013 | Generación de QR. | QR generado correctamente. | |
| PT-014 | Anonimización/eliminación. | Datos anonimizados/eliminados. | |

### 3.3 Visitantes

| ID | Caso | Resultado esperado | Estado |
| --- | --- | --- | --- |
| PT-020 | Registro de visitante. | Visitante creado. | |
| PT-021 | Verificación de visitante. | Visitante verificado. | |
| PT-022 | Bloqueo/desbloqueo. | Estado actualizado. | |
| PT-023 | Adjuntar y validar documento. | Documento validado/rechazado con motivo. | |

### 3.4 Registros / visitas

| ID | Caso | Resultado esperado | Estado |
| --- | --- | --- | --- |
| PT-030 | Crear visita por recepción. | Registro y evento inicial creados. | |
| PT-031 | Registro por liga enviada. | Token validado y registro creado. | |
| PT-032 | Cancelar/finalizar visita. | Evento de cierre y correo (si aplica). | |
| PT-033 | Notificaciones por correo. | Correos enviados a visitante/anfitrión. | |

### 3.5 Control de acceso

| ID | Caso | Resultado esperado | Estado |
| --- | --- | --- | --- |
| PT-040 | Validar QR válido. | Acceso autorizado y evento registrado. | |
| PT-041 | Validar QR inválido/expirado. | Acceso rechazado. | |
| PT-042 | Registrar entrada y salida. | Eventos de entrada/salida registrados. | |
| PT-043 | Operación en kiosco. | Consulta y registro de eventos. | |

### 3.6 Catálogos y configuración

| ID | Caso | Resultado esperado | Estado |
| --- | --- | --- | --- |
| PT-050 | CRUD de catálogos. | Altas/ediciones/estados correctos. | |
| PT-051 | Cambio de parámetros generales. | Configuración aplicada. | |
| PT-052 | Creación de rol personalizado. | Rol creado con visibilidad definida. | |
| PT-053 | Activar/desactivar módulo opcional. | Visibilidad actualizada sin afectar la base. | |

### 3.7 Reportes

| ID | Caso | Resultado esperado | Estado |
| --- | --- | --- | --- |
| PT-060 | Reporte de registros/eventos/horas. | Datos correctos según filtros. | |
| PT-061 | Exportación a PDF/Excel. | Archivo generado respetando permisos. | |

### 3.8 Permisos y seguridad

| ID | Caso | Resultado esperado | Estado |
| --- | --- | --- | --- |
| PT-070 | Acceso a ruta sin permiso de rol. | Acceso denegado. | |
| PT-071 | Manejo de error sin datos sensibles. | Error controlado, sin información técnica. | |
| PT-072 | Rate limit en autenticación. | Peticiones excesivas limitadas. | |
| PT-073 | Logs sin secretos ni datos personales completos. | Bitácora conforme a Control 8.11. | |

## 4. Checklist de validación

| Punto de revisión | Cumple | Observaciones |
| --- | --- | --- |
| Requerimientos funcionales validados | | |
| Permisos por rol verificados | | |
| Errores controlados | | |
| Reportes y exportaciones correctos | | |
| Contraseñas protegidas (hash) | | |
| Secretos fuera del código fuente | | |
| Logs sin datos sensibles | | |
| Evidencia de pruebas registrada | | |

## 5. Evidencias

`[Foto: evidencia de login exitoso]`
`[Foto: evidencia de registro de visita creado]`
`[Foto: evidencia de validación de QR]`
`[Foto: evidencia de reporte exportado]`

> Las evidencias deben capturarse sin exponer datos personales reales, QR reales, tokens ni valores de `.env`.

## 6. Control documental

| Documento | Código | Versión | Fecha | Responsable | Estado |
| --- | --- | --- | --- | --- | --- |
| Plan / Evidencia de Pruebas — RE | PT-RE-001 | 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Vigente |
