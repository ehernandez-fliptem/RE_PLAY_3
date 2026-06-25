# Manual de Usuario

## Recepción Electrónica (RE)

Versión 1.0

---

| Campo | Descripción |
| --- | --- |
| Tipo de documento | Manual de Usuario |
| Código | MU-RE-001 |
| Producto | Recepción Electrónica (RE) — Base |
| Versión | 1.0 |
| Fecha | 2026-06-24 |
| Responsable | Área de Sistemas / Desarrollo |
| Clasificación | Uso interno / Cliente |
| Estado | Vigente |

---

## Contenido

1. Introducción
2. Tipos de usuarios
3. Inicio (configuración inicial)
4. Acceso al sistema
   - 4.1 Inicio de sesión
   - 4.2 Recuperar contraseña
   - 4.3 Cierre de sesión y expiración
5. Funciones generales
   - 5.1 Editar perfil
   - 5.2 Descripción general del menú
   - 5.3 Composición general de las tablas
   - 5.4 Acciones sobre los registros: qué hace cada una
   - 5.5 Acerca de Editar, Inactivar y Eliminar (importante)
6. Módulo de Visitantes
7. Registro de visitas (Bitácora)
8. Liga de registro para el visitante
9. Módulo de Empleados
   - 9.1 Cómo registrar un nuevo empleado
   - 9.2 Directorio de empleados
10. Módulo de Usuarios
11. Control de acceso
    - 11.1 Kiosco
    - 11.2 Escáner QR
    - 11.3 Eventos
12. Catálogos
13. Reportes
14. Configuración (resumen)
15. Preguntas o incidencias comunes
16. Glosario

---

## Contenido de imágenes

- Ilustración 1. Configuración inicial
- Ilustración 2. Inicio de sesión
- Ilustración 3. Recuperar contraseña (envío de correo)
- Ilustración 4. Código de verificación
- Ilustración 5. Restablecer contraseña
- Ilustración 6. Editar perfil
- Ilustración 7. Menú principal
- Ilustración 8. Composición de tablas
- Ilustración 9. Listado de visitantes
- Ilustración 10. Nuevo visitante
- Ilustración 11. Verificación de visitante
- Ilustración 12. Bitácora / registros de visita
- Ilustración 13. Nuevo registro de visita
- Ilustración 14. Envío de liga de registro
- Ilustración 15. Registro desde la liga (visitante)
- Ilustración 16. Listado de empleados
- Ilustración 17. Nuevo empleado
- Ilustración 18. Listado de usuarios
- Ilustración 19. Nuevo usuario
- Ilustración 20. Kiosco
- Ilustración 21. Escáner QR
- Ilustración 22. Eventos
- Ilustración 23. Catálogos
- Ilustración 24. Reportes
- Ilustración 25. Menú de perfil / Cerrar sesión

---

## 1. Introducción

El presente manual de usuario tiene como finalidad orientar al personal en el uso del sistema de **Recepción Electrónica (RE)**, una plataforma diseñada para administrar el control de visitas, el registro de visitantes y empleados, y el control de acceso dentro de las instalaciones.

A través de este sistema es posible registrar visitas, enviar invitaciones a los visitantes, validar el ingreso mediante código QR, dar seguimiento a las entradas y salidas, capturar información de la operación y consultar reportes de la actividad registrada. Asimismo, la plataforma permite mantener un mejor control de la información generada durante el proceso de recepción y facilitar la consulta de registros cuando sea necesario.

Este documento describe de manera detallada las principales opciones disponibles dentro del sistema y explica, paso a paso, las funciones que el usuario puede realizar de acuerdo con su perfil. Su propósito es servir como guía de apoyo para una operación más clara, ordenada y eficiente.

**Nota.**

- Las opciones visibles en el sistema dependen del **rol** asignado a cada usuario; por ello, es posible que algunas pantallas descritas en este manual no estén disponibles para todos los perfiles.
- Este manual describe la operación base de Recepción Electrónica. Los módulos opcionales o integraciones, como Contratistas, BioStar, Hikvision, Visitantes Avanzado, Registro Campo o Capacitaciones, se documentan en manuales o documentos de integración separados cuando aplican.
- Para dudas sobre la operación del sistema o incidencias técnicas, el usuario deberá comunicarse con el área responsable de soporte o con el administrador del sistema.

El sistema de Recepción Electrónica permite a los usuarios:

- Iniciar sesión de forma segura y recuperar su contraseña.
- Registrar y administrar visitantes.
- Registrar visitas o citas, ya sea desde recepción o mediante una liga enviada al visitante.
- Validar el acceso de visitantes y empleados mediante código QR.
- Registrar eventos de entrada, salida, autorización y cancelación.
- Administrar empleados, usuarios y catálogos base (según el rol).
- Consultar y exportar reportes de visitas, eventos y horas.

## 2. Tipos de usuarios

El sistema maneja distintos perfiles. Cada uno define las funciones y módulos disponibles. Una misma persona puede tener un solo perfil asignado.

| Perfil | Descripción |
| --- | --- |
| Administrador | Gestiona usuarios, configuración, catálogos, empleados, visitantes, eventos y parámetros generales del sistema. |
| Recepción | Opera el registro de visitas, visitantes, empleados, eventos, directorio y catálogos principales. |
| Interno (anfitrión) | Consulta y opera las visitas asociadas a su persona. |
| Reportes | Consulta reportes, eventos, kiosco y visitantes. |
| Visitante | Accede a su perfil, documentos y código QR propio mediante una liga o credenciales temporales. |
| Tablet | Opera el kiosco, el escáner QR, visitantes y eventos desde un dispositivo de operación. |

> Nota: El sistema admite **roles personalizados** definidos por el administrador, cuya visibilidad de módulos se controla desde la configuración.

## 3. Inicio (configuración inicial)

La primera vez que se inicia el sistema aparecerá una vista para el registro del **usuario administrador**. Una vez registrado, esta vista no volverá a presentarse.

`[Foto: pantalla de configuración inicial]`

**Ilustración 1.** Configuración inicial

| N. | Campo | Descripción |
| --- | --- | --- |
| 1 | Datos generales | Campos para capturar los datos generales del administrador (nombre, correo, usuario, contraseña). Son obligatorios. |
| 2 | Crear usuario inicial | Genera la cuenta del primer administrador del sistema. |
| 3 | Credenciales | Si ya cuenta con credenciales, puede ingresarlas directamente para acceder al sistema. |

Una vez creado el usuario, se podrá acceder al sistema con esas credenciales.

## 4. Acceso al sistema

### 4.1 Inicio de sesión

La pantalla de inicio de sesión es el punto de acceso al sistema de Recepción Electrónica. Para ingresar, el usuario debe capturar el **correo/usuario** y la **contraseña** proporcionados por el administrador del sistema. En caso de no recordar la contraseña, podrá iniciar el proceso de recuperación desde la misma pantalla.

