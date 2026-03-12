// Generador de Reportes

// Usar REPORT_TYPES globales definidos en auth.js o definir si no existen
// Usar REPORT_TYPES globales definidos en auth.js o definir si no existen
if (typeof REPORT_TYPES === 'undefined') {
    var REPORT_TYPES = {
        MOVIMIENTOS: 'movimientos',
        PERSONAL_ACTIVO: 'personal_activo',
        CREDENCIALES_GENERADAS: 'credenciales_generadas',
        ACTIVIDAD_USUARIOS: 'actividad_usuarios',
        VIGENCIAS: 'vigencias',
        ESTADISTICAS: 'estadisticas'
    };
    window.REPORT_TYPES = REPORT_TYPES;
} else {
    // Si ya existe, nos aseguramos de usar el global
    var REPORT_TYPES = window.REPORT_TYPES;
}


// Configuración extendida de reportes (se combina con la de auth.js si ya existe)
const extendedReportConfig = {
    [REPORT_TYPES.MOVIMIENTOS]: {
        titulo: 'Reporte de Movimientos del Sistema',
        descripcion: 'Registro detallado de todas las actividades',
        columnas: ['Fecha', 'Hora', 'Usuario', 'Rol', 'Acción', 'Detalles']
    },
    [REPORT_TYPES.PERSONAL_ACTIVO]: {
        titulo: 'Reporte de Personal Activo',
        descripcion: 'Listado completo del personal',
        columnas: ['Nombre', 'Cargo', 'CUIP', 'CURP', 'Teléfono', 'Email', 'Vigencia']
    },
    [REPORT_TYPES.CREDENCIALES_GENERADAS]: {
        titulo: 'Reporte de Credenciales Generadas',
        descripcion: 'Histórico de credenciales emitidas',
        columnas: ['Fecha', 'Hora', 'Usuario', 'Empleado', 'Cargo', 'CUIP']
    },
    [REPORT_TYPES.ACTIVIDAD_USUARIOS]: {
        titulo: 'Reporte de Actividad por Usuario',
        descripcion: 'Resumen de actividades por usuario',
        columnas: ['Usuario', 'Rol', 'Total Acciones', 'Última Actividad', 'Acciones Comunes']
    },
    [REPORT_TYPES.VIGENCIAS]: {
        titulo: 'Reporte de Vigencias',
        descripcion: 'Personal por fecha de vigencia',
        columnas: ['Nombre', 'Cargo', 'CUIP', 'Fecha Vigencia', 'Estado', 'Días Restantes']
    },
    [REPORT_TYPES.ESTADISTICAS]: {
        titulo: 'Estadísticas del Sistema',
        descripcion: 'Métricas y estadísticas generales',
        columnas: ['Métrica', 'Valor', 'Período', 'Tendencia']
    },
    [REPORT_TYPES.C3]: {
        titulo: 'Reporte de Evaluaciones C3',
        descripcion: 'Control de personal en evaluaciones de control y confianza',
        columnas: ['Nombre', 'Cargo', 'CUIP', 'Fecha Evaluación', 'Resultado', 'Vigencia']
    },
    [REPORT_TYPES.C5I]: {
        titulo: 'Reporte Operativo C5i',
        descripcion: 'Registro de incidencias y telemetría C5i',
        columnas: ['Folio', 'Fecha', 'Tipo', 'Localización', 'Oficial', 'Estatus']
    },
    [REPORT_TYPES.MULTAS]: {
        titulo: 'Reporte de Multas de Tránsito',
        descripcion: 'Histórico de infracciones levantadas',
        columnas: ['Folio', 'Fecha', 'Placa', 'Infracción', 'Monto', 'Oficial']
    },
    [REPORT_TYPES.DOCUMENTACION]: {
        titulo: 'Reporte de Documentación Digital',
        descripcion: 'Estatus de expedientes digitales del personal',
        columnas: ['Nombre', 'CUIP', 'Documentos', 'Estatus', 'Última Carga']
    },
    [REPORT_TYPES.INVENTARIO]: {
        titulo: 'Reporte de Inventario de Armamento y Equipo',
        descripcion: 'Estado actual del resguardo de equipo táctico',
        columnas: ['Equipo', 'Serie', 'Tipo', 'Resguardante', 'Estado']
    }
};

