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
   - 5.2 Control 8.11 — Enmascaramiento / protección de datos
   - 5.3 PSI.12 — Desarrollo seguro
6. Resumen de cumplimiento
7. Brechas y recomendaciones
8. Conclusión
9. Control documental

---

## 1. Objetivo

El presente documento establece la **trazabilidad** entre los lineamientos de seguridad de la información definidos por la organización —**PSI.05 (Política de Control de Accesos)**, **Control 8.11 (Procedimiento de Enmascaramiento / Protección de Datos)** y **PSI.12 (Política de Desarrollo Seguro)**— y la forma en que el sistema **Recepción Electrónica (RE)** y su documentación **se alinean** con dichos lineamientos.

Las políticas y el procedimiento representan el **“deber ser”** (los requisitos que la organización ha definido), mientras que la documentación funcional, técnica, administrativa y operativa de RE describe el **“cómo se aplica”** en el sistema. Esta matriz sirve como **puente para auditoría**, permitiendo verificar, control por control, dónde se evidencia su aplicación.

> Este documento utiliza un lenguaje de **alineación** (“se alinea”, “soporta”, “contribuye a cumplir”) y **no constituye una declaración de cumplimiento legal o normativo absoluto**. La verificación final corresponde al proceso de auditoría y a la evidencia operativa que se conserve.

## 2. Alcance

- Aplica al sistema **Recepción Electrónica (RE) base** y a sus documentos relacionados (funcional, técnico, administrativo, de base de datos, de API y de pruebas).
- Cubre los controles contenidos en **PSI.05**, **Control 8.11** y **PSI.12**.
- **No** cubre los **módulos opcionales** (integraciones), que se documentan por separado y, cuando se contratan, deben evaluarse con su propia trazabilidad.
- La matriz refleja el estado del sistema y de la documentación a la **fecha** indicada en la portada; debe revisarse ante cambios relevantes.

## 3. Documentos de referencia

**Lineamientos (deber ser):**

| Código | Documento | Tema |
| --- | --- | --- |
| PSI.05 | Política de Control de Accesos | Gestión de identidades, accesos, roles y privilegios. |
| Control 8.11 | Procedimiento de Enmascaramiento / Protección de Datos | Minimización, enmascaramiento y protección de datos. |
| PSI.12 | Política de Desarrollo Seguro | Prácticas seguras de desarrollo, pruebas y cambios. |

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

## 4. Cómo leer esta matriz

Cada control se desglosa en una tabla con las siguientes columnas:

| Columna | Significado |
| --- | --- |
| **Política / Control** | Lineamiento de referencia (PSI.05, 8.11 o PSI.12). |
| **Requisito o lineamiento** | El requisito específico esperado por la política. |
| **Cómo lo cumple RE** | La capacidad, comportamiento o práctica del sistema que se alinea con el requisito. |
| **Documento RE relacionado** | Dónde está documentado dentro del conjunto RE. |
| **Evidencia / sección sugerida** | Qué evidencia conservar o qué sección consultar en auditoría. |

## 5. Matriz de trazabilidad

### 5.1 PSI.05 — Control de accesos

| Política / Control | Requisito o lineamiento | Cómo lo cumple RE | Documento RE relacionado | Evidencia / sección sugerida |
| --- | --- | --- | --- | --- |
| PSI.05 | Autenticación de usuarios | El acceso requiere **correo y contraseña**; el sistema valida credenciales, estado activo de la cuenta y emite una sesión con vigencia limitada. | DF-RE-001 (5.1, 6.1), MU-RE-001 (4.1) | Captura de pantalla de inicio de sesión; política de contraseñas. |
| PSI.05 | Roles y permisos | El sistema maneja **roles** (Administrador, Recepción, Interno, Reportes, Visitante, Tablet y personalizados) que determinan los módulos y acciones visibles. | MA-RE-001 (4, 5), DF-RE-001 (9) | Matriz de roles; configuración de permisos por rol. |
| PSI.05 | Mínimo privilegio | La visibilidad de módulos y acciones se restringe por rol y configuración de permisos; las rutas críticas exigen condición de **usuario maestro (root)**. | MA-RE-001 (5.1), DF-RE-001 (5.1) | Configuración de permisos; lista de cuentas con privilegios elevados. |
| PSI.05 | Ciclo de vida de las cuentas (alta, modificación, bloqueo, desbloqueo, inactivación) | RE permite **crear, editar, bloquear/desbloquear, activar/inactivar** usuarios; el bloqueo por intentos fallidos es temporal (predeterminado 30 min) y el administrador puede desbloquear. | MA-RE-001 (9), MU-RE-001 (10) | Bitácora de altas/bajas; evidencia de desbloqueos. |
| PSI.05 | Revisión periódica de accesos | El sistema distingue usuarios **activos / inactivos** y permite su revisión; la administración recomienda una revisión periódica. | MA-RE-001 (11, 14) | Reporte/lista de usuarios activos e inactivos por periodo. |
| PSI.05 | Accesos privilegiados (administrador / root) | El rol Administrador concentra la configuración; ciertas rutas requieren además condición de **root**, separando privilegios sensibles. | MA-RE-001 (4, 5.1) | Inventario de cuentas administradoras y root. |
| PSI.05 | Restricción de acceso a módulos y reportes | Cada módulo (incluidos **Reportes**) se muestra según el rol; las exportaciones respetan los permisos del usuario. | DF-RE-001 (6.7–6.9), MU-RE-001 (13) | Pruebas de visibilidad por rol; revisión de exportaciones. |
| PSI.05 | Expiración de sesión | La sesión tiene **vigencia limitada** (predeterminado 7 días) y el sistema valida periódicamente su validez, cerrando sesión y solicitando reautenticación al expirar. | DF-RE-001 (5.1), MU-RE-001 (4.3) | Configuración de tiempos de sesión. |
| PSI.05 | Trazabilidad de acciones relevantes | El sistema conserva registro de la operación (por ejemplo, eventos de acceso y bitácora técnica) que soporta la trazabilidad. | MT-RE-001, DF-RE-001 (6.7), PT-RE-001 | Muestra de bitácora; eventos de acceso. |

