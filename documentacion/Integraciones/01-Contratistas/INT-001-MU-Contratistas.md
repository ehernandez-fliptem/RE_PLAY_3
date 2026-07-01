# Manual de Usuario

## Recepción Electrónica — Módulo Contratistas

Versión 1.0

---

| Campo | Descripción |
| --- | --- |
| Tipo de documento | Manual de Usuario (módulo opcional) |
| Código | INT-001-MU |
| Módulo | Contratistas |
| Producto base | Recepción Electrónica (RE) |
| Versión | 1.0 |
| Fecha | 2026-06-24 |
| Responsable | Área de Sistemas / Desarrollo |
| Clasificación | Uso interno / Cliente |
| Estado | Vigente |

> Este manual describe la operación del módulo Contratistas pantalla por pantalla. El **alcance funcional** se describe en el documento INT-001-DF.

---

## Control de versiones

| Versión | Fecha | Autor | Descripción |
| --- | --- | --- | --- |
| 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Versión inicial del manual de usuario de Contratistas. |

---

## Contenido

1. Introducción
2. Objetivo
3. Alcance
4. Perfiles de usuario
5. Descripción general del módulo
6. Cómo activar el módulo (Configuración)
7. Administración de Contratistas (personal interno)
   - 7.1 Listado de contratistas
   - 7.2 Alta de un contratista
   - 7.3 Acciones sobre un contratista
8. Portal del Contratista
   - 8.1 Acceso al portal
   - 8.2 Documentos de la empresa
   - 8.3 Visitantes del contratista
   - 8.4 Solicitud de visita
9. Revisión por el personal interno
   - 9.1 Validación de visitantes
   - 9.2 Revisión de solicitudes
10. Flujo general recomendado
11. Preguntas o incidencias comunes
12. Glosario
13. Control documental

---

## Contenido de imágenes

- Ilustración 1. Interruptor "Portal de Visitas para Contratistas" en Configuración
- Ilustración 2. Menú del módulo Contratistas
- Ilustración 3. Listado de contratistas
- Ilustración 4. Alta de un contratista
- Ilustración 5. Acciones sobre un contratista
- Ilustración 6. Acceso al portal del contratista
- Ilustración 7. Documentos de la empresa (portal)
- Ilustración 8. Registro de visitante (portal)
- Ilustración 9. Solicitud de visita (portal)
- Ilustración 10. Validación de visitantes (personal interno)
- Ilustración 11. Revisión de una solicitud (personal interno)

---

## 1. Introducción

El presente manual describe el uso del módulo **Contratistas** dentro del sistema de **Recepción Electrónica (RE)**. Este módulo permite administrar a las **empresas contratistas** y ofrece un **portal** para que cada contratista gestione, con anticipación, los documentos de su empresa, el registro de sus visitantes y el envío de solicitudes de visita, que el personal interno revisa y aprueba.

El documento explica, paso a paso, las funciones disponibles según el perfil del usuario, tanto para el **personal interno** (administrador/recepción) como para el **contratista** que opera desde el portal.

**Nota.**

- Las opciones visibles dependen del **rol** del usuario y de que el módulo esté **activado**.
- Para dudas o incidencias, comuníquese con el área de soporte o con el administrador del sistema.

## 2. Objetivo

Describir la operación del módulo Contratistas: cómo dar de alta un contratista, cómo opera el contratista en su portal (documentos, visitantes y solicitudes) y cómo el personal interno valida la información, de modo que el usuario pueda utilizar el módulo sin dudas.

## 3. Alcance

Este manual comprende únicamente el módulo **Contratistas**: la pantalla administrativa interna y el **portal del contratista**. No incluye otros módulos del sistema, que se documentan por separado.

## 4. Perfiles de usuario

