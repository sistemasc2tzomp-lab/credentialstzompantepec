// ============================================================
// CONFIGURACIÓN CENTRAL DEL SISTEMA
// Sistema C2 - Seguridad Pública Tzompantepec
// ============================================================

const GAS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbzxmEA6xlg_R2MNnQm-J0Iet35Alve5DC1vrkNhrvrFzxD2d63k0Tp7qK_uWjIxuyan-w/exec';
const SPREADSHEET_ID_CONFIG = '12_nohX3MHsU8WrvhDKLYbQYr0uoMFvlx30ICjjJsT2M';

// Definiciones globales compartidas (Cargadas al inicio para evitar ReferenceErrors)
var EMPLOYEE_STATUS = Object.assign(window.EMPLOYEE_STATUS || {}, {
    ACTIVO: 'Activo',
    BAJA: 'Baja',
    VACACIONES: 'Vacaciones',
    COMISION: 'De Comisión'
});
window.EMPLOYEE_STATUS = EMPLOYEE_STATUS;

// Placeholders para funciones definidas en auth.js que son accedidas por otros scripts
window.printSingleCredential = window.printSingleCredential || function(cuip) {
    if (typeof console !== 'undefined') console.warn('printSingleCredential no cargada aún');
};
window.saveEmployeeChanges = window.saveEmployeeChanges || function(e) {
    if (typeof updateEmployee === 'function') return updateEmployee(e);
    if (typeof console !== 'undefined') console.warn('saveEmployeeChanges/updateEmployee no cargada aún');
};

/**
 * Validador de configuración
 */
function checkWebAppConfig() {
    if (!GAS_WEBAPP_URL || GAS_WEBAPP_URL === '') {
        console.error('SISTEMA BLOQUEADO: URL de Web App no configurada.');
        return false;
    }
    return true;
}

/**
 * JSONP GET helper — bypasses all CORS restrictions with GAS.
 * Works from any static site (GitHub Pages, etc.).
 */
function gasGet(action, extraParams = {}) {
    return new Promise((resolve, reject) => {
        const cbName = 'cb_' + action + '_' + Date.now();
        const url = new URL(GAS_WEBAPP_URL);
        url.searchParams.set('action', action);
        url.searchParams.set('callback', cbName);
        Object.entries(extraParams).forEach(([k, v]) => url.searchParams.set(k, v));

        const script = document.createElement('script');
        script.src = url.toString();

        const timer = setTimeout(() => {
            cleanup();
            reject(new Error('JSONP timeout for ' + action));
        }, 10000);

        window[cbName] = (data) => {
            cleanup();
            resolve(data);
        };

        function cleanup() {
            clearTimeout(timer);
            delete window[cbName];
            if (script.parentNode) script.parentNode.removeChild(script);
        }

        script.onerror = () => { cleanup(); reject(new Error('JSONP script error')); };
        document.head.appendChild(script);
    });
}

/**
 * GET: Obtener usuarios
 */
