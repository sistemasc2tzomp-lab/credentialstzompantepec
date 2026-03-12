# 🧪 Laboratorio de Desarrollo Local - SIBIM Tzompantepec

Este documento contiene las instrucciones necesarias para ejecutar y probar el sistema de credencialización en tu equipo local antes de subir los cambios a producción (Netlify).

## 🛠️ Requisitos Previos

1. **Node.js**: Asegúrate de tener instalado Node.js en tu equipo. [Descargar aquí](https://nodejs.org/).
2. **Navegador Moderno**: Chrome, Brave o Edge (recomendado para ver los efectos 3D).

---

## 🚀 Cómo iniciar el servidor de pruebas

Para evitar problemas de permisos (CORS) y asegurar que las funciones de Google Apps Script y las animaciones premium carguen correctamente, sigue estos pasos:

1. Abre una terminal (PowerShell o CMD) en la carpeta raíz del proyecto:
   `c:\Users\ROMERO\Desktop\credencializacionsegpubtzomp`

2. Ejecuta el siguiente comando:
   ```powershell
   npx live-server
   ```

3. **¡Listo!** El sistema se abrirá automáticamente en: `http://127.0.0.1:8080`

### Ventajas de usar Live-Server:
* **Hot Reload**: El navegador se refresca automáticamente cada vez que guardas un archivo en el editor.
* **Consistencia**: Emula un servidor real, garantizando que lo que ves localmente sea idéntico a lo que verás en Netlify.

---

## 📋 Lista de Verificación (QA)

Antes de subir a Netlify, asegúrate de probar lo siguiente:

### 1. Interfaz y Experiencia
* [ ] **Bienvenida**: Verifica que al loguearte aparezca el mensaje "¡BUEN DÍA/TARDE/NOCHE!" con tu nombre.
* [ ] **Efectos 3D**: Pasa el mouse sobre el escudo en la página de inicio para ver el efecto de profundidad.
* [ ] **Iconos**: Asegúrate de que los iconos tengan sus sombras y efectos de elevación.

### 2. Seguridad (RBAC)
* [ ] **Sesión Administrativa**: Entra con un usuario ADMIN y verifica que puedes ver el menú de "Usuarios".
* [ ] **Sesión de Auditor**: Entra con un usuario AUDITOR y verifica que NO existan botones de "Editar" o "Dar de Baja".

### 3. Conectividad
* [ ] **Google Sheets**: Verifica que las tablas de personal carguen datos reales desde la API de Google.
* [ ] **Logs**: Realiza una acción y verifica que aparezca en el historial de movimientos.

---

## 🛠️ Solución de Problemas

* **¿Los cambios no se ven?**: Presiona `Ctrl + F5` para limpiar la caché del navegador.
* **¿Error en rojo en la consola?**: Presiona `F12`, ve a la pestaña "Console" y revisa los mensajes. Usualmente son problemas de conexión a internet o falta de permisos en el script de Google.

---

## 📤 Subida a Producción

Una vez que hayas validado que todo funciona al 100%:
1. Asegúrate de que tu `netlify.toml` esté configurado.
2. Sube los archivos a tu repositorio de GitHub o realiza el despliegue manual en el panel de Netlify.

---
*Desarrollado con ❤️ para la Dirección de Seguridad Pública de Tzompantepec.*