| Perfil | Qué puede hacer en este módulo |
| --- | --- |
| Administrador | Activar el módulo, dar de alta contratistas, configurar documentos requeridos y validar visitantes/solicitudes. |
| Recepción | Dar de alta contratistas y validar visitantes/solicitudes. |
| Contratista (portal) | Cargar documentos de su empresa, registrar visitantes y enviar solicitudes de visita. |

## 5. Descripción general del módulo

El módulo se compone de **dos áreas**:

- **Área administrativa (interna):** pantalla **Contratistas**, donde el personal interno da de alta a las empresas, revisa a sus visitantes y revisa las solicitudes.
- **Portal del contratista (externo):** un espacio con sesión propia (rol Contratista) donde el contratista gestiona **Documentos**, **Visitantes** y **Solicitud de Visita**.

Al dar de alta un contratista, el sistema **crea su usuario de portal** y le **envía por correo** sus credenciales de acceso.

## 6. Cómo activar el módulo (Configuración)

**Paso 1.** Con rol **Administrador**, entre a **Configuración** y abra la pestaña **Integraciones**.

`[Foto: interruptor "Portal de Visitas para Contratistas" en Configuración]`

**Ilustración 1.** Interruptor "Portal de Visitas para Contratistas" en Configuración

**Paso 2.** Active el interruptor **"Portal de Visitas para Contratistas"**.

**Paso 3.** Configure los **documentos requeridos** al contratista y a sus visitantes (obligatorios u opcionales). Debe quedar **al menos uno activo** por ámbito.

**Paso 4.** Guarde. Aparecen los menús del módulo.

`[Foto: menú del módulo Contratistas]`

**Ilustración 2.** Menú del módulo Contratistas

> **Nota:** Si el interruptor no aparece, es porque el módulo no está incluido en la visibilidad del cliente. Si se **apaga**, los usuarios de portal (rol Contratista) se **desactivan**.

## 7. Administración de Contratistas (personal interno)

### 7.1 Listado de contratistas

La pantalla **Contratistas** (`/contratistas`) muestra las empresas registradas, con búsqueda, filtro por estatus y las acciones disponibles.

`[Foto: listado de contratistas]`

**Ilustración 3.** Listado de contratistas

| N. | Campo | Descripción |
| --- | --- | --- |
| 1 | Filtro por estatus | Visualiza contratistas activos, inactivos o todos. |
| 2 | Buscar | Localiza un contratista por nombre. |
| 3 | Nuevo contratista | Abre el formulario de alta. |
| 4 | Tabla de registros | Muestra la información general de cada contratista. |
| 5 | Acciones | Operaciones disponibles sobre cada contratista. |

### 7.2 Alta de un contratista

**Paso 1.** En **Contratistas**, presione **Nuevo / Más (+)**.

**Paso 2.** El sistema abre el formulario **Nuevo contratista**.

`[Foto: alta de un contratista]`

**Ilustración 4.** Alta de un contratista

**Paso 3.** Capture la información. Los campos con asterisco (\*) son **obligatorios**:

| Campo | Obligatorio | Descripción |
| --- | --- | --- |
| Empresa \* | Sí | Nombre de la empresa contratista (único). |
| Correo(s) \* | Sí | Correo(s) de contacto; a este se envía el acceso al portal. |
| Teléfono | No | Teléfono de contacto. |
| Empresa de RE asociada \* | Sí | Empresa del catálogo de RE con la que se relaciona. |

**Paso 4.** Presione **Crear**. El sistema crea el contratista, **genera su usuario de portal** y le **envía el correo de acceso**. Para salir sin guardar, presione **Regresar**.

**Paso 5. Validación.** Si falta un campo obligatorio o un dato es incorrecto (por ejemplo, un correo mal escrito), el sistema **no guarda** y **resalta en rojo** los campos a corregir. Corríjalos y vuelva a presionar **Crear**.

**Paso 6. Confirmación.** Al guardar correctamente, el sistema muestra un mensaje de **Éxito** y el contratista aparece en el listado.

