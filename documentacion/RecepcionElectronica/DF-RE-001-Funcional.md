# Documento Funcional

## Recepción Electrónica (RE) — Base

Versión 1.0

---

| Campo | Descripción |
| --- | --- |
| Tipo de documento | Documento Funcional |
| Código | DF-RE-001 |
| Producto | Recepción Electrónica (RE) — Base |
| Versión | 1.0 |
| Fecha | 2026-06-24 |
| Responsable | Área de Sistemas / Desarrollo |
| Clasificación | Uso interno / Cliente |
| Estado | Vigente |

---

## Control de versiones

| Versión | Fecha | Autor | Descripción |
| --- | --- | --- | --- |
| 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Versión inicial del documento funcional de la base. |

---

## Contenido

1. Objetivo
2. Alcance funcional
3. Definiciones y actores
4. Mapa funcional del sistema
5. Reglas de negocio generales
   - 5.1 Acceso y sesión
   - 5.2 Estados Activo / Inactivo y eliminación
   - 5.3 Validación de formularios
   - 5.4 Notificaciones por correo
6. Funcionalidad por módulo
   - 6.1 Autenticación
   - 6.2 Visitantes
   - 6.3 Registro de visitas (Bitácora)
   - 6.4 Liga de registro (autoservicio)
   - 6.5 Empleados
   - 6.6 Usuarios
   - 6.7 Control de acceso (Kiosco, Escáner QR, Eventos)
   - 6.8 Catálogos
   - 6.9 Reportes
   - 6.10 Configuración
7. Ciclo de vida de una visita (estados)
8. Flujos principales
9. Matriz de roles y funcionalidad
10. Extensibilidad (módulos opcionales)
11. Control documental

---

## Contenido de imágenes

- Ilustración 1. Inicio de sesión
- Ilustración 2. Panel principal tras iniciar sesión
- Ilustración 3. Listado de visitantes
- Ilustración 4. Registro de un nuevo visitante
- Ilustración 5. Verificación de visitante
- Ilustración 6. Bitácora de visitas
- Ilustración 7. Nuevo registro de visita
- Ilustración 8. Envío de liga de registro
- Ilustración 9. Registro desde la liga (visitante)
- Ilustración 10. Listado de empleados
- Ilustración 11. Listado de usuarios
- Ilustración 12. Escáner QR validando un acceso
- Ilustración 13. Eventos de acceso
- Ilustración 14. Catálogos
- Ilustración 15. Reportes con filtros
- Ilustración 16. Configuración general
- Ilustración 17. Ciclo de vida de una visita (creación a finalización)

---

## 1. Objetivo

Describir, desde una perspectiva funcional, **qué hace** el producto base de **Recepción Electrónica (RE)**: los módulos que lo componen, las pantallas y acciones disponibles, las reglas de negocio que rigen su comportamiento, los estados por los que pasa la información y la forma en que fluye entre los distintos procesos de recepción y control de acceso.

Este documento sirve como referencia funcional para dirección, líderes de proyecto, equipo de implementación y soporte. No describe detalles de programación (esos se encuentran en el Manual Técnico **MT-RE-001**, el Diccionario de Base de Datos **DB-RE-001** y la documentación de API **API-RE-001**), sino el **comportamiento esperado** del sistema desde el punto de vista del negocio y del usuario.

## 2. Alcance funcional

El producto base de RE cubre las siguientes capacidades:

- **Acceso seguro** al sistema: inicio de sesión, recuperación de contraseña, expiración de sesión y bloqueo por intentos fallidos.
- **Gestión de visitantes**: registro, verificación, generación de código QR, bloqueo, cambio de estado y documentación.
- **Gestión de visitas (Bitácora)**: creación de citas/visitas, seguimiento de su estado, cancelación y finalización.
- **Autoservicio del visitante**: registro mediante una liga enviada por correo.
- **Gestión de empleados**: registro, accesos, horarios, código QR y carga masiva.
- **Directorio**: consulta y exportación de empleados activos para operación de recepción.
- **Gestión de usuarios del sistema**: alta, roles, permisos, desbloqueo y estado.
- **Control de acceso**: kiosco de operación, escáner de QR y registro de eventos de entrada/salida.
- **Catálogos base**: empresas, pisos, accesos, puestos, departamentos y cubículos. Horarios y pases existen como catálogos operativos cuando la instalación los mantiene habilitados.
- **Reportes**: consulta y exportación (PDF/Excel) de visitas, eventos y horas.
- **Configuración**: parámetros generales, permisos por rol y activación de módulos opcionales.

