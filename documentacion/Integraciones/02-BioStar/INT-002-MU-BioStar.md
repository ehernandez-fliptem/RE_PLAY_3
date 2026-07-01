# Manual de Usuario

## Recepción Electrónica — Módulo BioStar

Versión 1.0

---

| Campo | Descripción |
| --- | --- |
| Tipo de documento | Manual de Usuario (módulo opcional) |
| Código | INT-002-MU |
| Módulo | BioStar (Control de Acceso Suprema/BioStar) |
| Producto base | Recepción Electrónica (RE) |
| Versión | 1.0 |
| Fecha | 2026-06-24 |
| Responsable | Área de Sistemas / Desarrollo |
| Clasificación | Uso interno / Cliente |
| Estado | Vigente |

> Este manual describe la operación del módulo BioStar pantalla por pantalla. El **alcance funcional** se describe en el documento INT-002-DF.

---

## Control de versiones

| Versión | Fecha | Autor | Descripción |
| --- | --- | --- | --- |
| 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Versión inicial del manual de usuario de BioStar. |

---

## Contenido

1. Introducción
2. Objetivo
3. Alcance
4. Perfil de usuario
5. Descripción general del módulo BioStar
6. Cómo activar el módulo (Configuración)
7. Menú BioStar
8. Conexión
   - 8.1 Nuevo dispositivo de conexión
   - 8.2 Restricción por falta de conexión
9. Dispositivos BioStar
   - 9.1 Acciones disponibles
   - 9.2 Nuevo dispositivo BioStar
10. Grupos de BioStar
    - 10.1 Grupos de usuarios
    - 10.2 Grupos de dispositivos
    - 10.3 Grupos de puertas
11. Puertas BioStar
    - 11.1 Nueva puerta BioStar
12. Horarios BioStar
    - 12.1 Nuevo horario BioStar
13. Niveles de Acceso
    - 13.1 Nuevo nivel de acceso
14. Permisos de Acceso
    - 14.1 Nuevo permiso de acceso
15. Apertura de puerta por evento (operación diaria)
16. Flujo general recomendado
17. Preguntas o incidencias comunes
18. Glosario
19. Control documental

---

## Contenido de imágenes

- Ilustración 1. Interruptor "Integración con Suprema / BioStar" en Configuración
- Ilustración 2. Menú BioStar
- Ilustración 3. Conexión — gestión de dispositivos
- Ilustración 4. Nuevo dispositivo de conexión
- Ilustración 5. Alerta por falta de conexión
- Ilustración 6. Dispositivos BioStar
- Ilustración 7. Nuevo dispositivo BioStar
- Ilustración 8. Grupos de usuarios
- Ilustración 9. Grupos de dispositivos
- Ilustración 10. Grupos de puertas
- Ilustración 11. Puertas BioStar
- Ilustración 12. Nueva puerta BioStar
- Ilustración 13. Horarios BioStar
- Ilustración 14. Nuevo horario BioStar
- Ilustración 15. Niveles de acceso
- Ilustración 16. Nuevo nivel de acceso
- Ilustración 17. Permisos de acceso
- Ilustración 18. Nuevo permiso de acceso
- Ilustración 19. Apertura de puerta al validar un acceso

---

## 1. Introducción

El presente manual describe el uso y la configuración del módulo **BioStar** dentro del sistema de **Recepción Electrónica (RE)**. Este módulo permite establecer la conexión con la plataforma **Suprema/BioStar**, configurar los dispositivos, grupos, puertas, horarios, niveles y permisos de acceso, y **abrir puertas** de forma automática cuando se valida un acceso en RE.

Una vez configurada correctamente la conexión, el usuario puede administrar la información de control de acceso desde RE, evitando en muchos casos la necesidad de ingresar directamente a la plataforma BioStar.

## 2. Objetivo

Describir, paso a paso, las opciones disponibles del módulo BioStar: cómo configurar la conexión, administrar dispositivos, grupos, puertas, horarios, niveles y permisos, y cómo opera la apertura de puertas por evento, de modo que el usuario pueda operar el módulo sin dudas.

## 3. Alcance

Este manual comprende únicamente la sección **BioStar** del sistema: configuración de conexión, dispositivos, grupos, puertas, horarios, niveles, permisos y la apertura/cierre de puertas asociada a los accesos. No incluye otros módulos del sistema ni la operación interna de la plataforma BioStar.

## 4. Perfil de usuario

Este módulo está dirigido a usuarios con perfil **Administrador (Super Admin)**. Los demás roles **no** tienen acceso a esta sección, ya que sus funciones administran la integración entre el sistema y BioStar.