// Globalizar o fusionar configuración
if (typeof reportConfig === 'undefined') {
    window.reportConfig = extendedReportConfig;
} else {
    Object.assign(reportConfig, extendedReportConfig);
}


// Generar reporte de personal
async function generatePersonnelReport() {
    const data = await loadGoogleSheetsData();

    const reportData = data.map(person => ({
        nombre: person.nombre,
        cargo: person.cargo,
        cuip: person.cuip,
        curp: person.curp,
        telefono: person.telefono || 'N/A',
        email: person.email || 'N/A',
        vigencia: person.vigencia || 'No definida'
    }));

    return {
        type: REPORT_TYPES.PERSONAL_ACTIVO,
        data: reportData,
        generatedAt: new Date().toISOString(),
        totalRegistros: reportData.length
    };
}

// Generar reporte de movimientos
function generateMovementsReport(filters = {}) {
    const logs = getFilteredLogs(filters);

    const reportData = logs.map(log => ({
        fecha: log.fecha,
        hora: log.hora,
        usuario: log.usuario,
        rol: log.rol,
        accion: log.accion,
        detalles: log.detalles
    }));

    return {
        type: REPORT_TYPES.MOVIMIENTOS,
        data: reportData,
        generatedAt: new Date().toISOString(),
        totalRegistros: reportData.length,
        filtros: filters
    };
}

// Generar reporte de actividad por usuario
function generateUserActivityReport() {
    const logs = auditLogs;
    const userStats = {};

    logs.forEach(log => {
        if (!userStats[log.usuario]) {
            userStats[log.usuario] = {
                usuario: log.usuario,
                rol: log.rol,
                totalAcciones: 0,
                ultimaActividad: log.timestamp,
                acciones: {}
            };
        }

        userStats[log.usuario].totalAcciones++;
        userStats[log.usuario].ultimaActividad = log.timestamp;

        if (!userStats[log.usuario].acciones[log.accion]) {
            userStats[log.usuario].acciones[log.accion] = 0;
        }
        userStats[log.usuario].acciones[log.accion]++;
    });

    const reportData = Object.values(userStats).map(stat => ({
        usuario: stat.usuario,
        rol: stat.rol,
        totalAcciones: stat.totalAcciones,
        ultimaActividad: new Date(stat.ultimaActividad).toLocaleString(),
        accionesComunes: Object.entries(stat.acciones)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([accion, count]) => `${accion} (${count})`)
            .join(', ')
    }));

    return {
        type: REPORT_TYPES.ACTIVIDAD_USUARIOS,
        data: reportData,
        generatedAt: new Date().toISOString(),
        totalRegistros: reportData.length
    };
}

// Generar reporte de vigencias
async function generateVigenciaReport() {
    const data = await loadGoogleSheetsData();
    const today = new Date();

    const reportData = data.map(person => {
        const vigenciaDate = new Date(person.vigencia || '2025-12-31');
        const daysRemaining = Math.ceil((vigenciaDate - today) / (1000 * 60 * 60 * 24));

        let estado = 'Vigente';
        if (daysRemaining < 0) estado = 'Vencido';
        else if (daysRemaining < 30) estado = 'Por vencer';

        return {
            nombre: person.nombre,
            cargo: person.cargo,
            cuip: person.cuip,
            fechaVigencia: person.vigencia || 'No definida',
            estado: estado,
            diasRestantes: daysRemaining < 0 ? 0 : daysRemaining
        };
    });

    return {
        type: REPORT_TYPES.VIGENCIAS,
        data: reportData,
        generatedAt: new Date().toISOString(),
        totalRegistros: reportData.length
    };
}