### 7.3 Acciones sobre un contratista

`[Foto: acciones sobre un contratista]`

**Ilustración 5.** Acciones sobre un contratista

**Acciones que tiene el módulo Contratistas:**

- **Ver:** abre el detalle del contratista en solo lectura.
- **Editar:** modifica los datos del contratista (empresa, correos, teléfono, empresa asociada).
- **Reenviar acceso:** vuelve a enviar el correo de acceso al portal.
- **Activar / Inactivar:** cambia el estado del contratista.

> **Nota:** Al **Inactivar** un contratista, su portal deja de estar disponible, pero su información se conserva. Prefiera Inactivar sobre acciones definitivas para conservar el historial.

## 8. Portal del Contratista

### 8.1 Acceso al portal

El contratista ingresa con el **correo y la contraseña** que recibió por correo.

`[Foto: acceso al portal del contratista]`

**Ilustración 6.** Acceso al portal del contratista

> Si el contratista no recuerda su contraseña, puede usar la recuperación desde la pantalla de inicio de sesión, o el personal interno puede **reenviarle el acceso**.

### 8.2 Documentos de la empresa

En **Documentos del Contratista** (`/portal-contratistas/documentos`), el contratista carga y consulta la documentación requerida de su empresa.

`[Foto: documentos de la empresa (portal)]`

**Ilustración 7.** Documentos de la empresa (portal)

| N. | Campo | Descripción |
| --- | --- | --- |
| 1 | Lista de documentos requeridos | Documentos que el cliente configuró como obligatorios u opcionales. |
| 2 | Cargar documento | Adjunta el archivo de cada documento. |
| 3 | Estado de validación | Indica si el documento fue verificado o rechazado (con motivo). |

### 8.3 Visitantes del contratista

En **Visitantes** (`/portal-contratistas/visitantes`), el contratista registra a su personal y adjunta sus documentos.

**Paso 1.** Presione **Nuevo / Más (+)** para registrar un visitante.

`[Foto: registro de visitante (portal)]`

**Ilustración 8.** Registro de visitante (portal)

**Paso 2.** Capture la información. Los campos con asterisco (\*) son **obligatorios**:

| Campo | Obligatorio | Descripción |
| --- | --- | --- |
| Nombre \* | Sí | Nombre del visitante. |
| Apellido paterno \* | Sí | Primer apellido. |
| Apellido materno | No | Segundo apellido. |
| Correo \* | Sí | Correo del visitante. |
| Teléfono | No | Teléfono de contacto. |
| Documentos | Según configuración | Documentos requeridos del visitante. |

**Paso 3.** Presione **Crear**. El visitante queda en estado **Pendiente** de validación.

**Paso 4. Validación.** Si falta un dato obligatorio, el sistema lo **resalta en rojo**; corríjalo y guarde.

### 8.4 Solicitud de visita

En **Solicitud de Visita** (`/portal-contratistas/solicitudes`), el contratista crea y da seguimiento a sus solicitudes.

**Paso 1.** Presione **Nueva solicitud**.

`[Foto: solicitud de visita (portal)]`

**Ilustración 9.** Solicitud de visita (portal)

**Paso 2.** Capture:

| Campo | Obligatorio | Descripción |
| --- | --- | --- |
| Fecha de visita \* | Sí | Fecha planeada de la visita. |
| Anfitrión(es) \* | Sí | Personal interno que recibirá la visita. |
| Visitantes \* | Sí | Lista de visitantes (previamente registrados) que asistirán. |
| Comentario | No | Observaciones de la solicitud. |

**Paso 3.** Presione **Enviar**. La solicitud queda en estado **Pendiente** para revisión del personal interno.

> **Nota:** El estado de la solicitud puede quedar **Aprobado**, **Rechazado** o **Parcial** (cuando unos visitantes se aprueban y otros no). El contratista ve el resultado por visitante.

## 9. Revisión por el personal interno

