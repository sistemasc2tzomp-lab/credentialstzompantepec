# SISTEMA C2 - SEGURIDAD PÚBLICA TZOMPANTEPEC

## Estructura del Repositorio
Para un mejor mantenimiento continuo del proyecto, se sugiere mantener la siguiente estructura de carpetas:

- **/css**: Contiene los estilos en hojas CSS (como `style-updates.css` y estilos generales).
- **/js**: Lógica principal del front-end. Incluye:
  - `auth.js` principal para carga de UI y vistas.
  - `gas-api.js` para conexión al Backend de Google Apps Script.
  - `reports-generator.js`, `google-sheets.js`, `credencial-generator.js`
- **/google-apps-script**: Código del Back-End. Para actualizar los endpoints, el archivo `Code.gs` se debe copiar y actualizar dentro del editor de Apps Script asociado a su cuenta de Google, **y posteriormente publicar como "Nueva Implementación"**.
- **/assets**: Contiene logotipos, imágenes y recursos estáticos para el proyecto `/assets`.
- **Raíz (/)**: Contiene los archivos `.html` que dan estructura a cada sección del sistema.

## Configuración y Dependencias

*   **Google Apps Script y Sheets:** Asegúrate de mantener correctamente vinculado el **ID del Google Sheet** en `Code.gs` (`SPREADSHEET_ID`) y en `js/gas-api.js` (`GAS_WEBAPP_URL`). Si realizas cambios en `Code.gs`, **debes generar una nueva implementación en Apps Script y actualizar el enlace `GAS_WEBAPP_URL`**.
*   **Google Drive:** El sistema requiere de carpetas con permisos "Públicos (solo lectura)" para que las previsualizaciones de expedientes y fotos no generen error de CORS.

## Mejoras Implementadas

- **Gestión de Eliminación Unificada**: Se consolidó la lógica de eliminación (`eliminarPersonal`) en `Code.gs` para evitar conflictos en POST.
- **Manejo de Respuestas de API**: Se agregaron catch blocks robustos a las vistas de Vehículos y Armamento para identificar cuando hace falta volver a desplegar la nueva versión del Apps Script.
- **Pestaña de Conexión de Google Drive**: Implementada en la vista de *Configuración General* del sistema (`auth.js`), permitiendo la validación manual del estado del almacenamiento.