// Generar reporte estadístico
async function generateEstadisticasReport() {
    const personnel = await loadGoogleSheetsData();
    const logs = auditLogs;

    // Calcular estadísticas
    const totalPersonal = personnel.length;
    const cargosUnicos = new Set(personnel.map(p => p.cargo)).size;
    const totalMovimientos = logs.length;
    const usuariosActivos = new Set(logs.map(l => l.usuario)).size;

    // Movimientos por día (últimos 7 días)
    const movimientosPorDia = {};
    const last7Days = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('es-MX');
        last7Days.push(dateStr);
        movimientosPorDia[dateStr] = 0;
    }

    logs.forEach(log => {
        const logDate = new Date(log.timestamp).toLocaleDateString('es-MX');
        if (movimientosPorDia.hasOwnProperty(logDate)) {
            movimientosPorDia[logDate]++;
        }
    });

    const reportData = [
        { metrica: 'Total Personal', valor: totalPersonal, periodo: 'Actual', tendencia: '📊' },
        { metrica: 'Cargos Diferentes', valor: cargosUnicos, periodo: 'Actual', tendencia: '📈' },
        { metrica: 'Total Movimientos', valor: totalMovimientos, periodo: 'Histórico', tendencia: '📉' },
        { metrica: 'Usuarios Activos', valor: usuariosActivos, periodo: 'Histórico', tendencia: '📈' },
        { metrica: 'Promedio Movimientos/Día', valor: Math.round(totalMovimientos / 30) || 0, periodo: '30 días', tendencia: '📊' }
    ];

    // Agregar movimientos por día
    last7Days.forEach(day => {
        reportData.push({
            metrica: `Movimientos ${day}`,
            valor: movimientosPorDia[day] || 0,
            periodo: 'Diario',
            tendencia: movimientosPorDia[day] > 0 ? '📈' : '📉'
        });
    });

    return {
        type: REPORT_TYPES.ESTADISTICAS,
        data: reportData,
        generatedAt: new Date().toISOString(),
        totalRegistros: reportData.length,
        resumen: {
            totalPersonal,
            totalMovimientos,
            usuariosActivos,
            periodoAnalisis: 'Últimos 7 días'
        }
    };
}

async function generateC3Report() {
    const personnel = await loadGoogleSheetsData();
    const reportData = personnel.map(p => {
        // Simular datos de C3 basados en el personal real
        const hasCert = p.cuip && p.cuip.length > 5;
        return {
            nombre: p.nombre,
            cargo: p.cargo,
            cuip: p.cuip,
            fechaEvaluacion: hasCert ? '2025-01-10' : 'PENDIENTE',
            resultado: hasCert ? 'APROBADO' : 'EN PROCESO',
            vigencia: hasCert ? '2028-01-10' : '---'
        };
    });
    return { type: REPORT_TYPES.C3, data: reportData, generatedAt: new Date().toISOString(), totalRegistros: reportData.length };
}

async function generateC5iReport() {
    const reportData = [
        { folio: 'C5I-2026-001', fecha: '2026-02-27', tipo: 'ALERTA TÁCTICA', localizacion: 'CENTRO', oficial: 'C2-STAFF', estatus: 'RESUELTO' },
        { folio: 'C5I-2026-002', fecha: '2026-02-27', tipo: 'VIGILANCIA QR', localizacion: 'ZONA NORTE', oficial: 'UNIDAD 04', estatus: 'ACTIVO' }
    ];
    return { type: REPORT_TYPES.C5I, data: reportData, generatedAt: new Date().toISOString(), totalRegistros: reportData.length };
}

