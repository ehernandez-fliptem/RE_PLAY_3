# GUÍA COMPLETA – LEVANTAR RE_PLAY_3 (BACK + FRONT + PM2)

## 📁 Ruta base del proyecto

```
<RUTA_BASE>\RE_PLAY_3
```

## 📦 Proyectos

- back (API)
- panel_server
- demonio_eventos
- front (Vite / React)

---
## Comandos rapidos (PowerShell)

Desde la raiz del repo:

### Instalacion desde 0

```
PowerShell -ExecutionPolicy Bypass -File scripts\setup.ps1
```

Nota: este script limpia procesos viejos de PM2 (pm2 delete all + pm2 save) antes de levantar los nuevos.

### Actualizacion (build + copia front + restart PM2)

```
PowerShell -ExecutionPolicy Bypass -File scripts\update.ps1
```


---
# Si no funciona hacerlo manual
---
# Pasos para hacerlo manual 

## 0) Abrir terminal

Abrir **CMD** o **PowerShell** como Administrador.

---

## 1) Verificar PM2

```
pm2 -v
```

Si no existe:

```
npm i -g pm2
```

---

## 2) Limpiar procesos viejos de PM2

```
pm2 delete all
```

---

## 3) FRONT (Vite / React) – primero

### 3.1 Entrar

```
cd "<RUTA_BASE>\RE_PLAY_3\front"
```

### 3.2 Instalar dependencias (ignorar peer deps)

```
npm install --legacy-peer-deps
```

### 3.3 Instalar TypeScript

```
npm i -D typescript
```

### 3.4 Build del front

```
npm run build
```

Confirmar que existe:

```
dir dist
```

Debe existir `index.html`.

---

## 4) Copiar FRONT al BACK (sin cambiar código)

El back busca:

```
back\dist\dist\index.html
```

### 4.1 Crear carpeta destino

```
mkdir "<RUTA_BASE>\RE_PLAY_3\back\dist\dist"
```

### 4.2 Copiar build del front

```
xcopy /E /I /Y "<RUTA_BASE>\RE_PLAY_3\front\dist" "<RUTA_BASE>\RE_PLAY_3\back\dist\dist"
```

Verificar:

```
dir "<RUTA_BASE>\RE_PLAY_3\back\dist\dist"
```

---

## 5) BACK (API)

### 5.1 Entrar al back

```
cd "<RUTA_BASE>\RE_PLAY_3\back"
```

### 5.2 Instalar dependencias

```
npm install
```

### 5.3 Asegurar TypeScript (solo si el build usa tsc)

```
npm i -D typescript
```

### 5.4 Build

```
npm run build
```

### 5.5 Ver archivo de arranque

```
dir dist
```

Si existe `index.js` (el correcto):

```
pm2 start dist\index.js --name back
```


---

## 6) PANEL_SERVER

### 6.1 Entrar

```
cd "<RUTA_BASE>\RE_PLAY_3\panel_server"
```

### 6.2 Instalar

```
npm install
```

### 6.3 TypeScript (si aplica)

```
npm i -D typescript
```

### 6.4 Build

```
npm run build
```

### 6.5 Levantar

Si hay `dist\index.js`:

```
pm2 start dist\index.js --name panel_server
```

---

## 7) DEMONIO_EVENTOS

### 7.1 Entrar

```
cd "<RUTA_BASE>\RE_PLAY_3\demonio_eventos"
```

### 7.2 Instalar

```
npm install
```

### 7.3 TypeScript

```
npm i -D typescript
```

### 7.4 Build

```
npm run build
```

### 7.5 Levantar

```
pm2 start dist\index.js --name demonio_eventos
```

---

## 8) Reinicio (build + PM2)

El reinicio correcto es:

1) Correr build

```
npm run build
```

2) Reiniciar todos los procesos

```
pm2 restart all
```

---

## 9) Ver estado de todo

```
pm2 list
```

### Logs en caso de error

```
pm2 logs back --err --lines 50
pm2 logs panel_server --err --lines 50
pm2 logs demonio_eventos --err --lines 50
```

---

## 10) Guardar configuración de PM2

(para que sobreviva reinicios del sistema)

```
pm2 save
```

---

## ✅ Notas importantes

- Si el front no compila → usar siempre:

  ```
  npm install --legacy-peer-deps
  ```

- Si aparece "tsc no se reconoce" → instalar TypeScript:

  ```
  npm i -D typescript
  ```

- El front **NO** se levanta con PM2, solo se compila y se copia al back.

- Cada vez que cambies el front:

  1) Ejecuta el build del front:

  ```
  npm run build
  ```

  2) Ve a la carpeta del front y copia la carpeta `dist`.


  3) Pégala dentro de `back\dist` (debe quedar `back\dist\dist`).

---

