# Documento Funcional / Alcance

## Recepción Electrónica — Módulo Configuración Avanzada de Visitantes (Ingreso en Vehículo)

Versión 1.0

---

| Campo | Descripción |
| --- | --- |
| Tipo de documento | Documento Funcional / Alcance (módulo opcional) |
| Código | INT-005-DF |
| Módulo | Configuración avanzada de visitantes — Ingreso en vehículo |
| Producto base | Recepción Electrónica (RE) |
| Versión | 1.0 |
| Fecha | 2026-06-24 |
| Responsable | Área de Sistemas / Desarrollo |
| Clasificación | Uso interno / Cliente |
| Estado | Vigente |

> Documento autocontenido. El **Manual de Usuario** (INT-005-MU) describe la operación pantalla por pantalla.

---

## Control de versiones

| Versión | Fecha | Autor | Descripción |
| --- | --- | --- | --- |
| 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Versión inicial. Alcance limitado al ingreso en vehículo de visitantes, verificado en código. |

---

## Contenido

1. Qué hace la integración
2. Qué problema resuelve
3. Qué módulos toca
4. Cómo se prende y se apaga
5. Flujo principal
6. Reglas de negocio
7. Dentro y fuera del alcance
8. Errores esperados y casos especiales
9. Control documental

---

## 1. Qué hace la integración

El módulo **Configuración avanzada de visitantes** habilita, de forma opcional, el **registro del ingreso en vehículo** de los visitantes: permite indicar si el visitante llega en coche y **capturar los documentos del vehículo**.

En la práctica, este es el **único control** que el módulo aplica hoy: activa (y hace visible) la opción **"Ingreso en vehículo"** dentro del registro de visitantes.

> **Aclaración importante.** Otras funciones que a veces se asocian al "registro avanzado de visitantes" —**lectura de identificación (OCR de INE)**, **autorización por QR**, **verificación**, **bloqueo/desbloqueo**, **programación masiva**, **reversión de creación** y **re-sincronización con paneles**— **forman parte del producto base** y están **siempre disponibles**; **no dependen** de este módulo. Se documentan en el Manual de Usuario de la base (MU-RE-001).

## 2. Qué problema resuelve

Permite controlar el **ingreso de visitantes en vehículo** y su documentación (licencia, póliza, tarjeta de circulación) solo cuando el cliente lo necesita, sin recargar el formulario de registro para quienes no usan esta función.

## 3. Qué módulos toca

| Módulo base | Cómo lo toca |
| --- | --- |
| Configuración | Se activan los interruptores del módulo. |
| Visitantes | En el **registro y edición** del visitante aparece la sección de vehículo y sus documentos. |

## 4. Cómo se prende y se apaga

Se controla desde **Configuración → pestaña Integraciones**, con **dos interruptores** (uno depende del otro):

> **"Configuración avanzada de visitantes"** — *"Activa controles opcionales para el registro de visitantes. Si se apaga, sus opciones quedan guardadas pero no se aplican."*
>
> **"Ingreso en vehículo"** — *"Permite capturar documentos de vehículo en visitantes."*

| Interruptor | Estado | Qué ocurre |
| --- | --- | --- |
| Configuración avanzada | Encendido | **Muestra y habilita** el sub-interruptor "Ingreso en vehículo". |
| Configuración avanzada | Apagado | El sub-interruptor de vehículo **no se muestra** y sus opciones **no se aplican** (aunque quedan guardadas). |
| Ingreso en vehículo | Encendido | En el registro/edición del visitante aparece la opción **"¿Viene en coche?"** y la captura de documentos del vehículo. Requiere el interruptor padre encendido. |
| Ingreso en vehículo | Apagado | La sección de vehículo no aparece en el registro. |

**Consideraciones importantes:**

- Banderas técnicas: `configuraciones.habilitarVisitantesAvanzado` (padre) y `configuraciones.habilitarVisitantesVehiculo` (vehículo).
- Para que la captura de vehículo se aplique, se requieren **ambos** encendidos.
- Si el módulo se apaga, los datos de vehículo enviados se **ignoran/limpian** en el servidor.
- La **visibilidad** del interruptor depende de que `visitantes_avanzado` esté en `INTEGRACIONES_VISIBLES` cuando el modo de visibilidad es por cliente.

## 5. Flujo principal

1. El administrador enciende **"Configuración avanzada de visitantes"** y **"Ingreso en vehículo"**.
2. Al **registrar o editar** un visitante aparece la opción **"¿Viene en coche?"**.
3. Si se marca, se capturan los **documentos del vehículo**.
4. Al **guardar**, el sistema **valida** que estén los documentos requeridos.
5. Si el módulo está **apagado**, la opción no aparece y los datos de vehículo no se aplican.

## 6. Reglas de negocio

- Cuando el visitante **"viene en coche"**: la **licencia** y la **póliza de seguro** son **obligatorias**; la **tarjeta de circulación** es **opcional**.
- Con el módulo **apagado**, los datos de vehículo **no se aplican** (se ignoran aunque se envíen).
- La configuración del módulo **se conserva** aunque se apague; al reactivarlo, vuelve a aplicarse.

## 7. Dentro y fuera del alcance

**Dentro del alcance:**

- Opción de **ingreso en vehículo** en el registro/edición de visitantes.
- Captura y validación de los **documentos del vehículo** (licencia, póliza, tarjeta de circulación).

**Fuera del alcance (son funciones de la BASE, no de este módulo):**

- El **registro base** de visitantes y su ciclo de visita.
- **OCR de INE**, **autorización por QR**, **verificación**, **bloqueo/desbloqueo**, **programación masiva**, **reversión de creación** y **re-sincronización con paneles**: todas **siempre disponibles** en la base, independientes de este módulo.

## 8. Errores esperados y casos especiales

| Situación | Qué pasa / qué hacer |
| --- | --- |
| No aparece "Ingreso en vehículo" en Configuración | Encender primero **"Configuración avanzada de visitantes"** (el sub-interruptor depende de él). |
| No aparece la sección de vehículo al registrar | Verificar que **ambos** interruptores estén encendidos. |
| Marcó "viene en coche" pero faltan documentos | Al guardar, el sistema **resalta en rojo** la **licencia** y la **póliza** (obligatorias); adjúntelas y guarde. |
| Módulo apagado con datos de vehículo capturados | El servidor **ignora/limpia** esos datos; la configuración se conserva para cuando se reactive. |

## 9. Control documental

| Documento | Código | Versión | Fecha | Responsable | Estado |
| --- | --- | --- | --- | --- | --- |
| Documento Funcional / Alcance — Configuración avanzada de visitantes | INT-005-DF | 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Vigente |

**Documentos relacionados:** INT-005-MU (Manual de Usuario), MU-RE-001, DF-RE-001, MA-RE-001.

---

**Fin del documento.**