## 5. Descripción general del módulo BioStar

El módulo agrega una sección **BioStar** en el menú lateral, con varias pantallas relacionadas entre sí. La **Conexión** es el punto de partida: sin una conexión válida no es posible consultar el resto de las secciones. A partir de ahí se administran dispositivos, grupos, puertas, horarios, niveles y permisos, que en conjunto definen **quién** puede pasar, **por dónde** y **cuándo**.

## 6. Cómo activar el módulo (Configuración)

**Paso 1.** Con rol **Administrador**, entre a **Configuración → pestaña Integraciones**.

`[Foto: interruptor "Integración con Suprema / BioStar" en Configuración]`

**Ilustración 1.** Interruptor "Integración con Suprema / BioStar" en Configuración

**Paso 2.** Active el interruptor **"Integración con Suprema / BioStar"** y guarde. Aparece la sección **BioStar** en el menú.

> **Nota:** Al **apagar** la integración, se ocultan las pantallas de BioStar y **se desactivan los usuarios con rol Tablet** (escáner QR/kiosco).

## 7. Menú BioStar

Al ingresar con rol **Super Admin**, en el menú lateral aparece la sección **BioStar** y, dentro de ella, el grupo **Grupos de BioStar** con sus submódulos.

`[Foto: menú BioStar]`

**Ilustración 2.** Menú BioStar

| N. | Campo | Descripción |
| --- | --- | --- |
| 1 | Módulo BioStar | Da acceso a Conexión, Dispositivos, Puertas, Niveles de Acceso, Horarios y Permisos de Acceso. |
| 2 | Grupos de BioStar | Agrupa Grupos de Usuarios, Grupos de Dispositivos y Grupos de Puertas. |
| 3 | Submódulos de grupos | Administración de cada tipo de grupo. |

## 8. Conexión

La sección **Conexión** (`/biostarar/conexion`) permite registrar y administrar los servidores/dispositivos BioStar con los que RE establece comunicación. Es el **punto de partida** del módulo: se requiere una conexión válida para acceder al resto de las secciones.

`[Foto: Conexión — gestión de dispositivos]`

**Ilustración 3.** Conexión — gestión de dispositivos

| N. | Campo | Descripción |
| --- | --- | --- |
| 1 | Tabla de dispositivos | Muestra los registros con nombre, IP, puerto, usuario, dispositivo principal (Main) y estado de sesión. |
| 2 | Nuevo dispositivo | Abre el formulario para registrar una conexión. |
| 3 | Acciones | Consultar, editar, establecer como principal, probar conexión o eliminar. |

> **Nota:** Antes de entrar al resto de submódulos, verifique que exista **al menos un dispositivo** registrado, que la conexión sea **válida** y que el **dispositivo principal** esté correctamente configurado.

### 8.1 Nuevo dispositivo de conexión

**Paso 1.** En **Conexión**, presione **Nuevo / Más (+)**.

`[Foto: nuevo dispositivo de conexión]`

**Ilustración 4.** Nuevo dispositivo de conexión

**Paso 2.** Capture los datos. Los campos con asterisco (\*) son **obligatorios**:

| Campo | Obligatorio | Descripción |
| --- | --- | --- |
| Dirección IP \* | Sí | IP del servidor BioStar. |
| Puerto \* | Sí | Puerto de comunicación (por defecto 443). |
| Nombre \* | Sí | Nombre para identificar la conexión. |
| Usuario \* | Sí | Usuario de BioStar. |
| Contraseña \* | Sí | Se guarda cifrada. Durante la captura se muestran los **criterios mínimos** (mayúscula, minúscula, número y símbolo). |

**Paso 3.** Presione **Guardar** (o **Cancelar** para salir sin guardar). El dispositivo queda registrado en la tabla y podrá usarse para la administración y sincronización.

**Paso 4. Validación.** Si falta un campo obligatorio o la contraseña no cumple los criterios, el sistema lo **resalta**; corríjalo y vuelva a guardar.

### 8.2 Restricción por falta de conexión

Si **no existe** una conexión registrada o **no es posible iniciar sesión** en BioStar y se intenta entrar a otra sección, el sistema muestra un mensaje **"No se pudo consultar"** con la opción **Ir a configuración**.

`[Foto: alerta por falta de conexión]`

**Ilustración 5.** Alerta por falta de conexión

> Esta validación indica que el módulo **requiere una conexión correcta** antes de permitir el acceso a las demás secciones.

## 9. Dispositivos BioStar

