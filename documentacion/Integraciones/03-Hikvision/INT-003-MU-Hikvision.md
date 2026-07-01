# Manual de Usuario

## Recepción Electrónica — Módulo Hikvision

Versión 1.0

---

| Campo | Descripción |
| --- | --- |
| Tipo de documento | Manual de Usuario (módulo opcional) |
| Código | INT-003-MU |
| Módulo | Hikvision + submódulo Huella y Tarjeta |
| Producto base | Recepción Electrónica (RE) |
| Versión | 1.0 |
| Fecha | 2026-06-24 |
| Responsable | Área de Sistemas / Desarrollo |
| Clasificación | Uso interno / Cliente |
| Estado | Vigente |

> Este manual describe la operación del módulo Hikvision pantalla por pantalla. El **alcance funcional** se describe en el documento INT-003-DF.

---

## Control de versiones

| Versión | Fecha | Autor | Descripción |
| --- | --- | --- | --- |
| 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Versión inicial del manual de usuario de Hikvision. |

---

## Contenido

1. Introducción
2. Objetivo
3. Alcance
4. Perfil de usuario
5. Descripción general del módulo
6. Cómo activar el módulo (Configuración)
7. Dispositivos Hikvision
   - 7.1 Nuevo panel Hikvision
   - 7.2 Acciones y sincronización
8. Cámaras
   - 8.1 Nueva cámara
9. Sincronización de personas hacia los paneles
10. Validación por rostro (operación diaria)
11. Preguntas o incidencias comunes
12. Glosario
13. Control documental

---

## Contenido de imágenes

- Ilustración 1. Interruptores de Hikvision y "Huella y tarjeta" en Configuración
- Ilustración 2. Menú de Dispositivos → Hikvision
- Ilustración 3. Listado de dispositivos Hikvision
- Ilustración 4. Alta / prueba de panel Hikvision (secretos enmascarados)
- Ilustración 5. Acciones y sincronización de un panel
- Ilustración 6. Administración de cámaras
- Ilustración 7. Alta de cámara
- Ilustración 8. Indicador de sincronización pendiente en una persona
- Ilustración 9. Validación de acceso por reconocimiento facial

---

## 1. Introducción

El presente manual describe el uso del módulo **Hikvision** dentro del sistema de **Recepción Electrónica (RE)**. Este módulo permite administrar **paneles Hikvision** de control de acceso (reconocimiento facial) y **cámaras**, **sincronizar** a las personas (usuarios, tarjetas, fotos) hacia los paneles y **registrar** los eventos que estos reportan. Con el submódulo **Huella y Tarjeta** se habilitan funciones biométricas/tarjeta mediante un **panel maestro**.

## 2. Objetivo

Describir, paso a paso, cómo dar de alta y probar paneles y cámaras, cómo se sincronizan las personas y cómo opera la **validación por rostro**, de modo que el usuario administre la integración sin dudas.

## 3. Alcance

Este manual comprende únicamente la sección **Hikvision** del sistema: paneles, cámaras, sincronización y validación por rostro. No incluye otros módulos ni la instalación física/firmware de los paneles.

## 4. Perfil de usuario

Este módulo está dirigido a usuarios con perfil **Administrador**. La administración de paneles requiere ese rol; la **validación por rostro** ocurre en la operación de acceso.

## 5. Descripción general del módulo

El módulo agrega la sección **Dispositivos → Hikvision** (paneles) y, según configuración, la sección de **Cámaras**. Los paneles se vinculan a **accesos** de RE; las personas registradas se **sincronizan** hacia ellos y los eventos de acceso regresan a RE. Con el submódulo activo, el acceso puede validarse por **reconocimiento facial**.

## 6. Cómo activar el módulo (Configuración)

**Paso 1.** Con rol **Administrador**, entre a **Configuración → pestaña Integraciones**.

`[Foto: interruptores de Hikvision y "Huella y tarjeta" en Configuración]`

**Ilustración 1.** Interruptores de Hikvision y "Huella y tarjeta" en Configuración

**Paso 2.** Encienda **"Integración con Control de accesos de Hikvision"**.

**Paso 3.** Si usará biometría/tarjeta, encienda además **"Huella y tarjeta (Hikvision)"** (solo disponible si el anterior está encendido).

**Paso 4.** Guarde. Aparece **Dispositivos → Hikvision** en el menú.

`[Foto: menú de Dispositivos → Hikvision]`

**Ilustración 2.** Menú de Dispositivos → Hikvision

> **Nota:** Si apaga la integración Hikvision, el submódulo **"Huella y tarjeta" se apaga automáticamente** y se restablece la marca de panel maestro.

## 7. Dispositivos Hikvision

La pantalla **Dispositivos Hikvision** (`/dispositivos-hikvision`) permite dar de alta, editar, probar y administrar los paneles.

`[Foto: listado de dispositivos Hikvision]`

**Ilustración 3.** Listado de dispositivos Hikvision

| N. | Campo | Descripción |
| --- | --- | --- |
| 1 | Barra superior | Nuevo panel, actualizar, exportar y buscar. |
| 2 | Tabla de paneles | Muestra nombre, IP, acceso, tipo de evento y estado. |
| 3 | Acciones | Editar, probar conexión, sincronizar, activar/inactivar. |

### 7.1 Nuevo panel Hikvision

**Paso 1.** Presione **Nuevo / Más (+)**.

`[Foto: alta / prueba de panel Hikvision (secretos enmascarados)]`

**Ilustración 4.** Alta / prueba de panel Hikvision (secretos enmascarados)

