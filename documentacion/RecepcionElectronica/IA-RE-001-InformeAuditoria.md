# Informe de Auditoria

## Recepcion Electronica (RE)

Documento de apoyo para revision de cumplimiento y alineacion del sistema Recepcion Electronica con las politicas internas PSI aplicables.

| Campo | Descripcion |
| --- | --- |
| Tipo de documento | Informe de Auditoria |
| Codigo | IA-RE-001 |
| Producto | Recepcion Electronica (RE) |
| Version | 1.0 |
| Fecha | 2026-06-26 |
| Responsable | Area de Sistemas / Desarrollo |
| Clasificacion | Uso interno |
| Estado | Vigente |

---

## 1. Objetivo

Presentar un resumen ejecutivo de los controles, evidencias y documentos que soportan la alineacion de Recepcion Electronica con los lineamientos de seguridad definidos en **PSI.01**, **PSI.05** y **PSI.12**.

Este informe sirve como guia para explicar, durante una revision o auditoria, que controles existen en el sistema, donde se documentan y que evidencia se puede mostrar.

---

## 2. Alcance

El alcance considera el sistema base de Recepcion Electronica:

- Autenticacion y recuperacion de contrasena.
- Usuarios, roles y permisos.
- Empleados.
- Visitantes.
- Registros de visitas.
- Validacion de QR.
- Kiosco y eventos.
- Reportes y exportaciones.
- Configuracion general.
- Bitacoras y evidencias.
- Anonimizacion posterior a eliminacion permanente.

Las integraciones opcionales se documentan en los documentos especificos de integracion.

---

## 3. Politicas y lineamientos revisados

| Politica | Nombre | Relacion con RE |
| --- | --- | --- |
| PSI.01 | Politica de requisitos de seguridad en los proyectos | Define requisitos de seguridad, documentacion, gestion del proyecto y controles aplicables al sistema. |
| PSI.05 | Politica de control de accesos | Define control de accesos, permisos, contrasenas, restriccion de informacion y proteccion de datos. |
| PSI.12 | Politica de desarrollo seguro | Define desarrollo seguro, pruebas, separacion de ambientes, obligaciones y buenas practicas de seguridad. |

---

## 4. Resumen de cumplimiento contra PSI

### 4.1 PSI.12 - Politica de Desarrollo Seguro

#### Principios de desarrollo seguro

Lineamientos considerados:

- Simplicidad.
- Contrasenas seguras.
- Aprender de los errores.
- Bases de seguridad.
- Enfoque de riesgos.

Cumplimiento en RE:

- El sistema utiliza autenticacion con usuario y contrasena.
- Las contrasenas se almacenan mediante hash.
- El acceso se controla por roles y permisos.
- El backend valida la informacion recibida antes de procesarla.
- Los errores se manejan mediante mensajes controlados.
- La informacion sensible no se expone en respuestas, reportes o documentacion.
- Los riesgos principales se documentan en la matriz de riesgos.

Evidencia relacionada:

- `MT-RE-001-ManualTecnico.md`
- `DF-RE-001-Funcional.md`
- `MR-RE-001-MatrizRiesgos.md`
- `TR-RE-001-MatrizTrazabilidadISO.md`

#### Pruebas

Lineamientos considerados:

- Pruebas funcionales.
- Pruebas de permisos.
- Pruebas de aceptacion.
- Pruebas de reportes.
- Pruebas de errores controlados.
- Pruebas de seguridad cuando aplique.

Cumplimiento en RE:

- Existe un plan de pruebas para validar los flujos principales.
- Se consideran pruebas de login, recuperacion de contrasena, visitantes, QR, entradas, salidas, reportes, permisos y errores.
- Las evidencias se registran mediante capturas y resultados obtenidos.
- Las pruebas se ejecutan con datos demo o anonimizados.

Evidencia relacionada:

- `PT-RE-001-Pruebas.md`
- Capturas de login, dashboard, visitantes, QR, eventos, reportes, roles y configuracion.

#### Separacion de ambientes de desarrollo, pruebas y produccion

Lineamientos considerados:

- Separacion de ambientes.
- Ambiente de pruebas funcionales.
- Ambiente de pruebas similar a produccion.
- Produccion separada de desarrollo y pruebas.
- Prohibicion de uso de datos reales de produccion en pruebas.

Cumplimiento en RE:

- El sistema se configura mediante variables de entorno.
- Las bases de datos, URLs, correos, integraciones y credenciales pueden separarse por ambiente.
- La documentacion no incluye valores reales de variables sensibles.
- Las pruebas se documentan con datos ficticios, demo o anonimizados.

Evidencia relacionada:

- `MI-RE-001-Instalacion.md`
- `MT-RE-001-ManualTecnico.md`
- `PT-RE-001-Pruebas.md`

#### Lineamientos

Lineamientos considerados:

- Identificar requisitos de seguridad.
- Documentar el sistema.
- Controlar cambios.
- Realizar pruebas.
- Controlar migraciones entre ambientes.
- Proteger informacion sensible.

