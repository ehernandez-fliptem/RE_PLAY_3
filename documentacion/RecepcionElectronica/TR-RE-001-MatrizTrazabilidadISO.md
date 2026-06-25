# Matriz de Trazabilidad ISO

## Recepción Electrónica (RE) — Base

Versión 1.0

---

| Campo | Descripción |
| --- | --- |
| Tipo de documento | Matriz de trazabilidad ISO |
| Código | TR-RE-001 |
| Producto | Recepción Electrónica (RE) |
| Versión | 1.0 |
| Fecha | 2026-06-24 |
| Responsable | Área de Sistemas / Desarrollo |
| Clasificación | Uso interno |
| Estado | Vigente |

---

## Control de versiones

| Versión | Fecha | Autor | Descripción |
| --- | --- | --- | --- |
| 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Versión inicial de la matriz de trazabilidad ISO. |

---

## Contenido

1. Objetivo
2. Alcance
3. Documentos de referencia
4. Cómo leer esta matriz
5. Matriz de trazabilidad
   - 5.1 PSI.05 — Control de accesos
   - 5.2 PSI.05 — Enmascaramiento y protección de datos
   - 5.3 PSI.12 — Desarrollo seguro
   - 5.4 PSI.01 — Requisitos de seguridad en los proyectos
6. Resumen de alineación
7. Acciones de control y seguimiento
8. Conclusión
9. Control documental

---

## Contenido de imágenes

- Ilustración 1. Inicio de sesión (evidencia de autenticación)
- Ilustración 2. Configuración de roles y permisos
- Ilustración 3. Listado de usuarios activos / inactivos (revisión de accesos)
- Ilustración 4. Acción de desbloqueo de cuenta
- Ilustración 5. Restricción de acceso por rol a datos completos
- Ilustración 6. Configuración de documentos requeridos (minimización)
- Ilustración 7. Exportación de reporte (control de datos en PDF/Excel)
- Ilustración 8. Arquitectura del sistema (separación de capas)
- Ilustración 9. Validación de formulario (campos obligatorios en rojo)
- Ilustración 10. Bitácora / control de cambios

> **Nota:** Las imágenes de este documento corresponden a **evidencias documentales** para auditoría. Las capturas no exponen datos sensibles (contraseñas, tokens, identificadores de sesión, direcciones IP ni datos personales reales) y se generan con datos de prueba o datos enmascarados.

---

## 1. Objetivo

El presente documento establece la **trazabilidad** entre los lineamientos de seguridad de la información definidos por la organización —**PSI.01 (Política de Requisitos de Seguridad en los Proyectos)**, **PSI.05 (Política de Control de Accesos, que incluye el enmascaramiento de datos)** y **PSI.12 (Política de Desarrollo Seguro)**— y la forma en que el sistema **Recepción Electrónica (RE)** y su documentación **se alinean** con dichos lineamientos.

Las políticas representan el **“deber ser”** (los requisitos que la organización ha definido), mientras que la documentación funcional, técnica, administrativa y operativa de RE describe el **“cómo se aplica”** en el sistema. Esta matriz sirve como **puente para auditoría**, permitiendo verificar, control por control, dónde se evidencia su aplicación.

> Este documento utiliza un lenguaje de **alineación** (“se alinea”, “soporta”, “contribuye a cumplir”) y **no constituye una declaración de cumplimiento legal o normativo absoluto**. La verificación final corresponde al proceso de auditoría y a la evidencia operativa que se conserve.

## 2. Alcance

- Aplica al sistema **Recepción Electrónica (RE) base** y a sus documentos relacionados (funcional, técnico, administrativo, de base de datos, de API y de pruebas).
- Cubre los controles contenidos en **PSI.01**, **PSI.05** (incluido su apartado de **enmascaramiento de datos**) y **PSI.12**.
- **No** cubre los **módulos opcionales** (integraciones), que se documentan por separado y, cuando se contratan, cuentan con su propia trazabilidad.
- La matriz refleja el estado del sistema y de la documentación a la **fecha** indicada en la portada; su revisión se realiza ante cambios relevantes.

## 3. Documentos de referencia

**Lineamientos (deber ser):**

| Código | Documento | Tema |
| --- | --- | --- |
| PSI.01 | Política de Requisitos de Seguridad en los Proyectos | Medidas de seguridad en la gestión de proyectos (comunicaciones, accesos, software, hardware y respaldos). |
| PSI.05 | Política de Control de Accesos | Gestión de identidades, accesos, roles y privilegios; incluye el **enmascaramiento de datos**. |
| PSI.12 | Política de Desarrollo Seguro | Prácticas seguras de desarrollo, pruebas, separación de ambientes y control de cambios. |

