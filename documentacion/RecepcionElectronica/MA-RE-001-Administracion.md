# Manual de Administración

## Recepción Electrónica (RE) — Base

Guía para el administrador del sistema: configuración, roles, permisos y operación.

| Campo | Descripción |
| --- | --- |
| Tipo de documento | Manual de Administración |
| Código | MA-RE-001 |
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
| 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Versión inicial del manual de administración de la base. |

---

## 1. Configuración inicial (setup)

En una instalación nueva, el sistema muestra el flujo de configuración inicial para crear empresa, piso, acceso, usuario administrador y configuración general.

`[Foto: flujo de configuración inicial]`

## 2. Roles del sistema

| Rol | Nombre | Descripción |
| --- | --- | --- |
| 1 | Administrador | Acceso administrativo amplio. Algunas rutas requieren además condición de root. |
| 2 | Recepción | Operación de empleados, visitantes, registros, eventos y catálogos. |
| 4 | Interno | Usuario anfitrión; opera visitas asociadas. |
| 5 | Reportes | Reportes, eventos, kiosco y visitantes. |
| 10 | Visitante | Acceso a su perfil, documentos y QR propio. |
| 13 | Tablet | Kiosco, visitantes, eventos y escáner QR. |
| ≥ 100 | Personalizado | Roles personalizados con visibilidad por configuración. |

> Otros roles (Asistencia, Validador, Empleado Campo, Contratista) se relacionan con módulos opcionales y se describen en sus documentos.

## 3. Permisos

- Backend: `validarTokenYRol([...])` por ruta.
- Frontend: cálculo de permisos por rol y banderas de configuración.
- Menú: visibilidad por rol.
- Usuario maestro/root: requerido para rutas críticas de configuración.

### 3.1 Roles personalizados

Desde **Configuración** se pueden crear y eliminar roles personalizados (numeración ≥ 100), definiendo qué módulos son visibles para cada uno.

`[Foto: pantalla de creación de rol personalizado]`

## 4. Configuración general

Desde **Configuración** (rol administrador root) se administra:

- Nombre de la aplicación y tema visual.
- Zona horaria.
- Correo de cuentas.
- Tiempos (por ejemplo, auto-cancelación de registros).
- Documentos requeridos.
- Activación de módulos opcionales.

`[Foto: pantalla de configuración general]`

## 5. Activación de módulos opcionales

Los módulos opcionales se activan mediante:

- Banderas `habilitar*` en configuración.
- Variable `INTEGRACIONES_VISIBLES` (lista por cliente) e `INTEGRACIONES_VISIBILIDAD_MODO` (`ALL`/`CLIENT`).

`[Foto: pantalla de integraciones/módulos en configuración]`

## 6. Administración de catálogos

Mantenga actualizados los catálogos base: empresas, pisos, accesos, puestos, departamentos, cubículos, horarios y pases. Cada uno permite crear, editar y activar/inactivar.

`[Foto: administración de catálogo de accesos]`

## 7. Gestión de usuarios

- Alta, edición y cambio de estado.
- Desbloqueo de cuentas bloqueadas por intentos fallidos.
- Anonimización y eliminación permanente conforme a la política de protección de datos.

`[Foto: gestión de usuarios con acción de desbloqueo]`

## 8. Operación y monitoreo

- Procesos gestionados con PM2 (`pm2 list`, `pm2 logs`, `pm2 restart`).
- Bitácora técnica de peticiones en la colección `logs`.
- Revisión periódica de accesos y usuarios (alineado con PSI.05).

`[Foto: salida de pm2 list]`

## 9. Respaldos

- Respaldo periódico de MongoDB (`mongodump`).
- Resguardo de archivos `.env` y certificados.
- Registro de fecha y responsable de cada respaldo.

## 10. Buenas prácticas de seguridad (ISO)

| Control | Acción del administrador | Referencia |
| --- | --- | --- |
| Mínimo privilegio | Asignar solo los accesos necesarios por rol. | PSI.05 |
| Revisión de accesos | Revisar usuarios activos/inactivos periódicamente. | PSI.05 |
| Protección de datos | Aplicar minimización/anonimización cuando corresponda. | Control 8.11 |
| Trazabilidad | Conservar bitácora de cambios relevantes. | PSI.12 |
| Secretos | No exponer `.env` ni certificados. | PSI.12 |

## 11. Control documental

| Documento | Código | Versión | Fecha | Responsable | Estado |
| --- | --- | --- | --- | --- | --- |
| Manual de Administración — RE | MA-RE-001 | 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Vigente |
