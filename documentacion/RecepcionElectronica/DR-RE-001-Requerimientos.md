# Documento de Requerimientos

## Recepción Electrónica (RE)

Especificación de requerimientos funcionales y no funcionales del producto base de Recepción Electrónica para el control de visitas, accesos y recepción.

| Campo | Descripción |
| --- | --- |
| Tipo de documento | Documento de Requerimientos de software |
| Código | DR-RE-001 |
| Producto | Recepción Electrónica (RE) — Base |
| Versión | 1.0 |
| Fecha | 2026-06-24 |
| Responsable | Área de Sistemas / Desarrollo |
| Clasificación | Uso interno |
| Estado | Vigente |

> Documento preparado como base del producto. Las integraciones y módulos opcionales se documentan por separado y no forman parte de esta especificación base.

---

## Control de versiones

| Versión | Fecha | Autor | Descripción |
| --- | --- | --- | --- |
| 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Versión inicial del documento de requerimientos de la base de RE. |

---

## Contenido

1. Objetivo
2. Alcance
3. Definiciones y acrónimos
4. Descripción general del producto
5. Actores y roles del sistema
6. Requerimientos funcionales
7. Requerimientos no funcionales
8. Requerimientos de seguridad
9. Restricciones técnicas
10. Supuestos y dependencias
11. Extensibilidad y módulos opcionales
12. Matriz de trazabilidad
13. Control documental

---

## 1. Objetivo

Establecer los requerimientos funcionales y no funcionales del producto base de **Recepción Electrónica (RE)**, un sistema web para la administración de visitas, registro de visitantes, control de acceso por código QR, gestión de usuarios y empleados, y generación de reportes de recepción.

Este documento define **qué debe hacer** el sistema base, de forma independiente a cualquier integración con dispositivos o módulos opcionales. Sirve como referencia para diseño funcional, desarrollo, pruebas, validación y liberación de la base del producto.

## 2. Alcance

El alcance de este documento corresponde al **núcleo de Recepción Electrónica**, que puede operar de forma autónoma sin depender de integraciones externas. Incluye:

- Autenticación y gestión de sesiones de usuarios.
- Administración de usuarios internos, roles y permisos.
- Administración de empleados.
- Registro y administración de visitantes.
- Registro de visitas/citas (por recepción o por liga enviada al visitante).
- Control de acceso mediante código QR (kiosco/tablet).
- Registro de eventos de entrada, salida, autorización y cancelación.
- Catálogos base (empresas, pisos, accesos, puestos, departamentos, cubículos, horarios, pases).
- Gestión documental de visitantes.
- Reportes de visitas, eventos y horas.
- Configuración general del sistema.
- Notificaciones por correo electrónico y actualizaciones en tiempo real.

**Fuera del alcance de este documento** (se especifican en documentos independientes): integraciones con paneles y dispositivos de control de acceso, biometría, portales de contratistas, capacitaciones públicas, registro de campo y funciones avanzadas de visitantes. El sistema base está diseñado para **admitir** estos módulos sin requerir modificaciones a su núcleo (ver sección 11).

## 3. Definiciones y acrónimos

| Término | Definición |
| --- | --- |
| RE | Recepción Electrónica. Producto base descrito en este documento. |
| Usuario | Persona interna del sistema con credenciales, rol y permisos asignados. |
| Empleado | Persona registrada en el sistema sujeta a control de acceso, sin necesariamente operar el sistema. |
| Visitante | Persona externa registrada para una visita o cita. |
| Registro / Visita | Cita o evento de visita que asocia a un visitante con un anfitrión, accesos y fechas. |
| Anfitrión | Usuario o empleado que recibe o autoriza una visita. |
| Evento | Acción de acceso registrada (entrada, salida, autorización, cancelación, finalización). |
| Acceso | Punto físico de entrada o salida controlado por el sistema. |
| QR | Código de respuesta rápida utilizado para autorizar y validar accesos. |
| Kiosco | Vista de operación tipo tablet para consulta y registro de eventos de acceso. |
| Rol | Agrupación de permisos asignada a un usuario según sus funciones. |
| RF | Requerimiento Funcional. |
| RNF | Requerimiento No Funcional. |
| Token | Credencial temporal de sesión o de operación (por ejemplo, ligas de registro). |