`[Foto: pantalla de inicio de sesión]`

**Ilustración 2.** Inicio de sesión

| N. | Campo | Descripción |
| --- | --- | --- |
| 1 | Credenciales | Campos para capturar usuario/correo y contraseña. |
| 2 | Alertas | Notifica cuando existe un error en la captura de las credenciales. |
| 3 | ¿Olvidó su contraseña? | Inicia el proceso de recuperación de contraseña. |

> **Nota:** Después de varios intentos fallidos, la cuenta se bloqueará temporalmente por seguridad (de forma predeterminada, **30 minutos**). Si esto ocurre, espere a que transcurra ese tiempo o solicite al administrador el desbloqueo de su cuenta.

### 4.2 Recuperar contraseña

Si el usuario no recuerda su contraseña, puede iniciar el proceso de recuperación desde la opción **¿Olvidó su contraseña?** disponible en la pantalla de inicio de sesión.

**Paso 1.** Capture el correo electrónico registrado en el sistema y envíe la solicitud. El sistema enviará un **código de verificación** al correo indicado.

`[Foto: pantalla de recuperación — captura de correo]`

**Ilustración 3.** Recuperar contraseña (envío de correo)

**Paso 2.** Capture el código de verificación recibido en su correo para continuar con el proceso.

`[Foto: pantalla de código de verificación]`

**Ilustración 4.** Código de verificación

**Paso 3.** Defina su nueva contraseña y confírmela.

`[Foto: pantalla de restablecer contraseña]`

**Ilustración 5.** Restablecer contraseña

| N. | Campo | Descripción |
| --- | --- | --- |
| 1 | Correo electrónico | Correo registrado del usuario; el sistema enviará el código de verificación. |
| 2 | Código de verificación | Campo para ingresar el código recibido por correo. |
| 3 | Restablecer contraseña | Permite registrar y confirmar la nueva contraseña. |

**Nota.**

- El correo capturado debe corresponder al que fue registrado previamente en el sistema.
- Si el usuario no recibe el código, deberá verificar su bandeja de entrada y la carpeta de correo no deseado.
- El código de verificación tiene una vigencia limitada; si expira, deberá solicitar uno nuevo.

### 4.3 Cierre de sesión y expiración

**Cerrar sesión manualmente.** Para salir del sistema de forma segura, presione el **avatar / foto de perfil** ubicado en la **esquina superior derecha** de la pantalla y seleccione la opción **Cerrar sesión**. El sistema cerrará su sesión y lo regresará a la pantalla de inicio de sesión.

`[Foto: menú del perfil con la opción Cerrar sesión]`

**Ilustración 25.** Menú de perfil / Cerrar sesión

| N. | Campo | Descripción |
| --- | --- | --- |
| 1 | Avatar / perfil (esquina superior derecha) | Despliega el menú de la cuenta. |
| 2 | Perfil | Abre la edición de su perfil. |
| 3 | Cerrar sesión | Cierra la sesión y regresa a la pantalla de inicio de sesión. |

> **Recomendación:** Cierre siempre su sesión cuando termine de usar el sistema, especialmente en equipos compartidos (recepción, tablet), para evitar que otra persona use su cuenta.

**Expiración automática de la sesión.** Por seguridad, la sesión tiene una **vigencia limitada** (de forma predeterminada, **7 días**). Además, el sistema **verifica periódicamente** que su sesión siga siendo válida. Cuando la sesión **expira** —o si el administrador deshabilita su cuenta— el sistema **cierra la sesión automáticamente** y lo **redirige a la pantalla de inicio de sesión**, donde deberá **volver a iniciar sesión** con su correo y contraseña.

> **Nota:** Si está capturando información y su sesión expira, es posible que pierda los datos no guardados. Guarde sus cambios con regularidad y vuelva a iniciar sesión cuando el sistema se lo solicite.

## 5. Funciones generales

### 5.1 Editar perfil

El sistema permite al usuario consultar y actualizar la información de su perfil, con el fin de mantener sus datos al día dentro de la plataforma. Entre los datos que el usuario puede actualizar se encuentran el nombre, correo electrónico, teléfono móvil, teléfono de oficina y extensión; en la sección de sistema es posible actualizar la contraseña.

`[Foto: pantalla de editar perfil]`

**Ilustración 6.** Editar perfil

| N. | Campo | Descripción |
| --- | --- | --- |
| 1 | Perfil | Sección desde la que se accede para editar el perfil. |
| 2 | Campos por editar | Permite consultar o actualizar los datos del usuario. |
| 3 | Regresar / Guardar | Permite regresar a la vista principal sin cambios o guardar los cambios realizados. |

> **Nota:** Es recomendable mantener actualizada la información de contacto para facilitar procesos como la recuperación de contraseña.

### 5.2 Descripción general del menú

El sistema cuenta con un **menú lateral** que permite acceder a los distintos módulos disponibles. La visualización de algunas opciones depende del perfil asignado al usuario. Los módulos que contienen subopciones pueden desplegarse o contraerse para facilitar la navegación.

`[Foto: menú principal]`

**Ilustración 7.** Menú principal

| N. | Campo | Descripción |
| --- | --- | --- |
| 1 | Botón de menú | Permite mostrar u ocultar el menú lateral. |
| 2 | Perfil del usuario | Muestra la cuenta que tiene la sesión iniciada. |
| 3 | Módulos desplegables | Agrupan opciones relacionadas dentro de una misma sección (por ejemplo, Catálogos). |
| 4 | Opción activa | Indica la sección en la que se encuentra el usuario. |

Elementos generales del menú (según rol):

- **Visitantes:** registro y administración de visitantes.
- **Registros / Bitácora:** registro y seguimiento de visitas.
- **Empleados:** administración de empleados.
- **Usuarios:** administración de usuarios internos.
- **Eventos / Kiosco / Escáner QR:** control de acceso.
- **Catálogos:** empresas, pisos, accesos, puestos, departamentos, cubículos, horarios.
- **Reportes:** consulta y exportación de información.
- **Configuración:** parámetros generales del sistema (solo administrador).

> **Nota:** Las opciones visibles en el menú varían según el rol. Este manual describe las funciones generales; algunas pueden no estar disponibles para su perfil.

### 5.3 Composición general de las tablas

En diversos módulos del sistema la información se presenta mediante **tablas**. Aunque el contenido varía según la sección, su estructura general es similar y está diseñada para facilitar la visualización, búsqueda y gestión de los registros.

`[Foto: composición de una tabla]`

**Ilustración 8.** Composición de tablas

| N. | Campo | Descripción |
| --- | --- | --- |
| 1 | Buscador | Permite localizar registros específicos mediante palabras clave. |
| 2 | Encabezados | Identifican la información mostrada en cada columna. |
| 3 | Registros | Muestran los datos almacenados en el sistema. |
| 4 | Acciones | Permiten consultar, editar o gestionar la información de un registro, según el módulo y los permisos. |
| 5 | Cantidad de registros / Paginación | Define cuántas filas se muestran por página y permite navegar entre páginas de resultados. |

