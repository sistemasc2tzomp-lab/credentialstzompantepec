// Generador de Reportes

// Tipos de reportes disponibles
const REPORT_TYPES = {
    MOVIMIENTOS: 'movimientos',
    PERSONAL_ACTIVO: 'personal_activo',
    CREDENCIALES_GENERADAS: 'credenciales_generadas',
    ACTIVIDAD_USUARIOS: 'actividad_usuarios',
    VIGENCIAS: 'vigencias',
    ESTADISTICAS: 'estadisticas'
};

// Configuración de reportes
const reportConfig = {
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
    }
};

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

    const config = reportConfig[report.type];
    const headers = config.columnas;

    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of report.data) {
        const values = headers.map(header => {
            const key = header.toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .replace(' ', '');
            let value = row[key] || row[header.toLowerCase()] || '';
            if (typeof value === 'string' && value.includes(',')) {
                value = `"${value}"`;
            }
            return value;
        });
        csvRows.push(values.join(','));
    }

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${report.type}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    logAction(ACTION_TYPES.EXPORT, `Exportó reporte ${report.type} a Excel`);
}

// Función principal para exportar reportes (unificada de reportes.html)
async function exportarReporte(tipo) {
    if (tipo === 'excel') {
        const report = await generatePersonnelReport();
        exportReportToExcel(report);
    } else if (tipo === 'pdf') {
        window.location.href = 'exportar_pdf.php?tipo=general';
    } else if (tipo === 'pdf-individual') {
        const id = document.getElementById('selectPersonal').value;
        if (id) {
            window.location.href = 'exportar_pdf.php?tipo=individual&id=' + id;
        } else {
            alert('Por favor seleccione un elemento del personal');
        }
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

    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${config.titulo}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap');
                body { font-family: 'Montserrat', sans-serif; margin: 0; padding: 40px; color: #333; }
                .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px double #8e24aa; padding-bottom: 10px; margin-bottom: 30px; }
                .header img { height: 80px; }
                .report-title { text-align: center; text-transform: uppercase; margin-bottom: 20px; color: #4a148c; }
                .report-meta { display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 20px; background: #f3e5f5; padding: 10px; border-radius: 5px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 0.8rem; }
                th { background: #6a1b9a; color: white; padding: 10px; text-align: left; text-transform: uppercase; }
                td { border-bottom: 1px solid #e1bee7; padding: 8px; }
                tr:nth-child(even) { background: #faf5ff; }
                .footer { position: fixed; bottom: 40px; left: 40px; right: 40px; text-align: center; border-top: 1px solid #ccc; padding-top: 20px; }
                .signature-area { margin-top: 50px; display: flex; flex-direction: column; align-items: center; }
                .signature-line { width: 300px; border-top: 1px solid #333; margin-bottom: 5px; }
                .official-info { font-size: 0.7rem; color: #666; margin-top: 10px; }
                @media print {
                    .no-print { display: none; }
                    body { padding: 0; }
                    .header { margin-top: 20px; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <img src="assets/escudo_tzomp.png" alt="Logo Izquierdo">
                <img src="assets/c2_logo.png" alt="Logo Derecho">
            </div>

            <h2 class="report-title">${config.titulo}</h2>
            
            <div class="report-meta">
                <span><strong>Emisión:</strong> ${fechaStr}</span>
                <span><strong>Total de Registros:</strong> ${report.totalRegistros}</span>
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
        const key = col.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(' ', '');
        return `<td>${row[key] || row[col.toLowerCase()] || '---'}</td>`;
    }).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="footer">
                <div class="signature-area">
                    <div class="signature-line"></div>
                    <div style="font-weight: bold; font-size: 0.9rem;">ING. JUAN ROMERO NAVA</div>
                    <div style="font-size: 0.7rem; text-transform: uppercase;">Responsable del Área de Sistemas e Información</div>
                </div>
                <div class="official-info">
                    Av. Zaragoza no. 1, San Salvador Tzompantepec, Col. Centro, C.P. 90490<br>
                    Tel: 241-4152315
                </div>
            </div>

            <div class="no-print" style="margin-top: 40px; text-align: center;">
                <button onclick="window.print()" style="padding: 10px 20px; background: #6a1b9a; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Confirmar Impresión
                </button>
            </div>
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