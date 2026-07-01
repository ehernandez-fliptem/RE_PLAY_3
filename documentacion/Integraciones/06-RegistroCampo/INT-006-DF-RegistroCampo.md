# Documento Funcional / Alcance

## Recepción Electrónica — Módulo Registro de Campo

Versión 1.0

---

| Campo | Descripción |
| --- | --- |
| Tipo de documento | Documento Funcional / Alcance (módulo opcional) |
| Código | INT-006-DF |
| Módulo | Registro de Campo |
| Producto base | Recepción Electrónica (RE) |
| Versión | 1.0 |
| Fecha | 2026-06-24 |
| Responsable | Área de Sistemas / Desarrollo |
| Clasificación | Uso interno / Cliente |
| Estado | Vigente |

> Documento autocontenido. El **Manual de Usuario** (INT-006-MU) describe la operación pantalla por pantalla.

---

## Control de versiones

| Versión | Fecha | Autor | Descripción |
| --- | --- | --- | --- |
| 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Versión inicial del documento funcional de Registro de Campo. |

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

El módulo **Registro de Campo** permite a los **empleados de campo** registrar sus movimientos de **entrada (check-in)** y **salida (check-out)** desde la web, capturando **ubicación geográfica** y **fotografía**. El administrador puede **consultar los reportes** de esos movimientos.

## 2. Qué problema resuelve

Permite controlar la asistencia y los movimientos de personal que trabaja **fuera de las instalaciones**, con evidencia de **dónde** (GPS) y **quién** (foto) realizó el registro, sin necesidad de un lector físico en sitio.

## 3. Qué módulos toca

| Módulo base | Cómo lo toca |
| --- | --- |
| Configuración | Se activa/desactiva el módulo. |
| Empleados | Usa a los empleados con rol de **campo**. |
| Reportes | El administrador consulta los movimientos de campo. |

## 4. Cómo se prende y se apaga

Se controla desde **Configuración → pestaña Integraciones**, con el interruptor:

> **"Registro de campo para empleados"** — *"Activa el módulo para permitir check-in/check-out de campo por ubicación y foto."*

| Estado | Qué ocurre |
| --- | --- |
| **Encendido** | Aparece el menú **Registro Campo** (roles Administrador y Empleado Campo) y se habilita la pantalla `/campo`. |
| **Apagado** | Se oculta el menú y se **bloquea** la ruta. Además, **los usuarios con rol Empleado Campo se desactivan**. |

**Consideraciones importantes:**

- Bandera técnica: `configuraciones.habilitarRegistroCampo`.
- Al **apagar** el módulo, los empleados de campo pierden acceso hasta reactivarlo (su usuario se desactiva).
- La **visibilidad** del interruptor depende de que `registro_campo` esté en `INTEGRACIONES_VISIBLES` cuando el modo de visibilidad es por cliente.
- El registro requiere que el navegador otorgue permiso de **ubicación** y **cámara**.

## 5. Flujo principal

1. El empleado de campo abre la pantalla **/campo**.
2. El sistema obtiene su **ubicación** (latitud/longitud y precisión).
3. El empleado presiona **Registrar Entrada** o **Registrar Salida** según corresponda.
4. Se **captura la fotografía** y se envía el movimiento.
5. El sistema **almacena** el registro y actualiza el estado (último y siguiente movimiento).
6. El administrador **consulta los reportes** de movimientos.

![Flujo del módulo Registro de Campo](img/registro-campo-flujo.svg)

**Diagrama 1.** Flujo de Registro de Campo: apertura de la pantalla, permisos, registro con ubicación y foto, y consulta de reportes.

## 6. Reglas de negocio

- Cada movimiento es de tipo **entrada (IN)** o **salida (OUT)**; el sistema indica cuál corresponde a continuación.
- Se registra la **fecha/hora del servidor** (para evitar manipulación), la **ubicación** (lat/long y precisión) y la **fotografía**.
- El empleado solo opera **sus propios** registros; los **reportes** son para el administrador.
- La ubicación y la fotografía se tratan como **datos personales**, con acceso restringido (alineado con PSI.05).

## 7. Dentro y fuera del alcance

**Dentro del alcance:**

- Registro de entrada/salida con ubicación y foto.
- Consulta del estado y de los registros propios del empleado.
- Reportes de movimientos para el administrador.

**Fuera del alcance:**

- El **control de acceso físico** a instalaciones (este módulo es de asistencia en campo, no opera puertas).
- La gestión de nómina u horarios laborales (fuera del sistema).

## 8. Errores esperados y casos especiales

| Situación | Qué pasa / qué hacer |
| --- | --- |
| El navegador no da ubicación | Otorgar permiso de **ubicación**; sin ella, el registro no puede completarse correctamente. |
| Sin señal GPS / baja precisión | El sistema captura la **precisión**; reintentar en mejor cobertura. |
| Cámara no disponible | Otorgar permiso de **cámara**; la foto es requerida. |
| Módulo apagado | El empleado de campo **no puede acceder** (su usuario se desactiva). |
| Rol no autorizado consulta reportes | El sistema **niega** el acceso; los reportes son solo del administrador. |

## 9. Control documental

| Documento | Código | Versión | Fecha | Responsable | Estado |
| --- | --- | --- | --- | --- | --- |
| Documento Funcional / Alcance — Registro de Campo | INT-006-DF | 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Vigente |

**Documentos relacionados:** INT-006-MU (Manual de Usuario), MU-RE-001, DF-RE-001, MA-RE-001.

---

**Fin del documento.**