- **Filtro por estatus:** muchos listados permiten filtrar registros **Activos**, **Inactivos** o **Todos**.

> **Nota:** En la columna **Acciones** de cada listado se muestran las operaciones disponibles sobre un registro. Estas **varían según el módulo** y según los permisos del usuario; las acciones de cada módulo se describen en su sección correspondiente. Si una acción no aparece en un registro, es porque ese módulo no la incluye o su perfil no cuenta con permiso para realizarla.

### 5.4 Acciones sobre los registros: qué hace cada una

Cada registro de una tabla puede tener una o varias **acciones** disponibles en la columna **Acciones**. Las acciones cambian según el módulo (cada módulo indica las suyas en su sección), pero su comportamiento es siempre el mismo. A continuación se describe **qué hace cada acción** y qué debe tener en cuenta al usarla.

| Acción | Qué hace | Qué debe considerar |
| --- | --- | --- |
| **Ver** | Abre el registro en **solo lectura**. Solo muestra la información; no modifica nada. | Es la opción segura para consultar datos sin riesgo de cambiarlos. |
| **Editar** | Abre el registro en modo edición para **modificar** sus datos. | Los cambios se aplican hasta presionar **Guardar / Actualizar**. Aplica la misma validación que el alta (los campos faltantes o incorrectos se marcan en rojo). |
| **Activar / Inactivar** | Cambia el **estado** del registro. Inactivar lo **oculta** de las listas activas, pero **no borra** la información: el registro sigue existiendo y puede volver a **Activarse** cuando se requiera. | Es **reversible**. Es la forma recomendada de "dar de baja" algo sin perder su historial. Use el filtro **Inactivos / Todos** para volver a verlo. |
| **Bloquear / Desbloquear** | Restringe o vuelve a habilitar el **acceso** de un visitante, empleado o usuario, sin borrar su registro. | Un registro bloqueado no podrá acceder (su QR no será válido) hasta que se desbloquee. |
| **Generar QR** | Muestra o genera el **código QR** del registro para el control de acceso. | El QR puede reenviarse por correo o mostrarse en pantalla para escanearlo. |
| **Reenviar** | Vuelve a enviar por correo la **notificación, liga o credenciales** al destinatario. | Útil cuando el visitante o usuario no recibió el correo. Verifique que el correo capturado sea correcto. |
| **Verificar** | Marca al visitante como **verificado** tras confirmar sus datos/documentos, paso previo a autorizar su acceso. | Solo disponible en el módulo de Visitantes. |
| **Cancelar / Finalizar** | En visitas: **Cancelar** anula la visita; **Finalizar** la cierra y registra la salida. | Cancelar puede enviar un correo de cancelación al visitante, según la configuración. |
| **Eliminar** | **Borra** el registro de la lista. Ver la advertencia importante de la sección 5.5. | **Puede ser permanente.** Antes de eliminar, lea la sección 5.5. |

> **Nota:** Una misma acción se comporta igual en todos los módulos; lo único que cambia es **cuáles** acciones están disponibles en cada uno. Por eso cada módulo de este manual lista únicamente las acciones que le aplican.

### 5.5 Acerca de Editar, Inactivar y Eliminar (importante)

Esta sección explica cómo afectan a su información las acciones que **modifican o quitan** registros. Léala antes de usar **Eliminar**.

**Editar**

- Al **Editar** un registro, usted cambia datos que **ya están en uso** por el sistema. Por ejemplo, cambiar el correo de un visitante afecta a dónde se envían sus ligas y su QR; cambiar el rol de un usuario cambia lo que ese usuario puede ver y hacer.
- Los cambios **no se aplican** hasta que presiona **Guardar / Actualizar**. Si presiona **Regresar / Cancelar**, no se modifica nada.
- Si deja un campo obligatorio vacío o captura un dato con formato incorrecto, el sistema **no guardará** y **marcará en rojo** los campos a corregir, igual que al crear un registro nuevo.

**Inactivar (recomendado para dar de baja)**

- **Inactivar** es la forma segura de "quitar" un registro de la operación diaria **sin perder la información**. El registro deja de aparecer en las listas activas, pero **se conserva** y puede volver a **Activarse** en cualquier momento.
- Para volver a verlo, cambie el **filtro por estatus** a **Inactivos** o **Todos**.
- Use Inactivar cuando un visitante, empleado, usuario o registro de catálogo ya no se usa, pero quiere conservar su historial.

**Eliminar (no se recupera desde el sistema)**

> **Advertencia importante.** A diferencia de Inactivar, la acción **Eliminar quita el registro de todas las listas** y **usted no podrá recuperarlo por su cuenta desde el sistema**.
>
> - Cuando elimina un registro, este **desaparece por completo**: ya **no aparece** en la lista, **ni siquiera** con el filtro **Inactivos / Todos**. Por eso, desde la pantalla, **un registro eliminado se ve igual que si nunca hubiera existido**.
> - Esto es **distinto** de Inactivar: un registro inactivo lo puede volver a ver y reactivar usted mismo; un registro **eliminado, no**.
> - El sistema normalmente **conserva la información internamente** aunque ya no se muestre, por lo que el área de soporte **podría** restaurarla. Sin embargo, **esto no está garantizado** y algunas operaciones sí borran los datos de forma definitiva, así que **trate todo Eliminar como definitivo**.
> - Si lo que desea es **dar de baja** algo pero conservarlo por si lo necesita después, **use Inactivar**, no Eliminar.
> - **Elimine solo cuando esté seguro** de que el registro ya no se necesitará. Antes de confirmar, verifique que es el registro correcto.
> - **Si eliminó algo por error** y necesita recuperarlo, **comuníquese de inmediato con el área de soporte o con el administrador del sistema**, indicando qué registro era y cuándo lo eliminó. Mientras antes lo reporte, mayor es la posibilidad de recuperarlo.

> **Nota:** No todos los módulos permiten eliminar. Por ejemplo, los **Eventos** de acceso **no se pueden eliminar** (son un registro histórico) y las **visitas** de la Bitácora no se eliminan: se **Cancelan** o se **Finalizan**, conservando su historial.

> **Recomendación general:** ante la duda, **prefiera Inactivar sobre Eliminar**. Inactivar siempre es reversible; Eliminar puede no serlo.

**Cómo editar un registro (flujo general)**

**Paso 1.** En la lista del módulo, ubique el registro y, en la columna **Acciones**, presione **Editar**.

**Paso 2.** El sistema abre el formulario con la información **precargada**. Modifique únicamente los campos que necesita cambiar.

**Paso 3.** Presione **Guardar / Actualizar** para aplicar los cambios, o **Regresar** para salir sin guardar.