**Documentación del sistema RE (cómo se aplica):**

| Código | Documento |
| --- | --- |
| MU-RE-001 | Manual de Usuario |
| MA-RE-001 | Manual de Administración |
| DF-RE-001 | Documento Funcional |
| MT-RE-001 | Manual Técnico |
| DB-RE-001 | Diccionario de Base de Datos |
| API-RE-001 | Documentación de API |
| PT-RE-001 | Plan / Evidencia de Pruebas |
| MI-RE-001 | Manual de Instalación / Despliegue |
| BC-RE-001 | Bitácora / Control de Cambios |

## 4. Cómo leer esta matriz

Cada control se desglosa en una tabla con las siguientes columnas:

| Columna | Significado |
| --- | --- |
| **Política / Control** | Lineamiento de referencia (PSI.01, PSI.05 o PSI.12). |
| **Requisito o lineamiento** | El requisito específico esperado por la política. |
| **Cómo lo cumple RE** | La capacidad, comportamiento o práctica del sistema que se alinea con el requisito. |
| **Documento RE relacionado** | Dónde está documentado dentro del conjunto RE. |
| **Evidencia / referencia** | Evidencia documental u operativa asociada al control. |

## 5. Matriz de trazabilidad

### 5.1 PSI.05 — Control de accesos

| Política / Control | Requisito o lineamiento | Cómo lo cumple RE | Documento RE relacionado | Evidencia / referencia |
| --- | --- | --- | --- | --- |
| PSI.05 | Autenticación de usuarios | El acceso requiere **correo y contraseña**; el sistema valida credenciales, estado activo de la cuenta y emite una sesión con vigencia limitada. | DF-RE-001 (5.1, 6.1), MU-RE-001 (4.1) | Captura de inicio de sesión (ver Ilustración 1); política de contraseñas. |
| PSI.05 | Identificador y contraseña únicos; prohibición de compartirlos | Cada usuario se identifica con un **correo único**; el sistema rechaza correos duplicados y cada cuenta tiene sus propias credenciales. | DF-RE-001 (6.6), MA-RE-001 (9.1) | Listado de usuarios con correos únicos. |
| PSI.05 | Contraseñas robustas y cambio controlado | El alta de usuario exige **contraseña con combinación de mayúsculas, minúsculas, números y símbolos**. | MU-RE-001 (10.1), DF-RE-001 (6.6) | Configuración/validación de contraseña (ver recomendación 1, sección 7). |
| PSI.05 | Roles y permisos | El sistema maneja **roles** (Administrador, Recepción, Interno, Reportes, Visitante, Tablet y personalizados) que determinan los módulos y acciones visibles. | MA-RE-001 (4, 5), DF-RE-001 (9) | Matriz de roles; configuración de permisos por rol (ver Ilustración 2). |
| PSI.05 | Privilegios mínimos, necesidad de saber y de usar | La visibilidad de módulos y acciones se restringe por rol y configuración de permisos; las rutas críticas exigen condición de **usuario maestro (root)**. | MA-RE-001 (5.1), DF-RE-001 (5.1) | Configuración de permisos; lista de cuentas con privilegios elevados. |
| PSI.05 | Ciclo de vida y baja de cuentas | RE permite **crear, editar, bloquear/desbloquear, activar/inactivar** y dar de baja usuarios; el bloqueo por intentos fallidos es temporal (predeterminado 30 min) y el administrador puede desbloquear. | MA-RE-001 (9), MU-RE-001 (10) | Bitácora de altas/bajas; evidencia de desbloqueos (ver Ilustración 4). |
| PSI.05 | Revisión periódica de accesos de administrador (cada 5 meses) | El sistema distingue usuarios **activos / inactivos** y registra cuentas con privilegios; la revisión cada 5 meses se establece como actividad administrativa. | MA-RE-001 (11, 14) | Reporte/lista de usuarios activos e inactivos por periodo (ver Ilustración 3). |
| PSI.05 | Doble factor / MFA cuando la tecnología lo permita | El acceso base es por contraseña; el MFA se considera **cuando la tecnología lo permita** (ver recomendación 2, sección 7). | DF-RE-001 (5.1) | Configuración de autenticación. |
| PSI.05 | Restricción de acceso a módulos y reportes | Cada módulo (incluidos **Reportes**) se muestra según el rol; las exportaciones respetan los permisos del usuario. | DF-RE-001 (6.7–6.9), MU-RE-001 (13) | Pruebas de visibilidad por rol; revisión de exportaciones. |
| PSI.05 | Expiración de sesión | La sesión tiene **vigencia limitada** (predeterminado 7 días) y el sistema valida periódicamente su validez, cerrando sesión y solicitando reautenticación al expirar. | DF-RE-001 (5.1), MU-RE-001 (4.3) | Configuración de tiempos de sesión. |
| PSI.05 | Trazabilidad de acciones relevantes | El sistema conserva registro de la operación (por ejemplo, eventos de acceso y bitácora técnica) que soporta la trazabilidad. | MT-RE-001, DF-RE-001 (6.7), PT-RE-001 | Muestra de bitácora; eventos de acceso. |

