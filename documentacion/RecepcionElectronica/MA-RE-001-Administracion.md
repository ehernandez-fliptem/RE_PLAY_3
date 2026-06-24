# Manual de Administración

## Recepción Electrónica (RE) — Base

Versión 1.0

---

| Campo | Descripción |
| --- | --- |
| Tipo de documento | Manual de Administración |
| Código | MA-RE-001 |
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
| 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Versión inicial del manual de administración de la base. |

---

## Contenido

1. Introducción
2. Perfil y responsabilidades del administrador
3. Configuración inicial (primer arranque)
4. Roles del sistema
5. Permisos y visibilidad
   - 5.1 Cómo funcionan los permisos
   - 5.2 Roles personalizados
6. Configuración general
   - 6.1 Parámetros generales
   - 6.2 Configuración de correo
   - 6.3 Tiempos y automatizaciones
   - 6.4 Documentos requeridos
7. Activación de módulos opcionales
8. Administración de catálogos
9. Gestión de usuarios
   - 9.1 Alta y edición
   - 9.2 Desbloqueo de cuentas
   - 9.3 Inactivar vs. Eliminar
10. Gestión de visitantes y empleados
11. Seguridad de la operación (ISO)
12. Respaldos y continuidad
13. Operación y monitoreo
14. Lista de verificación del administrador
15. Preguntas o incidencias comunes
16. Control documental

---

## Contenido de imágenes

- Ilustración 1. Flujo de configuración inicial
- Ilustración 2. Configuración general
- Ilustración 3. Permisos por rol
- Ilustración 4. Creación de rol personalizado
- Ilustración 5. Configuración de correo
- Ilustración 6. Activación de módulos
- Ilustración 7. Administración de catálogos
- Ilustración 8. Gestión de usuarios (desbloqueo)

---

## 1. Introducción

Este manual está dirigido a la persona responsable de **administrar** el sistema de **Recepción Electrónica (RE)**. Describe cómo configurar el sistema, administrar roles y permisos, gestionar usuarios y catálogos, activar módulos opcionales y mantener una operación segura y continua.

A diferencia del Manual de Usuario (MU-RE-001), que explica la operación diaria, este documento se concentra en las tareas de **configuración y gobierno** del sistema, que normalmente realiza el rol **Administrador**.

**Nota.**

- Algunas tareas de configuración requieren el rol **Administrador** y, en ciertos casos, condición de **usuario maestro (root)** del sistema.
- Este manual cubre la **base** de RE. Los módulos opcionales (integraciones) se administran según se describe en sus propios documentos.

## 2. Perfil y responsabilidades del administrador

El administrador es responsable de:

- Realizar la **configuración inicial** y mantener los **parámetros generales** del sistema.
- Crear y mantener **usuarios**, asignar **roles** y **permisos**, y **desbloquear** cuentas.
- Mantener actualizados los **catálogos** base.
- **Activar o desactivar** los módulos opcionales contratados.
- Velar por la **seguridad** (mínimo privilegio, revisión de accesos, protección de datos).
- Asegurar los **respaldos** y la **continuidad** de la operación.

## 3. Configuración inicial (primer arranque)

La primera vez que se inicia el sistema se muestra el flujo de **configuración inicial**, que permite crear los datos mínimos para operar: **empresa**, **piso**, **acceso**, **usuario administrador** y la **configuración general**. Una vez completado, este flujo no vuelve a mostrarse.

`[Foto: flujo de configuración inicial — Ilustración 1]`

| Paso | Acción | Resultado |
| --- | --- | --- |
| 1 | Capturar los datos del **administrador** (nombre, correo, contraseña). | Se crea la primera cuenta administradora. |
| 2 | Definir **empresa, piso y acceso** base. | El sistema queda con los catálogos mínimos para registrar visitas. |
| 3 | Establecer la **configuración general**. | El sistema queda listo para operar. |

> **Recomendación:** Use una contraseña robusta para el administrador (mínimo 8 caracteres con mayúscula, minúscula, número y símbolo) y resguarde estas credenciales.

## 4. Roles del sistema

El sistema define varios roles base. Cada uno determina las funciones y módulos disponibles.