> **Nota:** Este documento describe la **operación base**. El sistema está diseñado para **incorporar módulos opcionales** (integraciones) que amplían sus capacidades; estos se documentan por separado en sus propios documentos de integración cuando el cliente los contrata. La base no depende de ellos para operar.

## 3. Definiciones y actores

| Actor (rol) | Descripción funcional |
| --- | --- |
| **Administrador** | Configura el sistema, administra usuarios, roles, permisos, catálogos, empleados, visitantes y parámetros generales. |
| **Recepción** | Opera el día a día: registra visitas y visitantes, gestiona empleados, eventos, directorio y catálogos principales. |
| **Interno (anfitrión)** | Persona que recibe visitas; consulta y opera las visitas asociadas a su persona. |
| **Reportes** | Consulta información: reportes, eventos, kiosco y visitantes. |
| **Visitante** | Persona externa; accede a su perfil, documentos y código QR mediante una liga o credenciales temporales. |
| **Tablet** | Cuenta de operación en dispositivo (kiosco, escáner QR, visitantes y eventos). |
| **Rol personalizado** | Perfil definido por el administrador, cuya visibilidad de módulos se configura. |

| Término | Definición |
| --- | --- |
| **Visita / Registro** | Cita que asocia a uno o varios visitantes con un anfitrión, accesos y fechas. |
| **Evento** | Acción de acceso registrada (entrada, salida, autorización, cancelación, finalización). |
| **Acceso** | Punto físico de entrada/salida controlado por el sistema. |
| **Código QR** | Identificador que se escanea para validar el acceso de una persona. |
| **Liga de registro** | Enlace enviado al visitante para que complete su propio registro. |
| **Catálogo** | Conjunto de datos base reutilizados en otros procesos (empresas, pisos, etc.). |

## 4. Mapa funcional del sistema

| Módulo | Función principal |
| --- | --- |
| Autenticación | Inicio/cierre de sesión, recuperación de contraseña, expiración y bloqueo. |
| Visitantes | Registro y administración de personas externas. |
| Registros / Visitas (Bitácora) | Creación y ciclo de vida de las visitas/citas. |
| Liga de registro | Registro de autoservicio del visitante por correo. |
| Empleados | Administración de personal interno y sus accesos. |
| Directorio | Consulta y exportación de empleados activos para contacto operativo. |
| Usuarios | Administración de cuentas, roles y permisos. |
| Control de acceso | Kiosco, escáner QR y eventos de entrada/salida. |
| Catálogos | Empresas, pisos, accesos, puestos, departamentos, cubículos y, si están habilitados, horarios/pases. |
| Reportes | Consulta y exportación de visitas, eventos y horas. |
| Configuración | Parámetros generales, permisos por rol y activación de módulos. |

`[Foto: panel principal tras iniciar sesión]`

**Ilustración 2.** Panel principal tras iniciar sesión

## 5. Reglas de negocio generales

Estas reglas aplican de forma transversal a todo el sistema y son la base del comportamiento descrito en cada módulo.

### 5.1 Acceso y sesión

- El acceso al sistema se realiza con **correo** y **contraseña**. No existe un "nombre de usuario" independiente del correo.
- Tras **varios intentos fallidos**, la cuenta se **bloquea temporalmente** por seguridad (de forma predeterminada, **30 minutos**) o hasta que un administrador la desbloquee.
- La sesión tiene una **vigencia limitada** (de forma predeterminada, **7 días**). El sistema valida periódicamente que la sesión siga siendo válida.
- Cuando la sesión **expira** —o si el administrador **deshabilita** la cuenta— el sistema cierra la sesión automáticamente y redirige al usuario a la pantalla de inicio de sesión, donde deberá **autenticarse nuevamente**.
- La **visibilidad de módulos y acciones** depende del **rol** del usuario y de la configuración de permisos.

