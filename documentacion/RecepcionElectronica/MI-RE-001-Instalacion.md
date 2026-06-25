# Manual de Instalación y Despliegue

## Recepción Electrónica (RE) — Base

Guía de instalación, despliegue y operación de los procesos del núcleo de Recepción Electrónica.

| Campo | Descripción |
| --- | --- |
| Tipo de documento | Manual de Instalación / Despliegue |
| Código | MI-RE-001 |
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
| 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Versión inicial del manual de instalación. |

---

## Contenido

1. Requisitos previos
2. Instalación desde cero
3. Variables de entorno
4. Actualización
5. Flujo manual
6. Operación con PM2
7. HTTPS
8. Scripts disponibles
9. Verificación post-despliegue
10. Respaldo y recuperación
11. Control documental

---

## Contenido de imágenes

- Ilustración 1. Verificación de versiones (node, npm, mongod)
- Ilustración 2. Ejecución exitosa de setup.ps1
- Ilustración 3. Salida de pm2 list con el proceso back en línea
- Ilustración 4. Pantalla de login tras el despliegue

---

## 1. Requisitos previos

- Node.js LTS.
- MongoDB Community Server.
- PM2 (instalado de forma global).
- PowerShell (Windows).

`[Foto: verificación de versiones con node -v, npm -v y mongod --version]`

**Ilustración 1.** Verificación de versiones (node, npm, mongod)

## 2. Instalación desde cero

Desde la raíz del repositorio:

```powershell
PowerShell -ExecutionPolicy Bypass -File scripts\setup.ps1
```

El script instala dependencias, compila y levanta los procesos con PM2.

`[Foto: ejecución exitosa de setup.ps1]`

**Ilustración 2.** Ejecución exitosa de setup.ps1

## 3. Variables de entorno

Las variables se configuran en los archivos `.env` correspondientes. **No deben contener valores reales en la documentación ni en repositorios.**

### 3.1 Backend (`back/.env`)

`NODE_ENV`, `ENDPOINT`, `PUERTO_HTTP`, `PUERTO_HTTPS`, `MONGODB_URI`, `SECRET`, `SECRET_EMAIL`, `SECRET_CRYPTO`, `SECRET_TOKEN_SOCKET`, `SECRET_EXCELJS`, `LIFE_TIME`, `LIFE_TIME_EMAIL`, `LIFE_TIME_RESTRICTED`, `MAIL_USER`, `MAIL_PASS`, `INTEGRACIONES_VISIBILIDAD_MODO`, `INTEGRACIONES_VISIBLES`, `CLIENTE_ID`.

> Las variables específicas de módulos opcionales (por ejemplo de paneles o correo de visitantes) se documentan en los módulos correspondientes.

### 3.2 Correos (`back/.env.correos.example`)

Variables `MAIL_*` y `MAIL_VISITANTES_*` para el envío de invitaciones, ligas y notificaciones.

### 3.3 Raíz / instalación local (`.env`)

`REPLAY_BACK_HOST`, `REPLAY_BACK_PORT`, `REPLAY_BACK_HTTPS_PORT`, `REPLAY_PANEL_PORT`.

## 4. Actualización

```powershell
PowerShell -ExecutionPolicy Bypass -File scripts\update.ps1 -Target all
```

Por módulo:

```powershell
PowerShell -ExecutionPolicy Bypass -File scripts\update.ps1 -Target back
PowerShell -ExecutionPolicy Bypass -File scripts\update.ps1 -Target backfront
```

## 5. Flujo manual

### 5.1 Frontend

```powershell
cd "<RUTA_BASE>\RE_PLAY_3\front"
npm install --legacy-peer-deps
npm i -D typescript
npm run build
```

Copiar build al backend:

```powershell
mkdir "<RUTA_BASE>\RE_PLAY_3\back\dist\dist"
xcopy /E /I /Y "<RUTA_BASE>\RE_PLAY_3\front\dist" "<RUTA_BASE>\RE_PLAY_3\back\dist\dist"
```

### 5.2 Backend

```powershell
cd "<RUTA_BASE>\RE_PLAY_3\back"
npm install
npm i -D typescript
npm run build
pm2 start dist\index.js --name back
```

## 6. Operación con PM2

```powershell
pm2 list                       # Estado de procesos
pm2 logs back --err --lines 50 # Logs de errores
pm2 restart back               # Reiniciar
pm2 save                       # Guardar estado
```

`[Foto: salida de pm2 list con el proceso back en línea]`

**Ilustración 3.** Salida de pm2 list con el proceso back en línea

## 7. HTTPS

```powershell
PowerShell -ExecutionPolicy Bypass -File scripts\https_setup.ps1
```

Los certificados se almacenan en `back/secure` y deben tratarse como información sensible.

## 8. Scripts disponibles

| Script | Uso |
| --- | --- |
| `scripts/setup.ps1` | Instalación completa desde cero. |
| `scripts/update.ps1` | Build/copia/reinicio por módulo. |
| `scripts/update-with-deps.ps1` | Actualización con dependencias. |
| `scripts/start.ps1` / `stop.ps1` | Arranque / detención. |
| `scripts/build.ps1` | Compilación. |
| `scripts/https_setup.ps1` | Configuración HTTPS. |
| `scripts/make-exe.ps1` | Empaquetado/instalador. |

## 9. Verificación post-despliegue

1. `pm2 list` muestra el proceso `back` en línea.
2. La aplicación responde en el puerto configurado (`/`).
3. La pantalla de login carga correctamente.
4. El flujo de setup inicial aparece si la instalación es nueva.

`[Foto: pantalla de login cargada tras el despliegue]`

**Ilustración 4.** Pantalla de login tras el despliegue

## 10. Respaldo y recuperación

- Respaldar la base de datos MongoDB de forma periódica (`mongodump`).
- Resguardar los archivos `.env` y certificados de `back/secure` en un lugar seguro.
- Documentar fecha y responsable de cada respaldo.

## 11. Control documental

| Documento | Código | Versión | Fecha | Responsable | Estado |
| --- | --- | --- | --- | --- | --- |
| Manual de Instalación / Despliegue — RE | MI-RE-001 | 1.0 | 2026-06-24 | Área de Sistemas / Desarrollo | Vigente |