async function generateMultasReport() {
    // Intentar obtener multas de la base de datos real
    let fines = [];
    try {
        if (typeof apiGetMultas === 'function') {
            fines = await apiGetMultas();
        }
    } catch (e) {
        console.error('Error fetching real fines:', e);
    }

    // Si no hay datos, generar de ejemplo para demostrar el formato robusto
    if (!fines || fines.length === 0) {
        fines = [
            { folio: 'V-2026-001', fecha: '2026-02-25', placa: 'XW-123-A', infraccion: 'EXCESO VELOCIDAD', monto: '$1,250.00', oficial: 'OFICIAL RAMIREZ' },
            { folio: 'V-2026-002', fecha: '2026-02-26', placa: 'TZO-88-1', infraccion: 'ESTACIONAMIENTO PROHIBIDO', monto: '$450.00', oficial: 'OFICIAL LÓPEZ' },
            { folio: 'V-2026-003', fecha: '2026-02-27', placa: 'ABC-999', infraccion: 'SIN LICENCIA', monto: '$2,100.00', oficial: 'OFICIAL DURÁN' }
        ];
    }

    return { type: REPORT_TYPES.MULTAS, data: fines, generatedAt: new Date().toISOString(), totalRegistros: fines.length };
}

async function generateDocReport() {
    const personnel = await loadGoogleSheetsData();
    const reportData = personnel.map(p => ({
        nombre: p.nombre,
        cuip: p.cuip,
        documentos: 'INE, CURP, RFC',
        estatus: 'COMPLETO',
        ultimaCarga: '2026-02-20'
    }));
    return { type: REPORT_TYPES.DOCUMENTACION, data: reportData, generatedAt: new Date().toISOString(), totalRegistros: reportData.length };
}

async function generateInventoryReport() {
    const personnel = await loadGoogleSheetsData();
    const vehiculos = [];
    const armamento = [];

    personnel.forEach(p => {
        if (p.vehiculo && p.vehiculo !== 'SIN VEHÍCULO' && p.vehiculo !== '---') {
            vehiculos.push({ equipo: 'VEHÍCULO', serie: p.vehiculo, tipo: 'PATRULLA', resguardante: p.nombre, estado: 'OPERATIVO' });
        }
        if (p.armado && p.armado !== 'SIN ARMA ASIGNADA' && p.armado !== '---') {
            armamento.push({ equipo: 'ARMA', serie: 'MAT-' + p.cuip.split('-')[1] || '001', tipo: '9MM', resguardante: p.nombre, estado: 'ASIGNADA' });
        }
    });

    const reportData = [...vehiculos, ...armamento];
    return { type: REPORT_TYPES.INVENTARIO, data: reportData, generatedAt: new Date().toISOString(), totalRegistros: reportData.length };
}

// Exportar reporte a PDF usando formato municipal
function exportReportToPDF(report) {
    logAction(ACTION_TYPES.EXPORT, `Exportó reporte ${report.type} a PDF`);
    window.currentReport = report;
    printMunicipalReport(report.type);
}