| Rol | Nombre | Descripción funcional |
| --- | --- | --- |
| 1 | Administrador | Acceso administrativo amplio. Algunas rutas críticas requieren además condición de usuario maestro (root). |
| 2 | Recepción | Operación de empleados, visitantes, registros, eventos y catálogos. |
| 4 | Interno | Usuario anfitrión; opera las visitas asociadas a su persona. |
| 5 | Reportes | Reportes, eventos, kiosco y visitantes (principalmente consulta). |
| 10 | Visitante | Acceso a su perfil, documentos y QR propio. |
| 13 | Tablet | Kiosco, visitantes, eventos y escáner QR. |
| ≥ 100 | Personalizado | Roles definidos por el administrador con visibilidad configurable. |

> Otros roles asociados a **módulos opcionales** (por ejemplo, empleado de campo o contratista) se describen en los documentos de integración correspondientes; no forman parte de la base.

**Roles asociados a módulos opcionales comunes:**

| Rol | Uso | Condición |
| --- | --- | --- |
| 11 | Portal Contratistas | Visible cuando el módulo de Contratistas está habilitado. |
| 12 | Registro Campo | Visible cuando Registro Campo está habilitado. |
| 13 | Tablet / QR | Su visibilidad puede depender de la configuración de integración y permisos. |

> Si un módulo opcional se desactiva, sus roles, pantallas o accesos pueden quedar ocultos aunque el usuario conserve el rol en su cuenta.

## 5. Permisos y visibilidad

### 5.1 Cómo funcionan los permisos

La visibilidad de cada módulo y acción se determina por la combinación de:

- El **rol** asignado al usuario.
- La **configuración de permisos** por rol.
- Las **banderas de configuración** que activan o desactivan módulos.

De forma complementaria, las **rutas críticas** de configuración requieren condición de **usuario maestro (root)**, como medida adicional de seguridad.

> **Principio de mínimo privilegio:** asigne a cada usuario únicamente el rol y los accesos que necesita para su función (alineado con PSI.05).

### 5.2 Roles personalizados

Desde **Configuración** se pueden **crear** y **eliminar** roles personalizados (numeración ≥ 100), definiendo qué **módulos** son visibles para cada uno. Esto permite ajustar el sistema a estructuras organizacionales específicas sin alterar los roles base.

`[Foto: creación de rol personalizado — Ilustración 4]`

**Cómo crear un rol personalizado:**

1. Ingrese a **Configuración → Permisos / Roles**.
2. Cree un nuevo rol y asígnele un **nombre**.
3. Seleccione los **módulos visibles** para ese rol.
4. **Guarde**. El rol queda disponible para asignarse a usuarios.

**Reglas de administración de roles personalizados:**

- Use nombres claros, asociados a una función real del cliente.
- Revise que el rol no otorgue más módulos de los necesarios.
- Antes de eliminar un rol personalizado, verifique que no esté asignado a usuarios activos.
- Si el rol depende de una integración opcional, confirme que dicha integración esté habilitada.

## 6. Configuración general

Desde **Configuración** (rol Administrador, con condición root para parámetros críticos) se administra el comportamiento global del sistema.

`[Foto: configuración general — Ilustración 2]`

### 6.1 Parámetros generales

| Parámetro | Descripción |
| --- | --- |
| Nombre de la aplicación | Texto que identifica a la instalación. |
| Logo general | Imagen usada en la pantalla de acceso y comunicaciones donde aplique. |
| Tema visual | Apariencia/colores del sistema. |
| Zona horaria | Define la hora de los registros y reportes. |

### 6.2 Configuración de correo

El correo es necesario para enviar invitaciones, ligas de registro, códigos de recuperación y notificaciones. Si los correos **no se envían**, revise esta configuración.

`[Foto: configuración de correo — Ilustración 5]`

**Elementos que debe validar el administrador:**

- Cuenta o cuentas de correo configuradas.
- Cuenta asignada al flujo de visitantes.
- Asunto y plantilla del correo de visitantes.
- Logo o imagen que se incluirá en las comunicaciones, cuando aplique.
- Pruebas de envío después de modificar credenciales o plantillas.

> **Nota de seguridad:** No comparta ni exponga las credenciales de la cuenta de correo. Resguárdelas junto con el resto de los secretos del sistema.

### 6.3 Tiempos y automatizaciones

| Parámetro | Descripción |
| --- | --- |
| Auto-cancelación de registros | Tiempo tras el cual una visita no atendida puede cancelarse automáticamente. |
| Vigencia de sesión | La sesión expira de forma predeterminada a los **7 días**. |
| Bloqueo por intentos | La cuenta se bloquea (predeterminado **30 minutos**) tras varios intentos fallidos. |

### 6.4 Documentos requeridos

Permite definir qué **documentos** deben confirmarse para los visitantes (por ejemplo, identificación oficial u otros), de acuerdo con la política del sitio.

