# Documento Funcional

## Recepción Electrónica (RE) — Base

Descripción funcional de los módulos, pantallas y flujos del núcleo de Recepción Electrónica.

| Campo | Descripción |
| --- | --- |
| Tipo de documento | Documento Funcional |
| Código | DF-RE-001 |
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
| 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Versión inicial del documento funcional de la base. |

---

## 1. Objetivo

Describir el comportamiento funcional del producto base de RE: qué hace cada módulo, qué pantallas lo componen y cómo fluye la información entre ellos.

## 2. Mapa funcional

| Módulo | Función |
| --- | --- |
| Autenticación | Inicio/cierre de sesión y recuperación de contraseña. |
| Usuarios | Administración de usuarios internos, roles y permisos. |
| Empleados | Administración de empleados y sus accesos. |
| Visitantes | Registro y administración de visitantes. |
| Registros/Visitas | Creación y ciclo de vida de visitas/citas. |
| Control de acceso | Validación de QR, kiosco y eventos de entrada/salida. |
| Catálogos | Empresas, pisos, accesos, puestos, departamentos, cubículos, horarios, pases. |
| Documentos | Gestión documental de visitantes. |
| Reportes | Reportes de visitas, eventos y horas. |
| Configuración | Parámetros generales, permisos y módulos. |

`[Foto: dashboard principal tras iniciar sesión]`

## 3. Módulos

### 3.1 Autenticación

- **Login**: el usuario ingresa correo y contraseña. El sistema valida credenciales, estado activo y emite token de sesión.
- **Recuperación**: envío de código al correo, validación y cambio de contraseña.
- **Bloqueo**: tras varios intentos fallidos, la cuenta se bloquea hasta que un administrador la desbloquee.

`[Foto: pantalla de login]`
`[Foto: pantalla de recuperación de contraseña]`

### 3.2 Usuarios

- Listado con filtros y paginación.
- Alta/edición con asignación de rol, empresa, puesto, departamento, cubículo, piso, horario y accesos.
- Generación de QR, reenvío de correo de acceso, carga masiva.
- Anonimización y eliminación permanente.

`[Foto: listado de usuarios]`
`[Foto: formulario de alta de usuario]`

### 3.3 Empleados

- Listado, alta/edición con empresa, piso, accesos y horarios.
- Carga masiva, generación de QR y directorio.
- Anonimización y eliminación permanente.

`[Foto: listado de empleados]`

### 3.4 Visitantes

- Registro, edición y cambio de estado de visitantes.
- Verificación previa al acceso, bloqueo/desbloqueo.
- Asociación y validación de documentos.
- Generación de QR y carga masiva.

`[Foto: listado de visitantes]`
`[Foto: detalle de visitante con documentos]`

### 3.5 Registros / Visitas

- Creación de visita capturando visitante, contacto, empresa, anfitrión, fecha, accesos y documentos.
- Registro por liga enviada al visitante (autoservicio).
- Edición, cancelación y finalización con registro de salida.
- Notificaciones por correo en creación, cancelación y confirmación.

`[Foto: formulario de nuevo registro de visita]`
`[Foto: correo de invitación recibido por el visitante]`

### 3.6 Control de acceso

- **Kiosco/Tablet**: operación de acceso con consulta y registro de eventos.
- **Escáner QR**: validación de QR de visitantes, usuarios y empleados.
- **Eventos**: registro de entrada, salida, autorización, cancelación y finalización.

`[Foto: vista de kiosco]`
`[Foto: escáner QR validando un acceso]`

### 3.7 Catálogos

CRUD de empresas, pisos, accesos, puestos, departamentos, cubículos, horarios y pases (crear, editar, activar/inactivar).

`[Foto: catálogo de accesos]`

### 3.8 Reportes

- Reportes de registros/visitas, eventos y horas con filtros.
- Exportación a PDF y Excel respetando permisos del usuario.

`[Foto: pantalla de reportes con filtros]`
`[Foto: ejemplo de reporte exportado a Excel]`

### 3.9 Configuración

- Parámetros generales (nombre, zona horaria, correo, tiempos, tema).
- Administración de permisos por rol y roles personalizados.
- Activación/desactivación de módulos opcionales.

`[Foto: pantalla de configuración general]`
`[Foto: pantalla de permisos por rol]`

## 4. Flujos principales

### 4.1 Registro por recepción

1. El usuario inicia sesión.
2. Crea una visita desde visitantes/bitácora.
3. Captura datos y accesos.
4. El sistema crea el registro y un evento inicial pendiente.
5. Se notifica por correo a visitante/anfitrión.

### 4.2 Registro por liga

1. Un usuario autorizado envía la liga de registro.
2. El visitante abre la liga, se valida el token y captura sus datos.
3. El sistema crea el registro e invalida el token.

### 4.3 Entrada y salida

1. El visitante llega a recepción/kiosco/tablet.
2. Se escanea el QR y se valida el acceso.
3. Se registra el evento de entrada y, posteriormente, el de salida.
4. El registro puede finalizarse (con fecha de salida).

### 4.4 Cancelación / finalización

1. Un usuario autorizado cancela o finaliza el registro.
2. Se crea el evento correspondiente.
3. Puede enviarse correo de cancelación.

`[Foto: secuencia de un registro desde creación hasta finalización]`

## 5. Roles y visibilidad

La visibilidad de módulos y acciones depende del rol del usuario y de la configuración de permisos. Ver MA-RE-001 (Administración) para el detalle de roles y permisos.

## 6. Control documental

| Documento | Código | Versión | Fecha | Responsable | Estado |
| --- | --- | --- | --- | --- | --- |
| Documento Funcional — RE | DF-RE-001 | 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Vigente |