### 5.2 Control 8.11 — Enmascaramiento / protección de datos

| Política / Control | Requisito o lineamiento | Cómo lo cumple RE | Documento RE relacionado | Evidencia / sección sugerida |
| --- | --- | --- | --- | --- |
| 8.11 | Minimización de datos personales | RE captura únicamente los datos necesarios para la operación (identificación, contacto, documentos según configuración) y permite definir qué documentos se solicitan. | DF-RE-001 (6.2, 6.3), MA-RE-001 (6.4) | Definición de campos y documentos requeridos. |
| 8.11 | Acceso restringido a datos completos | El acceso a la información detallada (visitantes, empleados, documentos) está condicionado por rol y permisos. | MA-RE-001 (5), DF-RE-001 (9) | Pruebas de acceso por rol a datos completos. |
| 8.11 | Protección de documentos, fotografías e identificaciones | Las imágenes y documentos asociados a visitantes/empleados se tratan como datos personales y su acceso se restringe por rol. | DF-RE-001 (6.2), DB-RE-001 | Revisión de permisos sobre documentos. |
| 8.11 | Protección de datos de contacto | Los datos de contacto (correo, teléfono) se utilizan solo para la operación (invitaciones, ligas, notificaciones) y su visualización depende del rol. | DF-RE-001 (5.4, 6.2) | Configuración de correo y notificaciones. |
| 8.11 | Cuidado con exportaciones (PDF/Excel) | Las exportaciones respetan los permisos del usuario; la documentación recomienda **no incluir ni compartir datos personales innecesarios**. | MU-RE-001 (13), MA-RE-001 (11) | Lineamiento de exportaciones; revisión de reportes compartidos. |
| 8.11 | No exponer contraseñas, tokens, llaves ni secretos | Las contraseñas se almacenan **cifradas/hasheadas**; los secretos del sistema se mantienen en configuración protegida y no se documentan con valores reales. | MT-RE-001, MA-RE-001 (11), API-RE-001 | Revisión de manejo de credenciales; ausencia de secretos en documentación. |
| 8.11 | Registros (logs) sin datos sensibles completos | La bitácora técnica está orientada a la trazabilidad de la operación y **no debe** almacenar contraseñas, tokens ni datos personales completos. | MT-RE-001, PT-RE-001 | Muestra de logs verificando ausencia de datos sensibles. |
| 8.11 | Baja lógica / anonimización (Inactivar vs Eliminar) | RE prioriza la **baja lógica** (Inactivar) sobre el borrado; contempla la anonimización conforme a la política de protección de datos. | DF-RE-001 (5.2), MA-RE-001 (9.3) | Evidencia de inactivación/anonimización. |
| 8.11 | Datos de prueba controlados | La documentación recomienda usar **datos de prueba anonimizados o controlados** en evidencias y ambientes de prueba. | PT-RE-001, MA-RE-001 (11) | Set de datos de prueba; captura sin datos reales. |

### 5.3 PSI.12 — Desarrollo seguro

