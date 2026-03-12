// ============================================================
// CONFIGURACIÓN CENTRAL DEL SISTEMA
// Sistema C2 - Seguridad Pública Tzompantepec
// ============================================================

const GAS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxZBIe-u9R2aASbstARif7bC8yWDfndhktJmAQIuP4o6_1A-NiGidx10LT8yIYcnJnm/exec';
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
 * POST: Guardar personal (usando objeto plano con Base64)
 */
async function apiGuardarPersonalObj(datos) {
    if (!checkWebAppConfig()) return { success: false, message: 'Configuración de API no encontrada' };
    try {
        const response = await fetch(GAS_WEBAPP_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(datos)
        });

        const result = await response.json();
        return result;
    } catch (e) {
        console.error('apiGuardarPersonalObj Error:', e);
        return { success: false, message: 'Error de conexión: ' + e.message };
    }
}

/**
 * Helper: Convert File to Base64
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

/**
 * POST: Guardar personal (con soporte de foto/archivos)
 */
async function apiGuardarPersonal(formData) {
    if (!checkWebAppConfig()) return { success: false, message: 'URL no configurada' };
    try {
        const datos = { action: 'guardarPersonal' };

        // Procesar campos comunes
        for (let [key, val] of formData.entries()) {
            if (!(val instanceof File)) {
                datos[key] = val;
            }
        }

        // Procesar archivos (si existen)
        const fileEntries = Array.from(formData.entries()).filter(e => e[1] instanceof File && e[1].size > 0);
        for (let [key, file] of fileEntries) {
            datos[key] = await fileToBase64(file);
        }

        const response = await fetch(GAS_WEBAPP_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(datos)
        });

        const result = await response.json();
        return result;
    } catch (e) {
        console.error('apiGuardarPersonal Error:', e);
        return { success: false, message: e.message };
    }
}

/**
 * POST: Actualizar personal (con soporte de foto/archivos)
 */
async function apiActualizarPersonal(formData) {
    if (!checkWebAppConfig()) return { success: false, message: 'URL no configurada' };
    try {
        const datos = { action: 'actualizarPersonal' };

        // Procesar campos comunes
        for (let [key, val] of formData.entries()) {
            if (!(val instanceof File)) {
                datos[key] = val;
            }
        }

        // Procesar archivos (si existen)
        const fileEntries = Array.from(formData.entries()).filter(e => e[1] instanceof File && e[1].size > 0);
        for (let [key, file] of fileEntries) {
            datos[key] = await fileToBase64(file);
        }

        const response = await fetch(GAS_WEBAPP_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(datos)
        });

        const result = await response.json();
        return result;
    } catch (e) {
        console.error('apiActualizarPersonal Error:', e);
        return { success: false, message: e.message };
    }
}

/**
 * POST: Eliminar personal
 */
async function apiDeletePersonal(cuip) {
    if (!checkWebAppConfig()) return { success: false };
    try {
        const payload = { action: 'eliminarPersonal', cuip };
        const response = await fetch(GAS_WEBAPP_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        return await response.json();
    } catch (e) {
        console.error('apiDeletePersonal Error:', e);
        return { success: false, message: e.message };
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
window.apiActualizarPersonal = apiActualizarPersonal;
window.apiGuardarPersonalObj = apiGuardarPersonalObj;
window.apiActualizarEstado = apiActualizarEstado;
window.apiDeletePersonal = apiDeletePersonal;
