# RE_PLAY_3

Sistema de recepcion y control de acceso con sincronizacion hacia paneles Hikvision.

## Modulos

- `back`: API principal y logica de negocio.
- `front`: interfaz web (Vite/React).
- `panel_server`: capa de integracion con paneles Hikvision (usuarios, tarjetas, foto, eventos).
- `demonio_eventos`: proceso de eventos en segundo plano.

## Estructura del repositorio

```text
RE_PLAY_3/
  back/
  front/
  panel_server/
  demonio_eventos/
  scripts/
  tools/
  GUIA_LEVANTAR_RE_PLAY_3.md
```

## Requisitos

- Node.js (recomendado LTS)
- MongoDB Community Server
- PM2 global (`npm i -g pm2`)
- PowerShell (Windows)

## Levantar desde cero (recomendado)

Desde la raiz del repo:

```powershell
PowerShell -ExecutionPolicy Bypass -File scripts\setup.ps1
```

Este flujo instala dependencias, compila y levanta procesos con PM2.

## Actualizacion rapida

```powershell
PowerShell -ExecutionPolicy Bypass -File scripts\update.ps1 -Target all
```

Actualizacion por modulo:

```powershell
PowerShell -ExecutionPolicy Bypass -File scripts\update.ps1 -Target back
PowerShell -ExecutionPolicy Bypass -File scripts\update.ps1 -Target panel
PowerShell -ExecutionPolicy Bypass -File scripts\update.ps1 -Target demonio
PowerShell -ExecutionPolicy Bypass -File scripts\update.ps1 -Target backfront
PowerShell -ExecutionPolicy Bypass -File scripts\update.ps1 -Target all
```

## Operacion con PM2

Ver estado:

```powershell
pm2 ls
```

Ver logs:

```powershell
pm2 logs
```

Reiniciar servicios:

```powershell
pm2 restart back
pm2 restart panel_server
pm2 restart demonio_eventos
```

Guardar estado actual de PM2:

```powershell
pm2 save
```

## Flujo manual (si scripts fallan)

Referencia completa en:

- `GUIA_LEVANTAR_RE_PLAY_3.md`

Resumen:

1. Compilar `front` (`npm run build`).
2. Copiar build de `front` a `back/dist/dist`.
3. Compilar `back`, `panel_server`, `demonio_eventos`.
4. Levantar cada modulo con PM2.

## Notas

- El frontend servido en produccion sale desde `back/dist`.
- La integracion de paneles se procesa en `panel_server`.
- Para cambios operativos, usar primero `scripts/update.ps1`.

## Documentacion adicional

- [GUIA_LEVANTAR_RE_PLAY_3.md](./GUIA_LEVANTAR_RE_PLAY_3.md)
- [GUIA_HTTPS_CAMARA.md](./GUIA_HTTPS_CAMARA.md)
- [GUIA_SETUP_EXE.md](./GUIA_SETUP_EXE.md)