Cumplimiento en RE:

- Los requerimientos se documentan en el documento de requerimientos.
- El comportamiento funcional se documenta en el documento funcional.
- La arquitectura, APIs, base de datos e instalacion se documentan por separado.
- La matriz de trazabilidad relaciona los controles PSI con los documentos y evidencias.

Evidencia relacionada:

- `DR-RE-001-Requerimientos.md`
- `DF-RE-001-Funcional.md`
- `MT-RE-001-ManualTecnico.md`
- `API-RE-001-API.md`
- `DB-RE-001-DiccionarioBD.md`
- `TR-RE-001-MatrizTrazabilidadISO.md`

#### Obligaciones de la Direccion de Sistemas

Lineamientos considerados:

- Asignar responsabilidades.
- Supervisar controles de seguridad.
- Asegurar pruebas antes de liberar.
- Controlar cambios y migraciones.
- Mantener evidencia documental.

Cumplimiento en RE:

- La documentacion identifica responsables y estado documental.
- El sistema cuenta con plan de pruebas.
- La instalacion y despliegue estan documentados.
- La matriz de riesgos identifica amenazas y controles.
- La trazabilidad PSI vincula politica, control, documento y evidencia.

Evidencia relacionada:

- `MA-RE-001-Administracion.md`
- `MI-RE-001-Instalacion.md`
- `MR-RE-001-MatrizRiesgos.md`
- `PT-RE-001-Pruebas.md`
- `TR-RE-001-MatrizTrazabilidadISO.md`

#### Obligaciones de desarrolladores internos

Lineamientos considerados:

- Aplicar desarrollo seguro.
- Validar entradas.
- Proteger datos sensibles.
- Evitar exposicion de secretos.
- Mantener documentacion actualizada.
- Realizar pruebas de seguridad cuando aplique.

Cumplimiento en RE:

- El sistema valida datos en frontend y backend.
- Los accesos se restringen por roles y permisos.
- Las contrasenas se almacenan mediante hash.
- Los secretos se gestionan mediante variables de entorno.
- Los valores reales de credenciales no se incluyen en la documentacion.
- Se documentan riesgos, pruebas, API, base de datos e instalacion.

Evidencia relacionada:

- `MT-RE-001-ManualTecnico.md`
- `API-RE-001-API.md`
- `DB-RE-001-DiccionarioBD.md`
- `MR-RE-001-MatrizRiesgos.md`

#### Gerencia de desarrollo de software

Lineamientos considerados:

- Validar el ciclo de desarrollo.
- Separar ambientes.
- Aprobar cambios.
- Mantener evidencia de pruebas.
- Registrar riesgos y controles compensatorios.

Cumplimiento en RE:

- La documentacion del sistema se encuentra versionada.
- El plan de pruebas permite registrar resultado y evidencia.
- La matriz de riesgos documenta riesgos principales y controles.
- La matriz de trazabilidad permite demostrar relacion entre PSI y RE.

Evidencia relacionada:

- `MR-RE-001-MatrizRiesgos.md`
- `PT-RE-001-Pruebas.md`
- `TR-RE-001-MatrizTrazabilidadISO.md`

#### Pruebas realizadas

Pruebas consideradas:

- Login.
- Recuperacion de contrasena.
- Registro de visitantes.
- Verificacion de visitante.
- Envio de QR.
- Validacion de QR.
- Entrada y salida.
- Kiosco y eventos.
- Roles y permisos.
- Reportes.
- Exportaciones.
- Bitacora.
- Anonimizacion posterior a eliminacion permanente.

Evidencia relacionada:

- `PT-RE-001-Pruebas.md`
- Capturas anexas de ejecucion.

---

### 4.2 PSI.05 - Politica de Control de Accesos

#### Control de accesos

Lineamientos considerados:

- Acceso autorizado.
- Privilegios minimos.
- Gestion de usuarios.
- Gestion de accesos de administrador.
- Revision de derechos de acceso.
- Uso de informacion de autenticacion secreta.

Cumplimiento en RE:

- El acceso al sistema requiere usuario y contrasena.
- Los modulos visibles dependen del rol del usuario.
- Las rutas API se protegen mediante validacion de token y rol.
- Los permisos se administran desde configuracion y roles.
- Los usuarios inactivos o eliminados permanentemente dejan de operar en el sistema.

Evidencia relacionada:

- `MA-RE-001-Administracion.md`
- `DF-RE-001-Funcional.md`
- `API-RE-001-API.md`
- `MU-RE-001-ManualUsuario.md`

#### Enmascaramiento de datos

Lineamientos considerados:

- Proteccion de datos personales.
- No exposicion de contrasenas.
- No exposicion de secretos.
- Uso de datos demo o anonimizados en pruebas.
- Restriccion de informacion visible por rol.

Cumplimiento en RE:

