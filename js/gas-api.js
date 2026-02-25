// ============================================================
// CONFIGURACIÓN CENTRAL DEL SISTEMA
// Sistema C2 - Seguridad Pública Tzompantepec
// ============================================================

// 🔴 IMPORTANTE: Reemplaza esta URL con la URL real de tu
//    Google Apps Script desplegado como "Web App".
//    Sigue las instrucciones en google-apps-script/INSTRUCCIONES.md
//
//    Formato: https://script.google.com/macros/s/TU_ID/exec
// ============================================================

const GAS_WEBAPP_URL = 'REEMPLAZAR_CON_URL_DE_WEB_APP';

// ID de Google Sheet (para lectura pública con API Key)
const SPREADSHEET_ID_CONFIG = '12_nohX3MHsU8WrvhDKLYbQYr0uoMFvlx30ICjjJsT2M';

// ============================================================
// API CENTRALIZADA - Todas las llamadas al backend pasan aquí
// ============================================================

// Verificar si la URL del Web App está configurada
function checkWebAppConfig() {
    if (GAS_WEBAPP_URL === 'REEMPLAZAR_CON_URL_DE_WEB_APP') {
        console.warn('⚠️ GAS Web App URL no configurada. El sistema usará datos locales de demostración.');
        return false;
    }
    return true;
}

/**
 * GET: Obtener usuarios del sistema
 */
async function apiGetUsuarios() {
    if (!checkWebAppConfig()) return [];
    try {
        const url = `${GAS_WEBAPP_URL}?action=getUsuarios`;
        const response = await fetch(url);
        const data = await response.json();
        if (Array.isArray(data)) return data;
        if (data.error) return [];
        return [];
    } catch (e) {
        console.error('apiGetUsuarios error:', e);
        return [];
    }
}

/**
 * POST: Guardar nuevo usuario
 */
async function apiGuardarUsuario(datos) {
    if (!checkWebAppConfig()) {
        return { success: false, message: 'Web App no configurada. Despliega el Google Apps Script primero.' };
    }
    try {
        const payload = { action: 'guardarUsuario', ...datos };
        const response = await fetch(GAS_WEBAPP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return await response.json();
    } catch (e) {
        return { success: false, message: 'Error de conexión: ' + e.message };
    }
}

/**
 * GET: Obtener todo el personal
 */
async function apiGetPersonal() {
    if (!checkWebAppConfig()) return null; // fallback a mock
    try {
        const url = `${GAS_WEBAPP_URL}?action=getPersonal`;
        const response = await fetch(url);
        const data = await response.json();
        if (Array.isArray(data)) return data;
        return null;
    } catch (e) {
        console.error('apiGetPersonal error:', e);
        return null;
    }
}

/**
 * POST: Guardar nuevo personal
 */
async function apiGuardarPersonal(formData) {
    if (!checkWebAppConfig()) {
        return { success: false, message: 'Web App no configurada.' };
    }
    try {
        // Convertir FormData a objeto JSON
        const datos = { action: 'guardarPersonal' };
        for (let [key, val] of formData.entries()) {
            datos[key] = val;
        }
        const response = await fetch(GAS_WEBAPP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
        return await response.json();
    } catch (e) {
        return { success: false, message: 'Error de conexión: ' + e.message };
    }
}

/**
 * POST: Actualizar estado de empleado
 */
async function apiActualizarEstado(cuip, estado) {
    if (!checkWebAppConfig()) {
        return { success: false, message: 'Web App no configurada.' };
    }
    try {
        const payload = { action: 'actualizarEstado', cuip, estado };
        const response = await fetch(GAS_WEBAPP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return await response.json();
    } catch (e) {
        return { success: false, message: 'Error de conexión: ' + e.message };
    }
}

// Exponer globalmente
window.GAS_WEBAPP_URL = GAS_WEBAPP_URL;
window.apiGetUsuarios = apiGetUsuarios;
window.apiGuardarUsuario = apiGuardarUsuario;
window.apiGetPersonal = apiGetPersonal;
window.apiGuardarPersonal = apiGuardarPersonal;
window.apiActualizarEstado = apiActualizarEstado;

console.log('✅ gas-api.js cargado. Google Sheets ID:', SPREADSHEET_ID_CONFIG);