**Paso 2.** Capture los datos. Los campos con asterisco (\*) son **obligatorios**:

| Campo | Obligatorio | Descripción |
| --- | --- | --- |
| Nombre \* | Sí | Nombre único del panel. |
| Dirección IP \* | Sí | IP del panel. |
| Usuario \* | Sí | Usuario del panel (se guarda cifrado). |
| Contraseña \* | Sí | Contraseña del panel (se guarda cifrada). |
| Acceso \* | Sí | Acceso de RE vinculado. |
| Tipo de evento \* | Sí | Tipo de evento asociado. |
| Habilitar citas | No | Habilita la función de citas del panel. |
| Panel maestro | No | Marca el panel como maestro (para huella/tarjeta). |

**Paso 3.** Presione **Probar conexión**. Si es correcta, presione **Guardar**.

**Paso 4. Validación.** Si faltan datos o la conexión falla, el sistema lo indica con un **mensaje controlado** (sin exponer datos sensibles). Corrija y reintente.

### 7.2 Acciones y sincronización

`[Foto: acciones y sincronización de un panel]`

**Ilustración 5.** Acciones y sincronización de un panel

- **Editar:** modifica los datos del panel.
- **Probar conexión:** verifica la comunicación con el panel.
- **Sincronizar:** envía al panel los visitantes/empleados activos (usuarios, tarjetas, fotos).
- **Activar / Inactivar:** cambia el estado del panel.

## 8. Cámaras

La pantalla **Cámaras** (`/camaras`) —disponible según la configuración— permite administrar cámaras vinculadas a accesos y tipos de evento.

`[Foto: administración de cámaras]`

**Ilustración 6.** Administración de cámaras

### 8.1 Nueva cámara

**Paso 1.** Presione **Nuevo / Más (+)**.

`[Foto: alta de cámara]`

**Ilustración 7.** Alta de cámara

**Paso 2.** Capture:

| Campo | Obligatorio | Descripción |
| --- | --- | --- |
| Nombre \* | Sí | Nombre de la cámara. |
| Dirección IP \* | Sí | IP de la cámara. |
| Usuario / Contraseña \* | Sí | Credenciales (se guardan cifradas). |
| Acceso \* | Sí | Acceso de RE vinculado. |
| Tipo de evento \* | Sí | Tipo de evento asociado. |

**Paso 3.** Presione **Probar conexión** y luego **Guardar**.

## 9. Sincronización de personas hacia los paneles

Cuando se **crea o edita** un visitante o empleado, el sistema marca su **sincronización pendiente** con los paneles.

`[Foto: indicador de sincronización pendiente en una persona]`

**Ilustración 8.** Indicador de sincronización pendiente en una persona

- La sincronización carga en el panel el **usuario**, su **tarjeta** y su **foto**.
- Si una persona no se refleja en el panel, revise la bandera de **sincronización pendiente** y **re-sincronice** desde el panel correspondiente.

## 10. Validación por rostro (operación diaria)

`[Foto: validación de acceso por reconocimiento facial]`

**Ilustración 9.** Validación de acceso por reconocimiento facial

- En el punto de acceso, el sistema **captura el rostro** y lo compara con los datos almacenados.
- Si coincide (según el **umbral de similitud**), **autoriza** el acceso y **registra** el evento; si no, lo rechaza.
- Puede complementarse con **QR** para mayor seguridad.

![Flujo del módulo Hikvision](img/hikvision-flujo.svg)

**Diagrama 1.** Flujo de Hikvision: activación, alta y prueba del panel, sincronización de personas, eventos y validación por rostro.

## 11. Preguntas o incidencias comunes

**1. No aparece Dispositivos → Hikvision**
*Acción:* verifique que la integración esté encendida y que su rol sea **Administrador**.

**2. No se activa "Huella y tarjeta"**
*Acción:* encienda primero la integración **Hikvision**; el submódulo depende de ella.

**3. La prueba de conexión del panel falla**
*Acción:* revise IP, usuario, contraseña y la disponibilidad del panel en la red.

**4. Una persona no aparece en el panel**
*Acción:* revise la **sincronización pendiente** y re-sincronice.

**5. Los eventos llegan con hora incorrecta**
*Acción:* revise la **alerta de desfase de reloj** del panel y sincronice su hora.

**6. El rostro no es reconocido**
*Acción:* mejore la calidad de la foto, ajuste el **umbral** y use validación por **QR** como respaldo.

## 12. Glosario

**Panel Hikvision.** Dispositivo de control de acceso (reconocimiento facial) administrado desde RE.

**Cámara.** Dispositivo de captura vinculado a un acceso y tipo de evento.

**Sincronización.** Proceso que carga en el panel los usuarios, tarjetas y fotos de RE.

**Panel maestro.** Panel usado para las operaciones de huella/tarjeta del submódulo Huella y Tarjeta.

**Umbral de similitud.** Nivel de coincidencia requerido para aceptar un rostro como válido.

**Desfase de reloj.** Diferencia de hora entre el panel y el sistema; si es alta, se genera una alerta.

**Validación por rostro.** Autorización de acceso comparando el rostro capturado contra los datos almacenados.

## 13. Control documental

| Documento | Código | Versión | Fecha | Responsable | Estado |
| --- | --- | --- | --- | --- | --- |
| Manual de Usuario — Hikvision | INT-003-MU | 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Vigente |

**Documentos relacionados:** INT-003-DF (Documento Funcional), MU-RE-001, MA-RE-001, IA-RE-001.

---

**Fin del documento.**