**Buenas prácticas:**

- Active solo documentos realmente necesarios para la operación.
- Separe documentos obligatorios y opcionales según el riesgo del sitio.
- Revise periódicamente los documentos personalizados para evitar requisitos obsoletos.
- Cuando use módulos de contratistas o visitantes avanzado, valide la configuración documental en el documento de integración correspondiente.

## 7. Activación de módulos opcionales

El sistema base puede ampliarse con **módulos opcionales** (integraciones). Su activación se controla mediante:

- **Banderas de configuración** (`habilitar…`) que encienden o apagan cada módulo.
- La **lista de módulos visibles por cliente** y su **modo de visibilidad** (para todos o por cliente).

`[Foto: activación de módulos — Ilustración 6]`

| Acción | Efecto |
| --- | --- |
| Activar un módulo | Sus pantallas y acciones se vuelven visibles para los roles correspondientes. |
| Desactivar un módulo | Sus pantallas dejan de mostrarse; la base sigue operando con normalidad. |

**Módulos opcionales administrables desde Configuración:**

| Módulo | Efecto administrativo |
| --- | --- |
| Visitantes Avanzado | Habilita campos/documentos adicionales de visitantes. |
| Vehículo de visitantes | Permite capturar datos de vehículo cuando Visitantes Avanzado está activo. |
| Contratistas | Habilita alta de contratistas, portal y solicitudes asociadas. |
| Registro Campo | Habilita la operación de registros de campo y su rol asociado. |
| Capacitaciones | Habilita la gestión y publicación de capacitaciones. |
| Hikvision / biometría | Habilita pantallas y flujos de dispositivos Hikvision, según integración. |
| BioStar | Habilita conexión, dispositivos, puertas, grupos y permisos BioStar. |
| Cámaras | Habilita administración de cámaras y evidencias asociadas. |

> Cada módulo opcional cuenta con su **propio documento de integración**, que detalla su configuración y operación. Este manual solo cubre **cómo se activan** desde la base.

## 8. Administración de catálogos

Mantenga actualizados los catálogos base, ya que son **requeridos** por otros procesos (registro de visitas, asignación de accesos, etc.):

**empresas, pisos, accesos, puestos, departamentos, cubículos, horarios y pases.**

`[Foto: administración de catálogos — Ilustración 7]`

Cada catálogo permite **crear, editar y Activar/Inactivar**. 

> **Recomendación:** En lugar de **Eliminar** un elemento que está en uso, **Inactívelo**. Inactivar lo retira de las nuevas capturas sin afectar la información que ya lo referencia. Eliminar puede no ser recuperable desde la operación normal.

**Criterios de administración:**

- Mantenga nombres claros y únicos para evitar errores de selección.
- Revise empresas, accesos y pisos antes de iniciar operación en un nuevo sitio.
- Inactive catálogos que ya no se usen, en vez de eliminarlos.
- Documente cambios relevantes cuando afecten accesos, reportes o asignaciones.

## 9. Gestión de usuarios

`[Foto: gestión de usuarios — desbloqueo — Ilustración 8]`

### 9.1 Alta y edición

- Cree usuarios capturando nombre, apellido paterno, **correo único**, **contraseña robusta** (mínimo 8 caracteres con mayúscula, minúscula, número y símbolo), **rol** y **empresa**.
- Al **editar**, puede cambiar el rol y los permisos; el cambio surte efecto de inmediato.
- Verifique que la empresa, accesos y datos de contacto correspondan a la operación real del usuario.
- Si el usuario operará tablet, kiosco, QR o módulos opcionales, valide que el rol y el módulo estén habilitados.

### 9.2 Desbloqueo de cuentas

Cuando un usuario supera el número de intentos fallidos, su cuenta se **bloquea** temporalmente. El administrador puede **desbloquearla** desde la acción correspondiente en el listado de usuarios, sin necesidad de esperar el tiempo de bloqueo.

### 9.3 Inactivar vs. Eliminar

| Acción | Cuándo usarla | Efecto |
| --- | --- | --- |
| **Inactivar** | Para retirar el acceso de un usuario conservando su cuenta e historial. | Se oculta de las listas activas; reversible con **Activar**. |
| **Eliminar** | Solo cuando la cuenta no debe existir. | Desaparece de todas las listas; **no recuperable** por el usuario desde el sistema. |

> **Protección de datos:** Aplique minimización/anonimización cuando corresponda, conforme a la política de protección de datos (Control 8.11). No conserve datos personales más allá de lo necesario.