**Paso 4. Validación.** Si dejó vacío un campo obligatorio o capturó un dato incorrecto, el sistema **no guardará** y **resaltará en rojo** los campos a corregir con su mensaje. Corríjalos y vuelva a guardar.

**Paso 5. Confirmación.** Al guardar correctamente, el sistema muestra un mensaje de **Éxito** y la lista refleja los datos actualizados.

**Cómo eliminar un registro (flujo general)**

**Paso 1.** En la columna **Acciones**, presione **Eliminar**.

**Paso 2.** El sistema solicita una **confirmación** ("¿Está seguro de eliminar…?"). Revise que sea el registro correcto.

**Paso 3.** Confirme solo si está seguro. Recuerde que, según el módulo, esta acción **puede ser permanente** (ver advertencia arriba). Si solo desea darlo de baja, presione **Cancelar** y use **Inactivar** en su lugar.

**Paso 4.** Tras confirmar, el registro desaparece de la lista. Si lo eliminó por error, **contacte a soporte de inmediato**.

## 6. Módulo de Visitantes

El módulo **Visitantes** permite consultar, registrar y administrar a las personas externas que acuden a las instalaciones. Desde esta vista es posible visualizar la información general de cada visitante, filtrar por estatus, realizar búsquedas y ejecutar acciones según los permisos disponibles.

`[Foto: listado de visitantes]`

**Ilustración 9.** Listado de visitantes

| N. | Campo | Descripción |
| --- | --- | --- |
| 1 | Filtro por estatus | Permite visualizar visitantes activos, inactivos o todos. |
| 2 | Buscar | Localiza visitantes específicos dentro de la tabla. |
| 3 | Nuevo visitante | Abre el formulario para registrar un nuevo visitante. |
| 4 | Tabla de registros | Muestra la información general de los visitantes. |
| 5 | Acciones | Operaciones disponibles sobre cada visitante (ver detalle). |

**Acciones que tiene el módulo Visitantes (columna Acciones):**

- **Ver:** abre el detalle del visitante en solo lectura, para consultar sus datos y documentos sin modificarlos.
- **Editar:** abre el formulario del visitante para modificar sus datos. Recuerde que el **correo** es importante: si lo cambia, las futuras ligas, invitaciones y el QR se enviarán al nuevo correo. Los cambios se aplican al **Guardar**.
- **Verificar:** marca al visitante como **verificado** después de revisar sus datos/documentos. Es el paso previo recomendado antes de autorizar su acceso.
- **Generar QR:** muestra el **código QR** del visitante para el control de acceso; puede mostrarse en pantalla o reenviarse por correo.
- **Bloquear / Desbloquear:** **Bloquear** impide el acceso del visitante (su QR deja de ser válido) sin borrar su registro; **Desbloquear** lo habilita de nuevo. Útil para suspender temporalmente a un visitante.
- **Reenviar:** vuelve a enviar por correo la **notificación o liga** al visitante, por si no la recibió. Verifique antes que el correo sea correcto.
- **Activar / Inactivar:** **Inactivar** oculta al visitante de la lista activa pero **conserva** su información (reversible con **Activar**). Es la forma recomendada de darlo de baja.
- **Eliminar:** **quita** al visitante y desaparece de **todas** las listas (no se ve ni con el filtro Inactivos/Todos). **No podrá recuperarlo usted mismo.** Si solo quiere darlo de baja conservando su historial, use **Inactivar**. Ver sección 5.5.

### 6.1 Cómo registrar un nuevo visitante

Siga estos pasos para dar de alta un visitante:

**Paso 1.** En la pantalla de **Visitantes**, presione el botón **Nuevo / Más (+)** ubicado en la parte superior derecha del listado.

**Paso 2.** El sistema abrirá el formulario **Nuevo visitante**.

`[Foto: formulario de nuevo visitante]`

**Ilustración 10.** Nuevo visitante

**Paso 3.** Capture la información. Los campos marcados con asterisco (\*) son **obligatorios**; los demás son **opcionales**:

| Campo | Obligatorio | Descripción |
| --- | --- | --- |
| Nombre \* | Sí | Nombre del visitante (solo letras y espacios). |
| Apellido paterno \* | Sí | Primer apellido (solo letras y espacios). |
| Apellido materno | No | Segundo apellido. |
| Correo \* | Sí | Correo del visitante; debe ser válido y único (se usa para invitaciones, ligas y QR). |
| Teléfono | No | Teléfono de contacto. |
| Empresa | No | Empresa o procedencia del visitante. |
| Fotografía / Identificación (imagen) | No | Imágenes del visitante y de su identificación. |
| Confirmación de documentos | Sí (según configuración) | Casillas de verificación de documentos (por ejemplo: identificación oficial, SUA, permiso de entrada y lista de artículos), cuando la operación lo requiere. |

> La contraseña del visitante **no se captura**: el sistema la **genera automáticamente**. Los campos exactos y cuáles son obligatorios se indican en el propio formulario con un asterisco (\*).

**Paso 4.** Presione **Crear** para guardar el visitante. Si desea cancelar, presione **Regresar** (no se guardará nada).

**Paso 5. Validación.** Si presiona **Crear** y falta algún campo obligatorio o un dato tiene formato incorrecto (por ejemplo, un correo mal escrito), el sistema **no guardará** y **resaltará en rojo** los campos pendientes, mostrando debajo de cada uno un mensaje indicando qué se debe corregir. Corrija los campos marcados y vuelva a presionar **Crear**.

**Paso 6. Confirmación.** Cuando la información es correcta, el sistema muestra un mensaje de **Éxito** y el visitante aparece en el listado, listo para asociarse a una visita.

> **Nota:** El correo del visitante debe ser válido, ya que se utiliza para enviar invitaciones, ligas de registro y su código QR.

### 6.2 Verificación de visitante

Antes de autorizar el acceso, el visitante puede requerir **verificación**. Desde el detalle del visitante, el usuario confirma sus datos y lo marca como verificado.

`[Foto: pantalla de verificación de visitante]`

**Ilustración 11.** Verificación de visitante

| N. | Campo | Descripción |
| --- | --- | --- |
| 1 | Datos del visitante | Información capturada del visitante para su revisión. |
| 2 | Documentos | Permite validar la documentación adjunta. |
| 3 | Verificar | Marca al visitante como verificado para continuar con el proceso. |

Acciones adicionales disponibles sobre un visitante:

- **Bloquear / Desbloquear:** restringe o habilita el acceso del visitante.
- **Generar QR:** muestra el código QR del visitante para el control de acceso.
- **Reenviar correo:** vuelve a enviar la notificación o liga al visitante.

## 7. Registro de visitas (Bitácora)

El registro de visitas es el módulo principal de operación. Desde la **Bitácora** el usuario puede consultar las visitas registradas y dar seguimiento a su estado durante el proceso de recepción.

