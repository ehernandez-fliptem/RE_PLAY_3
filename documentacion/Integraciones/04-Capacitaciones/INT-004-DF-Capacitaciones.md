# Documento Funcional / Alcance

## Recepción Electrónica — Módulo Capacitaciones Públicas

Versión 1.0

---

| Campo | Descripción |
| --- | --- |
| Tipo de documento | Documento Funcional / Alcance (módulo opcional) |
| Código | INT-004-DF |
| Módulo | Capacitaciones Públicas |
| Producto base | Recepción Electrónica (RE) |
| Versión | 1.0 |
| Fecha | 2026-06-24 |
| Responsable | Área de Sistemas / Desarrollo |
| Clasificación | Uso interno / Cliente |
| Estado | Vigente |

> Documento autocontenido. El **Manual de Usuario** (INT-004-MU) describe la operación pantalla por pantalla.

---

## Control de versiones

| Versión | Fecha | Autor | Descripción |
| --- | --- | --- | --- |
| 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Versión inicial del documento funcional de Capacitaciones. |

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

El módulo **Capacitaciones** permite crear contenidos de capacitación por **pasos y bloques**, publicarlos mediante una **liga pública** (sin necesidad de iniciar sesión) y **registrar los resultados** de quienes los completan.

## 2. Qué problema resuelve

Permite que visitantes, contratistas o personal completen una **inducción/capacitación** antes o durante su visita, mediante un enlace, y deja **evidencia** de quién la completó. Evita procesos manuales de inducción y centraliza el material y los resultados.

## 3. Qué módulos toca

| Módulo base | Cómo lo toca |
| --- | --- |
| Configuración | Se activa/desactiva el módulo. |
| Correo / difusión | La liga pública se comparte con los participantes. |
| (Independiente del control de acceso) | No opera puertas; es contenido y resultados. |

## 4. Cómo se prende y se apaga

Se controla desde **Configuración → pestaña Integraciones**, con el interruptor:

> **"Capacitaciones públicas"** — *"Habilita el módulo privado de capacitaciones y las rutas públicas para cursos guiados."*

| Estado | Qué ocurre |
| --- | --- |
| **Encendido** | Aparece el menú **Capacitaciones** (roles Administrador y Recepción) y se habilitan las **rutas públicas** de los cursos. |
| **Apagado** | Se oculta el menú y **todas las rutas de capacitaciones se desactivan**: el acceso público responde con un error controlado (no encontrado / módulo desactivado). |

**Consideraciones importantes:**

- Bandera técnica: `configuraciones.habilitarCapacitacionPublica`.
- Un **middleware** protege las rutas: cuando el módulo está apagado, las peticiones a capacitaciones devuelven **404** con el código `CAPACITACION_PUBLICA_DESACTIVADA`.
- Apagar el módulo **no desactiva usuarios** (a diferencia de otras integraciones); solo bloquea el contenido.
- La **visibilidad** del interruptor depende de que `capacitacion_publica` esté en `INTEGRACIONES_VISIBLES` cuando el modo de visibilidad es por cliente.

## 5. Flujo principal

1. El administrador **crea** la capacitación, define **pasos y bloques** y la **publica**.
2. Se comparte la **liga pública** con los participantes.
3. El participante abre la liga (**sin iniciar sesión**) y completa los pasos según las reglas de avance.
4. Al finalizar, se **envía el resultado** y queda almacenado.
5. El administrador **consulta los resultados**.

![Flujo del módulo Capacitaciones](img/capacitaciones-flujo.svg)

**Diagrama 1.** Flujo de Capacitaciones: de la creación del contenido a la liga pública y la consulta de resultados.

## 6. Reglas de negocio

- Estados de la capacitación: **borrador**, **publicada**, **inactiva**. Solo las **publicadas** son accesibles por liga.
- Tipos de bloque disponibles: identificación, texto, imagen, video, link, checklist, tarjetas, acordeón, pregunta, separador, documento y aviso.
- Se pueden configurar **reglas de avance** por paso (tiempo mínimo, ver bloques, responder preguntas, etc.).
- Los datos del participante se **minimizan**; puede permitirse participación **anónima** según configuración.

## 7. Dentro y fuera del alcance

**Dentro del alcance:**

- Creación/edición/duplicado/eliminación de capacitaciones con pasos y bloques.
- Estados (borrador/publicada/inactiva), vista previa y publicación por liga.
- Acceso público sin login y registro/consulta de resultados.

**Fuera del alcance:**

- El **control de acceso físico** o la vinculación obligatoria a una visita (es contenido y evidencia).
- La difusión masiva del enlace por medios externos.

## 8. Errores esperados y casos especiales

| Situación | Qué pasa / qué hacer |
| --- | --- |
| La liga pública no abre | Verificar que el módulo esté **encendido** y que la capacitación esté **publicada**; si el módulo está apagado, responde 404. |
| El participante no ve el contenido | Revisar el estado (debe estar **publicada**) y la vigencia del enlace/slug. |
| Contenido interno expuesto por error | Publicar solo lo necesario; el estado y el slug controlan el acceso. |
| Datos personales de más | Minimizar los datos solicitados o permitir participación anónima. |

## 9. Control documental

| Documento | Código | Versión | Fecha | Responsable | Estado |
| --- | --- | --- | --- | --- | --- |
| Documento Funcional / Alcance — Capacitaciones | INT-004-DF | 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Vigente |

**Documentos relacionados:** INT-004-MU (Manual de Usuario), MU-RE-001, DF-RE-001, MA-RE-001.

---

**Fin del documento.**