## 4. Descripción general del producto

RE es un sistema web cliente-servidor compuesto por una aplicación de **frontend** (interfaz de usuario web), un **backend** de servicios (API) y una **base de datos** documental. El sistema permite que el personal de recepción y los usuarios autorizados administren el ciclo completo de una visita: desde la creación del registro, el envío de invitaciones, la validación de acceso por QR, hasta el registro de entrada/salida y los reportes.

El producto está orientado a operar en sitio (instalación local del cliente) y soporta múltiples roles con permisos diferenciados. La comunicación entre componentes se realiza mediante API sobre HTTP/HTTPS y un canal de tiempo real para notificaciones.

### 4.1 Características generales

- Operación multiusuario con control de acceso por rol y permiso.
- Configuración parametrizable por instalación/cliente.
- Notificaciones por correo y en tiempo real.
- Generación de reportes y exportaciones.
- Arquitectura preparada para activar módulos opcionales por configuración.

## 5. Actores y roles del sistema

| Rol | Actor | Descripción funcional |
| --- | --- | --- |
| Administrador | Personal de sistemas | Acceso administrativo amplio: usuarios, configuración, catálogos, empleados, visitantes, eventos y parámetros del sistema. |
| Recepción | Personal de recepción | Operación de empleados, visitantes, registros, eventos, directorio y catálogos principales. |
| Interno | Usuario anfitrión | Consulta y operación de visitas asociadas a su persona. |
| Reportes | Usuario de consulta | Acceso orientado a reportes, eventos, kiosco y visitantes. |
| Visitante | Persona externa | Acceso a su perfil, documentos, QR y bitácora propia mediante liga o credenciales temporales. |
| Tablet | Dispositivo de operación | Acceso a kiosco, visitantes, eventos y escáner QR. |

> Nota: el sistema soporta **roles personalizados** (numeración ≥ 100) cuya visibilidad de módulos se controla por configuración.

## 6. Requerimientos funcionales

### 6.1 Autenticación y sesión

| ID | Requerimiento | Prioridad |
| --- | --- | --- |
| RF-001 | El sistema debe permitir el inicio de sesión mediante correo y contraseña, validando credenciales y estado activo del usuario. | Alta |
| RF-002 | El sistema debe emitir un token de sesión (JWT) con tiempo de vida configurable y asociarlo al dispositivo de origen. | Alta |
| RF-003 | El sistema debe permitir el cierre de sesión, invalidando el token activo. | Alta |
| RF-004 | El sistema debe bloquear al usuario tras un número de intentos fallidos y permitir su desbloqueo por un administrador. | Media |
| RF-005 | El sistema debe ofrecer recuperación de contraseña mediante envío de código al correo, validación del código y cambio de contraseña. | Alta |
| RF-006 | El sistema debe ejecutar un flujo de configuración inicial (setup) cuando la instalación no esté configurada. | Media |

### 6.2 Gestión de usuarios

| ID | Requerimiento | Prioridad |
| --- | --- | --- |
| RF-010 | El sistema debe permitir crear, consultar, editar y cambiar el estado de usuarios internos. | Alta |
| RF-011 | El sistema debe permitir asignar rol, empresa, puesto, departamento, cubículo, piso, horario y accesos a cada usuario. | Alta |
| RF-012 | El sistema debe permitir la carga masiva de usuarios mediante un formato descargable. | Media |
| RF-013 | El sistema debe generar y mostrar el código QR asociado a un usuario. | Media |
| RF-014 | El sistema debe permitir reenviar el correo de acceso a un usuario. | Baja |
| RF-015 | El sistema debe permitir anonimizar y eliminar de forma permanente a un usuario, conforme a las políticas de protección de datos. | Media |

