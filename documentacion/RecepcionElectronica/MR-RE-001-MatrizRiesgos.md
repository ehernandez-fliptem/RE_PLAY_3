# Matriz de Riesgos

## Recepción Electrónica (RE) — Base

Identificación, evaluación y mitigación de riesgos del producto base.

| Campo | Descripción |
| --- | --- |
| Tipo de documento | Matriz de Riesgos |
| Código | MR-RE-001 |
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
| 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Versión inicial de la matriz de riesgos de la base. |

---

## Contenido

1. Objetivo y alcance
2. Metodología
3. Matriz de riesgos
4. Seguimiento
5. Revisión
6. Control documental

---

## 1. Objetivo y alcance

Identificar, evaluar y dar seguimiento a los principales **riesgos** asociados a la operación, la seguridad y la continuidad del producto base de **Recepción Electrónica (RE)**, así como definir las **medidas de mitigación** y los responsables correspondientes.

El alcance corresponde al **núcleo de RE** y a su entorno de operación (acceso, datos, servicio, respaldo y cambios). Los riesgos específicos de **módulos opcionales** se documentan en sus propios documentos de integración. Esta matriz se alinea con las políticas internas de seguridad (PSI.05, Control 8.11 y PSI.12).

## 2. Metodología

Cada riesgo se evalúa por **impacto** (Alto/Medio/Bajo) y **probabilidad** (Alta/Media/Baja). El **nivel** resulta de la combinación de ambos. Se define una **mitigación** y un **responsable**.

| Impacto \ Probabilidad | Baja | Media | Alta |
| --- | --- | --- | --- |
| Alto | Medio | Alto | Crítico |
| Medio | Bajo | Medio | Alto |
| Bajo | Bajo | Bajo | Medio |

## 3. Matriz de riesgos

| ID | Riesgo | Categoría | Impacto | Prob. | Nivel | Mitigación |
| --- | --- | --- | --- | --- | --- | --- |
| R-001 | Acceso no autorizado por credenciales débiles o compartidas. | Seguridad | Alto | Media | Alto | Hash de contraseñas, bloqueo por intentos, mínimo privilegio (PSI.05). |
| R-002 | Exposición de datos personales en pantallas/reportes/logs. | Seguridad | Alto | Media | Alto | Minimización/enmascaramiento, logs sin datos completos (Control 8.11). |
| R-003 | Exposición de secretos (.env, certificados). | Seguridad | Alto | Baja | Medio | Variables de entorno fuera de repositorio, resguardo de `back/secure` (PSI.12). |
| R-004 | Pérdida de datos por falta de respaldo. | Operación | Alto | Media | Alto | Respaldos periódicos de MongoDB y verificación de restauración. |
| R-005 | Indisponibilidad del servicio. | Operación | Alto | Media | Alto | Gestión con PM2, reinicio automático y monitoreo. |
| R-006 | Caída de la base de datos. | Operación | Alto | Baja | Medio | Monitoreo de MongoDB, respaldos y plan de recuperación. |
| R-007 | Errores que revelan información técnica al usuario. | Seguridad | Medio | Media | Medio | Manejo controlado de errores (PSI.12). |
| R-008 | Envío de correos fallido (invitaciones/ligas). | Operación | Medio | Media | Medio | Configuración validada de correo y reintentos. |
| R-009 | Asignación incorrecta de permisos. | Seguridad | Medio | Media | Medio | Revisión periódica de accesos y matriz de roles (PSI.05). |
| R-010 | Datos de prueba reales en ambientes no productivos. | Cumplimiento | Medio | Media | Medio | Datos ficticios/anonimizados en pruebas (Control 8.33/8.11). |
| R-011 | Tokens/ligas de registro reutilizados o expirados mal gestionados. | Seguridad | Medio | Baja | Bajo | Invalidación de token tras uso y expiración configurada. |
| R-012 | Dependencias con vulnerabilidades. | Técnico | Medio | Media | Medio | Revisión y actualización de dependencias (PSI.12). |
| R-013 | Falta de trazabilidad de cambios. | Cumplimiento | Medio | Baja | Bajo | Bitácora de cambios y control de versiones (BC-RE-001). |
| R-014 | Certificados HTTPS no válidos o vencidos. | Técnico | Medio | Media | Medio | Configuración y renovación de certificados. |

## 4. Seguimiento

| ID | Estado | Acción en curso | Responsable | Fecha de revisión |
| --- | --- | --- | --- | --- |
| R-001 | Abierto | | | |
| R-002 | Abierto | | | |
| R-004 | Abierto | | | |
| R-005 | Abierto | | | |

## 5. Revisión

Esta matriz debe revisarse al menos una vez al año o ante cambios significativos en sistemas, datos tratados o riesgos, conforme a PSI.12.

## 6. Control documental

| Documento | Código | Versión | Fecha | Responsable | Estado |
| --- | --- | --- | --- | --- | --- |
| Matriz de Riesgos — RE | MR-RE-001 | 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Vigente |