## 10. Gestión de visitantes y empleados

- **Visitantes:** el administrador y recepción pueden registrar, verificar, bloquear/desbloquear, generar QR y cambiar el estado de los visitantes (ver MU-RE-001).
- **Empleados:** administre altas, accesos, horarios y QR; utilice la **carga masiva** para registrar varios a la vez.
- **Directorio:** valide que los empleados activos tengan datos completos de contacto, área y ubicación, ya que esta información se consulta desde recepción.
- Para dar de baja, prefiera **Inactivar** sobre **Eliminar** (conserva historial).

## 11. Seguridad de la operación (ISO)

| Control | Acción del administrador | Referencia |
| --- | --- | --- |
| Mínimo privilegio | Asignar solo el rol y los accesos necesarios. | PSI.05 |
| Revisión de accesos | Revisar periódicamente usuarios activos/inactivos y sus permisos. | PSI.05 |
| Protección de datos | Aplicar minimización/anonimización cuando corresponda. | Control 8.11 |
| Trazabilidad | Conservar la bitácora de cambios relevantes. | PSI.12 |
| Gestión de secretos | No exponer archivos de configuración (`.env`) ni certificados. | PSI.12 |
| Contraseñas | Exigir contraseñas robustas; promover su cambio periódico. | PSI.05 |

> **Importante:** Las evidencias, capturas y reportes que se compartan **no deben exponer** datos sensibles (contraseñas, tokens, identificadores de sesión, direcciones IP ni datos personales innecesarios).

## 12. Respaldos y continuidad

- Realice **respaldos periódicos** de la base de datos.
- Resguarde los **archivos de configuración** y **certificados** en un lugar seguro.
- Registre **fecha y responsable** de cada respaldo.
- Verifique de forma periódica que los respaldos puedan **restaurarse**.

> Un respaldo no probado no es un respaldo confiable: valide ocasionalmente la restauración en un entorno controlado.

## 13. Operación y monitoreo

- El sistema mantiene una **bitácora técnica** de la operación que permite revisar la actividad.
- Supervise que los servicios estén **en ejecución** y revise los registros ante cualquier incidencia.
- Ante un comportamiento anómalo, consulte el Manual Técnico (MT-RE-001) o contacte al área de desarrollo/soporte.

> El detalle técnico de procesos, servicios y registros se documenta en **MT-RE-001 (Manual Técnico)** y **MI-RE-001 (Instalación/Despliegue)**.

## 14. Lista de verificación del administrador

| Periodicidad | Tarea |
| --- | --- |
| Diaria | Verificar que el sistema esté operativo y que se envíen los correos. |
| Semanal | Revisar usuarios nuevos, bloqueos y cuentas inactivas. |
| Mensual | Revisar permisos por rol y accesos; depurar catálogos en desuso (Inactivar). |
| Mensual | Verificar respaldos y probar una restauración. |
| Según cambios | Actualizar parámetros, módulos y roles personalizados. |

## 15. Preguntas o incidencias comunes

**1. No se envían los correos (invitaciones, recuperación, notificaciones)**
*Acción:* revise la **configuración de correo** (sección 6.2) y confirme que esté completa.

**2. Un usuario no puede entrar y dice estar bloqueado**
*Acción:* verifique en el listado de usuarios; si está bloqueado por intentos fallidos, use **Desbloquear** (sección 9.2).

**3. Un usuario ve módulos que no debería (o no ve los que necesita)**
*Acción:* revise el **rol** y la **configuración de permisos** del usuario (sección 5).

**4. Necesito un perfil que no existe entre los roles base**
*Acción:* cree un **rol personalizado** y defina sus módulos visibles (sección 5.2).

**5. Eliminé un registro por error**
*Acción:* la eliminación no es recuperable desde la operación normal; contacte al área de desarrollo/soporte lo antes posible. Para evitarlo, prefiera **Inactivar**.

**6. Quiero activar un módulo opcional contratado**
*Acción:* actívelo desde **Configuración** (sección 7) y consulte el documento de integración correspondiente.

## 16. Control documental

| Documento | Código | Versión | Fecha | Responsable | Estado |
| --- | --- | --- | --- | --- | --- |
| Manual de Administración — RE | MA-RE-001 | 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Vigente |

**Documentos relacionados:** DF-RE-001 (Funcional), MU-RE-001 (Manual de Usuario), MT-RE-001 (Técnico), MI-RE-001 (Instalación).

---

**Fin del documento.**
