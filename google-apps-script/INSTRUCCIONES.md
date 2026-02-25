# 📋 INSTRUCCIONES: Desplegar Google Apps Script como Web App

## ¿Qué hace este script?
Este archivo (`Code.gs`) contiene **todo el backend del sistema** en JavaScript de Google.
Reemplaza los archivos PHP y conecta directamente con tu Google Sheets.

---

## 🚀 PASO A PASO

### PASO 1 — Abrir el editor de Google Apps Script

1. Ve a: https://script.google.com
2. Haz clic en **"Nuevo proyecto"**
3. Ponle un nombre al proyecto: `Sistema C2 Tzompantepec`

---

### PASO 2 — Pegar el código

1. Borra todo el contenido del archivo `Code.gs` que aparece
2. Abre el archivo `Code.gs` de esta carpeta
3. Copia **todo** su contenido y pégalo en el editor de Google Apps Script
4. Presiona **Ctrl + S** para guardar

---

### PASO 3 — Desplegar como Web App

1. Haz clic en el botón **"Implementar"** (esquina superior derecha)
2. Selecciona **"Nueva implementación"**
3. Haz clic en el ícono ⚙️ (engranaje) junto a "Tipo"
4. Selecciona **"Aplicación web"**
5. Configura:
   - **Descripción**: `Sistema C2 v2.1`
   - **Ejecutar como**: `Yo (tu cuenta de Gmail)`
   - **Quién tiene acceso**: **"Cualquier usuario"** (Anyone) ← ¡MUY IMPORTANTE!
6. Haz clic en **"Implementar"**
7. Autoriza los permisos que solicite (es tu propio script)
8. **Copia la URL** que aparece. Se ve así:
   ```
   https://script.google.com/macros/s/AKfycbxXXXXXXXXXXXXXXXXXXXXXXXXXXXX/exec
   ```

---

### PASO 4 — Configurar la URL en el proyecto

1. Abre el archivo `js/gas-api.js` en tu proyecto
2. Busca esta línea:
   ```javascript
   const GAS_WEBAPP_URL = 'REEMPLAZAR_CON_URL_DE_WEB_APP';
   ```
3. Reemplázala con tu URL real:
   ```javascript
   const GAS_WEBAPP_URL = 'https://script.google.com/macros/s/TU_ID_REAL/exec';
   ```
4. Guarda el archivo

---

### PASO 5 — Inicializar las hojas de Google Sheets

Una vez desplegado, visita esta URL en tu navegador para crear las hojas automáticamente:
```
https://script.google.com/macros/s/TU_ID_REAL/exec?action=inicializar
```

Deberías ver:
```json
{"success": true, "message": "Hojas inicializadas correctamente"}
```

Esto creará en tu Google Sheet:
- Hoja **PERSONAL** con encabezados dorados
- Hoja **USUARIOS** con encabezados dorados + usuario admin por defecto

---

### PASO 6 — Hacer push a GitHub

```bash
git add .
git commit -m "feat: Integrar Google Apps Script como backend"
git push origin main
```

---

## ✅ Verificar que funciona

Prueba en tu navegador:
```
https://script.google.com/macros/s/TU_ID/exec?action=getUsuarios
```
Debe responder: `[]` (array vacío hasta que registres usuarios)

---

## 🔑 Credenciales de acceso iniciales

Después de inicializar, el sistema crea este usuario administrador por defecto:
- **Usuario**: `admin`
- **Contraseña**: `admin123`
- **Rol**: `ADMIN`

⚠️ **Cámbialo después de tu primer acceso** creando un nuevo usuario real desde el panel de Gestión de Usuarios.

---

## ⚠️ IMPORTANTE: Permisos de Google Sheet

Tu Google Sheet con ID `12_nohX3MHsU8WrvhDKLYbQYr0uoMFvlx30ICjjJsT2M`
debe estar **compartida** con la cuenta de Gmail que uses para el Google Apps Script.

Si eres el dueño del Sheet y del Script con la misma cuenta, no necesitas hacer nada extra.

---

## 🆘 Solución de problemas

| Error | Solución |
|---|---|
| `Quota exceeded` | El script excedió límite de ejecuciones. Espera 1 minuto |
| `Permission denied` | Asegúrate de que "Quién tiene acceso" sea "Cualquier usuario" |
| `No se pudo conectar` | Verifica que la URL en `gas-api.js` sea correcta |
| `CORS error` | El script permite CORS automáticamente desde Google |