`[Foto: bitácora / registros de visita]`

**Ilustración 12.** Bitácora / registros de visita

| N. | Campo | Descripción |
| --- | --- | --- |
| 1 | Fecha | Permite seleccionar la fecha de la cual se desean visualizar registros. |
| 2 | Buscar | Localiza visitas específicas dentro de la tabla. |
| 3 | Nuevo registro | Abre el formulario para registrar una nueva visita. |
| 4 | Registros | Muestra las visitas registradas con su información principal. |
| 5 | Columna Estado | Indica el estado de la visita (por ejemplo: Pendiente, Accedió, Salida, Finalizada, Cancelada). |
| 6 | Acciones | Operaciones disponibles sobre cada visita. |

**Acciones que tiene la Bitácora (columna Acciones):**

- **Ver:** abre el detalle de la visita en solo lectura (visitante, anfitrión, accesos, fechas, estado y eventos asociados).
- **Editar:** modifica los datos de la visita/cita (por ejemplo, fecha, anfitrión o accesos), siempre que su estado lo permita. Los cambios se aplican al **Guardar**.
- **Cancelar:** **anula** la visita. Si está configurado, envía un correo de cancelación al visitante. El estado de la visita cambia a **Cancelada**.
- **Finalizar:** **cierra** la visita y registra la **fecha de salida**. El estado cambia a **Finalizada**.

> **Nota:** En la Bitácora, en lugar de eliminar visitas se usan **Cancelar** o **Finalizar**, de modo que el registro y su historial se conservan para reportes.

### 7.1 Cómo registrar una nueva visita

Siga estos pasos para crear una visita o cita:

**Paso 1.** En la **Bitácora** (o en el módulo Visitantes), presione el botón **Nuevo / Más (+)** ubicado en la parte superior.

**Paso 2.** El sistema abrirá el formulario **Nuevo registro de visita**.

`[Foto: formulario de nuevo registro de visita]`

**Ilustración 13.** Nuevo registro de visita

**Paso 3.** Capture la información. Los campos marcados con asterisco (\*) son **obligatorios**; los demás son **opcionales**:

| Campo | Obligatorio | Descripción |
| --- | --- | --- |
| Tipo de registro \* | Sí | Tipo de visita/cita que se está registrando. |
| Nombre del visitante \* | Sí | Nombre del visitante que asistirá. |
| Apellido paterno del visitante \* | Sí | Primer apellido del visitante. |
| Correo del visitante \* | Sí | Correo válido del visitante. |
| Anfitrión \* | Sí | Usuario o empleado que recibe la visita. |
| Fecha de entrada \* | Sí | Fecha programada de la visita; **no puede ser una fecha pasada**. |
| Accesos \* | Sí | Al menos un acceso o punto de entrada autorizado. |
| Empresa | No | Empresa o procedencia del visitante. |
| Identificación / Documentos | No | Imágenes de identificación y documentación de la visita. |
| Placas / Vehículo | No | Datos del vehículo, cuando aplique. |
| Comentarios / Actividades | No | Información adicional de la visita. |

> Puede registrarse **más de un visitante** en la misma visita; cada uno requiere nombre, apellido paterno y correo. Los campos exactos y los obligatorios se indican en el formulario con un asterisco (\*).

**Paso 4.** Presione **Crear** para guardar la visita, o **Regresar** para cancelar sin guardar.

**Paso 5. Validación.** Si falta un campo obligatorio o un dato es incorrecto, el sistema **resaltará en rojo** los campos pendientes con su mensaje de error. Corríjalos y vuelva a presionar **Crear**.

**Paso 6. Confirmación.** Al guardar correctamente, el sistema muestra un mensaje de **Éxito**, crea la visita en la Bitácora y, si está configurado, envía una notificación por correo al visitante y al anfitrión.

### 7.2 Cancelar o finalizar una visita

Desde la columna **Acciones** de la Bitácora, el usuario puede:

- **Cancelar:** anula la visita y, si aplica, envía un correo de cancelación.
- **Finalizar:** cierra la visita y registra la fecha de salida.

> **Nota:** El estado del registro cambia automáticamente conforme avanza el proceso (entrada, salida, finalización).

## 8. Liga de registro para el visitante

El sistema permite que sea el **propio visitante** quien complete su registro, mediante una liga enviada por correo. Esto agiliza la recepción al llegar.

**Paso 1.** Un usuario autorizado selecciona **Enviar liga de registro**, captura el correo del visitante, la fecha, el anfitrión y los accesos, y envía la invitación.

`[Foto: envío de liga de registro]`

**Ilustración 14.** Envío de liga de registro

| N. | Campo | Descripción |
| --- | --- | --- |
| 1 | Correo | Correo del visitante al que se enviará la liga. |
| 2 | Fecha | Fecha de la visita. |
| 3 | Anfitrión | Usuario o empleado que recibe la visita. |
| 4 | Accesos | Accesos autorizados para la visita. |
| 5 | Enviar | Genera la liga y la envía por correo al visitante. |

**Paso 2.** El visitante abre la liga, el sistema valida el enlace y el visitante captura o confirma sus datos para completar su registro.

`[Foto: registro desde la liga (vista del visitante)]`

**Ilustración 15.** Registro desde la liga (visitante)

> **Nota:** La liga tiene una vigencia limitada y se invalida una vez utilizada. Si expira, será necesario enviar una nueva.

## 9. Módulo de Empleados

> Disponible para roles administrativos.

El módulo **Empleados** permite administrar a las personas internas sujetas a control de acceso. Su estructura es similar a la de Visitantes: listado con filtros, búsqueda, alta y acciones.

`[Foto: listado de empleados]`

**Ilustración 16.** Listado de empleados

| N. | Campo | Descripción |
| --- | --- | --- |
| 1 | Filtro por estatus | Visualiza empleados activos, inactivos o todos. |
| 2 | Buscar | Localiza empleados específicos. |
| 3 | Nuevo empleado | Abre el formulario para registrar un empleado. |
| 4 | Tabla de registros | Muestra la información general de los empleados. |
| 5 | Acciones | Operaciones disponibles sobre cada empleado. |

**Acciones que tiene el módulo Empleados (columna Acciones):**

- **Ver:** abre el detalle del empleado en solo lectura (datos, empresa, piso, horario y accesos).
- **Editar:** modifica los datos del empleado, incluidos sus **accesos** y **horario**. Cambiar estos campos afecta a dónde y cuándo puede acceder. Los cambios se aplican al **Guardar**.
- **Generar QR:** muestra el **código QR** del empleado para el control de acceso.
- **Activar / Inactivar:** **Inactivar** oculta al empleado de la lista activa pero **conserva** su información (reversible con **Activar**). Forma recomendada de darlo de baja.
- **Desbloquear:** restablece el acceso de un empleado que fue **bloqueado** (por ejemplo, por intentos o por una suspensión), sin borrar su registro.
- **Eliminar:** **quita** al empleado y desaparece de **todas** las listas (no se ve ni con el filtro Inactivos/Todos). **No podrá recuperarlo usted mismo.** Si solo desea darlo de baja conservando su historial, use **Inactivar**. Ver sección 5.5.