### 5.2 Estados Activo / Inactivo y eliminación

El sistema distingue tres operaciones que afectan a la permanencia de un registro:

| Operación | Efecto | ¿Reversible por el usuario? |
| --- | --- | --- |
| **Inactivar** | El registro se **oculta** de las listas activas pero **se conserva**. Puede volver a verse con el filtro Inactivos/Todos y reactivarse. | Sí (Activar). |
| **Eliminar** | El registro se **marca como eliminado** y **desaparece de todas las listas** (incluso del filtro Inactivos/Todos). La información se conserva internamente, pero **el usuario no puede recuperarla** desde el sistema. | No (requiere soporte). |
| **Cancelar / Finalizar** (visitas) | Cierra el ciclo de la visita conservando su historial; no se elimina. | Según estado. |

> **Regla:** Para "dar de baja" sin perder historial se utiliza **Inactivar**. **Eliminar** se reserva para registros que ya no deben existir; algunos procesos avanzados sí borran datos de forma definitiva, por lo que debe tratarse como una acción **no recuperable** desde la operación normal. Los **eventos de acceso no se eliminan** (son registro histórico) y las **visitas no se eliminan**: se **Cancelan** o **Finalizan**.

### 5.3 Validación de formularios

- Los campos **obligatorios** se indican en cada formulario con un **asterisco (\*)**.
- Al guardar, si falta un campo obligatorio o un dato tiene **formato incorrecto** (por ejemplo, un correo mal escrito o una contraseña que no cumple los requisitos), el sistema **no guarda** y **resalta en rojo** los campos a corregir, mostrando un mensaje bajo cada uno.
- Ciertos datos deben ser **únicos** (por ejemplo, el correo de usuarios y empleados); el sistema rechaza duplicados.
- Algunos campos solo aceptan ciertos caracteres (por ejemplo, nombres solo con letras y espacios).

### 5.4 Notificaciones por correo

El sistema envía notificaciones por correo en momentos clave del proceso, según la configuración:

- **Invitación / liga de registro** al visitante.
- **Confirmación** de una visita creada (al visitante y/o anfitrión).
- **Cancelación** de una visita.
- **Recuperación de contraseña** (código de verificación).
- **Acceso / credenciales** para usuarios.

> El envío de correos depende de que la **configuración de correo** esté completa. Ante fallas de envío, la configuración se revisa conforme al Manual de Administración (MA-RE-001).

## 6. Funcionalidad por módulo

Para cada módulo se describe su **propósito**, las **acciones** disponibles sobre sus registros y sus **reglas** particulares.

### 6.1 Autenticación

**Propósito:** controlar el acceso al sistema de forma segura.

**Funciones:**

- **Inicio de sesión:** valida correo, contraseña y estado activo de la cuenta; emite la sesión.
- **Recuperación de contraseña:** envía un **código de verificación** al correo registrado; el usuario lo captura y define una nueva contraseña. El código tiene **vigencia limitada**.
- **Bloqueo:** tras varios intentos fallidos, la cuenta se bloquea (30 min predeterminado) o hasta desbloqueo por el administrador.
- **Cierre de sesión:** manual (menú de perfil) o automático por expiración.

`[Foto: inicio de sesión]`

**Ilustración 1.** Inicio de sesión

### 6.2 Visitantes

**Propósito:** administrar a las personas externas que acuden a las instalaciones.

`[Foto: listado de visitantes]`

**Ilustración 3.** Listado de visitantes

**Acciones sobre cada visitante:** Ver, Editar, Verificar, Generar QR, Bloquear/Desbloquear, Reenviar, Activar/Inactivar, Eliminar.