La sección **Dispositivos BioStar** (`/biostarar/dispositivos`) permite consultar y administrar los dispositivos usados para el acceso o la validación.

`[Foto: Dispositivos BioStar]`

**Ilustración 6.** Dispositivos BioStar

| N. | Campo | Descripción |
| --- | --- | --- |
| 1 | Barra superior | Filtro por grupo de dispositivos, actualizar, nuevo dispositivo, exportar y buscar. |
| 2 | Tabla de dispositivos | Muestra nombre, IP, tipo de acceso, opción de apertura, estatus y grupo. |
| 3 | Acciones | Editar, enviar reconexión, borrar y subir de nuevo, o eliminar. |

### 9.1 Acciones disponibles

- **Editar:** modifica la información del dispositivo.
- **Enviar reconexión:** reenvía la conexión al dispositivo para restablecer la comunicación.
- **Borrar y subir de nuevo:** elimina y vuelve a cargar la configuración del dispositivo. *Puede tardar algunos minutos.*
- **Eliminar:** borra el registro del sistema.

### 9.2 Nuevo dispositivo BioStar

**Paso 1.** En **Dispositivos BioStar**, presione **Nuevo / Más (+)**.

`[Foto: nuevo dispositivo BioStar]`

**Ilustración 7.** Nuevo dispositivo BioStar

**Paso 2.** Capture o seleccione:

| Campo | Obligatorio | Descripción |
| --- | --- | --- |
| Nombre \* | Sí | Nombre del dispositivo. |
| Dirección IP \* | Sí | IP del dispositivo. |
| Puerto \* | Sí | Puerto de comunicación. |
| Grupo \* | Sí | Grupo de dispositivos al que pertenece (con opción **+ Grupo**). |
| Tipo de acceso \* | Sí | Entrada, salida o ambos. |
| Acceso \* | Sí | Acceso de RE vinculado. |
| Abrir puerta BioStar por este acceso | No | Define si el acceso abrirá una puerta asociada. |
| Puerta destino | Según el caso | Puerta a abrir (cuando la apertura está habilitada). |

**Paso 3.** Presione **Guardar** (o **Cancelar**). El dispositivo queda disponible para las funciones de acceso.

## 10. Grupos de BioStar

La sección **Grupos de BioStar** organiza la información en tres categorías: **grupos de usuarios**, **grupos de dispositivos** y **grupos de puertas**. Los grupos se usan después para relacionar la información en puertas, niveles y permisos.

### 10.1 Grupos de usuarios

**Grupos de Usuarios** (`/biostarar/grupos`) permite consultar y administrar los grupos de usuarios de BioStar.

`[Foto: grupos de usuarios]`

**Ilustración 8.** Grupos de usuarios

- La tabla muestra el **nombre del grupo** y la **cantidad de usuarios** asociados.
- Para crear uno, presione **Nuevo grupo**, capture el **nombre del grupo** y **Guarde**.

### 10.2 Grupos de dispositivos

**Grupos de Dispositivos** (`/biostarar/grupos-dispositivos`) organiza los dispositivos para facilitar su administración.

`[Foto: grupos de dispositivos]`

**Ilustración 9.** Grupos de dispositivos

- La tabla muestra el **nombre del grupo** y el **nivel** asociado.
- Para crear uno, presione **Nuevo grupo de dispositivos**, capture el **nombre** y **Guarde**.

### 10.3 Grupos de puertas

**Grupos de Puertas** (`/biostarar/puertas`) organiza las puertas para su uso en otras configuraciones.

`[Foto: grupos de puertas]`

**Ilustración 10.** Grupos de puertas

- La tabla muestra el **nombre del grupo** y el **nivel** asociado.
- Para crear uno, presione **Nuevo grupo de puertas**, capture el **nombre** y **Guarde**.

## 11. Puertas BioStar

La sección **Puertas de Acceso** (`/biostarar/puertas-acceso`) permite consultar y administrar las puertas, vinculando cada puerta a un dispositivo con su relé, botón de salida y sensor.

`[Foto: Puertas BioStar]`

**Ilustración 11.** Puertas BioStar

| N. | Campo | Descripción |
| --- | --- | --- |
| 1 | Tabla de puertas | Muestra nombre, grupo, dispositivo asignado, relé, botón de salida y sensor. |
| 2 | Nueva puerta | Abre el formulario de alta. |
| 3 | Acciones | Editar o eliminar una puerta. |

> **Nota:** Para registrar una puerta, deben existir previamente **grupos de puertas** y **dispositivos BioStar**; si no existen, no podrán seleccionarse.