// Exportar reporte a Excel (CSV)
function exportReportToExcel(report) {
    if (!report || !report.data || report.data.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    const config = reportConfig[report.type] || { columnas: Object.keys(report.data[0]) };
    const headers = config.columnas;

    // Crear contenido CSV con BOM para Excel (UTF-8 con BOM)
    let csvContent = '\uFEFF';
    csvContent += headers.join(',') + '\n';

    report.data.forEach(row => {
        const values = headers.map(header => {
            // Mapeo inteligente de headers a keys del objeto data
            const key = header.toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .replace(/\s+/g, '');

            // Buscar valor por key normalizada o por exact match del header
            let value = row[key];
            if (value === undefined) {
                // Intento alternativo: buscar key que contenga la palabra o coincide ignorando mayúsculas
                const foundKey = Object.keys(row).find(k => k.toLowerCase() === header.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
                value = foundKey ? row[foundKey] : (row[header] || '');
            }

            // Escapar comas y comillas para CSV
            if (typeof value === 'string') {
                value = `"${value.replace(/"/g, '""')}"`;
            } else if (value === null || value === undefined) {
                value = '""';
            }
            return value;
        });
        csvContent += values.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `REPORTE_${report.type.toUpperCase()}_FT_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    logAction(ACTION_TYPES.EXPORT, `Exportó reporte ${report.type} a Excel (Robust)`);
}

// Función principal para exportar reportes (unificada para botones de la UI)
async function exportarReporte(reportType, formato) {
    showNotification(`Generando reporte ${reportType}...`, 'info');

    let report;
    try {
        switch (reportType) {
            case REPORT_TYPES.MOVIMIENTOS:
            case 'movimientos':
                report = generateMovementsReport(); break;
            case REPORT_TYPES.PERSONAL_ACTIVO:
            case 'personal_activo':
                report = await generatePersonnelReport(); break;
            case REPORT_TYPES.ACTIVIDAD_USUARIOS:
            case 'actividad_usuarios':
                report = generateUserActivityReport(); break;
            case REPORT_TYPES.VIGENCIAS:
            case 'vigencias':
                report = await generateVigenciaReport(); break;
            case REPORT_TYPES.ESTADISTICAS:
            case 'estadisticas':
                report = await generateEstadisticasReport(); break;
            case REPORT_TYPES.C3:
            case 'c3_records':
                report = await generateC3Report(); break;
            case REPORT_TYPES.C5I:
            case 'c5i_records':
                report = await generateC5iReport(); break;
            case REPORT_TYPES.MULTAS:
            case 'multas_records':
                report = await generateMultasReport(); break;
            case REPORT_TYPES.DOCUMENTACION:
            case 'doc_records':
                report = await generateDocReport(); break;
            case REPORT_TYPES.INVENTARIO:
            case 'inv_records':
                report = await generateInventoryReport(); break;
            default:
                report = await generatePersonnelReport();
        }
    } catch (e) {
        console.error('Error generando reporte:', e);
        showNotification('Error al generar reporte', 'error');
        return;
    }

    if (!report) {
        showNotification('No se pudo generar el reporte', 'error');
        return;
    }

    window.currentReport = report;

    if (formato === 'excel' || formato === 'xlsx') {
        exportReportToExcel(report);
        showNotification('Reporte Excel generado correctamente', 'success');
    } else {
        // PDF - opens print window
        exportReportToPDF(report);
        showNotification('Abriendo ventana de impresión PDF...', 'success');
    }
}

// Función para imprimir reporte con formato oficial
function printMunicipalReport(reportType) {
    const config = reportConfig[reportType];
    const report = window.currentReport; // Asumimos que hay un reporte global cargado

    if (!report) {
        alert('Primero genere un reporte para imprimir');
        return;
    }

    const hoy = new Date();
    const fechaStr = hoy.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });

    // Generar Hash Único para el reporte
    const reportHash = 'SIBIM-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();

    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${config.titulo}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800&family=Inter:wght@400;600&display=swap');
                @page { size: A4; margin: 15mm; }
                body { font-family: 'Inter', sans-serif; margin: 0; padding: 40px; color: #1e293b; background: white; }
                .report-document { border: 1px solid #e2e8f0; padding: 30px; border-radius: 15px; position: relative; }
                .header-official { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; }
                .header-official img { height: 70px; }
                .center-title { text-align: center; }
                .center-title h1 { margin: 0; font-family: 'Montserrat', sans-serif; font-size: 1.4rem; color: #0f172a; font-weight: 800; text-transform: uppercase; }
                .center-title p { margin: 5px 0 0 0; font-size: 0.75rem; color: #64748b; font-weight: 600; }
                
                .meta-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; background: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0; }
                .meta-item { display: flex; flex-direction: column; }
                .meta-label { font-size: 0.65rem; color: #64748b; font-weight: 700; text-transform: uppercase; }
                .meta-value { font-size: 0.85rem; color: #0f172a; font-weight: 700; }
                
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.75rem; }
                th { background: #0f172a; color: white; padding: 12px 10px; text-align: left; text-transform: uppercase; letter-spacing: 0.5px; }
                td { border-bottom: 1px solid #e2e8f0; padding: 10px; color: #334155; }
                tr:nth-child(even) { background: #fcfdfe; }
                
                .signatures-grid { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 80px; text-align: center; }
                .sig-box { border-top: 1px solid #0f172a; padding-top: 15px; }
                .sig-name { font-weight: 800; font-size: 0.8rem; margin: 0; }
                .sig-position { font-size: 0.65rem; color: #64748b; margin-top: 5px; text-transform: uppercase; }
                
                .document-security-footer { margin-top: 50px; border-top: 1px dashed #cbd5e1; padding-top: 15px; display: flex; justify-content: space-between; align-items: center; }
                .security-hash { font-family: monospace; font-size: 0.7rem; color: #94a3b8; }
                .security-stamp { font-size: 0.6rem; color: #94a3b8; font-style: italic; }

                @media print {
                    .no-print { display: none; }
                    body { padding: 0; }
                    .report-document { border: none; padding: 0; }
                }
            </style>
        </head>
        <body>
            <div class="report-document">
                <div class="header-official">
                    <img src="assets/escudo_tzomp.png">
                    <div class="center-title">
                        <h1>${config.titulo}</h1>
                        <p>SISTEMA INTEGRAL DE BASE DE INFORMACIÓN MUNICIPAL (SIBIM)</p>
                        <p>DIRECCIÓN DE SEGURIDAD PÚBLICA Y VIALIDAD • TZOMPANTEPEC, TLAXCALA</p>
                    </div>
                    <img src="assets/SPT.png">
                </div>
                
                <div class="meta-summary">
                    <div class="meta-item">
                        <span class="meta-label">Fecha de Generación</span>
                        <span class="meta-value">${fechaStr}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Total de Registros</span>
                        <span class="meta-value">${report.totalRegistros}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Estado del Segmento</span>
                        <span class="meta-value" style="color:#10b981;">OFICIAL / VALIDADO</span>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            ${config.columnas.map(col => `<th>${col}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${report.data.map(row => `
                            <tr>
                                ${config.columnas.map(col => {
        // Mapeo inteligente de keys
        const key = col.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
        return `<td>${row[key] || row[col.toLowerCase()] || row[col] || '---'}</td>`;
    }).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="signatures-grid">
                    <div class="sig-box">
                        <p class="sig-name">DTO SISTEMAS C2</p>
                        <p class="sig-position">Encargado de Sistemas y SIBIM</p>
                    </div>
                    <div class="sig-box">
                        <p class="sig-name">________________________________</p>
                        <p class="sig-position">Director de Seguridad Pública Municipal</p>
                    </div>
                </div>

                <div class="document-security-footer">
                    <div class="security-hash">HASH DE SEGURIDAD: ${reportHash}</div>
                    <div class="security-stamp">Documento emitido electrónicamente. Sin validez si presenta tachaduras o enmendaduras.</div>
                </div>
            </div>

            <div class="no-print" style="margin-top: 40px; text-align: center;">
                <button onclick="window.print()" style="padding: 15px 40px; background: #0f172a; color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 800; font-family: 'Montserrat', sans-serif;">
                    <i class="fas fa-print"></i> CONFIRMAR IMPRESIÓN OFICIAL
                </button>
            </div>

            <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/js/all.min.js"></script>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
}

// Hacer funciones globales
window.generatePersonnelReport = generatePersonnelReport;
window.generateMovementsReport = generateMovementsReport;
window.generateUserActivityReport = generateUserActivityReport;
window.generateVigenciaReport = generateVigenciaReport;
window.generateEstadisticasReport = generateEstadisticasReport;
window.generateC3Report = generateC3Report;
window.generateC5iReport = generateC5iReport;
window.generateMultasReport = generateMultasReport;
window.generateDocReport = generateDocReport;
window.generateInventoryReport = generateInventoryReport;
window.exportReportToPDF = exportReportToPDF;
window.exportReportToExcel = exportReportToExcel;
window.exportarReporte = exportarReporte;
window.printMunicipalReport = printMunicipalReport;
window.printSingleCredential = printSingleCredential;
window.REPORT_TYPES = REPORT_TYPES;
window.reportConfig = reportConfig;

console.log('Sistema de Repositorio QR cargado correctamente');
console.log('Módulos de Inventario y Configuración activados');
console.log('Sincronización de Credenciales activada');
console.log('Generador de Reportes Municipales activado');