> **Nota (baja de empleados):** Cuando un empleado finaliza su relación con la empresa, además de darlo de baja, sus **datos personales (correo, nombre y teléfono) se anonimizan** por política de protección de datos, de modo que ya no pueden identificarse ni recuperarse. Esta acción es **definitiva**.

### 9.1 Cómo registrar un nuevo empleado

**Paso 1.** En la pantalla de **Empleados**, presione el botón **Nuevo / Más (+)** en la parte superior.

**Paso 2.** El sistema abrirá el formulario **Nuevo empleado**.

`[Foto: formulario de nuevo empleado]`

**Ilustración 17.** Nuevo empleado

**Paso 3.** Capture la información. Los campos con asterisco (\*) son **obligatorios**; los demás son **opcionales**:

| Campo | Obligatorio | Descripción |
| --- | --- | --- |
| Nombre \* | Sí | Nombre del empleado (solo letras y espacios). |
| Apellido paterno \* | Sí | Primer apellido (solo letras y espacios). |
| Apellido materno | No | Segundo apellido. |
| Correo \* | Sí | Correo del empleado; debe ser válido y único. |
| Empresa \* | Sí | Empresa a la que pertenece. |
| Piso \* | Sí | Piso asignado. |
| Accesos \* | Sí | Al menos un acceso autorizado para el empleado. |
| Móvil / Teléfono / Extensión | No | Datos de contacto. |
| Puesto / Departamento / Cubículo | No | Ubicación organizacional. |
| Horario | No | Horario asignado. |
| Fotografía | No | Imagen del empleado. |

> Los campos obligatorios se indican en el formulario con un asterisco (\*).

**Paso 4.** Presione **Crear** para guardar, o **Regresar** para cancelar.

**Paso 5. Validación.** Si falta un campo obligatorio o un dato es incorrecto, el sistema **resaltará en rojo** los campos pendientes con su mensaje. Corríjalos y vuelva a guardar.

**Paso 6. Confirmación.** Al guardar correctamente, el sistema muestra un mensaje de **Éxito** y el empleado aparece en el listado.

Funciones adicionales:

- **Carga masiva:** descargue el formato, complételo y cárguelo para registrar varios empleados a la vez.
- **Generar QR:** obtiene el código QR del empleado para el control de acceso.
- **Directorio:** consulta de empleados registrados.

### 9.2 Directorio de empleados

El **Directorio** permite consultar empleados registrados sin entrar al flujo completo de administración. Es útil para localizar rápidamente información de contacto, área, puesto o ubicación de una persona interna.

> Disponible para perfiles autorizados. La información visible depende de los permisos del usuario y de los datos capturados para cada empleado.

**Uso general del Directorio:**

**Paso 1.** Ingrese a la opción **Directorio** desde el menú principal.

**Paso 2.** Use el buscador o los filtros disponibles para localizar al empleado.

**Paso 3.** Revise la información mostrada en la tabla o tarjeta de resultados.

**Paso 4.** Si necesita modificar información, hágalo desde el módulo **Empleados**, siempre que su perfil tenga permiso de edición.

> **Nota:** El Directorio es principalmente de consulta. Para altas, bajas, activación, inactivación o cambios de datos, utilice el módulo **Empleados**.

## 10. Módulo de Usuarios

> Disponible para el rol Administrador.

El módulo **Usuarios** permite consultar y administrar a las personas con acceso al sistema. Desde esta vista es posible visualizar la información de cada usuario, filtrar por estatus, buscar y ejecutar acciones.

`[Foto: listado de usuarios]`

**Ilustración 18.** Listado de usuarios

| N. | Campo | Descripción |
| --- | --- | --- |
| 1 | Filtro por estatus | Visualiza usuarios activos, inactivos o todos. |
| 2 | Nuevo usuario | Abre el formulario para registrar un usuario. |
| 3 | Tabla de registros | Muestra la información general de los usuarios. |
| 4 | Acciones | Operaciones disponibles sobre cada usuario. |

**Acciones que tiene el módulo Usuarios (columna Acciones):**

- **Ver:** abre el detalle del usuario en solo lectura (datos de contacto, usuario y rol).
- **Editar:** modifica los datos, el **rol** y los **permisos** del usuario. Cambiar el rol modifica de inmediato lo que ese usuario puede ver y hacer en el sistema. Los cambios se aplican al **Guardar**.
- **Generar QR:** muestra el **código QR** del usuario para el control de acceso.
- **Reenviar:** vuelve a enviar por correo las **credenciales o el acceso** al usuario, por si no las recibió.
- **Desbloquear:** restablece el acceso de un usuario **bloqueado por intentos fallidos** de inicio de sesión, sin borrar su cuenta.
- **Activar / Inactivar:** **Inactivar** deshabilita el acceso del usuario al sistema y lo oculta de la lista activa, pero **conserva** su cuenta (reversible con **Activar**). Forma recomendada de retirar un acceso.
- **Eliminar:** **quita** la cuenta del usuario y desaparece de **todas** las listas (no se ve ni con el filtro Inactivos/Todos). **No podrá recuperarla usted mismo.** Para retirar el acceso conservando el registro, use **Inactivar**. Ver sección 5.5.

### 10.1 Cómo registrar un nuevo usuario

**Paso 1.** En la pantalla de **Usuarios**, presione el botón **Nuevo / Más (+)** en la parte superior.

**Paso 2.** El sistema abrirá el formulario **Nuevo usuario**.

`[Foto: formulario de nuevo usuario]`

**Ilustración 19.** Nuevo usuario

**Paso 3.** Capture la información. Los campos con asterisco (\*) son **obligatorios**; los demás son **opcionales**:

| Campo | Obligatorio | Descripción |
| --- | --- | --- |
| Nombre \* | Sí | Nombre del usuario (solo letras y espacios). |
| Apellido paterno \* | Sí | Primer apellido. |
| Correo \* | Sí | Correo del usuario; debe ser válido y **único**. Se usa para iniciar sesión, recuperación y notificaciones. |
| Contraseña \* | Sí | Contraseña inicial. Debe tener **mínimo 8 caracteres** e incluir **mayúscula, minúscula, número y símbolo**. |
| Rol \* | Sí | Al menos un perfil que define las funciones y permisos disponibles. |
| Empresa \* | Sí | Empresa a la que pertenece el usuario. |
| Apellido materno | No | Segundo apellido. |
| Teléfono móvil / oficina / extensión | No | Datos de contacto. |
| Puesto / Departamento / Cubículo / Piso / Horario | No | Datos organizacionales. |
| Accesos | No | Accesos autorizados. |