**Alta de un visitante — datos:**

| Campo | Obligatorio | Regla |
| --- | --- | --- |
| Nombre | Sí | Solo letras y espacios. |
| Apellido paterno | Sí | Solo letras y espacios. |
| Apellido materno | No | — |
| Correo | Sí | Válido y único; se usa para invitaciones, ligas y QR. |
| Teléfono / Empresa | No | — |
| Imágenes (foto / identificación) | No | — |
| Confirmación de documentos | Sí (según configuración) | Casillas de documentos requeridos (p. ej. identificación oficial, SUA, permiso de entrada, lista de artículos). |

> La **contraseña** del visitante **no se captura**: el sistema la **genera automáticamente**.

**Reglas particulares:**

- La **verificación** confirma los datos del visitante antes de autorizar su acceso.
- **Bloquear** impide el acceso (su QR deja de ser válido) sin borrar el registro.

`[Foto: verificación de visitante]`

**Ilustración 5.** Verificación de visitante

### 6.3 Registro de visitas (Bitácora)

**Propósito:** registrar y dar seguimiento a las visitas/citas; es el módulo principal de operación.

`[Foto: bitácora de visitas]`

**Ilustración 6.** Bitácora de visitas

**Acciones sobre cada visita:** Ver, Editar, Cancelar, Finalizar.

**Alta de una visita — datos:**

| Campo | Obligatorio | Regla |
| --- | --- | --- |
| Tipo de registro | Sí | Define el tipo de visita/cita. |
| Visitante: nombre, apellido paterno, correo | Sí | Se puede registrar más de un visitante. |
| Anfitrión | Sí | Usuario o empleado que recibe la visita. |
| Fecha de entrada | Sí | **No puede ser una fecha pasada.** |
| Accesos | Sí | Al menos un acceso autorizado. |
| Empresa / Identificación / Vehículo / Comentarios | No | Según el caso. |

**Reglas particulares:**

- Al crear la visita, el sistema genera un **evento inicial** en estado pendiente y, si está configurado, **notifica por correo**.
- Las visitas **no se eliminan**: se **Cancelan** (anula y, si aplica, envía correo) o se **Finalizan** (cierra y registra la salida).
- El **estado** de la visita avanza automáticamente conforme ocurre la entrada, la salida y la finalización (ver sección 7).

`[Foto: nuevo registro de visita]`

**Ilustración 7.** Nuevo registro de visita

### 6.4 Liga de registro (autoservicio)

**Propósito:** permitir que el **propio visitante** complete su registro antes de llegar.

**Comportamiento:**

1. Un usuario autorizado **envía la liga** capturando correo, fecha, anfitrión y accesos.
2. El visitante **abre la liga**; el sistema **valida el enlace** y el visitante captura/confirma sus datos.
3. El sistema crea el registro e **invalida la liga** (de un solo uso y con vigencia limitada).

`[Foto: envío de liga de registro]`

**Ilustración 8.** Envío de liga de registro

`[Foto: registro desde la liga (visitante)]`

**Ilustración 9.** Registro desde la liga (visitante)

### 6.5 Empleados

**Propósito:** administrar al personal interno sujeto a control de acceso.

`[Foto: listado de empleados]`

**Ilustración 10.** Listado de empleados

**Acciones sobre cada empleado:** Ver, Editar, Generar QR, Activar/Inactivar, Desbloquear, Eliminar.

**Alta de un empleado — datos:**

| Campo | Obligatorio | Regla |
| --- | --- | --- |
| Nombre / Apellido paterno | Sí | Solo letras y espacios. |
| Correo | Sí | Válido y único. |
| Empresa | Sí | — |
| Piso | Sí | — |
| Accesos | Sí | Al menos un acceso. |
| Apellido materno / Contacto / Puesto / Departamento / Cubículo / Horario / Foto | No | — |

**Funciones adicionales:** **carga masiva** (formato descargable), **generación de QR** y consulta desde **Directorio**.

**Directorio:**