### 9.1 Validación de visitantes

Desde **Contratistas**, el personal interno abre los visitantes enviados por cada contratista y los **valida**.

`[Foto: validación de visitantes (personal interno)]`

**Ilustración 10.** Validación de visitantes (personal interno)

| Acción | Qué hace |
| --- | --- |
| **Aprobar** | Marca al visitante como aprobado y lo **vincula a un visitante de RE**. |
| **Rechazar** | Marca al visitante como rechazado; se **captura el motivo**. |

### 9.2 Revisión de solicitudes

El personal interno abre cada solicitud y la revisa **por visitante**.

`[Foto: revisión de una solicitud (personal interno)]`

**Ilustración 11.** Revisión de una solicitud (personal interno)

- Puede **aprobar** o **rechazar** cada visitante de la solicitud.
- El estado global de la solicitud se calcula automáticamente (Aprobado / Rechazado / Parcial).

## 10. Flujo general recomendado

Para operar el módulo sin contratiempos, se recomienda este orden:

1. **Activar** el módulo y configurar los **documentos requeridos** (Configuración).
2. **Dar de alta** al contratista (se envía su acceso al portal).
3. El contratista **carga los documentos** de su empresa.
4. El contratista **registra a sus visitantes** y adjunta documentos.
5. El personal interno **valida** a los visitantes.
6. El contratista **envía la solicitud de visita**.
7. El personal interno **revisa la solicitud** por visitante.
8. El visitante aprobado queda **vinculado** y listo para el proceso normal de visita en RE.

![Flujo del módulo Contratistas](img/contratistas-flujo.svg)

**Diagrama 1.** Flujo del módulo Contratistas: del alta del contratista a la aprobación de la visita, incluyendo el reenvío de documentos cuando no se aprueban.

## 11. Preguntas o incidencias comunes

**1. No aparecen los menús de Contratistas**
*Acción:* verifique que el interruptor **"Portal de Visitas para Contratistas"** esté encendido en Configuración y que su rol tenga permiso.

**2. El contratista no puede entrar al portal**
*Acción:* confirme que el módulo esté **encendido** (al apagarlo se desactivan los usuarios de portal) y que la cuenta del contratista esté activa.

**3. El contratista no recibió el correo de acceso**
*Acción:* use **Reenviar acceso**; revise el correo capturado y la carpeta de correo no deseado.

**4. No puedo desactivar un documento**
*Acción:* debe quedar **al menos un documento activo** por ámbito; active otro antes de desactivar el actual.

**5. Un visitante aprobado no aparece en RE**
*Acción:* confirme que la aprobación se completó; al aprobar se genera el **vínculo** al visitante de RE.

**6. La solicitud quedó "Parcial"**
*Acción:* es normal cuando **unos visitantes se aprueban y otros se rechazan**; revise el detalle por visitante.

## 12. Glosario

**Contratista.** Empresa externa que, mediante el portal, gestiona sus documentos, visitantes y solicitudes de visita.

**Portal del contratista.** Espacio con sesión propia (rol Contratista) para operar documentos, visitantes y solicitudes.

**Solicitud de visita.** Petición que agrupa fecha, anfitriones y una lista de visitantes para su revisión.

**Validación.** Acción del personal interno de aprobar o rechazar un visitante o una solicitud.

**Vínculo a visitante de RE.** Relación que se crea al aprobar un visitante del contratista, para integrarlo al proceso de visita de la base.

**Estado Parcial.** Situación de una solicitud en la que algunos visitantes fueron aprobados y otros rechazados.

## 13. Control documental

| Documento | Código | Versión | Fecha | Responsable | Estado |
| --- | --- | --- | --- | --- | --- |
| Manual de Usuario — Contratistas | INT-001-MU | 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Vigente |

**Documentos relacionados:** INT-001-DF (Documento Funcional), MU-RE-001, MA-RE-001.

---

**Fin del documento.**