### 6.3 Gestión de empleados

| ID | Requerimiento | Prioridad |
| --- | --- | --- |
| RF-020 | El sistema debe permitir crear, consultar, editar y cambiar el estado de empleados. | Alta |
| RF-021 | El sistema debe permitir asignar empresa, piso, accesos y horarios a los empleados. | Alta |
| RF-022 | El sistema debe permitir la carga masiva de empleados mediante formato descargable. | Media |
| RF-023 | El sistema debe generar el código QR del empleado. | Media |
| RF-024 | El sistema debe permitir anonimizar al empleado dado de baja, sobrescribiendo de forma física sus datos personales (correo, nombre y teléfono) para evitar su identificación y recuperación, así como darlo de baja. | Media |
| RF-025 | El sistema debe mantener un directorio consultable de empleados. | Baja |

### 6.4 Gestión de visitantes

| ID | Requerimiento | Prioridad |
| --- | --- | --- |
| RF-030 | El sistema debe permitir registrar, consultar, editar y cambiar el estado de visitantes. | Alta |
| RF-031 | El sistema debe permitir verificar a un visitante antes de autorizar su acceso. | Alta |
| RF-032 | El sistema debe permitir bloquear y desbloquear visitantes. | Media |
| RF-033 | El sistema debe permitir autorizar el acceso por QR a un visitante. | Alta |
| RF-034 | El sistema debe permitir la carga masiva de visitantes. | Baja |
| RF-035 | El sistema debe asociar documentos al visitante y permitir su validación. | Media |
| RF-036 | El sistema debe permitir cambiar el estado y eliminar permanentemente a un visitante cuando la operación autorizada lo requiera. | Media |

### 6.5 Registro de visitas / citas

| ID | Requerimiento | Prioridad |
| --- | --- | --- |
| RF-040 | El sistema debe permitir crear un registro de visita capturando visitante, contacto, empresa, anfitrión, fecha de entrada, accesos y documentos. | Alta |
| RF-041 | El sistema debe permitir el registro de visita iniciado por el propio visitante mediante una liga enviada por correo y validada por token temporal. | Alta |
| RF-042 | El sistema debe permitir editar, modificar, cancelar y finalizar un registro. | Alta |
| RF-043 | El sistema debe registrar la fecha de salida al finalizar una visita. | Alta |
| RF-044 | El sistema debe permitir registrar placas/vehículo cuando aplique. | Baja |
| RF-045 | El sistema debe enviar correos de notificación a visitante y anfitrión en creación, cancelación y confirmación. | Media |
| RF-046 | El sistema debe autocompletar datos a partir del último registro asociado a un correo. | Baja |

### 6.6 Control de acceso y eventos

| ID | Requerimiento | Prioridad |
| --- | --- | --- |
| RF-050 | El sistema debe validar el código QR de visitantes, usuarios y empleados para autorizar el acceso. | Alta |
| RF-051 | El sistema debe registrar eventos de entrada, salida, autorización, cancelación y finalización. | Alta |
| RF-052 | El sistema debe ofrecer una vista de kiosco/tablet para la operación de control de acceso. | Alta |
| RF-053 | El sistema debe asociar cada evento al registro, acceso y persona correspondiente. | Alta |
| RF-054 | El sistema debe almacenar la imagen del evento cuando esté disponible. | Baja |
| RF-055 | El sistema debe permitir autorizar o rechazar un acceso (check) por un usuario facultado. | Media |

### 6.7 Catálogos base

| ID | Requerimiento | Prioridad |
| --- | --- | --- |
| RF-060 | El sistema debe administrar los catálogos de empresas, pisos, accesos, puestos, departamentos, cubículos, horarios y pases (crear, editar, activar/inactivar). | Alta |
| RF-061 | El sistema debe inicializar automáticamente los catálogos base (tipos de registro, documento, evento y dispositivo) en una instalación nueva. | Media |

### 6.8 Documentos