- La documentacion no incluye valores reales de `.env`.
- Las evidencias no deben mostrar contrasenas, tokens, QR reales ni datos personales completos.
- Las contrasenas no se muestran en claro.
- Los reportes y modulos se consultan conforme a permisos.
- Las pruebas se realizan con datos demo o anonimizados.

Evidencia relacionada:

- `PT-RE-001-Pruebas.md`
- `TR-RE-001-MatrizTrazabilidadISO.md`
- `MA-RE-001-Administracion.md`

#### Anonimizacion de datos

Lineamientos considerados:

- Reducir exposicion de datos personales.
- Mantener trazabilidad sin identificar directamente a la persona.
- Evitar recuperacion operativa de datos personales una vez cumplido el periodo definido.

Cumplimiento en RE:

- La eliminacion permanente oculta el registro en RE mediante `eliminado_permanente`.
- El registro se conserva en base de datos para trazabilidad.
- Al cumplirse 30 dias desde la eliminacion permanente, el proceso automatico de anonimizacion sobrescribe datos personales.
- Se anonimizan datos como nombre, apellidos, correo, telefono, fotografia, tokens y datos de identificacion aplicables.

Evidencia relacionada:

- `PT-RE-001-Pruebas.md`, caso PT-014.
- Backend: proceso automatico de anonimizacion de eliminados.
- Matriz de trazabilidad `TR-RE-001-MatrizTrazabilidadISO.md`.

---

### 4.3 PSI.01 - Requisitos de seguridad en proyectos

#### Seguridad en la gestion del proyecto

Lineamientos considerados:

- Requisitos de seguridad.
- Documentacion del proyecto.
- Roles y responsabilidades.
- Evidencia de pruebas.
- Resguardo de informacion critica.

Cumplimiento en RE:

- El proyecto cuenta con documentacion funcional, tecnica, administrativa, de base de datos, API, pruebas, riesgos y trazabilidad.
- Los roles y permisos del sistema se encuentran documentados.
- Los comandos de instalacion y despliegue se describen en el documento de instalacion.
- Las variables de entorno se documentan solo por nombre, sin valores reales.

Evidencia relacionada:

- `DR-RE-001-Requerimientos.md`
- `DF-RE-001-Funcional.md`
- `MA-RE-001-Administracion.md`
- `MT-RE-001-ManualTecnico.md`
- `MI-RE-001-Instalacion.md`
- `TR-RE-001-MatrizTrazabilidadISO.md`

---

## 5. Resumen tabular de evidencias

| Tema PSI | Como lo cumple RE | Documento / evidencia |
| --- | --- | --- |
| Principios de desarrollo seguro | Autenticacion, roles, validaciones, manejo de errores y proteccion de datos. | `MT-RE-001`, `DF-RE-001`, `MR-RE-001` |
| Pruebas | Casos funcionales, permisos, reportes, errores y seguridad. | `PT-RE-001` |
| Separacion de ambientes | Configuracion por `.env`, bases separadas y datos demo. | `MI-RE-001`, `MT-RE-001` |
| Lineamientos | Requerimientos, documentacion, control de cambios y trazabilidad. | `DR-RE-001`, `TR-RE-001` |
| Obligaciones | Responsables, pruebas, despliegue y control documental. | `MA-RE-001`, `PT-RE-001` |
| Control de accesos | Roles, permisos, token, rutas protegidas y visibilidad por perfil. | `MA-RE-001`, `API-RE-001` |
| Enmascaramiento de datos | No exponer secretos, contrasenas, tokens, QR reales ni datos personales completos. | `PT-RE-001`, `TR-RE-001` |
| Anonimizacion | Eliminacion permanente oculta en RE y anonimiza datos despues de 30 dias. | `PT-014`, backend de RE |

---

## 6. Resultado de la revision

| Criterio | Resultado |
| --- | --- |
| Documentacion funcional | Conforme |
| Documentacion tecnica | Conforme |
| Control de accesos | Conforme |
| Evidencia de pruebas | Conforme |
| Separacion de ambientes | Conforme |
| Proteccion de secretos | Conforme |
| Enmascaramiento de datos | Conforme |
| Anonimizacion posterior a eliminacion permanente | Conforme |

---

## 7. Conclusion

Recepcion Electronica cuenta con documentacion, controles y evidencia que permiten demostrar su alineacion con los lineamientos revisados de **PSI.01**, **PSI.05** y **PSI.12**.

El sistema contempla control de accesos por rol, proteccion de contrasenas, gestion de variables de entorno, separacion de ambientes, pruebas funcionales, trazabilidad documental y anonimizacion posterior a eliminacion permanente.

La evidencia principal para auditoria se concentra en:

- `TR-RE-001-MatrizTrazabilidadISO.md`
- `PT-RE-001-Pruebas.md`
- `MA-RE-001-Administracion.md`
- `DF-RE-001-Funcional.md`
- `MT-RE-001-ManualTecnico.md`
- `MI-RE-001-Instalacion.md`
- `MR-RE-001-MatrizRiesgos.md`