### 11.1 Nueva puerta BioStar

**Paso 1.** Presione **Nuevo / Más (+)**.

`[Foto: nueva puerta BioStar]`

**Ilustración 12.** Nueva puerta BioStar

**Paso 2.** Capture o seleccione:

| Campo | Obligatorio | Descripción |
| --- | --- | --- |
| Nombre \* | Sí | Nombre de la puerta para identificarla. |
| Grupo de puertas \* | Sí | Grupo al que pertenece (con opción **+ Grupo**). |
| Dispositivo asignado \* | Sí | Dispositivo BioStar relacionado. |
| Relé de puerta \* | Sí | Relé del dispositivo. |
| Botón de salida | No | Entrada del botón de salida. |
| Sensor de puerta | No | Entrada del sensor. |

**Paso 3.** Presione **Guardar** (o **Cancelar**).

## 12. Horarios BioStar

La sección **Horarios BioStar** (`/biostarar/horarios`) permite administrar los rangos de días y horas de acceso. Los horarios se usan después en los **niveles de acceso**.

`[Foto: Horarios BioStar]`

**Ilustración 13.** Horarios BioStar

| N. | Campo | Descripción |
| --- | --- | --- |
| 1 | Tabla de horarios | Muestra nombre, descripción y si repite cada semana. |
| 2 | Nuevo horario | Abre el formulario de alta. |
| 3 | Acciones | Editar o eliminar un horario. |

### 12.1 Nuevo horario BioStar

**Paso 1.** Presione **Nuevo / Más (+)**.

`[Foto: nuevo horario BioStar]`

**Ilustración 14.** Nuevo horario BioStar

**Paso 2.** Capture:

| Campo | Obligatorio | Descripción |
| --- | --- | --- |
| Nombre \* | Sí | Nombre del horario. |
| Descripción | No | Breve descripción. |
| Configuración de horario | Sí | Hora de **inicio** y **fin** por día. La opción **Aplicar a días activos** copia el mismo rango a los días seleccionados. |
| Repetir cada semana | No | Indica que el horario se repite semanalmente. |

**Paso 3.** Presione **Guardar** (o **Cancelar**). El horario queda disponible para los niveles de acceso.

## 13. Niveles de Acceso

La sección **Niveles de Acceso** (`/biostarar/access-levels`) define la relación entre **puertas** y **horarios** mediante **reglas**.

`[Foto: niveles de acceso]`

**Ilustración 15.** Niveles de acceso

| N. | Campo | Descripción |
| --- | --- | --- |
| 1 | Tabla de niveles | Muestra el nombre y la cantidad de reglas. |
| 2 | Nuevo nivel | Abre el formulario de alta. |
| 3 | Acciones | Editar o eliminar un nivel. |

> **Nota:** Para crear un nivel deben existir previamente **puertas** y **horarios**.

### 13.1 Nuevo nivel de acceso

**Paso 1.** Presione **Nuevo / Más (+)**.

`[Foto: nuevo nivel de acceso]`

**Ilustración 16.** Nuevo nivel de acceso

**Paso 2.** Capture:

| Campo | Obligatorio | Descripción |
| --- | --- | --- |
| Nombre del nivel \* | Sí | Nombre asignado al nivel de acceso. |
| Regla (Puerta + Horario) \* | Sí | Cada regla relaciona una **puerta** con un **horario**. |
| Agregar regla | No | Permite incorporar más reglas puerta–horario. |

**Paso 3.** Presione **Guardar** (o **Cancelar**).

## 14. Permisos de Acceso

La sección **Permisos de Acceso** (`/biostarar/permisos-acceso`) integra los elementos configurados —**niveles de acceso**, **grupos de usuarios** y **usuarios**— para definir accesos completos.

`[Foto: permisos de acceso]`

**Ilustración 17.** Permisos de acceso

| N. | Campo | Descripción |
| --- | --- | --- |
| 1 | Barra superior | Actualizar, nuevo permiso, exportar y buscar. |
| 2 | Tabla de permisos | Muestra nombre, descripción y cantidad de niveles, grupos y usuarios. |
| 3 | Acciones | Editar o eliminar un permiso. |

> **Nota:** Para crear un permiso deben existir previamente **niveles de acceso**, **grupos de usuarios** y **usuarios** de BioStar.

### 14.1 Nuevo permiso de acceso

**Paso 1.** Presione **Nuevo / Más (+)**.

`[Foto: nuevo permiso de acceso]`

**Ilustración 18.** Nuevo permiso de acceso

