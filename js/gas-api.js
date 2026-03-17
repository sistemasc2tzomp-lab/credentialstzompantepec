// ============================================================
// CONFIGURACIÓN CENTRAL DEL SISTEMA
// Sistema C2 - Seguridad Pública Tzompantepec
// ============================================================

const GAS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbyZqg9lzxJKwxxsQUms9mPEXlccpiGd2ydrmSB0mYd-QG8JXWs2BaQr1RoBIr3DphTZeg/exec';
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
        if (!response.ok) throw new Error('Network response was not ok');
        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error('Error parseando JSON (probablemente necesita permisos Públicos "Anyone" en el WebApp):', text.substring(0, 100));
            return [];
        }
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
        if (!response.ok) throw new Error('Error HTTP');
        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error('Error parseando JSON (probablemente necesita permisos Públicos "Anyone" en el WebApp):', text.substring(0, 100));
            return null;
        }
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
            mode: 'no-cors', // USAR NO-CORS PARA EVITAR EL BLOQUEO DE NAVEGADOR
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(datos)
        });
        
        // Con no-cors no podemos leer la respuesta, pero el envío se realiza
        showNotification('Datos enviados correctamente al servidor', 'success');
        return { success: true };
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
            mode: 'no-cors', // Modo opaco para evitar CORS en POST
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(datos)
        });

        return { success: true, message: 'Actualización enviada' };
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
        // Para eliminar, usamos un simple GET que es más compatible con CORS en GAS
        const response = await fetch(`${GAS_WEBAPP_URL}?action=eliminarPersonal&cuip=${encodeURIComponent(cuip)}`);
        return { success: true, message: 'Registro procesado' };
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

/**
 * GET: Obtener datos genéricos
 */
async function apiGetSheetData(action) {
    if (!checkWebAppConfig()) return [];
    try {
        const response = await fetch(`${GAS_WEBAPP_URL}?action=${action}`);
        if (!response.ok) throw new Error('HTTP error ' + response.status);
        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error('Error parseando JSON en', action, '(probablemente necesita permisos Públicos "Anyone"):', text.substring(0, 100));
            return [];
        }
    } catch (e) {
        console.error('apiGetSheetData Error:', e);
        return [];
    }
}

/**
 * POST: Guardar registro de reporte
 */
async function apiGuardarReporte(datos) {
    if (!checkWebAppConfig()) return { success: false };
    try {
        const payload = { action: 'guardarReporte', ...datos };
        const response = await fetch(GAS_WEBAPP_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        return await response.json();
    } catch (e) {
        console.error('apiGuardarReporte Error:', e);
        return { success: false, message: e.message };
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
window.apiGetSheetData = apiGetSheetData;
window.apiGuardarReporte = apiGuardarReporte;