| ID | Requerimiento | Prioridad |
| --- | --- | --- |
| RF-070 | El sistema debe permitir adjuntar documentos a visitantes y registros, con tipo, vigencia y estado. | Media |
| RF-071 | El sistema debe permitir validar o rechazar documentos, registrando quién y cuándo. | Media |

### 6.9 Reportes

| ID | Requerimiento | Prioridad |
| --- | --- | --- |
| RF-080 | El sistema debe generar reportes de registros/visitas con filtros. | Alta |
| RF-081 | El sistema debe generar reportes de eventos de acceso. | Media |
| RF-082 | El sistema debe generar reportes de horas. | Media |
| RF-083 | El sistema debe permitir exportar reportes (por ejemplo, PDF y Excel) respetando los permisos del usuario. | Media |

### 6.10 Configuración

| ID | Requerimiento | Prioridad |
| --- | --- | --- |
| RF-090 | El sistema debe permitir configurar parámetros generales (nombre, zona horaria, correo de cuentas, tiempos, tema visual). | Alta |
| RF-091 | El sistema debe permitir administrar permisos por rol y crear/eliminar roles personalizados. | Alta |
| RF-092 | El sistema debe permitir habilitar o deshabilitar módulos opcionales mediante banderas de configuración, sin afectar el núcleo. | Alta |
| RF-093 | El sistema debe permitir configurar los tipos de documentos requeridos. | Media |

## 7. Requerimientos no funcionales

| ID | Categoría | Requerimiento |
| --- | --- | --- |
| RNF-001 | Disponibilidad | El sistema debe operar como servicio continuo gestionado por un administrador de procesos, con reinicio automático ante fallos. |
| RNF-002 | Rendimiento | Las consultas de listados deben soportar paginación y filtros para manejar grandes volúmenes de registros. |
| RNF-003 | Usabilidad | La interfaz debe ser responsiva y operable en equipos de escritorio y tablets. |
| RNF-004 | Compatibilidad | El frontend debe funcionar en navegadores web modernos. |
| RNF-005 | Mantenibilidad | El sistema debe mantener separación entre frontend, backend, base de datos y procesos auxiliares. |
| RNF-006 | Escalabilidad | La arquitectura debe permitir activar módulos opcionales sin reconstruir el núcleo. |
| RNF-007 | Trazabilidad | El sistema debe registrar las peticiones relevantes y conservar bitácora técnica. |
| RNF-008 | Internacionalización | El sistema debe manejar zona horaria configurable. |
| RNF-009 | Tiempo real | El sistema debe notificar nuevos registros y eventos mediante un canal de tiempo real. |
| RNF-010 | Portabilidad | El sistema debe poder instalarse en sitio mediante scripts de instalación y despliegue. |

## 8. Requerimientos de seguridad

Los siguientes requerimientos alinean el producto base con las políticas internas de seguridad de la información (**PSI.01**, **PSI.05** —incluido su apartado de enmascaramiento de datos— y **PSI.12**):

| ID | Requerimiento | Referencia |
| --- | --- | --- |
| RNF-S01 | El acceso a funciones y datos debe restringirse por rol, permiso y necesidad operativa (mínimo privilegio, necesidad de saber y de usar). | PSI.05 Control de Accesos |
| RNF-S02 | Las contraseñas de usuarios deben almacenarse de forma cifrada (hash) y nunca mostrarse ni registrarse en claro. | PSI.05 |
| RNF-S03 | Las credenciales técnicas y secretos deben gestionarse mediante variables de entorno y cifrado, fuera del código fuente. | PSI.12 Desarrollo Seguro |
| RNF-S04 | Los datos personales sensibles deben minimizarse o enmascararse según el perfil del usuario. | PSI.05 (Enmascaramiento) |
| RNF-S05 | El sistema debe validar entradas en frontend y backend (sintáctica y semántica) y manejar errores sin exponer información técnica sensible. | PSI.12 |
| RNF-S06 | El sistema debe aplicar límites de tasa (rate limiting) a rutas sensibles de autenticación. | PSI.05 / PSI.12 |
| RNF-S07 | El sistema debe permitir la anonimización física (no lógica) de los datos de empleados dados de baja (correo, nombre y teléfono). | PSI.05 (Enmascaramiento) |
| RNF-S08 | Los registros (logs) no deben almacenar contraseñas, tokens ni datos personales completos. | PSI.05 / PSI.12 |
| RNF-S09 | Cada usuario debe identificarse con un identificador único (correo) y credenciales propias; el sistema debe rechazar identificadores duplicados. | PSI.05 |
| RNF-S10 | El sistema debe soportar autenticación robusta y considerar el doble factor (MFA) cuando la tecnología lo permita. | PSI.05 |
| RNF-S11 | El proyecto debe instalarse, desplegarse y respaldarse conforme a los requisitos de seguridad de proyectos. | PSI.01 / PSI.09 |