**Paso 2.** Capture y seleccione:

| Campo | Obligatorio | Descripción |
| --- | --- | --- |
| Nombre \* | Sí | Nombre del permiso. |
| Descripción | No | Descripción del permiso. |
| Niveles de acceso \* | Sí | Niveles previamente creados. |
| Grupos de usuarios \* | Sí | Grupos previamente creados. |
| Usuarios | Según el caso | Usuarios existentes en BioStar. |

**Paso 3.** Presione **Guardar** (o **Cancelar**).

## 15. Apertura de puerta por evento (operación diaria)

`[Foto: apertura de puerta al validar un acceso]`

**Ilustración 19.** Apertura de puerta al validar un acceso

- La apertura ocurre **automáticamente** cuando un visitante o empleado **valida su acceso** en RE (por ejemplo, por QR).
- En **modo pulso**, la puerta se **cierra sola** tras el tiempo configurado; en **modo manual**, permanece abierta hasta que un usuario autorizado ejecute el **cierre manual**.

## 16. Flujo general recomendado

Aunque cada sección puede consultarse por separado, se recomienda seguir este orden para que la información necesaria ya exista al crear nuevas configuraciones:

1. **Conexión** → registrar y probar; definir el principal.
2. **Dispositivos BioStar** → consultar/registrar.
3. **Grupos de BioStar** → usuarios, dispositivos y puertas.
4. **Puertas BioStar** → asociar a dispositivos y grupos.
5. **Horarios BioStar** → crear los rangos.
6. **Niveles de Acceso** → relacionar puertas y horarios.
7. **Permisos de Acceso** → integrar niveles, grupos y usuarios.

![Flujo de configuración de BioStar](img/biostar-flujo.svg)

**Diagrama 1.** Orden recomendado de configuración de BioStar y la operación de apertura por evento.

## 17. Preguntas o incidencias comunes

**1. No aparece la sección BioStar**
*Acción:* verifique que el interruptor esté encendido en Configuración y que su rol sea **Super Admin**.

**2. "No se pudo consultar" al entrar a una sección**
*Acción:* registre y **pruebe la conexión** en la sección Conexión; el módulo requiere una conexión válida.

**3. La prueba de conexión falla**
*Acción:* revise IP, puerto, usuario y contraseña, y la disponibilidad del servidor BioStar.

**4. No puedo crear un nivel o un permiso**
*Acción:* faltan registros previos (puertas/horarios para niveles; niveles/grupos/usuarios para permisos). Créelos primero.

**5. La puerta no abre al validar un acceso**
*Acción:* confirme que el dispositivo tenga **apertura habilitada**, la **puerta destino** configurada y una conexión activa.

**6. Los tablets no pueden entrar**
*Acción:* al **apagar** la integración se desactivan los usuarios rol **Tablet**; vuelva a encenderla y revise su estado.

**7. "Borrar y subir de nuevo" tarda**
*Acción:* es normal; el sistema **recarga** la configuración del dispositivo.

## 18. Glosario

**BioStar.** Plataforma de control de acceso con la que se integra RE para administrar dispositivos, puertas, horarios, niveles y permisos.

**Conexión principal (Main).** Dispositivo/conexión definido como principal; se usa como referencia para las operaciones del módulo.

**Dispositivo BioStar.** Equipo registrado para funciones de acceso o validación.

**Enviar reconexión.** Acción para reenviar la conexión y restablecer la comunicación con un dispositivo.

**Grupo de usuarios / dispositivos / puertas.** Conjuntos que organizan usuarios, dispositivos o puertas para relacionarlos en otras configuraciones.

**Horario BioStar.** Configuración de días y horas permitidas; se usa en los niveles de acceso.

**Nivel de acceso.** Relación de puertas y horarios (reglas) que define condiciones de acceso.

**Permiso de acceso.** Integra niveles de acceso, grupos de usuarios y usuarios para definir accesos permitidos.

**Puerta BioStar.** Registro de un acceso físico con dispositivo, relé, botón de salida y sensor.

**Modo pulso / manual.** Pulso: la puerta se cierra automáticamente tras un tiempo. Manual: permanece abierta hasta una orden de cierre.

## 19. Control documental

| Documento | Código | Versión | Fecha | Responsable | Estado |
| --- | --- | --- | --- | --- | --- |
| Manual de Usuario — BioStar | INT-002-MU | 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Vigente |

**Documentos relacionados:** INT-002-DF (Documento Funcional), MU-RE-001, MA-RE-001, MI-RE-001.

---

**Fin del documento.**
