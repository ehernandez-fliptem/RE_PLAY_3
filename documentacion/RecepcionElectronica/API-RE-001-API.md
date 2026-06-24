# Documentación de API

## Recepción Electrónica (RE) — Base

Especificación de los endpoints del núcleo de Recepción Electrónica.

| Campo | Descripción |
| --- | --- |
| Tipo de documento | Documentación de API |
| Código | API-RE-001 |
| Producto | Recepción Electrónica (RE) — Base |
| Versión | 1.0 |
| Fecha | 2026-06-24 |
| Responsable | Área de Sistemas / Desarrollo |
| Clasificación | Uso interno |
| Estado | Vigente |

> Documento de la base. Los endpoints de módulos opcionales (dispositivos, contratistas, capacitaciones, registro de campo, OCR, validación facial) se documentan en sus documentos de integración.

---

## Control de versiones

| Versión | Fecha | Autor | Descripción |
| --- | --- | --- | --- |
| 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Versión inicial de la API base. |

---

## 1. Generalidades

- Base de la API: `/api`.
- Autenticación: las rutas protegidas requieren el header `x-access-token` (JWT). El WebSocket usa token validado.
- Control de acceso: por rol mediante `validarTokenYRol([...])`.
- Límites de tasa: aplicados a rutas sensibles de autenticación.

### 1.1 Formato de respuesta

Éxito:

```json
{ "estado": true, "datos": {} }
```

Error funcional:

```json
{ "estado": false, "mensaje": "Descripción del error" }
```

Validación de formulario:

```json
{ "estado": false, "mensaje": "Revisa que los datos sean correctos", "mensajes": {} }
```

## 2. Autenticación — `/api/auth`

| Método | Ruta | Recibe | Responde | Login |
| --- | --- | --- | --- | --- |
| POST | `/api/auth` | Correo, contraseña y datos de dispositivo. | Token JWT, datos de usuario y configuración. | No |
| POST | `/api/auth/logout` | Token de sesión. | Confirmación de cierre. | Sí |

## 3. Recuperación de contraseña — `/api/recuperaciones`

| Método | Ruta | Recibe | Responde | Login |
| --- | --- | --- | --- | --- |
| POST | `/enviar-codigo` | Correo. | Envío de código. | No |
| POST | `/validar-codigo` | Correo/código. | Token temporal. | No |
| PUT | `/modificar-contrasena` | Token temporal y nueva contraseña. | Confirmación. | No |

## 4. Validación / setup inicial — `/api/validacion`

| Método | Ruta | Propósito | Login |
| --- | --- | --- | --- |
| GET | `/app` | Estado de configuración inicial. | No |
| GET | `/session-config` | Información de sesión/configuración activa. | Sí |
| GET | `/generales`, `/accesos`, `/pisos` | Catálogos para setup. | No |
| GET | `/usuario/form-nuevo`, `/empresa/form-nuevo` | Datos para formularios iniciales. | No |
| POST | `/empresa`, `/piso`, `/acceso`, `/usuario`, `/configuracion` | Altas del setup inicial. | No |
| DELETE | `/piso/:id`, `/acceso/:id` | Eliminación de elementos del setup. | No |

## 5. Usuarios — `/api/usuarios`

| Método | Ruta | Propósito | Rol |
| --- | --- | --- | --- |
| GET | `/` · `/activos` · `/:id` | Lista, activos y detalle. | 1 |
| GET | `/directorio` | Directorio. | 1, 2 |
| GET | `/anfitriones` | Anfitriones. | 1, 2, 4, 5 |
| GET | `/descargar-formato` · `/form-nuevo` · `/form-editar/:id` · `/qr/:id` | Formatos, catálogos y QR. | 1 |
| POST | `/` | Crear usuario. | 1 |
| POST | `/cargar-formato` · `/programacion` | Carga masiva / programación. | 1 |
| PUT | `/:id` | Actualizar. | 1 |
| PATCH | `/anonimizar/:id` · `/reenviar/:id` · `/desbloquear/:id` · `/eliminar-permanente/:id` · `/:id` | Anonimizar, reenviar, desbloquear, eliminar, estado. | 1 |

## 6. Empleados — `/api/empleados`

| Método | Ruta | Propósito | Rol |
| --- | --- | --- | --- |
| GET | `/` · `/activos` · `/:id` | Lista, activos y detalle. | 1, 2 |
| GET | `/directorio` · `/anfitriones` | Directorio y anfitriones. | 1, 2 (anfitriones también 11) |
| GET | `/descargar-formato` · `/form-nuevo` · `/form-editar/:id` · `/qr/:id` | Formatos, catálogos y QR. | 1, 2 |
| POST | `/` | Crear empleado. | 1, 2 |
| POST | `/cargar-formato` · `/programacion` | Carga masiva / programación. | 1, 2 |
| PUT | `/:id` | Actualizar. | 1, 2 |
| PATCH | `/anonimizar/:id` · `/desbloquear/:id` · `/eliminar-permanente/:id` · `/:id` | Anonimizar, desbloquear, eliminar, estado. | 1, 2 |