| Política / Control | Requisito o lineamiento | Cómo lo cumple RE | Documento RE relacionado | Evidencia / sección sugerida |
| --- | --- | --- | --- | --- |
| PSI.12 | Separación de capas (frontend / backend / base de datos) | RE está construido con **frontend, backend y base de datos** separados, con responsabilidades definidas. | MT-RE-001, DF-RE-001 (1) | Arquitectura del Manual Técnico. |
| PSI.12 | Uso de variables de entorno | La configuración sensible se gestiona mediante **variables de entorno**, sin incluir valores reales en la documentación. | MT-RE-001, MI-RE-001 | Lista de variables (por nombre, sin valores). |
| PSI.12 | Validación de entradas (formularios y APIs) | RE valida los datos de entrada tanto en los **formularios** (campos obligatorios, formato, unicidad, resaltado en rojo) como en las **APIs**. | DF-RE-001 (5.3), MU-RE-001 (6.1, 10.1), API-RE-001 | Casos de validación en PT-RE-001. |
| PSI.12 | Manejo controlado de errores | El sistema gestiona los errores de forma controlada (mensajes de validación, estados HTTP), evitando exponer información sensible. | API-RE-001, DF-RE-001 (5.3) | Pruebas de manejo de errores. |
| PSI.12 | Control de cambios y documentación | Los cambios se registran y la documentación se mantiene actualizada (bitácora de cambios y control de versiones por documento). | BC-RE-001, todos los documentos (control documental) | Bitácora de cambios; historial de versiones. |
| PSI.12 | Pruebas funcionales y de seguridad | Existe un **plan/evidencia de pruebas** que cubre escenarios funcionales y de control de acceso. | PT-RE-001 | Resultados de pruebas por versión. |
| PSI.12 | Protección de credenciales | Las contraseñas se almacenan con **hash**; las credenciales de servicios se mantienen protegidas. | MT-RE-001, API-RE-001 | Revisión del manejo de credenciales. |
| PSI.12 | Gestión de dependencias | Las dependencias se administran mediante el gestor de paquetes del proyecto, lo que permite su control y actualización. | MT-RE-001, MI-RE-001 | Inventario de dependencias. |
| PSI.12 | Documentación técnica, de API, de BD y de pruebas | El proyecto cuenta con documentación **técnica, de API, de base de datos y de pruebas**. | MT-RE-001, API-RE-001, DB-RE-001, PT-RE-001 | Conjunto documental entregado. |
| PSI.12 | Separación de ambientes (local / pruebas / producción) | La configuración por variables de entorno permite **separar ambientes** cuando la instalación lo contempla. | MI-RE-001, MT-RE-001 | Configuración por ambiente. |

## 6. Resumen de cumplimiento

| Control | Nivel de alineación | Comentario |
| --- | --- | --- |
| **PSI.05 — Control de accesos** | **Alto** | El sistema soporta autenticación, roles, mínimo privilegio, ciclo de vida de cuentas, expiración de sesión y trazabilidad. La alineación se fortalece conservando evidencia de revisiones periódicas de acceso. |
| **Control 8.11 — Protección de datos** | **Medio-Alto** | RE aplica minimización, restricción por rol, baja lógica y cifrado de contraseñas. Se recomienda reforzar el control sobre exportaciones y el uso de datos de prueba para elevar el nivel. |
| **PSI.12 — Desarrollo seguro** | **Alto** | Arquitectura separada, validación de entradas, manejo de errores, control de cambios, pruebas y documentación completa contribuyen a una alineación alta. |

> Los niveles de alineación son una **valoración orientativa** para auditoría y deben confirmarse con la evidencia operativa conservada.

## 7. Brechas y recomendaciones

Para sostener y elevar la alineación, se recomienda implementar y conservar de forma continua:

1. **Revisión de accesos.** Mantener **evidencia documentada** de las revisiones periódicas de usuarios y permisos (quién revisó, cuándo y resultado).
2. **Configuración de roles.** Conservar **capturas o reportes** de la configuración de roles y permisos vigente, especialmente de las cuentas privilegiadas.
3. **Módulos opcionales.** Documentar **cuándo y por qué** se activan o desactivan los módulos opcionales, dejando registro del responsable.
4. **Secretos.** **No incluir valores reales** de variables de entorno, llaves ni contraseñas en la documentación ni en las evidencias; referenciarlos solo por nombre.
5. **Respaldos.** Mantener respaldos periódicos y **evidencia de pruebas de restauración** exitosas.
6. **Pruebas previas a liberación.** Conservar **evidencia de pruebas** (funcionales y de control de acceso) antes de liberar cada cambio relevante.
7. **Exportaciones.** Revisar las **exportaciones PDF/Excel** para evitar compartir datos personales innecesarios; aplicar minimización al difundir reportes.
8. **Datos de prueba.** Utilizar **datos anonimizados o controlados** en ambientes de prueba y en las capturas incluidas en la documentación.

## 8. Conclusión

La documentación y el comportamiento del sistema **Recepción Electrónica (RE)** **se alinean** con los lineamientos establecidos en **PSI.05**, **Control 8.11** y **PSI.12**, soportando los controles de acceso, la protección de datos y las prácticas de desarrollo seguro definidos por la organización.

Esta matriz **contribuye a cumplir** dichos lineamientos al servir como **puente para auditoría**, vinculando cada requisito con la capacidad del sistema, el documento donde se describe y la evidencia que conviene conservar. El mantenimiento de las evidencias señaladas en la sección 7 es lo que permitirá **sostener y demostrar** esa alineación a lo largo del tiempo.

## 9. Control documental

| Documento | Código | Versión | Fecha | Responsable | Estado |
| --- | --- | --- | --- | --- | --- |
| Matriz de Trazabilidad ISO — RE | TR-RE-001 | 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Vigente |

**Documentos relacionados:** PSI.05, Control 8.11, PSI.12, DF-RE-001, MA-RE-001, MU-RE-001, MT-RE-001, DB-RE-001, API-RE-001, PT-RE-001.

---

**Fin del documento.**