## 9. Restricciones técnicas

- El sistema se entrega para instalación en sitio sobre el sistema operativo definido por el cliente.
- La base de datos es documental (orientada a colecciones), no relacional.
- La operación de procesos del lado servidor se gestiona mediante un administrador de procesos.
- La comunicación segura requiere certificados para HTTPS cuando aplique.

## 10. Supuestos y dependencias

- El cliente proporciona la infraestructura mínima (servidor, base de datos y red).
- El envío de correos depende de una cuenta/servicio de correo configurado.
- Las funciones que dependan de cámara o lectura de QR requieren el hardware correspondiente en el equipo de operación.

## 11. Extensibilidad y módulos opcionales

El producto base está diseñado para **incorporar módulos opcionales** activables por configuración, sin modificar el núcleo. Cada módulo opcional:

- Se habilita o deshabilita mediante banderas de configuración y/o visibilidad de integraciones por cliente.
- Se documenta en un **documento independiente** (especificación propia de requerimientos, funcional, técnico, API, pruebas y riesgos).
- No es requisito para la operación de la base.

De esta forma, una entrega a cliente se compone de **la base (este conjunto documental) más los documentos de los módulos contratados**, sin necesidad de alterar la documentación base.

> Este documento no enumera ni describe módulos opcionales específicos por diseño. Para el detalle de cada módulo, consúltese su documento correspondiente.

## 12. Matriz de trazabilidad

| Grupo funcional | Requerimientos | Verificación esperada |
| --- | --- | --- |
| Autenticación y sesión | RF-001 a RF-006 | Pruebas funcionales de login, logout, recuperación y bloqueo. |
| Usuarios | RF-010 a RF-015 | Pruebas de alta/edición/estado y permisos por rol. |
| Empleados | RF-020 a RF-025 | Pruebas de alta/edición/estado y carga masiva. |
| Visitantes | RF-030 a RF-036 | Pruebas de registro, verificación, bloqueo y QR. |
| Registros/visitas | RF-040 a RF-046 | Pruebas de ciclo completo de visita y liga de registro. |
| Control de acceso | RF-050 a RF-055 | Pruebas de validación QR, eventos y kiosco. |
| Catálogos | RF-060 a RF-061 | Pruebas CRUD e inicialización. |
| Documentos | RF-070 a RF-071 | Pruebas de adjunto y validación. |
| Reportes | RF-080 a RF-083 | Pruebas de generación y exportación. |
| Configuración | RF-090 a RF-093 | Pruebas de parámetros, permisos y banderas de módulos. |
| Seguridad | RNF-S01 a RNF-S11 | Revisión de controles y evidencia ISO (PSI.01, PSI.05, PSI.12). |

## 13. Control documental

| Documento | Código | Versión | Fecha | Responsable | Estado |
| --- | --- | --- | --- | --- | --- |
| Documento de Requerimientos — Recepción Electrónica | DR-RE-001 | 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Vigente |

**Documentos relacionados:** DF-RE-001 (Funcional), MT-RE-001 (Técnico), DB-RE-001 (Diccionario de BD), API-RE-001 (API), PT-RE-001 (Pruebas), MR-RE-001 (Matriz de Riesgos).