## 7. Visitantes — `/api/visitantes`

| Método | Ruta | Propósito | Rol |
| --- | --- | --- | --- |
| GET | `/` · `/todos` · `/activos` · `/:id` | Grid, lista, activos y detalle. | 1, 2, 4, 5, 13 |
| GET | `/descargar-formato` · `/form-editar/:id` | Formato y datos de edición. | 1, 2 (edición además 4, 5, 13) |
| GET | `/qr/:id` · `/qr/` | QR de visitante / QR propio. | 1, 2, 4, 5, 10, 13 |
| POST | `/` | Crear visitante. | 1, 2, 4, 5, 13 |
| POST | `/cargar-formato` | Carga masiva. | 1, 2 |
| PUT | `/:id` | Actualizar. | 1, 2, 4, 5, 13 |
| PATCH | `/eliminar-permanente/:id` · `/:id` | Eliminar / cambiar estado. | 1, 2, 4, 5, 13 |

> Operaciones avanzadas de visitantes (autorización QR, programación, verificación, bloqueo/desbloqueo, resync, reversión) se documentan en el módulo **Visitantes Avanzado**.

## 8. Registros / visitas — `/api/registros`

| Método | Ruta | Propósito | Rol/Login |
| --- | --- | --- | --- |
| GET | `/` · `/:id` | Lista y detalle. | 1, 2, 10 |
| GET | `/ultimo-registro` · `/form-nuevo` · `/form-editar/:id` | Autocompletar y catálogos. | 1, 2 |
| POST | `/` | Crear registro. | 1, 2 |
| POST | `/reportes` · `/reporte-horas` · `/accesos-anfitrion` | Reportes y accesos del anfitrión. | 1, 2 |
| POST | `/enviar-liga-registro` | Enviar liga de registro al visitante. | 1, 2 |
| POST | `/validar-token-registro` · `/visitante` | Validar liga / registro por visitante. | No (token) |
| PUT | `/:id` · `/modificar/:id` · `/cancelar/:id` · `/finalizar/:id` | Editar, modificar, cancelar, finalizar. | 1, 2 |
| PATCH | `/acceso/:id` | Marcar nuevo acceso. | 1, 2 |

## 9. Eventos — `/api/eventos`

| Método | Ruta | Propósito | Rol |
| --- | --- | --- | --- |
| GET | `/form-reportes` · `/kiosco/paneles` · `/kiosco` · `/imagen/:id` · `/:id` | Catálogos, kiosco, imagen y detalle. | 1, 2, 5, 13 |
| GET | `/form-reporte-horas` | Catálogos de reporte de horas. | 1, 2, 5 |
| POST | `/` | Crear evento. | 1, 2, 5, 13 |
| POST | `/validar-qr` | Validar QR. | 1, 2, 5, 13 |
| POST | `/autorizar` · `/reporte-horas/individual/:id` · `/reportes-horas` | Autorizar check y reportes de horas. | 1, 2, 5 |
| POST | `/reportes` | Reporte de eventos. | 1, 2, 5, 13 |

> Endpoints de eventos vinculados a paneles/biometría/apertura de puertas se documentan en sus módulos de integración.

## 10. Configuración — `/api/configuracion`

| Método | Ruta | Propósito | Rol |
| --- | --- | --- | --- |
| GET | `/` | Configuración general. | 1 (root) |
| GET | `/integraciones` | Estado/visibilidad de módulos opcionales. | 1 (root) |
| PUT | `/` · `/integraciones` · `/colecciones` | Actualiza configuración general, módulos y documentos. | 1 (root) |
| POST | `/roles/personalizado` | Crea rol personalizado. | 1 (root) |
| DELETE | `/roles/personalizado/:rol` | Elimina rol personalizado. | 1 (root) |

## 11. Catálogos base

Patrón común para `/api/accesos`, `/api/pisos`, `/api/puestos`, `/api/departamentos`, `/api/cubiculos`, `/api/empresas`, `/api/pases`, `/api/horarios`:

| Método | Ruta tipo | Propósito |
| --- | --- | --- |
| GET | `/<catalogo>` · `/activos` · `/:id` | Lista, activos, detalle. |
| GET | `/<catalogo>/form-nuevo` · `/form-editar/:id` | Catálogos para alta/edición. |
| POST | `/<catalogo>` | Crear. |
| PUT | `/<catalogo>/:id` | Actualizar. |
| PATCH | `/<catalogo>/:id` | Activar/inactivar. |

## 12. Tiempo real (WebSocket)

- El sistema emite notificaciones por WebSocket para nuevos registros y eventos.
- El token de conexión se valida con `validarTokenWS`.

`[Foto: ejemplo de respuesta de /api/auth en Postman, con token enmascarado]`

## 13. Control documental

| Documento | Código | Versión | Fecha | Responsable | Estado |
| --- | --- | --- | --- | --- | --- |
| Documentación de API — RE | API-RE-001 | 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Vigente |