**Evidencias documentales para PSI.05 (control de accesos):**

`[Foto: pantalla de inicio de sesión]`

**Ilustración 1.** Inicio de sesión (evidencia de autenticación)

`[Foto: configuración de roles y permisos por rol]`

**Ilustración 2.** Configuración de roles y permisos

`[Foto: listado de usuarios con filtro Activos/Inactivos]`

**Ilustración 3.** Listado de usuarios activos / inactivos (revisión de accesos)

`[Foto: acción de desbloqueo de una cuenta]`

**Ilustración 4.** Acción de desbloqueo de cuenta

### 5.2 PSI.05 — Enmascaramiento y protección de datos

> El apartado de **enmascaramiento de datos** forma parte de la política **PSI.05**. RE aplica estos lineamientos sobre los datos personales que administra.

| Política / Control | Requisito o lineamiento | Cómo lo cumple RE | Documento RE relacionado | Evidencia / referencia |
| --- | --- | --- | --- | --- |
| PSI.05 | Minimización de datos personales | RE captura únicamente los datos necesarios para la operación (identificación, contacto, documentos según configuración) y permite definir qué documentos se solicitan. | DF-RE-001 (6.2, 6.3), MA-RE-001 (6.4) | Definición de campos y documentos requeridos (ver Ilustración 6). |
| PSI.05 | Acceso restringido a datos completos | El acceso a la información detallada (visitantes, empleados, documentos) está condicionado por rol y permisos. | MA-RE-001 (5), DF-RE-001 (9) | Pruebas de acceso por rol a datos completos (ver Ilustración 5). |
| PSI.05 | Protección de documentos, fotografías e identificaciones | Las imágenes y documentos asociados a visitantes/empleados se tratan como datos personales y su acceso se restringe por rol. | DF-RE-001 (6.2), DB-RE-001 | Revisión de permisos sobre documentos. |
| PSI.05 | Anonimización de empleados dados de baja (física, no lógica) | RE cuenta con la acción de **anonimizar**, que sobrescribe los datos personales —**correo, nombre y teléfono**— como parte de la baja del empleado, para evitar su identificación y recuperación. | MA-RE-001 (9.3, 10), DF-RE-001 (5.2), API-RE-001 | Evidencia de anonimización en la baja de un empleado. |
| PSI.05 | Contraseñas almacenadas de forma cifrada | Las contraseñas del Sistema de Recepción Electrónica se almacenan **cifradas/encriptadas**, de modo que ante una vulneración de la base de datos no se divulguen. | MT-RE-001, API-RE-001 | Revisión del manejo de credenciales. |
| PSI.05 | Cuidado con exportaciones (PDF/Excel) | Las exportaciones respetan los permisos del usuario; la documentación establece que no deben incluirse ni compartirse datos personales innecesarios. | MU-RE-001 (13), MA-RE-001 (11) | Lineamiento de exportaciones; revisión de reportes compartidos (ver Ilustración 7). |
| PSI.05 | Registros (logs) sin datos sensibles completos | La bitácora técnica está orientada a la trazabilidad de la operación y **no debe** almacenar contraseñas, tokens ni datos personales completos. | MT-RE-001, PT-RE-001 | Muestra de logs verificando ausencia de datos sensibles. |

**Evidencias documentales para PSI.05 (enmascaramiento):**

`[Foto: restricción de acceso por rol a datos completos]`

**Ilustración 5.** Restricción de acceso por rol a datos completos

`[Foto: configuración de documentos requeridos (minimización)]`

**Ilustración 6.** Configuración de documentos requeridos (minimización)

`[Foto: exportación de reporte mostrando solo datos necesarios]`

**Ilustración 7.** Exportación de reporte (control de datos en PDF/Excel)

### 5.3 PSI.12 — Desarrollo seguro