> El acceso al sistema se realiza con el **correo** y la **contraseña** (no hay un campo de "nombre de usuario" aparte). Si el rol asignado es de **Tablet**, el formulario solicitará además los datos de operación de la tablet. Los campos obligatorios se indican con un asterisco (\*).

**Paso 4.** Presione **Crear** para guardar, o **Regresar** para cancelar.

**Paso 5. Validación.** Si falta un campo obligatorio o un dato es incorrecto (por ejemplo, correo duplicado o contraseña que no cumple los requisitos), el sistema **resaltará en rojo** los campos pendientes con su mensaje. Corríjalos y vuelva a guardar.

**Paso 6. Confirmación.** Al guardar correctamente, el sistema muestra un mensaje de **Éxito** y el usuario aparece en el listado.

> **Nota:** El correo registrado debe ser único y puede utilizarse para recuperación de contraseña o notificaciones.

## 11. Control de acceso

### 11.1 Kiosco

El **Kiosco** es una vista de operación pensada para recepción o tablet, desde la cual se consultan y registran los eventos de acceso.

`[Foto: vista de kiosco]`

**Ilustración 20.** Kiosco

| N. | Campo | Descripción |
| --- | --- | --- |
| 1 | Consulta | Permite buscar visitas/visitantes para el control de acceso. |
| 2 | Registro de evento | Registra la entrada o salida del visitante/empleado. |
| 3 | Estado | Muestra el resultado de la validación. |

### 11.2 Escáner QR

La pantalla **Escáner QR** permite validar el código QR de visitantes, usuarios y empleados para autorizar el acceso.

`[Foto: escáner QR validando un acceso]`

**Ilustración 21.** Escáner QR

| N. | Campo | Descripción |
| --- | --- | --- |
| 1 | Cámara / Escáner | Captura el código QR presentado. |
| 2 | Resultado | Indica si el acceso es válido o inválido. |
| 3 | Confirmación | Registra el evento de entrada o salida. |

**Flujo de entrada/salida:**

1. El visitante o empleado presenta su código QR.
2. El sistema valida el QR y los permisos de acceso.
3. Si es válido, se registra el evento de **entrada**.
4. A la salida, se repite el escaneo y se registra el evento de **salida**, finalizando el registro cuando corresponde.

### 11.3 Eventos

El módulo **Eventos** permite consultar los accesos registrados (entradas, salidas, autorizaciones, cancelaciones) y aplicar filtros para su revisión.

`[Foto: pantalla de eventos]`

**Ilustración 22.** Eventos

| N. | Campo | Descripción |
| --- | --- | --- |
| 1 | Filtros | Permite filtrar por fecha, acceso, tipo de evento, etc. |
| 2 | Tabla de eventos | Muestra los eventos registrados con su información. |
| 3 | Acciones | Operaciones disponibles sobre cada evento. |

**Acciones que tiene el módulo Eventos (columna Acciones):**

- **Ver:** abre el detalle del evento (tipo, fecha/hora, acceso y persona), incluyendo la imagen cuando esté disponible.
- **Imagen:** consulta la **evidencia fotográfica** asociada al evento (si existe).

> **Nota:** Los eventos son un **registro histórico** del control de acceso; por eso este módulo es principalmente de **consulta** (no se editan ni se eliminan eventos individuales desde aquí).

## 12. Catálogos

> Disponible para roles administrativos.

La sección **Catálogos** concentra los registros base necesarios para la operación: empresas, pisos, accesos, puestos, departamentos, cubículos y horarios. Todos comparten una estructura similar de consulta, alta, edición y activación.

`[Foto: pantalla de un catálogo]`

**Ilustración 23.** Catálogos

| N. | Campo | Descripción |
| --- | --- | --- |
| 1 | Filtro por estatus | Visualiza registros activos, inactivos o todos. |
| 2 | Buscar | Localiza registros específicos. |
| 3 | Nuevo registro | Abre el formulario de alta del catálogo. |
| 4 | Tabla de registros | Muestra los elementos dados de alta. |
| 5 | Acciones | Operaciones disponibles sobre cada registro del catálogo. |

**Acciones que tienen los Catálogos (columna Acciones):**

- **Ver:** abre el detalle del registro en solo lectura.
- **Editar:** modifica los datos del registro (por ejemplo, el nombre de una empresa o un acceso). Como los catálogos se usan en otros procesos, el cambio se reflejará donde ese registro esté asignado. Los cambios se aplican al **Guardar**.
- **Activar / Inactivar:** **Inactivar** oculta el registro de las listas activas pero lo **conserva** (reversible con **Activar**). Un catálogo inactivo deja de ofrecerse al capturar nuevas visitas, empleados, etc.
- **Eliminar:** **quita** el registro del catálogo y desaparece de **todas** las listas. **No podrá recuperarlo usted mismo.** Úselo con cuidado: si el registro está **en uso** por visitas o empleados, lo recomendable es **Inactivar** en lugar de Eliminar. Ver sección 5.5.

> **Importante:** Antes de eliminar un elemento de catálogo, verifique que no esté asignado a registros activos (visitas, empleados, accesos). Si solo desea dejar de usarlo, **Inactívelo**; así no afecta a la información que ya lo referencia.

### 12.1 Cómo registrar un nuevo elemento de catálogo

**Paso 1.** En el catálogo correspondiente (por ejemplo, **Empresas**), presione el botón **Nuevo / Más (+)**.

**Paso 2.** El sistema abrirá el formulario de alta.

**Paso 3.** Capture la información solicitada. El **nombre** del registro suele ser obligatorio (\*); otros campos dependen del catálogo.

**Paso 4.** Presione **Crear** para guardar o **Regresar** para cancelar.

**Paso 5. Validación.** Si falta un campo obligatorio, el sistema lo **resaltará en rojo** con su mensaje. Corríjalo y vuelva a guardar.

**Paso 6. Confirmación.** Al guardar correctamente, el registro aparece en el catálogo y queda disponible para usarse en otros procesos.

> **Nota:** La información de los catálogos es requerida en otros procesos del sistema, como el registro de visitas y la asignación de accesos.

## 13. Reportes

La sección **Reportes** permite consultar la información de las visitas, eventos y horas registradas, mediante diferentes filtros, y exportar los resultados.

`[Foto: pantalla de reportes con filtros]`

**Ilustración 24.** Reportes

| N. | Campo | Descripción |
| --- | --- | --- |
| 1 | Filtros de búsqueda | Permiten consultar registros por fecha, acceso, anfitrión, visitante, estado, etc. |
| 2 | Tabla de resultados | Muestra los registros que cumplen con los filtros. |
| 3 | Exportar | Permite descargar los resultados en formato PDF o Excel. |

**Cómo consultar y exportar un reporte:**

