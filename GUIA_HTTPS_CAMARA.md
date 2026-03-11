# GUIA HTTPS CAMARA (TABLETS / CELULARES)

Esta guia sirve para activar HTTPS en la workstation y permitir que la camara funcione en iPhone/iPad/Android.

## Requisitos

- La app ya debe estar corriendo en la workstation (back/front) y accesible por IP.
- Tener la IP local de la workstation.

## Comando rapido (PowerShell)

Desde la raiz del repo:

```
PowerShell -ExecutionPolicy Bypass -File scripts\https_setup.ps1 -IP 192.168.100.118
```

Opcional:

```
PowerShell -ExecutionPolicy Bypass -File scripts\https_setup.ps1 -IP 192.168.100.118 -BackendPort 80 -HttpsPort 8443
```

## Que hace el script

- Descarga mkcert (si no existe).
- Instala la CA local de mkcert.
- Genera certificado para la IP indicada.
- Descarga Caddy (si no existe).
- Configura Caddy con HTTPS y reverse proxy al back.
- Arranca Caddy.

## URL final

Abre en la tablet:

```
https://<IP_WORKSTATION>:8443
```

Ejemplo:

```
https://192.168.100.118:8443
```
<!-- 
## Paso obligatorio en iPhone/iPad

1. Copia a la tablet el archivo:

```
%USERPROFILE%\AppData\Local\mkcert\rootCA.pem
```

2. Instala el certificado en Ajustes.
3. Activalo en:

```
Ajustes -> General -> Informacion -> Ajustes de confianza de certificados
```

## Notas

- En iOS la camara NO funciona en HTTP. Solo HTTPS o localhost.
- Si quieres usar puerto 443, asegurate de liberar ese puerto en la workstation.
- Si el firewall bloquea el puerto 8443, abre ese puerto en Windows.

## Puertos e IP (importante)

- El puerto del BACK viene de `.env`:
  - `REPLAY_BACK_PORT` (HTTP)
  - `REPLAY_BACK_HTTPS_PORT` (si el back usa HTTPS directo)
- La IP **no se toma del `.env`**. Se usa la IP real de la workstation.

Si cambias el puerto en `.env`, tambien debes actualizar el comando del script:

```
PowerShell -ExecutionPolicy Bypass -File scripts\https_setup.ps1 -IP <IP_WORKSTATION> -BackendPort <PUERTO_BACK> -HttpsPort <PUERTO_HTTPS>
```

Ejemplo:

```
PowerShell -ExecutionPolicy Bypass -File scripts\https_setup.ps1 -IP 192.168.100.118 -BackendPort 3000 -HttpsPort 8443
```

Si cambia la IP (por ejemplo Wi‑Fi vs Ethernet), hay que generar un nuevo certificado con la nueva IP y volver a abrir con esa URL.

 -->