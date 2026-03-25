// Sistema de Auditoría y Registro de Movimientos

// Estructura para almacenar logs (en producción usarías una base de datos)
let auditLogs = [];

// Usar ACTION_TYPES globales definidos en auth.js o definir si no existen
if (typeof ACTION_TYPES === 'undefined') {
    var ACTION_TYPES = {
        LOGIN: 'Inicio de Sesión',
        LOGOUT: 'Cierre de Sesión',
        CREATE: 'Creación',
        UPDATE: 'Actualización',
        DELETE: 'Eliminación',
        VIEW: 'Visualización',
        PRINT: 'Impresión',
        GENERATE: 'Generación',
        SEARCH: 'Búsqueda',
        EXPORT: 'Exportación',
        DOWNLOAD: 'Descarga'
    };
    window.ACTION_TYPES = ACTION_TYPES;
} else {
    // Si ya existe, nos aseguramos de que tenga los campos necesarios
    Object.assign(window.ACTION_TYPES, {
        GENERATE: window.ACTION_TYPES.GENERATE || 'Generación'
    });
}


// Registrar una acción
function logAction(actionType, details, additionalInfo = {}) {
    const user = JSON.parse(localStorage.getItem('currentUser')) || { username: 'Sistema', role: 'system' };

    const logEntry = {
        id: generateLogId(),
        timestamp: new Date().toISOString(),
        fecha: new Date().toLocaleDateString('es-MX'),
        hora: new Date().toLocaleTimeString('es-MX'),
        usuario: user.name || user.username,
        rol: user.role,
        accion: actionType,
        detalles: details,
        ip: '127.0.0.1', // En producción obtener IP real
        navegador: navigator.userAgent,
        ...additionalInfo
    };

    auditLogs.push(logEntry);

    // Guardar en localStorage (temporal, en producción usar backend)
    saveLogsToStorage();

    // Disparar evento para actualizar UI si es necesario
    document.dispatchEvent(new CustomEvent('newLogEntry', { detail: logEntry }));

    console.log('📝 Acción registrada:', logEntry);
    return logEntry;
}

function generateLogId() {
    return 'LOG_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function saveLogsToStorage() {
    try {
        localStorage.setItem('auditLogs', JSON.stringify(auditLogs));
    } catch (e) {
        console.warn('No se pudieron guardar los logs en localStorage', e);
    }
}

function loadLogsFromStorage() {
    try {
        const stored = localStorage.getItem('auditLogs');
        if (stored) {
            auditLogs = JSON.parse(stored);
        }
    } catch (e) {
        console.warn('No se pudieron cargar los logs', e);
    }
}

// Obtener logs con filtros
function getFilteredLogs(filters = {}) {
    let filtered = [...auditLogs];

    if (filters.fechaInicio) {
        const start = new Date(filters.fechaInicio);
        start.setHours(0, 0, 0, 0); // Inicio del día local
        filtered = filtered.filter(log => new Date(log.timestamp) >= start);
    }

    if (filters.fechaFin) {
        const end = new Date(filters.fechaFin);
        end.setHours(23, 59, 59, 999); // Fin del día local
        filtered = filtered.filter(log => new Date(log.timestamp) <= end);
    }

    if (filters.usuario) {
        filtered = filtered.filter(log => log.usuario.toLowerCase().includes(filters.usuario.toLowerCase()));
    }

    if (filters.accion) {
        filtered = filtered.filter(log => log.accion === filters.accion);
    }

    if (filters.rol) {
        filtered = filtered.filter(log => log.rol === filters.rol);
    }

    return filtered;
}

// Exportar logs a CSV
function exportLogsToCSV(filters = {}) {
    const logs = getFilteredLogs(filters);

    if (logs.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    const headers = ['ID', 'Fecha', 'Hora', 'Usuario', 'Rol', 'Acción', 'Detalles', 'IP'];
    const csvRows = [];

    csvRows.push(headers.join(','));

    for (const log of logs) {
        const values = [
            log.id,
            log.fecha,
            log.hora,
            log.usuario,
            log.rol,
            log.accion,
            `"${log.detalles.replace(/"/g, '""')}"`,
            log.ip
        ];
        csvRows.push(values.join(','));
    }

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_movimientos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    logAction(ACTION_TYPES.EXPORT, `Exportó ${logs.length} registros de movimientos`);
}

// Inicializar
loadLogsFromStorage();

// Hacer funciones globales
window.logAction = logAction;
window.ACTION_TYPES = ACTION_TYPES;
window.getFilteredLogs = getFilteredLogs;
window.exportLogsToCSV = exportLogsToCSV;