| Política / Control | Requisito o lineamiento | Cómo lo cumple RE | Documento RE relacionado | Evidencia / referencia |
| --- | --- | --- | --- | --- |
| PSI.12 | Requerimientos de seguridad en el documento funcional | Los requisitos de seguridad del sistema se definen y documentan junto con su funcionalidad. | DF-RE-001 (5), DR-RE-001 (8) | Sección de seguridad del documento funcional/requerimientos. |
| PSI.12 | Separación de capas (frontend / backend / base de datos) | RE está construido con **frontend, backend y base de datos** separados, con responsabilidades definidas. | MT-RE-001, DF-RE-001 (1) | Arquitectura del Manual Técnico (ver Ilustración 8). |
| PSI.12 | Uso de variables de entorno | La configuración sensible se gestiona mediante **variables de entorno**, sin incluir valores reales en la documentación. | MT-RE-001, MI-RE-001 | Lista de variables (por nombre, sin valores). |
| PSI.12 | Validación de entradas en cliente y servidor (sintáctica y semántica) | RE valida los datos de entrada tanto en los **formularios** (campos obligatorios, formato, unicidad, resaltado en rojo) como en las **APIs**. | DF-RE-001 (5.3), MU-RE-001 (6.1, 10.1), API-RE-001 | Casos de validación en PT-RE-001 (ver Ilustración 9). |
| PSI.12 | Manejo controlado de errores | El sistema gestiona los errores de forma controlada (mensajes de validación, estados HTTP), sin filtrar información técnica sensible. | API-RE-001, DF-RE-001 (5.3) | Pruebas de manejo de errores. |
| PSI.12 | Bitácoras asociadas a usuarios | El sistema registra operaciones y eventos que pueden asociarse a los usuarios que las ejecutan. | MT-RE-001, DF-RE-001 (6.7) | Muestra de bitácora con usuario y operación. |
| PSI.12 | Control de cambios y control de versiones | Los cambios se registran y la documentación se versiona; el control de cambios se alinea con la política de gestión del cambio. | BC-RE-001, todos los documentos (control documental) | Bitácora de cambios; historial de versiones (ver Ilustración 10). |
| PSI.12 | Separación de ambientes y datos de prueba | La configuración por variables de entorno permite **separar ambientes**; las pruebas no deben usar datos reales de producción. | MI-RE-001, MT-RE-001, PT-RE-001 | Configuración por ambiente; set de datos de prueba. |
| PSI.12 | Pruebas funcionales, de seguridad y de aceptación | Existe un **plan/evidencia de pruebas** que cubre escenarios funcionales y de control de acceso. | PT-RE-001 | Resultados de pruebas por versión. |
| PSI.12 | Pruebas de seguridad (SAST/DAST, OWASP) | Las prácticas de seguridad se apoyan en estándares **OWASP Top 10** y **API Security Top 10**, con análisis estático/dinámico cuando aplique. | PT-RE-001, MT-RE-001 | Reporte de análisis de seguridad. |
| PSI.12 | Protección de credenciales y datos confidenciales | Las contraseñas se almacenan cifradas y la información sensible se protege; los secretos se mantienen fuera del código fuente. | MT-RE-001, API-RE-001 | Revisión del manejo de credenciales. |
| PSI.12 | Documentación técnica, de API, de BD y de pruebas | El proyecto cuenta con documentación **técnica, de API, de base de datos y de pruebas**. | MT-RE-001, API-RE-001, DB-RE-001, PT-RE-001 | Conjunto documental entregado. |

**Evidencias documentales para PSI.12:**

`[Foto: diagrama de arquitectura del sistema (separación de capas)]`

**Ilustración 8.** Arquitectura del sistema (separación de capas)

`[Foto: validación de un formulario con campos obligatorios en rojo]`

**Ilustración 9.** Validación de formulario (campos obligatorios en rojo)

`[Foto: bitácora / control de cambios]`

**Ilustración 10.** Bitácora / control de cambios

### 5.4 PSI.01 — Requisitos de seguridad en los proyectos

> PSI.01 define medidas de seguridad para la **gestión de proyectos** (comunicaciones, accesos, software, hardware y respaldos). En el contexto de RE, aplica a su **instalación, despliegue y operación** en sitio.