- Permite consultar empleados activos y datos de contacto/ubicación sin entrar al flujo completo de administración.
- Puede exportar el directorio para apoyo operativo.
- Es principalmente de consulta; altas, bajas y cambios de información se realizan desde **Empleados**.

### 6.6 Usuarios

**Propósito:** administrar las cuentas con acceso al sistema y sus permisos.

`[Foto: listado de usuarios]`

**Ilustración 11.** Listado de usuarios

**Acciones sobre cada usuario:** Ver, Editar, Generar QR, Reenviar, Desbloquear, Activar/Inactivar, Eliminar.

**Alta de un usuario — datos:**

| Campo | Obligatorio | Regla |
| --- | --- | --- |
| Nombre / Apellido paterno | Sí | — |
| Correo | Sí | Válido y único; se usa para iniciar sesión y notificaciones. |
| Contraseña | Sí | Mínimo 8 caracteres con mayúscula, minúscula, número y símbolo. |
| Rol | Sí | Al menos un perfil; define funciones y permisos. |
| Empresa | Sí | — |
| Contacto / Datos organizacionales / Accesos | No | — |

**Reglas particulares:**

- Cambiar el **rol** modifica de inmediato lo que el usuario puede ver y hacer.
- **Desbloquear** restablece el acceso de cuentas bloqueadas por intentos fallidos.

### 6.7 Control de acceso (Kiosco, Escáner QR, Eventos)

**Propósito:** validar y registrar el acceso de visitantes, empleados y usuarios.

- **Kiosco:** vista de operación (recepción/tablet) para consultar y registrar eventos.
- **Escáner QR:** valida el código QR y los permisos; registra el evento de **entrada** y, a la salida, el de **salida**.
- **Eventos:** consulta del histórico de accesos con filtros. Es un módulo de **consulta**: los eventos **no se editan ni se eliminan** (acciones disponibles: Ver e Imagen de evidencia).

`[Foto: escáner QR validando un acceso]`

**Ilustración 12.** Escáner QR validando un acceso

`[Foto: eventos de acceso]`

**Ilustración 13.** Eventos de acceso

### 6.8 Catálogos

**Propósito:** mantener los datos base reutilizados por el resto del sistema: **empresas, pisos, accesos, puestos, departamentos y cubículos**. Los catálogos de **horarios** y **pases** existen como componentes operativos cuando la instalación los mantiene habilitados.

`[Foto: catálogos]`

**Ilustración 14.** Catálogos

**Acciones sobre cada registro:** Ver, Editar, Activar/Inactivar, Eliminar.

**Reglas particulares:**

- Un catálogo **inactivo** deja de ofrecerse al capturar nuevos registros (visitas, empleados, etc.).
- Antes de **eliminar** un elemento en uso, lo recomendable es **Inactivarlo** para no afectar a la información que lo referencia.

### 6.9 Reportes

**Propósito:** consultar y exportar la información operativa.

**Comportamiento:**

- Reportes de **visitas, eventos y horas** con **filtros** (fecha, acceso, anfitrión, visitante, estado, etc.).
- **Exportación** a **PDF** y **Excel**, respetando los permisos del usuario que los genera.

`[Foto: reportes con filtros]`

**Ilustración 15.** Reportes con filtros

### 6.10 Configuración

**Propósito:** definir el comportamiento global del sistema (rol Administrador).

**Comportamiento:**

- Parámetros generales: nombre de la aplicación, tema visual, zona horaria, correo, tiempos (p. ej. auto-cancelación de registros) y documentos requeridos.
- Administración de **permisos por rol** y **roles personalizados**.
- **Activación/desactivación de módulos opcionales**.

`[Foto: configuración general]`

**Ilustración 16.** Configuración general

> El detalle de esta sección se describe en el Manual de Administración **MA-RE-001**.

## 7. Ciclo de vida de una visita (estados)

Una visita avanza por una secuencia de estados que reflejan su situación dentro del proceso de recepción:

| Estado | Significado | Cómo se alcanza |
| --- | --- | --- |
| **Pendiente** | La visita está registrada pero el visitante aún no ingresa. | Al crear el registro. |
| **Accedió / En sitio** | El visitante ingresó. | Al validar el QR y registrar el evento de entrada. |
| **Salida** | El visitante salió. | Al registrar el evento de salida. |
| **Finalizada** | La visita se cerró. | Manualmente (Finalizar) o automáticamente al registrar la salida. |
| **Cancelada** | La visita se anuló antes de completarse. | Mediante la acción Cancelar. |

> El estado avanza **automáticamente** conforme ocurren los eventos de acceso; algunas transiciones (Cancelar, Finalizar) son acciones manuales del usuario.

`[Foto: secuencia de un registro desde su creación hasta su finalización]`

**Ilustración 17.** Ciclo de vida de una visita (creación a finalización)

## 8. Flujos principales

### 8.1 Registro por recepción

1. El usuario inicia sesión.
2. Crea una visita desde Visitantes o Bitácora y captura datos y accesos.
3. El sistema valida la información y crea el registro con un evento inicial **Pendiente**.
4. Se notifica por correo al visitante y/o anfitrión (según configuración).

### 8.2 Registro por liga (autoservicio)

1. Un usuario autorizado envía la **liga de registro** al correo del visitante.
2. El visitante abre la liga; el sistema **valida el enlace** y el visitante captura sus datos.
3. El sistema crea el registro e **invalida la liga**.

### 8.3 Entrada y salida

1. El visitante o empleado llega a recepción/kiosco/tablet y presenta su **QR**.
2. El sistema valida el QR y los permisos de acceso.
3. Si es válido, se registra el evento de **entrada** (estado "Accedió").
4. A la salida se repite el escaneo y se registra el evento de **salida**; la visita puede **finalizarse**.

### 8.4 Cancelación / finalización

1. Un usuario autorizado **Cancela** o **Finaliza** la visita.
2. El sistema registra el evento correspondiente y actualiza el estado.
3. En la cancelación, puede enviarse un **correo** al visitante.

## 9. Matriz de roles y funcionalidad

Visión general de qué opera cada rol (la visibilidad final depende de la configuración de permisos):

| Funcionalidad | Administrador | Recepción | Interno | Reportes | Tablet |
| --- | --- | --- | --- | --- | --- |
| Visitantes | Sí | Sí | Parcial | Consulta | Sí |
| Visitas (Bitácora) | Sí | Sí | Asociadas | Consulta | Parcial |
| Liga de registro | Sí | Sí | — | — | — |
| Empleados | Sí | Sí | — | — | — |
| Directorio | Sí | Sí | — | — | — |
| Usuarios | Sí | — | — | — | — |
| Control de acceso (Kiosco/QR/Eventos) | Sí | Sí | — | Consulta | Sí |
| Catálogos | Sí | Sí | — | — | — |
| Reportes | Sí | Sí | Parcial | Sí | — |
| Configuración | Sí | — | — | — | — |

> "Parcial / Asociadas / Consulta" indica acceso limitado a ciertas acciones o a los registros propios. El detalle exacto se define en la configuración de permisos (ver MA-RE-001).

## 10. Extensibilidad (módulos opcionales)

El producto base está diseñado para **incorporar módulos opcionales** sin modificar su funcionamiento central. Estos módulos:

- Se **activan** mediante banderas de configuración y la visibilidad por cliente.
- Se **documentan por separado** en sus propios documentos de integración.
- **No son necesarios** para la operación base descrita en este documento.

> Cuando un cliente contrata un módulo opcional, se entrega esta base junto con el documento del módulo correspondiente.

## 11. Control documental

| Documento | Código | Versión | Fecha | Responsable | Estado |
| --- | --- | --- | --- | --- | --- |
| Documento Funcional — RE | DF-RE-001 | 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Vigente |

**Documentos relacionados:** DR-RE-001 (Requerimientos), MU-RE-001 (Manual de Usuario), MA-RE-001 (Administración).

---

**Fin del documento.**