**Paso 1.** Ingrese a **Reportes** y seleccione el tipo de reporte que desea consultar (por ejemplo, visitas, eventos u horas).

**Paso 2.** Defina los **filtros** (rango de fechas, acceso, anfitrión, visitante, estado, etc.) y aplíquelos.

**Paso 3.** El sistema muestra en la **tabla de resultados** los registros que cumplen con los filtros. Puede usar el buscador y la paginación para revisarlos.

**Paso 4.** Presione **Exportar** y elija el formato (**PDF** o **Excel**). El archivo se descargará en su equipo.

> **Nota:** Las exportaciones respetan los permisos del usuario que las genera. Evite incluir o compartir datos personales innecesarios. Si la tabla aparece vacía, ajuste los filtros (por ejemplo, amplíe el rango de fechas).

## 14. Configuración (resumen)

> Disponible para el rol Administrador.

La sección **Configuración** permite definir parámetros generales del sistema (nombre, zona horaria, correo, tema), administrar permisos por rol y activar módulos opcionales. El detalle de esta sección se describe en el documento **MA-RE-001 Manual de Administración**.

## 15. Preguntas o incidencias comunes

**1. No puedo iniciar sesión**
*Posible causa:* el usuario o la contraseña son incorrectos.
*Acción recomendada:* verifique sus datos. Si no recuerda la contraseña, use **¿Olvidó su contraseña?** en la pantalla de inicio de sesión.

**2. Mi cuenta fue bloqueada**
*Posible causa:* se realizaron varios intentos fallidos de acceso.
*Acción recomendada:* espere el tiempo de bloqueo o solicite al administrador el desbloqueo de su cuenta.

**3. No recibí el código para recuperar mi contraseña**
*Posible causa:* el correo no es correcto o el mensaje llegó a otra bandeja.
*Acción recomendada:* revise su bandeja de entrada y la carpeta de correo no deseado. Si no llega, verifique con el administrador que su correo esté registrado correctamente.

**4. El visitante no recibió la liga de registro**
*Posible causa:* el correo capturado es incorrecto o el mensaje llegó a correo no deseado.
*Acción recomendada:* verifique el correo y reenvíe la liga. Si persiste, valide con el administrador la configuración de correo.

**5. El código QR no es válido al escanear**
*Posible causa:* el QR está expirado, el visitante no está verificado o no tiene accesos autorizados.
*Acción recomendada:* verifique al visitante, confirme sus accesos y, si es necesario, vuelva a generar el QR.

**6. Una visita no aparece en la Bitácora**
*Posible causa:* la fecha seleccionada no corresponde o el registro no se guardó correctamente.
*Acción recomendada:* ajuste el filtro de fecha y use el buscador. Si no aparece, vuelva a registrar la visita.

**7. No puedo ver ciertas opciones del menú**
*Posible causa:* su perfil no cuenta con permisos para esos módulos.
*Acción recomendada:* verifique con el administrador el rol y los permisos asignados a su cuenta.

**8. No se envían los correos (invitaciones/cancelaciones)**
*Posible causa:* la configuración de correo no está completa.
*Acción recomendada:* solicite al administrador revisar la configuración de correo del sistema.

**9. Eliminé un registro por error y lo necesito de vuelta**
*Posible causa:* se usó la acción **Eliminar**, que en algunos módulos es permanente.
*Acción recomendada:* **contacte de inmediato** al área de soporte o al administrador del sistema indicando qué registro era y cuándo lo eliminó. La recuperación no está garantizada y depende de los respaldos disponibles, por lo que es importante reportarlo cuanto antes. Para evitarlo en el futuro, prefiera **Inactivar** en lugar de Eliminar (ver sección 5.5).

**10. Inactivé un registro y ya no lo veo en la lista**
*Posible causa:* los listados muestran por defecto solo los registros **activos**.
*Acción recomendada:* cambie el **filtro por estatus** a **Inactivos** o **Todos** para verlo, y use **Activar** si desea volver a habilitarlo. La información no se perdió.

**11. ¿Cuál es la diferencia entre Inactivar y Eliminar?**
*Respuesta:* **Inactivar** oculta el registro pero lo **conserva** y es **reversible** (puede Activarlo de nuevo). **Eliminar** lo **quita** de todas las listas y **no podrá recuperarlo usted mismo**. Si tiene duda sobre cuál usar, use **Inactivar**.

**12. El sistema me cerró la sesión solo / me pidió iniciar sesión otra vez**
*Posible causa:* su sesión **expiró** (tiene una vigencia limitada, de forma predeterminada 7 días) o el administrador deshabilitó su cuenta.
*Acción recomendada:* es un comportamiento normal de seguridad. Vuelva a **iniciar sesión** con su correo y contraseña. Si le sigue ocurriendo con mucha frecuencia, repórtelo al administrador.

## 16. Glosario

**Acceso.** Punto físico de entrada o salida controlado por el sistema.

**Anfitrión.** Usuario o empleado que recibe o autoriza una visita.

**Bitácora.** Sección donde se registran y consultan las visitas, con su estado y seguimiento.

**Carga masiva.** Función que permite registrar varios elementos a la vez mediante un archivo de formato.

**Catálogo.** Conjunto de registros base del sistema (empresas, pisos, accesos, puestos, etc.).

**Código QR.** Código que se escanea para autorizar y validar el acceso de un visitante o empleado.

**Editar.** Acción que abre un registro para modificar sus datos; los cambios se aplican al guardar.

**Eliminar.** Acción que quita un registro de la lista; según el módulo puede ser **permanente** y no recuperable desde el sistema.

**Empleado.** Persona interna sujeta a control de acceso.

**Evento.** Acción de acceso registrada (entrada, salida, autorización, cancelación, finalización).

**Inactivar.** Acción que oculta un registro de las listas activas pero **conserva** su información; es reversible mediante **Activar**.

**Kiosco.** Vista de operación tipo tablet para consultar y registrar eventos de acceso.

**Liga de registro.** Enlace enviado al visitante para que complete su propio registro.

**Registro / Visita.** Cita o evento de visita que asocia a un visitante con un anfitrión, accesos y fechas.

**Rol.** Perfil asignado a un usuario que define sus funciones y permisos.

**Sesión.** Periodo durante el cual un usuario permanece autenticado en el sistema; tiene una vigencia limitada y expira por seguridad, requiriendo iniciar sesión nuevamente.

**Usuario.** Persona con acceso al sistema para consultar, registrar o administrar información, según su rol.

**Verificación.** Confirmación de los datos del visitante antes de autorizar su acceso.

**Visitante.** Persona externa registrada para una visita o cita.

---

**Fin del documento.**

| Documento | Código | Versión | Fecha | Responsable | Estado |
| --- | --- | --- | --- | --- | --- |
| Manual de Usuario — RE | MU-RE-001 | 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Vigente |