| Política / Control | Requisito o lineamiento | Cómo lo cumple RE | Documento RE relacionado | Evidencia / referencia |
| --- | --- | --- | --- | --- |
| PSI.01 | Requisitos de seguridad considerados en el proyecto | La instalación y el despliegue siguen un procedimiento documentado, con configuración por ambiente y resguardo de secretos. | MI-RE-001, MT-RE-001 | Procedimiento de instalación/despliegue. |
| PSI.01 | Control de accesos del proyecto | El acceso al sistema, a la configuración y a las rutas críticas se gestiona por rol y por usuario maestro (root). | MA-RE-001 (5), DF-RE-001 (9) | Inventario de accesos del proyecto. |
| PSI.01 | Resguardo y respaldos (alineado con PSI.09) | Se establecen respaldos periódicos de la base de datos y resguardo de archivos de configuración y certificados, con registro de responsable y fecha. | MA-RE-001 (12), MI-RE-001 (10) | Evidencia de respaldos y de pruebas de restauración. |
| PSI.01 | Documentación del proyecto | El proyecto se entrega con un conjunto documental (funcional, técnico, administrativo, de pruebas e instalación). | Conjunto documental RE | Entregable documental versionado. |

## 6. Resumen de alineación

| Control | Nivel de alineación | Comentario |
| --- | --- | --- |
| **PSI.01 — Requisitos de seguridad en proyectos** | **Medio-Alto** | RE se instala y opera con procedimiento documentado, control de accesos y respaldos. La alineación se sostiene conservando evidencia de instalación, accesos y respaldos del proyecto. |
| **PSI.05 — Control de accesos (incl. enmascaramiento)** | **Medio-Alto** | El sistema soporta autenticación, identificadores únicos, roles, mínimo privilegio, expiración de sesión, baja de cuentas, anonimización de empleados dados de baja y cifrado de contraseñas. La alineación se sostiene con las acciones de seguimiento sobre longitud de contraseña, MFA y revisión periódica de accesos. |
| **PSI.12 — Desarrollo seguro** | **Alto** | Arquitectura separada, validación de entradas, manejo de errores, bitácoras, control de cambios, pruebas y documentación completa contribuyen a una alineación alta. |

> Los niveles de alineación son una **valoración orientativa** para auditoría y deben confirmarse con la evidencia operativa conservada.

## 7. Acciones de control y seguimiento

Para sostener y reforzar la alineación con las políticas, se mantienen las siguientes acciones de control:

1. **Longitud de contraseña.** Revisar y, cuando aplique, **alinear la longitud mínima de contraseña** del sistema con lo establecido en PSI.05 (al menos 12 caracteres con combinación de mayúsculas, minúsculas, números y símbolos).
2. **MFA.** Evaluar la habilitación de **autenticación multifactor (MFA)** cuando la tecnología y el entorno del cliente lo permitan.
3. **Revisión de accesos.** Conservar evidencia documentada de las revisiones de accesos de administrador **cada 5 meses** y ante cambios mayores, realizadas por personal ajeno a la asignación de accesos.
4. **Anonimización en bajas.** Conservar evidencia de la **anonimización (correo, nombre y teléfono)** de empleados dados de baja, conforme a PSI.05.
5. **Configuración de roles.** Conservar capturas o reportes de la configuración vigente de roles y permisos, especialmente de cuentas privilegiadas.
6. **Secretos.** No incluir valores reales de variables de entorno, llaves ni contraseñas en documentación ni evidencias; referenciarlos solo por nombre.
7. **Respaldos.** Mantener respaldos periódicos y evidencia de pruebas de restauración (PSI.01 / PSI.09).
8. **Pruebas y ambientes.** Conservar evidencia de pruebas funcionales y de seguridad antes de liberar, sin usar datos reales de producción en ambientes de prueba (PSI.12).
9. **Exportaciones.** Revisar las exportaciones PDF/Excel antes de compartirlas para no divulgar datos personales innecesarios.

## 8. Conclusión

La documentación y el comportamiento del sistema **Recepción Electrónica (RE)** **se alinean** con los lineamientos establecidos en **PSI.01**, **PSI.05** (incluido su apartado de enmascaramiento) y **PSI.12**, soportando los requisitos de seguridad del proyecto, los controles de acceso, la protección de datos y las prácticas de desarrollo seguro definidos por la organización.

Esta matriz **contribuye a cumplir** dichos lineamientos al servir como **puente para auditoría**, vinculando cada requisito con la capacidad del sistema, el documento donde se describe y la evidencia asociada. El mantenimiento de las acciones de control señaladas en la sección 7 permite **sostener y demostrar** esa alineación a lo largo del tiempo.

## 9. Control documental

| Documento | Código | Versión | Fecha | Responsable | Estado |
| --- | --- | --- | --- | --- | --- |
| Matriz de Trazabilidad ISO — RE | TR-RE-001 | 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Vigente |

**Documentos relacionados:** PSI.01, PSI.05, PSI.12, DF-RE-001, MA-RE-001, MU-RE-001, MT-RE-001, DB-RE-001, API-RE-001, PT-RE-001, MI-RE-001, BC-RE-001.

---

**Fin del documento.**
