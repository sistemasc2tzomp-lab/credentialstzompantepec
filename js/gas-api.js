// ============================================================
// CONFIGURACIÓN CENTRAL DEL SISTEMA
// Sistema C2 - Seguridad Pública Tzompantepec
// ============================================================

const GAS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbz-qHToQO3uHptxEMV6v2yxM2gewsSDWkfvd-lUac3o2OQ_xn5ZCOtmdBntgxB2-ebe/exec';
const SPREADSHEET_ID_CONFIG = '12_nohX3MHsU8WrvhDKLYbQYr0uoMFvlx30ICjjJsT2M';

function checkWebAppConfig() {
    if (GAS_WEBAPP_URL.includes('REEMPLAZAR')) return false;
    return true;
}

/**
 * GET: Obtener usuarios
 */
async function apiGetUsuarios() {
    if (!checkWebAppConfig()) return [];
    try {
        const response = await fetch(`${GAS_WEBAPP_URL}?action=getUsuarios`);
        return await response.json();
    } catch (e) {
        console.error('apiGetUsuarios Error:', e);
        return [];
    }
}

/**
 * POST: Guardar usuario
 */
async function apiGuardarUsuario(datos) {
    if (!checkWebAppConfig()) return { success: false, message: 'Falta configuración URL' };
    try {
        const payload = { action: 'guardarUsuario', ...datos };
        // Usamos POST con text/plain para evitar errores de CORS/Preflight en Google Apps Script
        const response = await fetch(GAS_WEBAPP_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });

        // En POST a GAS, el navegador suele seguir una redirección 302.
        // fetch maneja esto bien en modo 'cors'.
        return { success: true, message: 'Usuario registrado correctamente' };
    } catch (e) {
        console.error('apiGuardarUsuario Error:', e);
        return { success: false, message: e.message };
    }
}

/**
 * GET: Obtener personal
 */
async function apiGetPersonal() {
    if (!checkWebAppConfig()) return null;
    try {
        const response = await fetch(`${GAS_WEBAPP_URL}?action=getPersonal`);
        return await response.json();
    } catch (e) {
        console.error('apiGetPersonal Error:', e);
        return null;
    }
}

/**
 * POST: Guardar personal
 */
async function apiGuardarPersonal(formData) {
    if (!checkWebAppConfig()) return { success: false };
    try {
        const datos = { action: 'guardarPersonal' };
        for (let [key, val] of formData.entries()) {
            datos[key] = val;
        }

        await fetch(GAS_WEBAPP_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(datos)
        });
        return { success: true, message: 'Personal guardado' };
    } catch (e) {
        console.error('apiGuardarPersonal Error:', e);
        return { success: false };
    }
}

/**
 * POST: Actualizar estado
 */
async function apiActualizarEstado(cuip, estado) {
    if (!checkWebAppConfig()) return { success: false };
    try {
        const payload = { action: 'actualizarEstado', cuip, estado };
        await fetch(GAS_WEBAPP_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        return { success: true, message: 'Estado actualizado' };
    } catch (e) {
        return { success: false };
    }
}

// Globales
window.apiGetUsuarios = apiGetUsuarios;
window.apiGuardarUsuario = apiGuardarUsuario;
window.apiGetPersonal = apiGetPersonal;
window.apiGuardarPersonal = apiGuardarPersonal;
window.apiActualizarEstado = apiActualizarEstado;