async function apiGetUsuarios() {
    if (!checkWebAppConfig()) return [];
    try {
        return await gasGet('getUsuarios');
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
 * POST: Actualizar usuario
 */
async function apiActualizarUsuario(datos) {
    if (!checkWebAppConfig()) return { success: false, message: 'Falta configuración URL' };
    try {
        const payload = { action: 'actualizarUsuario', ...datos };
        const response = await fetch(GAS_WEBAPP_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        return { success: true, message: 'Usuario actualizado correctamente' };
    } catch (e) {
        console.error('apiActualizarUsuario Error:', e);
        return { success: false, message: e.message };
    }
}

/**
 * POST: Eliminar usuario
 */
async function apiEliminarUsuario(id) {
    if (!checkWebAppConfig()) return { success: false };
    try {
        const payload = { action: 'eliminarUsuario', id };
        const response = await fetch(GAS_WEBAPP_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        return { success: true, message: 'Usuario eliminado' };
    } catch (e) {
        return { success: false, message: e.message };
    }
}

/**
 * GET: Obtener personal
 */
async function apiGetPersonal() {
    if (!checkWebAppConfig()) return null;
    try {
        return await gasGet('getPersonal');
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
 * GET: Obtener datos genéricos (con JSONP para GitHub Pages)
 */
async function apiGetSheetData(action, params = {}) {
    if (!checkWebAppConfig()) return [];
    try {
        return await gasGet(action, params);
    } catch (e) {
        console.error('apiGetSheetData Error (' + action + '):', e);
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

/**
 * POST: Guardar Armamento
 */
async function apiGuardarArmamento(datos) {
    if (!checkWebAppConfig()) return { success: false };
    try {
        const payload = { action: 'guardarArmamento', ...datos };
        await fetch(GAS_WEBAPP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });
        return { success: true, message: 'Registro enviado' };
    } catch (e) {
        return { success: false, message: e.message };
    }
}

/**
 * POST: Guardar Vehículo
 */
async function apiGuardarVehiculo(datos) {
    if (!checkWebAppConfig()) return { success: false };
    try {
        const payload = { action: 'guardarVehiculo', ...datos };
        await fetch(GAS_WEBAPP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });
        return { success: true, message: 'Registro de vehículo enviado' };
    } catch (e) {
        return { success: false, message: e.message };
    }
}

/**
 * POST: Actualizar Armamento
 */
async function apiActualizarArmamento(datos) {
    if (!checkWebAppConfig()) return { success: false };
    try {
        const payload = { action: 'actualizarArmamento', ...datos };
        await fetch(GAS_WEBAPP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });
        return { success: true, message: 'Registro actualizado' };
    } catch (e) {
        return { success: false, message: e.message };
    }
}

/**
 * POST: Actualizar Vehículo
 */
async function apiActualizarVehiculo(datos) {
    if (!checkWebAppConfig()) return { success: false };
    try {
        const payload = { action: 'actualizarVehiculo', ...datos };
        await fetch(GAS_WEBAPP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });
        return { success: true, message: 'Vehículo actualizado' };
    } catch (e) {
        return { success: false, message: e.message };
    }
}

/**
 * POST: Eliminar Armamento
 */
async function apiEliminarArmamento(id, type) {
    if (!checkWebAppConfig()) return { success: false };
    try {
        const payload = { action: 'eliminarArmamento', id: id, type: type };
        await fetch(GAS_WEBAPP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });
        return { success: true, message: 'Registro eliminado' };
    } catch (e) {
        return { success: false, message: e.message };
    }
}

/**
 * POST: Eliminar Vehículo
 */
async function apiEliminarVehiculo(id) {
    if (!checkWebAppConfig()) return { success: false };
    try {
        const payload = { action: 'eliminarVehiculo', id: id };
        await fetch(GAS_WEBAPP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });
        return { success: true, message: 'Vehículo eliminado logicamente' };
    } catch (e) {
        return { success: false, message: e.message };
    }
}

/**
 * POST: Guardar en Bitácora
 */
async function apiSaveLog(log) {
    if (!checkWebAppConfig()) return { success: false };
    try {
        const payload = { action: 'saveLog', ...log };
        await fetch(GAS_WEBAPP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });
        return { success: true };
    } catch (e) {
        return { success: false };
    }
}

/**
 * GET: Obtener Bitácora
 */
async function apiGetLogs() {
    const rawLogs = await apiGetSheetData('getLogs');
    if (!rawLogs || !Array.isArray(rawLogs)) return [];
    
    return rawLogs.map(log => {
        if (!log.fecha && log.timestamp) {
            const dateObj = new Date(log.timestamp);
            log.fecha = dateObj.toLocaleDateString('es-MX');
            log.hora = dateObj.toLocaleTimeString('es-MX');
        }
        return log;
    });
}

/**
 * GET: Obtener datos C3
 */
async function apiGetC3Data() {
    return await apiGetSheetData('getC3Data');
}

/**
 * POST: Actualizar estado C3
 */
async function apiUpdateC3Status(datos) {
    if (!checkWebAppConfig()) return { success: false };
    try {
        const payload = { action: 'updateC3Status', ...datos };
        const response = await fetch(GAS_WEBAPP_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        return { success: true };
    } catch (e) {
        return { success: false };
    }
}

/**
 * POST: Subir archivo a Google Drive (Dossier)
 */
async function apiUploadFile(datos) {
    if (!checkWebAppConfig()) return { success: false };
    try {
        const payload = { action: 'uploadFile', ...datos };
        const response = await fetch(GAS_WEBAPP_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        return await response.json();
    } catch (e) {
        return { success: false, message: e.message };
    }
}

// Globales
window.apiGetUsuarios = apiGetUsuarios;
window.apiGuardarUsuario = apiGuardarUsuario;
window.apiActualizarUsuario = apiActualizarUsuario;
window.apiEliminarUsuario = apiEliminarUsuario;
window.apiUploadFile = apiUploadFile;
window.apiGetPersonal = apiGetPersonal;
window.apiGuardarPersonal = apiGuardarPersonal;
window.apiActualizarPersonal = apiActualizarPersonal;
window.apiGuardarPersonalObj = apiGuardarPersonalObj;
window.apiActualizarEstado = apiActualizarEstado;
window.apiDeletePersonal = apiDeletePersonal;
window.apiGetSheetData = apiGetSheetData;
window.apiGuardarReporte = apiGuardarReporte;
window.apiGuardarArmamento = apiGuardarArmamento;
window.apiGuardarVehiculo = apiGuardarVehiculo;
window.apiActualizarArmamento = apiActualizarArmamento;
window.apiActualizarVehiculo = apiActualizarVehiculo;
window.apiEliminarArmamento = apiEliminarArmamento;
window.apiEliminarVehiculo = apiEliminarVehiculo;
window.apiSaveLog = apiSaveLog;
window.apiGetLogs = apiGetLogs;
window.apiGetC3Data = apiGetC3Data;
window.apiUpdateC3Status = apiUpdateC3Status;
window.GAS_WEBAPP_URL = GAS_WEBAPP_URL;


