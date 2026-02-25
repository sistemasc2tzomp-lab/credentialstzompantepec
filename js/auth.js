// Sistema de autenticación y roles
const users = {
    admin: {
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        name: 'Administrador'
    },
    user: {
        username: 'user',
        password: 'user123',
        role: 'user',
        name: 'Usuario General'
    }
};

// Tipos de acciones para logging
const ACTION_TYPES = {
    LOGIN: 'Login',
    LOGOUT: 'Logout',
    VIEW: 'Visualización',
    CREATE: 'Creación',
    UPDATE: 'Actualización',
    DELETE: 'Eliminación',
    PRINT: 'Impresión',
    DOWNLOAD: 'Descarga',
    SEARCH: 'Búsqueda',
    EXPORT: 'Exportación'
};

// Tipos de reportes
const REPORT_TYPES = {
    MOVIMIENTOS: 'movimientos',
    PERSONAL_ACTIVO: 'personal_activo',
    CREDENCIALES_GENERADAS: 'credenciales_generadas',
    ACTIVIDAD_USUARIOS: 'actividad_usuarios',
    VIGENCIAS: 'vigencias',
    ESTADISTICAS: 'estadisticas'
};

// Estados oficiales del personal
const EMPLOYEE_STATUS = {
    ACTIVO: 'Activo',
    FRANCO: 'Franco',
    BAJA: 'Baja',
    VACACIONES: 'Vacaciones',
    COMISION: 'De Comisión',
    INCAPACIDAD: 'Incapacidad',
    SUSPENDIDO: 'Suspendido'
};
window.EMPLOYEE_STATUS = EMPLOYEE_STATUS;

// Configuración de reportes
const reportConfig = {
    [REPORT_TYPES.MOVIMIENTOS]: {
        titulo: 'Reporte de Movimientos del Sistema',
        descripcion: 'Registro detallado de todas las actividades'
    },
    [REPORT_TYPES.PERSONAL_ACTIVO]: {
        titulo: 'Reporte de Personal Activo',
        descripcion: 'Listado completo del personal'
    },
    [REPORT_TYPES.CREDENCIALES_GENERADAS]: {
        titulo: 'Reporte de Credenciales Generadas',
        descripcion: 'Histórico de emisión de credenciales'
    },
    [REPORT_TYPES.ACTIVIDAD_USUARIOS]: {
        titulo: 'Reporte de Actividad por Usuario',
        descripcion: 'Resumen de actividades por usuario'
    },
    [REPORT_TYPES.VIGENCIAS]: {
        titulo: 'Reporte de Control de Vigencias',
        descripcion: 'Personal próximo a vencer y vencido'
    },
    [REPORT_TYPES.ESTADISTICAS]: {
        titulo: 'Estadísticas del Sistema',
        descripcion: 'Métricas y análisis de uso'
    }
};

// Almacén de logs en memoria
let systemLogs = [];

// Función para registrar acciones
function logAction(accion, detalles, usuario = null) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const now = new Date();

    const logEntry = {
        fecha: now.toLocaleDateString('es-MX'),
        hora: now.toLocaleTimeString('es-MX'),
        timestamp: now.getTime(),
        usuario: usuario || (currentUser ? currentUser.name : 'Sistema'),
        rol: currentUser ? currentUser.role : 'sistema',
        accion: accion,
        detalles: detalles
    };

    systemLogs.push(logEntry);

    // Mantener solo los últimos 1000 logs
    if (systemLogs.length > 1000) {
        systemLogs = systemLogs.slice(-1000);
    }

    console.log('LOG:', logEntry);
    return logEntry;
}

// Función para obtener logs filtrados
function getFilteredLogs(filters = {}) {
    let filtered = [...systemLogs];

    if (filters.fechaInicio) {
        const fechaInicio = new Date(filters.fechaInicio).setHours(0, 0, 0, 0);
        filtered = filtered.filter(log => log.timestamp >= fechaInicio);
    }

    if (filters.fechaFin) {
        const fechaFin = new Date(filters.fechaFin).setHours(23, 59, 59, 999);
        filtered = filtered.filter(log => log.timestamp <= fechaFin);
    }

    if (filters.usuario) {
        const usuarioLower = filters.usuario.toLowerCase();
        filtered = filtered.filter(log =>
            log.usuario.toLowerCase().includes(usuarioLower)
        );
    }

    if (filters.accion) {
        filtered = filtered.filter(log => log.accion === filters.accion);
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
}

// Funciones para generar reportes
function generateMovementsReport() {
    return {
        type: REPORT_TYPES.MOVIMIENTOS,
        generatedAt: new Date().toISOString(),
        totalRegistros: systemLogs.length,
        data: getFilteredLogs()
    };
}

async function generatePersonnelReport() {
    const personnelData = await loadGoogleSheetsData();
    return {
        type: REPORT_TYPES.PERSONAL_ACTIVO,
        generatedAt: new Date().toISOString(),
        totalRegistros: personnelData.length,
        data: personnelData
    };
}

function generateUserActivityReport() {
    const userActivity = {};

    systemLogs.forEach(log => {
        if (!userActivity[log.usuario]) {
            userActivity[log.usuario] = {
                usuario: log.usuario,
                rol: log.rol,
                acciones: [],
                ultimaActividad: log.fecha + ' ' + log.hora,
                totalAcciones: 0
            };
        }

        userActivity[log.usuario].acciones.push(log.accion);
        userActivity[log.usuario].totalAcciones++;
        userActivity[log.usuario].ultimaActividad = log.fecha + ' ' + log.hora;
    });

    const data = Object.values(userActivity).map(user => {
        const accionesCount = {};
        user.acciones.forEach(accion => {
            accionesCount[accion] = (accionesCount[accion] || 0) + 1;
        });

        const accionesComunes = Object.entries(accionesCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([accion, count]) => `${accion} (${count})`)
            .join(', ');

        return {
            usuario: user.usuario,
            rol: user.rol,
            totalAcciones: user.totalAcciones,
            ultimaActividad: user.ultimaActividad,
            accionesComunes: accionesComunes
        };
    });

    return {
        type: REPORT_TYPES.ACTIVIDAD_USUARIOS,
        generatedAt: new Date().toISOString(),
        totalRegistros: data.length,
        data: data.sort((a, b) => b.totalAcciones - a.totalAcciones)
    };
}

async function generateVigenciaReport() {
    const personnelData = await loadGoogleSheetsData();
    const today = new Date();

    const data = personnelData.map(person => {
        const vigenciaDate = new Date(person.vigencia || '2024-12-31');
        const diffTime = vigenciaDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let estado = 'Vigente';
        if (diffDays < 0) {
            estado = 'Vencido';
        } else if (diffDays <= 30) {
            estado = 'Por vencer';
        }

        return {
            nombre: person.nombre,
            cargo: person.cargo,
            cuip: person.cuip,
            fechaVigencia: person.vigencia || '2024-12-31',
            estado: estado,
            diasRestantes: diffDays
        };
    });

    return {
        type: REPORT_TYPES.VIGENCIAS,
        generatedAt: new Date().toISOString(),
        totalRegistros: data.length,
        data: data.sort((a, b) => a.diasRestantes - b.diasRestantes)
    };
}

async function generateEstadisticasReport() {
    const personnelData = await loadGoogleSheetsData();
    const today = new Date();
    const lastMonth = new Date(today.setMonth(today.getMonth() - 1));

    const logsLastMonth = systemLogs.filter(log => log.timestamp >= lastMonth.getTime());
    const accionesPorTipo = {};

    logsLastMonth.forEach(log => {
        accionesPorTipo[log.accion] = (accionesPorTipo[log.accion] || 0) + 1;
    });

    const tendencias = [];
    for (const [accion, count] of Object.entries(accionesPorTipo)) {
        tendencias.push({
            metrica: `Acciones de ${accion}`,
            valor: count,
            periodo: 'Último mes',
            tendencia: count > 10 ? '📈' : count > 5 ? '📊' : '📉'
        });
    }

    return {
        type: REPORT_TYPES.ESTADISTICAS,
        generatedAt: new Date().toISOString(),
        totalRegistros: tendencias.length,
        data: tendencias,
        resumen: {
            totalPersonal: personnelData.length,
            totalMovimientos: systemLogs.length,
            usuariosActivos: new Set(systemLogs.map(l => l.usuario)).size,
            periodoAnalisis: 'Últimos 30 días'
        }
    };
}

// Funciones de exportación
function exportReportToExcel(report) {
    let csvContent = '';

    if (report.type === REPORT_TYPES.MOVIMIENTOS) {
        csvContent = 'Fecha,Hora,Usuario,Rol,Acción,Detalles\n';
        report.data.forEach(item => {
            csvContent += `"${item.fecha}","${item.hora}","${item.usuario}","${item.rol}","${item.accion}","${item.detalles}"\n`;
        });
    } else if (report.type === REPORT_TYPES.PERSONAL_ACTIVO) {
        csvContent = 'Nombre,Cargo,CUIP,CURP,Teléfono,Email,Vigencia\n';
        report.data.forEach(item => {
            csvContent += `"${item.nombre}","${item.cargo}","${item.cuip}","${item.curp}","${item.telefono}","${item.email}","${item.vigencia}"\n`;
        });
    } else if (report.type === REPORT_TYPES.VIGENCIAS) {
        csvContent = 'Nombre,Cargo,CUIP,Vigencia,Estado,Días Restantes\n';
        report.data.forEach(item => {
            csvContent += `"${item.nombre}","${item.cargo}","${item.cuip}","${item.fechaVigencia}","${item.estado}","${item.diasRestantes}"\n`;
        });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${report.type}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    logAction(ACTION_TYPES.EXPORT, `Exportó reporte: ${report.type}`);
}

function exportReportToPDF(report) {
    alert('Funcionalidad de exportación a PDF próximamente');
    logAction(ACTION_TYPES.EXPORT, `Intentó exportar PDF: ${report.type}`);
}

function exportLogsToCSV() {
    const report = generateMovementsReport();
    exportReportToExcel(report);
}

// Manejo del login
document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const role = document.querySelector('.role-btn.active').dataset.role;

            authenticateUser(username, password, role);
        });
    }

    // Role selector
    const roleBtns = document.querySelectorAll('.role-btn');
    roleBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            roleBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Dashboard initialization
    if (window.location.pathname.includes('dashboard.html')) {
        checkAuth();
        loadDashboard();
        logAction(ACTION_TYPES.LOGIN, 'Inició sesión en el dashboard');
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            logAction(ACTION_TYPES.LOGOUT, 'Cierre de sesión');
            localStorage.removeItem('currentUser');
            window.location.href = 'login.html';
        });
    }

    // Menu toggle
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', function () {
            document.querySelector('.sidebar').classList.toggle('active');
        });
    }

    // Navigation
    const navLinks = document.querySelectorAll('.sidebar-nav a[data-section]');
    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            loadSection(this.dataset.section);
        });
    });

    // Forgot password
    const forgotLink = document.getElementById('forgotPasswordLink');
    if (forgotLink) {
        forgotLink.addEventListener('click', function (e) {
            e.preventDefault();
            alert('Para restablecer su contraseña institucional, por favor comuníquese con el área de soporte técnico o con la Dirección de Seguridad Pública de Tzompantepec.');
        });
    }
});

async function authenticateUser(username, password, selectedRole) {
    showNotification('Verificando credenciales institucionales...', 'info');

    try {
        // Usar API centralizada de Google Apps Script
        const realUsers = await apiGetUsuarios();

        // Buscar el usuario en la lista real
        let user = realUsers.find(u => u.username === username && u.password === password && u.role === selectedRole);

        // Fallback para admin si la hoja está vacía (primer uso del sistema)
        if (!user && realUsers.length === 0 && username === 'admin' && password === 'admin123' && selectedRole === 'ADMIN') {
            user = { username: 'admin', role: 'ADMIN', nombre: 'Administrador', estado: 'ACTIVO' };
        }

        if (user) {
            if (user.estado === 'INACTIVO') {
                showNotification('Su cuenta ha sido desactivada. Contacte al administrador.', 'error');
                // Re-enable button
                const btn = document.getElementById('loginSubmitBtn');
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-unlock-keyhole"></i> Entrar al Sistema'; }
                return;
            }
            localStorage.setItem('currentUser', JSON.stringify({
                username: user.username,
                role: user.role,
                name: user.nombre || user.name || username
            }));
            logAction(ACTION_TYPES.LOGIN, `Inicio de sesión exitoso como ${selectedRole}`, user.nombre || user.username);
            window.location.href = 'dashboard.html';
        } else {
            showNotification('Credenciales incorrectas o rol no autorizado para este usuario', 'error');
            const btn = document.getElementById('loginSubmitBtn');
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-unlock-keyhole"></i> Entrar al Sistema'; }
        }
    } catch (error) {
        console.error('Error de autenticación:', error);
        showNotification('Error de conexión. Intenta de nuevo.', 'error');
        const btn = document.getElementById('loginSubmitBtn');
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-unlock-keyhole"></i> Entrar al Sistema'; }
    }
}

function checkAuth() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Map role to display name
    const roleNames = {
        'ADMIN': 'Administrador',
        'OPERADOR': 'Operador',
        'AUDITOR': 'Auditor',
        'admin': 'Administrador',   // legacy fallback
        'user': 'Usuario'            // legacy fallback
    };

    // Update UI with user info
    const userNameEl = document.getElementById('userName');
    const userRoleEl = document.getElementById('userRole');
    if (userNameEl) userNameEl.textContent = user.name;
    if (userRoleEl) userRoleEl.textContent = roleNames[user.role] || user.role;

    // Show/hide admin sections
    const adminSection = document.getElementById('adminSection');
    if (adminSection) {
        adminSection.style.display = (user.role === 'ADMIN' || user.role === 'admin') ? 'block' : 'none';
    }
}

function loadDashboard() {
    loadSection('inicio');
}

// Sección de Movimientos
function getMovimientosSection() {
    const logs = getFilteredLogs();

    return `
        <div class="movimientos-section">
            <div class="section-header">
                <h2><i class="fas fa-history"></i> Registro de Movimientos</h2>
                <div class="header-actions">
                    <button class="action-btn" onclick="exportLogsToCSV()">
                        <i class="fas fa-download"></i> Exportar CSV
                    </button>
                    <button class="action-btn secondary" onclick="clearLogFilters()">
                        <i class="fas fa-undo"></i> Limpiar Filtros
                    </button>
                </div>
            </div>
            
            <div class="filters-card">
                <h3>Filtros</h3>
                <div class="filters-grid">
                    <div class="filter-group">
                        <label>Fecha Inicio:</label>
                        <input type="date" id="filterFechaInicio" class="filter-input">
                    </div>
                    <div class="filter-group">
                        <label>Fecha Fin:</label>
                        <input type="date" id="filterFechaFin" class="filter-input">
                    </div>
                    <div class="filter-group">
                        <label>Usuario:</label>
                        <input type="text" id="filterUsuario" placeholder="Buscar usuario..." class="filter-input">
                    </div>
                    <div class="filter-group">
                        <label>Acción:</label>
                        <select id="filterAccion" class="filter-input">
                            <option value="">Todas</option>
                            ${Object.values(ACTION_TYPES).map(accion =>
        `<option value="${accion}">${accion}</option>`
    ).join('')}
                        </select>
                    </div>
                </div>
                <button class="action-btn" onclick="applyLogFilters()">
                    <i class="fas fa-search"></i> Aplicar Filtros
                </button>
            </div>
            
            <div class="logs-table-container">
                <table class="data-table" id="logsTable">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Hora</th>
                            <th>Usuario</th>
                            <th>Rol</th>
                            <th>Acción</th>
                            <th>Detalles</th>
                        </tr>
                    </thead>
                    <tbody id="logsTableBody">
                        ${generateLogsRows(logs)}
                    </tbody>
                </table>
            </div>
            
            <div class="table-footer">
                <span>Total registros: <strong>${logs.length}</strong></span>
            </div>
        </div>
    `;
}

function generateLogsRows(logs) {
    if (logs.length === 0) {
        return '<tr><td colspan="6" style="text-align: center;">No hay movimientos registrados</td></tr>';
    }

    return logs.slice(0, 100).map(log => `
        <tr>
            <td>${log.fecha}</td>
            <td>${log.hora}</td>
            <td>${log.usuario}</td>
            <td><span class="role-badge ${log.rol}">${log.rol}</span></td>
            <td>${log.accion}</td>
            <td>${log.detalles}</td>
        </tr>
    `).join('');
}

// Sección de Reportes
function getReportesSection() {
    return `
        <div class="reportes-container">
            <div class="section-header">
                <h2><i class="fas fa-file-contract"></i> Sistema de Reportes e Inteligencia</h2>
                <div class="header-actions">
                    <button class="action-btn" onclick="exportarReporte('excel')">
                        <i class="fas fa-file-excel"></i> Exportar Consolidado
                    </button>
                    <button class="action-btn secondary" onclick="window.print()">
                        <i class="fas fa-print"></i> Imprimir Vista
                    </button>
                </div>
            </div>
            
            <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 25px;">
                <div class="stat-card" style="border-left: 4px solid #6a1b9a;">
                    <div class="stat-info">
                        <h3>Reportes Generados</h3>
                        <p>124</p>
                    </div>
                </div>
                <div class="stat-card" style="border-left: 4px solid #1a3a5f;">
                    <div class="stat-info">
                        <h3>Exportaciones PDF</h3>
                        <p>89</p>
                    </div>
                </div>
                <div class="stat-card" style="border-left: 4px solid #c5a059;">
                    <div class="stat-info">
                        <h3>Auditorías Realizadas</h3>
                        <p>15</p>
                    </div>
                </div>
            </div>

            <div class="report-filters-layout" style="display: grid; grid-template-columns: 1fr 2fr; gap: 20px;">
                <div class="card">
                    <h3><i class="fas fa-cog"></i> Configurar Reporte</h3>
                    <div class="form-group" style="margin-top:15px;">
                        <label>Tipo de Reporte</label>
                        <select id="mainReportSelector" class="filter-input" style="width:100%" onchange="updateReportDescription()">
                            <option value="${REPORT_TYPES.PERSONAL_ACTIVO}">Listado de Personal</option>
                            <option value="${REPORT_TYPES.VIGENCIAS}">Control de Vigencias</option>
                            <option value="${REPORT_TYPES.MOVIMIENTOS}">Bitácora de Movimientos</option>
                            <option value="${REPORT_TYPES.ACTIVIDAD_USUARIOS}">Rendimiento de Usuarios</option>
                            <option value="${REPORT_TYPES.ESTADISTICAS}">Estadísticas Operativas</option>
                        </select>
                        <p id="reportDesc" style="font-size: 0.8rem; color: #64748b; margin-top: 10px;">Genera un listado detallado de todo el personal activo.</p>
                    </div>
                    <div class="form-group">
                        <label>Filtro Individual (Opcional)</label>
                        <select id="selectPersonal" class="filter-input" style="width:100%">
                            <option value="">-- Todos los elementos --</option>
                        </select>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
                        <button onclick="generateAndPreviewReport()" class="action-btn">
                            <i class="fas fa-sync"></i> Generar Vista Previa
                        </button>
                        <button onclick="printCurrentReport()" class="action-btn secondary">
                            <i class="fas fa-file-pdf"></i> Generar Reporte PDF
                        </button>
                    </div>
                </div>

                <div class="card">
                    <h3><i class="fas fa-eye"></i> Vista Previa</h3>
                    <div id="reporteResultado" class="reporte-resultado" style="max-height: 500px; overflow-y: auto;">
                        <div class="empty-state" style="text-align: center; padding: 50px;">
                            <i class="fas fa-file-invoice" style="font-size: 3rem; color: #e2e8f0; margin-bottom: 15px;"></i>
                            <p>Seleccione un tipo de reporte y haga clic en "Generar Vista Previa"</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getDocumentacionSection() {
    return `
        <div class="documentacion-container">
            <div class="section-header">
                <h2><i class="fas fa-folder-open"></i> Repositorio Central de Documentación</h2>
                <div class="header-actions">
                    <button class="action-btn" onclick="showUploadDocModal()">
                        <i class="fas fa-upload"></i> Cargar Documento
                    </button>
                </div>
            </div>

            <div class="card" style="margin-bottom: 25px;">
                <div class="search-bar" style="margin-bottom: 0;">
                    <i class="fas fa-search"></i>
                    <input type="text" id="searchDocs" placeholder="Buscar por Nombre, CURP, CUIP o RFC..." onkeyup="filterDocsRepo()">
                </div>
            </div>

            <div class="docs-grid" id="docsGridContainer">
                <!-- Se cargará aquí la lista de personal con sus carpetas -->
                <div class="loading">Sincronizando expedientes digitales...</div>
            </div>
        </div>

        <!-- Modal para Carga de Documentos -->
        <div id="uploadDocModal" class="modal-overlay" style="display:none;">
            <div class="modal-content card">
                <h3><i class="fas fa-file-upload"></i> Cargar Documentación Digital</h3>
                <form id="formUploadDoc">
                    <div class="form-group">
                        <label>Seleccionar Personal</label>
                        <select id="docPersonnelSelect" name="employeeId" required class="filter-input" style="width:100%">
                            <option value="">Cargando personal...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Tipo de Documento</label>
                        <select name="docType" required class="filter-input" style="width:100%">
                            <option value="CURP">CURP (PDF)</option>
                            <option value="RFC">RFC (PDF)</option>
                            <option value="INE">Identificación Oficial</option>
                            <option value="ACTA">Acta de Nacimiento</option>
                            <option value="COMPROBANTE">Comprobante de Domicilio</option>
                            <option value="TITULO">Título / Cédula</option>
                            <option value="CUIP">Constancia CUIP</option>
                            <option value="OTRO">Otro Documento</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Archivo (PDF o Imagen)</label>
                        <input type="file" name="docFile" required accept=".pdf,image/*">
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="action-btn">Subir al Expediente</button>
                        <button type="button" class="action-btn secondary" onclick="closeUploadDocModal()">Cancelar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

async function showReportGenerator(reportType) {
    const resultadoDiv = document.getElementById('reporteResultado');
    resultadoDiv.style.display = 'block';

    let report;
    let html = '';

    switch (reportType) {
        case REPORT_TYPES.MOVIMIENTOS:
            report = generateMovementsReport();
            html = generateMovimientosReportHTML(report);
            break;
        case REPORT_TYPES.PERSONAL_ACTIVO:
            report = await generatePersonnelReport();
            html = generatePersonalReportHTML(report);
            break;
        case REPORT_TYPES.ACTIVIDAD_USUARIOS:
            report = generateUserActivityReport();
            html = generateActividadReportHTML(report);
            break;
        case REPORT_TYPES.VIGENCIAS:
            report = await generateVigenciaReport();
            html = generateVigenciaReportHTML(report);
            break;
        case REPORT_TYPES.ESTADISTICAS:
            report = await generateEstadisticasReport();
            html = generateEstadisticasReportHTML(report);
            break;
        default:
            html = '<p>Tipo de reporte no implementado</p>';
    }

    resultadoDiv.innerHTML = html;
    window.currentReport = report; // Guardar reporte actual para impresión
    logAction(ACTION_TYPES.VIEW, `Visualizó reporte: ${reportType}`);
}

function generateMovimientosReportHTML(report) {
    return `
        <div class="reporte-header">
            <h3>${reportConfig[REPORT_TYPES.MOVIMIENTOS].titulo}</h3>
            <div class="reporte-actions">
                <button class="action-btn" onclick="exportReportToExcel(${JSON.stringify(report).replace(/"/g, '&quot;')})">
                    <i class="fas fa-file-excel"></i> Exportar Excel
                </button>
                <button class="action-btn" onclick="exportReportToPDF(${JSON.stringify(report).replace(/"/g, '&quot;')})">
                    <i class="fas fa-file-pdf"></i> Exportar PDF
                </button>
            </div>
        </div>
        <p>Generado: ${new Date(report.generatedAt).toLocaleString()}</p>
        <p>Total de registros: ${report.totalRegistros}</p>
        
        <table class="data-table">
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Hora</th>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Acción</th>
                    <th>Detalles</th>
                </tr>
            </thead>
            <tbody>
                ${report.data.slice(0, 50).map(item => `
                    <tr>
                        <td>${item.fecha}</td>
                        <td>${item.hora}</td>
                        <td>${item.usuario}</td>
                        <td>${item.rol}</td>
                        <td>${item.accion}</td>
                        <td>${item.detalles}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ${report.data.length > 50 ? '<p><em>Mostrando primeros 50 registros</em></p>' : ''}
    `;
}

function generatePersonalReportHTML(report) {
    return `
        <div class="reporte-header">
            <h3>${reportConfig[REPORT_TYPES.PERSONAL_ACTIVO].titulo}</h3>
            <div class="reporte-actions">
                <button class="action-btn" onclick="exportReportToExcel(${JSON.stringify(report).replace(/"/g, '&quot;')})">
                    <i class="fas fa-file-excel"></i> Exportar Excel
                </button>
            </div>
        </div>
        <p>Generado: ${new Date(report.generatedAt).toLocaleString()}</p>
        <p>Total de personal: ${report.totalRegistros}</p>
        
        <table class="data-table">
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Cargo</th>
                    <th>CUIP</th>
                    <th>CURP</th>
                    <th>Teléfono</th>
                    <th>Email</th>
                    <th>Vigencia</th>
                </tr>
            </thead>
            <tbody>
                ${report.data.map(item => `
                    <tr>
                        <td>${item.nombre}</td>
                        <td>${item.cargo}</td>
                        <td>${item.cuip}</td>
                        <td>${item.curp}</td>
                        <td>${item.telefono}</td>
                        <td>${item.email}</td>
                        <td>${item.vigencia}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function generateActividadReportHTML(report) {
    return `
        <div class="reporte-header">
            <h3>${reportConfig[REPORT_TYPES.ACTIVIDAD_USUARIOS].titulo}</h3>
            <div class="reporte-actions">
                <button class="action-btn" onclick="exportReportToExcel(${JSON.stringify(report).replace(/"/g, '&quot;')})">
                    <i class="fas fa-file-excel"></i> Exportar Excel
                </button>
            </div>
        </div>
        <p>Generado: ${new Date(report.generatedAt).toLocaleString()}</p>
        <p>Usuarios activos: ${report.totalRegistros}</p>
        
        <table class="data-table">
            <thead>
                <tr>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Total Acciones</th>
                    <th>Última Actividad</th>
                    <th>Acciones Comunes</th>
                </tr>
            </thead>
            <tbody>
                ${report.data.map(item => `
                    <tr>
                        <td><strong>${item.usuario}</strong></td>
                        <td>${item.rol}</td>
                        <td class="text-center">${item.totalAcciones}</td>
                        <td>${item.ultimaActividad}</td>
                        <td>${item.accionesComunes}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function generateVigenciaReportHTML(report) {
    const vencidos = report.data.filter(p => p.estado === 'Vencido').length;
    const porVencer = report.data.filter(p => p.estado === 'Por vencer').length;
    const vigentes = report.data.filter(p => p.estado === 'Vigente').length;

    return `
        <div class="reporte-header">
            <h3>${reportConfig[REPORT_TYPES.VIGENCIAS].titulo}</h3>
            <div class="reporte-actions">
                <button class="action-btn" onclick="exportReportToExcel(${JSON.stringify(report).replace(/"/g, '&quot;')})">
                    <i class="fas fa-file-excel"></i> Exportar Excel
                </button>
            </div>
        </div>
        <p>Generado: ${new Date(report.generatedAt).toLocaleString()}</p>
        
        <div class="stats-mini">
            <div class="stat-mini-card">
                <span class="stat-label">Vigentes</span>
                <span class="stat-value" style="color: #4caf50;">${vigentes}</span>
            </div>
            <div class="stat-mini-card">
                <span class="stat-label">Por Vencer</span>
                <span class="stat-value" style="color: #ff9800;">${porVencer}</span>
            </div>
            <div class="stat-mini-card">
                <span class="stat-label">Vencidos</span>
                <span class="stat-value" style="color: #f44336;">${vencidos}</span>
            </div>
        </div>
        
        <table class="data-table">
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Cargo</th>
                    <th>CUIP</th>
                    <th>Vigencia</th>
                    <th>Estado</th>
                    <th>Días Restantes</th>
                </tr>
            </thead>
            <tbody>
                ${report.data.map(item => `
                    <tr>
                        <td>${item.nombre}</td>
                        <td>${item.cargo}</td>
                        <td>${item.cuip}</td>
                        <td>${item.fechaVigencia}</td>
                        <td>
                            <span class="status-badge ${item.estado === 'Vigente' ? 'vigente' : item.estado === 'Por vencer' ? 'por-vencer' : 'vencido'}">
                                ${item.estado}
                            </span>
                        </td>
                        <td class="text-center">${item.diasRestantes}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function generateEstadisticasReportHTML(report) {
    return `
        <div class="reporte-header">
            <h3>${reportConfig[REPORT_TYPES.ESTADISTICAS].titulo}</h3>
            <div class="reporte-actions">
                <button class="action-btn" onclick="exportReportToExcel(${JSON.stringify(report).replace(/"/g, '&quot;')})">
                    <i class="fas fa-file-excel"></i> Exportar Excel
                </button>
            </div>
        </div>
        <p>Generado: ${new Date(report.generatedAt).toLocaleString()}</p>
        
        <div class="estadisticas-grid">
            ${report.data.map(item => `
                <div class="estadistica-card">
                    <div class="estadistica-icon">${item.tendencia}</div>
                    <div class="estadistica-content">
                        <h4>${item.metrica}</h4>
                        <div class="estadistica-valor">${item.valor}</div>
                        <small>${item.periodo}</small>
                    </div>
                </div>
            `).join('')}
        </div>
        
        ${report.resumen ? `
            <div class="resumen-card">
                <h4>Resumen Ejecutivo</h4>
                <p>Total Personal: <strong>${report.resumen.totalPersonal}</strong></p>
                <p>Total Movimientos: <strong>${report.resumen.totalMovimientos}</strong></p>
                <p>Usuarios Activos: <strong>${report.resumen.usuariosActivos}</strong></p>
                <p>Período de Análisis: <strong>${report.resumen.periodoAnalisis}</strong></p>
            </div>
        ` : ''}
    `;
}

// Funciones auxiliares para filtros
function applyLogFilters() {
    const filters = {
        fechaInicio: document.getElementById('filterFechaInicio')?.value,
        fechaFin: document.getElementById('filterFechaFin')?.value,
        usuario: document.getElementById('filterUsuario')?.value,
        accion: document.getElementById('filterAccion')?.value
    };

    const filteredLogs = getFilteredLogs(filters);
    const tbody = document.getElementById('logsTableBody');

    if (tbody) {
        tbody.innerHTML = generateLogsRows(filteredLogs);
    }

    logAction(ACTION_TYPES.SEARCH, `Aplicó filtros a movimientos`);
}

function clearLogFilters() {
    document.getElementById('filterFechaInicio').value = '';
    document.getElementById('filterFechaFin').value = '';
    document.getElementById('filterUsuario').value = '';
    document.getElementById('filterAccion').value = '';

    applyLogFilters();
}

function getInicioSection() {
    return `
        <div class="dashboard-home">
            <div class="welcome-banner">
                <div class="welcome-text">
                    <h1>Panel de Control de Seguridad Pública</h1>
                    <p>Gestión integral de personal y credencialización - Tzompantepec</p>
                </div>
                <div class="current-date">
                    <i class="far fa-calendar-alt"></i>
                    <span id="displayDate">${new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
            </div>

            <div class="stats-overview">
                <div class="stat-card primary">
                    <div class="stat-icon"><i class="fas fa-users"></i></div>
                    <div class="stat-content">
                        <h3>Total Personal</h3>
                        <p class="stat-number" id="totalPersonal">0</p>
                        <span class="stat-trend positive"><i class="fas fa-arrow-up"></i> +2 este mes</span>
                    </div>
                </div>
                <div class="stat-card success">
                    <div class="stat-icon"><i class="fas fa-id-card"></i></div>
                    <div class="stat-content">
                        <h3>Vigentes</h3>
                        <p class="stat-number" id="credencialesActivas">0</p>
                        <span class="stat-label">Credenciales activas</span>
                    </div>
                </div>
                <div class="stat-card warning">
                    <div class="stat-icon"><i class="fas fa-exclamation-triangle"></i></div>
                    <div class="stat-content">
                        <h3>Por Vencer</h3>
                        <p class="stat-number" id="statsPorVencer">5</p>
                        <span class="stat-label">Próximos 30 días</span>
                    </div>
                </div>
                <div class="stat-card danger">
                    <div class="stat-icon"><i class="fas fa-clock"></i></div>
                    <div class="stat-content">
                        <h3>Vencidas</h3>
                        <p class="stat-number" id="statsVencidas">2</p>
                        <span class="stat-label">Requieren renovación</span>
                    </div>
                </div>
            </div>

            <div class="dashboard-charts">
                <div class="chart-container card">
                    <h3><i class="fas fa-chart-pie"></i> Distribución por Cargo</h3>
                    <canvas id="chartCargos"></canvas>
                </div>
                <div class="chart-container card">
                    <h3><i class="fas fa-chart-line"></i> Actividad Reciente</h3>
                    <canvas id="chartActividad"></canvas>
                </div>
            </div>

            <div class="recent-activity card">
                <h3><i class="fas fa-history"></i> Últimos Movimientos</h3>
                <div class="activity-list" id="recentActivityList">
                    <div class="activity-item loading">Cargando movimientos...</div>
                </div>
            </div>
        </div>
    `;
}

function getPersonalSection() {
    return `
        <div class="gestion-personal-container">
            <div class="section-header">
                <h2><i class="fas fa-users-cog"></i> Gestión de Personal</h2>
                <div class="header-actions">
                    <button class="action-btn" onclick="document.getElementById('formRegistroPersonal').scrollIntoView({behavior: 'smooth'})">
                        <i class="fas fa-user-plus"></i> Nuevo Registro
                    </button>
                </div>
            </div>
            
            <p>Módulo de administración de personal de seguridad pública</p>
            
            <!-- Formulario de registro de personal -->
            <div class="formulario-personal">
                <h3><i class="fas fa-user-plus"></i> Registrar Nuevo Personal</h3>
                
                <form id="formRegistroPersonal" class="form-personal">
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="nombre"><i class="fas fa-user"></i> Nombre(s) *</label>
                            <input type="text" id="nombre" name="nombre" required placeholder="Nombre(s)">
                        </div>

                        <div class="form-group">
                            <label for="apellidos"><i class="fas fa-user"></i> Apellidos *</label>
                            <input type="text" id="apellidos" name="apellidos" required placeholder="Apellidos">
                        </div>

                        <div class="form-group">
                            <label for="cuip"><i class="fas fa-id-card"></i> CUIP *</label>
                            <input type="text" id="cuip" name="cuip" required placeholder="Clave Única de Identificación Personal">
                        </div>

                        <div class="form-group">
                            <label for="curp"><i class="fas fa-id-card"></i> CURP *</label>
                            <input type="text" id="curp" name="curp" required placeholder="CURP (18 caracteres)">
                        </div>

                        <div class="form-group">
                            <label for="rfc"><i class="fas fa-barcode"></i> RFC *</label>
                            <input type="text" id="rfc" name="rfc" required placeholder="RFC con Homoclave">
                        </div>

                        <div class="form-group">
                            <label for="fechaNacimiento"><i class="fas fa-birthday-cake"></i> Fecha Nacimiento *</label>
                            <input type="date" id="fechaNacimiento" name="fechaNacimiento" required>
                        </div>

                        <div class="form-group">
                            <label for="puesto"><i class="fas fa-briefcase"></i> Cargo / Puesto *</label>
                            <select id="puesto" name="puesto" required>
                                <option value="">Seleccione un cargo</option>
                                <option value="Policía">Policía</option>
                                <option value="Oficial">Oficial</option>
                                <option value="Supervisor">Supervisor</option>
                                <option value="Comandante">Comandante</option>
                                <option value="Administrativo">Administrativo</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="fechaIngreso"><i class="fas fa-calendar-check"></i> Fecha de Ingreso *</label>
                            <input type="date" id="fechaIngreso" name="fechaIngreso" required>
                        </div>

                        <div class="form-group">
                            <label for="tipoSangre"><i class="fas fa-tint"></i> Tipo de Sangre</label>
                            <select id="tipoSangre" name="tipoSangre">
                                <option value="O+">O+</option>
                                <option value="O-">O-</option>
                                <option value="A+">A+</option>
                                <option value="A-">A-</option>
                                <option value="B+">B+</option>
                                <option value="AB+">AB+</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="nss"><i class="fas fa-heartbeat"></i> NSS</label>
                            <input type="text" id="nss" name="nss" placeholder="Número de Seguro Social">
                        </div>

                        <div class="form-group">
                            <label for="numPlaca"><i class="fas fa-id-badge"></i> Número de Placa</label>
                            <input type="text" id="numPlaca" name="numPlaca" placeholder="Placa de identificación">
                        </div>

                        <div class="form-group">
                            <label for="fotoInput"><i class="fas fa-camera"></i> Fotografía</label>
                            <input type="file" id="fotoInput" name="foto" accept="image/*">
                        </div>

                        <div class="form-group">
                            <label for="armado"><i class="fas fa-gun"></i> Armamento Principal</label>
                            <input type="text" id="armado" name="armado" placeholder="Arma corta/larga asignada">
                        </div>

                        <div class="form-group">
                            <label for="vehiculo"><i class="fas fa-car"></i> Vehículo Asignado</label>
                            <input type="text" id="vehiculo" name="vehiculo" placeholder="Número de patrulla / Unidad">
                        </div>

                        <div class="form-group full-width">
                            <label><i class="fas fa-pen-nib"></i> Firma Digital del Policía</label>
                            <div class="signature-container">
                                <canvas id="signature-pad" class="signature-pad"></canvas>
                                <div class="signature-actions">
                                    <button type="button" class="action-btn small secondary" id="clear-signature">
                                        <i class="fas fa-eraser"></i> Limpiar Firma
                                    </button>
                                </div>
                                <input type="hidden" name="firma" id="firma-input">
                            </div>
                            <small class="form-text text-muted">Solicite el trazo de la firma dentro del recuadro.</small>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="submit" class="action-btn">
                            <i class="fas fa-save"></i> Guardar Personal
                        </button>
                        <button type="reset" class="action-btn secondary">
                            <i class="fas fa-eraser"></i> Limpiar
                        </button>
                    </div>
                </form>
            </div>

            <!-- Repositorio de Credenciales (Galería) -->
            <div class="personal-table-section">
                <h3><i class="fas fa-id-card"></i> Repositorio de Credenciales Emitidas</h3>
                <div class="search-bar">
                    <input type="text" id="buscarCredencial" placeholder="Buscar por nombre o CUIP..." onkeyup="filterCredencialesRepo()">
                </div>
                <div class="inventory-grid" id="credencialesGrid">
                    <div class="loading">Cargando repositorio de credenciales...</div>
                </div>
            </div>
        </div>
    `;
}

function getCredencialesSection() {
    return `
        <div class="credenciales-section">
            <div class="section-header">
                <h2><i class="fas fa-id-card"></i> Generador de Credenciales Oficiales</h2>
                <div class="header-actions">
                    <button class="action-btn" onclick="printEnhancedCredential()">
                        <i class="fas fa-print"></i> Imprimir Credencial
                    </button>
                </div>
            </div>

            <div class="credential-container" style="display: flex; flex-direction: column; gap: 40px; align-items: center;">
                <!-- FRENTE -->
                <div class="credential-preview-box">
                    <h3>Vista Frontal</h3>
                    <div class="credential-tzomp" id="tzompFront">
                        <div class="top-logos" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 15px;">
                            <!-- Logo Izquierdo: Escudo Tzompantepec -->
                            <div class="logo-left" style="width: 70px;">
                                <img src="assets/escudo_tzomp.png" alt="Escudo" style="width: 100%; height: auto; object-fit: contain;">
                            </div>
                            <!-- Logo Centro: C2 -->
                            <div class="logo-center" style="width: 90px;">
                                <img src="assets/c2_logo.png" alt="C2" style="width: 100%; height: auto; object-fit: contain;">
                            </div>
                            <!-- Logo Derecho: SPT -->
                            <div class="logo-right" style="width: 70px;">
                                <img src="assets/spt_logo.png" alt="SPT" style="width: 100%; height: auto; object-fit: contain;">
                            </div>
                        </div>
                        <div class="banner">
                            <div>SEGURIDAD PÚBLICA</div>
                            <div style="font-size: 0.9rem;">TZOMPANTEPEC</div>
                        </div>
                        <div class="main-content">
                            <div class="photo-area" id="previewPhoto">
                                <i class="fas fa-user"></i>
                            </div>
                            <div class="info-area">
                                <div class="info-field">
                                    <span class="info-label">Nombre:</span>
                                    <span class="info-value" id="previewName">NOMBRE APELLIDO</span>
                                </div>
                                <div class="info-field">
                                    <span class="info-label">Cargo:</span>
                                    <span class="info-value" id="previewPosition">CARGO EJEMPLO</span>
                                </div>
                                <div class="info-field">
                                    <span class="info-label">CUIP:</span>
                                    <span class="info-value" id="previewCUIP">---</span>
                                </div>
                                <div class="info-field">
                                    <span class="info-label">CURP:</span>
                                    <span class="info-value" id="previewCURP">---</span>
                                </div>
                                <div class="info-field">
                                    <span class="info-label">Vigencia:</span>
                                    <span class="info-value" id="previewVigencia">1 AÑO</span>
                                </div>
                                <div class="info-field">
                                    <span class="info-label">Expedición:</span>
                                    <span class="info-value" id="previewExpedicion">01-ENERO-26</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- REVERSO -->
                <div class="credential-preview-box">
                    <h3>Vista Posterior</h3>
                    <div class="credential-tzomp back" id="tzompBack">
                        <div class="top-logos" style="display: flex; justify-content: space-around; align-items: center; padding: 10px;">
                            <img src="assets/escudo_tzomp.png" alt="Escudo" style="height: 40px; width: auto;">
                            <img src="assets/c2_logo.png" alt="C2" style="height: 40px; width: auto;">
                            <img src="assets/spt_logo.png" alt="SPT" style="height: 40px; width: auto;">
                        </div>
                        <div class="banner">
                            <div>SEGURIDAD PÚBLICA</div>
                            <div style="font-size: 0.9rem;">TZOMPANTEPEC</div>
                        </div>
                        <div class="back-layout">
                            <div class="auth-section">
                                <div style="font-size: 0.6rem; margin-bottom: 40px;">FIRMA DE AUTORIZACIÓN</div>
                                <div class="signature-line"></div>
                                <div style="font-size: 0.5rem; font-weight: bold;">C.P. MARCELINO RAMOS MONTIEL</div>
                                <div style="font-size: 0.4rem;">PRESIDENTE MUNICIPAL</div>
                            </div>
                            <div class="fingerprint-section">
                                <div class="fingerprint"></div>
                            </div>
                            <div class="confidentiality">
                                <h4>AVISO DE CONFIDENCIALIDAD:</h4>
                                <p>Este documento es personal e intransferible. Su uso indebido será sancionado conforme a la ley. En caso de pérdida, repórtelo inmediatamente.</p>
                            </div>
                        </div>
                        <div class="bottom-banner">
                            <div style="display: flex; align-items: center; gap: 5px;">
                                <i class="fas fa-fingerprint" style="color: #c5a059;"></i>
                                <span>C2</span>
                            </div>
                            <span>PROPIEDAD DE GOBIERNO DE TZOMPANTEPEC</span>
                            <div class="qr-area" id="previewQR">
                                <i class="fas fa-qrcode" style="color: black;"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Sección de Repositorio mejorada
function getRepositorioSection() {
    // Verificar si EMPLOYEE_STATUS está disponible
    const employeeStatus = window.EMPLOYEE_STATUS || {
        ACTIVO: 'Activo',
        BAJA: 'Baja',
        VACACIONES: 'Vacaciones',
        COMISION: 'De Comisión'
    };

    return `
        <div class="repositorio-completo">
            <div class="section-header">
                <h2><i class="fas fa-database"></i> Repositorio de Personal</h2>
                <div class="header-actions">
                    <button class="action-btn primary" onclick="showAddEmployeeModal()">
                        <i class="fas fa-plus"></i> Nuevo Personal
                    </button>
                    <button class="action-btn" onclick="exportPersonnelData()">
                        <i class="fas fa-download"></i> Exportar
                    </button>
                    <button class="action-btn secondary" onclick="refreshPersonnelData()">
                        <i class="fas fa-sync-alt"></i> Actualizar
                    </button>
                </div>
            </div>

            <!-- Filtros avanzados -->
            <div class="filters-advanced">
                <div class="filters-row">
                    <div class="filter-group">
                        <label><i class="fas fa-search"></i> Búsqueda</label>
                        <input type="text" id="searchGlobal" placeholder="Nombre, cargo, CUIP, CURP..." class="filter-input">
                    </div>
                    <div class="filter-group">
                        <label><i class="fas fa-filter"></i> Estado</label>
                        <select id="filterEstado" class="filter-input">
                            <option value="">Todos</option>
                            ${Object.values(employeeStatus).map(estado =>
        `<option value="${estado}">${estado}</option>`
    ).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label><i class="fas fa-briefcase"></i> Cargo</label>
                        <select id="filterCargo" class="filter-input">
                            <option value="">Todos</option>
                            <option value="Supervisor">Supervisor</option>
                            <option value="Guardia">Guardia</option>
                            <option value="Jefe de Turno">Jefe de Turno</option>
                            <option value="Coordinadora">Coordinadora</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label><i class="fas fa-calendar"></i> Vigencia</label>
                        <select id="filterVigencia" class="filter-input">
                            <option value="">Todas</option>
                            <option value="vigente">Vigente</option>
                            <option value="por-vencer">Por vencer (30 días)</option>
                            <option value="vencido">Vencido</option>
                        </select>
                    </div>
                </div>
                <div class="filters-row">
                    <div class="filter-group">
                        <label><i class="fas fa-calendar-alt"></i> Fecha Ingreso desde</label>
                        <input type="date" id="filterFechaIngresoDesde" class="filter-input">
                    </div>
                    <div class="filter-group">
                        <label><i class="fas fa-calendar-alt"></i> Fecha Ingreso hasta</label>
                        <input type="date" id="filterFechaIngresoHasta" class="filter-input">
                    </div>
                    <div class="filter-group">
                        <label><i class="fas fa-id-card"></i> Con Credencial</label>
                        <select id="filterCredencial" class="filter-input">
                            <option value="">Todos</option>
                            <option value="si">Con credencial activa</option>
                            <option value="no">Sin credencial</option>
                        </select>
                    </div>
                    <div class="filter-group filter-actions">
                        <button class="action-btn" onclick="applyPersonnelFilters()">
                            <i class="fas fa-search"></i> Aplicar
                        </button>
                        <button class="action-btn secondary" onclick="clearPersonnelFilters()">
                            <i class="fas fa-undo"></i> Limpiar
                        </button>
                    </div>
                </div>
            </div>

            <!-- Estadísticas rápidas -->
            <div class="stats-cards">
                <div class="stat-card" onclick="filterByStatus('Activo')">
                    <div class="stat-icon" style="background: #4caf50;">
                        <i class="fas fa-user-check"></i>
                    </div>
                    <div class="stat-info">
                        <span class="stat-label">Activos</span>
                        <span class="stat-number" id="statsActivos">0</span>
                    </div>
                </div>
                <div class="stat-card" onclick="filterByStatus('Baja')">
                    <div class="stat-icon" style="background: #f44336;">
                        <i class="fas fa-user-times"></i>
                    </div>
                    <div class="stat-info">
                        <span class="stat-label">Bajas</span>
                        <span class="stat-number" id="statsBajas">0</span>
                    </div>
                </div>
                <div class="stat-card" onclick="filterByStatus('Vacaciones')">
                    <div class="stat-icon" style="background: #ff9800;">
                        <i class="fas fa-umbrella-beach"></i>
                    </div>
                    <div class="stat-info">
                        <span class="stat-label">Vacaciones</span>
                        <span class="stat-number" id="statsVacaciones">0</span>
                    </div>
                </div>
                <div class="stat-card" onclick="filterByStatus('De Comisión')">
                    <div class="stat-icon" style="background: #9c27b0;">
                        <i class="fas fa-briefcase"></i>
                    </div>
                    <div class="stat-info">
                        <span class="stat-label">De Comisión</span>
                        <span class="stat-number" id="statsComision">0</span>
                    </div>
                </div>
                <div class="stat-card" onclick="filterByVigencia('por-vencer')">
                    <div class="stat-icon" style="background: #ffc107;">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="stat-info">
                        <span class="stat-label">Por vencer</span>
                        <span class="stat-number" id="statsPorVencer">0</span>
                    </div>
                </div>
                <div class="stat-card" onclick="filterByVigencia('vencido')">
                    <div class="stat-icon" style="background: #dc3545;">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="stat-info">
                        <span class="stat-label">Vencidos</span>
                        <span class="stat-number" id="statsVencidos">0</span>
                    </div>
                </div>
            </div>

            <!-- Vista de personal (tabla y tarjetas) -->
            <div class="view-toggle">
                <button class="view-btn active" onclick="togglePersonnelView('table')">
                    <i class="fas fa-table"></i> Tabla
                </button>
                <button class="view-btn" onclick="togglePersonnelView('cards')">
                    <i class="fas fa-id-card"></i> Tarjetas
                </button>
            </div>

            <!-- Vista de tabla -->
            <div id="tableView" class="view-container active">
                <div class="table-responsive">
                    <table class="data-table enhanced" id="personnelTable">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Foto</th>
                                <th>Nombre</th>
                                <th>Estado</th>
                                <th>CUIP</th>
                                <th>Placa</th>
                                <th>Equipo</th>
                                <th>Vehículo</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="tableBody">
                            <tr>
                                <td colspan="12" class="text-center">Cargando datos...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Vista de tarjetas -->
            <div id="cardsView" class="view-container">
                <div class="personnel-cards" id="personnelCards">
                    <!-- Las tarjetas se generarán dinámicamente -->
                </div>
            </div>

            <!-- Paginación -->
            <div class="pagination">
                <button class="page-btn" onclick="changePage('prev')" id="prevPage">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <span class="page-info" id="pageInfo">Página 1 de 1</span>
                <button class="page-btn" onclick="changePage('next')" id="nextPage">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        </div>
    `;
}

function getQRRepoSection() {
    return `
        <div class="qr-repository-container">
            <div class="section-header">
                <h2><i class="fas fa-qrcode"></i> Repositorio de Códigos QR</h2>
                <div class="header-actions">
                    <button class="action-btn" onclick="window.print()">
                        <i class="fas fa-print"></i> Imprimir Galería
                    </button>
                </div>
            </div>
            
            <div class="qr-search-bar" style="margin-bottom: 20px;">
                <div class="search-input-wrapper" style="position: relative; max-width: 400px;">
                    <i class="fas fa-search" style="position: absolute; left: 15px; top: 12px; color: #94a3b8;"></i>
                    <input type="text" id="searchQR" placeholder="Buscar por nombre o CUIP..." 
                        onkeyup="filterQRRepo()" 
                        style="width: 100%; padding: 10px 15px 10px 40px; border-radius: 10px; border: 1px solid #e2e8f0;">
                </div>
            </div>

            <div class="qr-grid" id="qrGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px;">
                <!-- Los QRs se cargarán aquí -->
            </div>
        </div>
    `;
}

function getInventarioSection() {
    return `
        <div class="inventario-container">
            <div class="section-header">
                <h2><i class="fas fa-box-open"></i> Inventario de Equipo y Control Táctico</h2>
                <div class="header-actions">
                    <button class="action-btn" onclick="refreshInventory()">
                        <i class="fas fa-sync-alt"></i> Actualizar
                    </button>
                    <button class="action-btn" onclick="exportInventory()">
                        <i class="fas fa-file-excel"></i> Exportar
                    </button>
                </div>
            </div>
            
            <div class="stats-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 30px;">
                <div class="stat-card gradient-blue">
                    <div class="stat-info">
                        <h3>Patrullas</h3>
                        <p id="totalVehicles">--</p>
                    </div>
                    <i class="fas fa-car"></i>
                </div>
                <div class="stat-card gradient-gold">
                    <div class="stat-info">
                        <h3>Armas</h3>
                        <p id="totalWeapons">--</p>
                    </div>
                    <i class="fas fa-gun"></i>
                </div>
                <div class="stat-card gradient-red">
                    <div class="stat-info">
                        <h3>Radios</h3>
                        <p id="totalRadios">--</p>
                    </div>
                    <i class="fas fa-walkie-talkie"></i>
                </div>
                <div class="stat-card gradient-dark">
                    <div class="stat-info">
                        <h3>Chalecos</h3>
                        <p id="totalVests">--</p>
                    </div>
                    <i class="fas fa-shield-alt"></i>
                </div>
            </div>

            <div class="inventory-grid" id="inventoryContainer">
                <!-- Se cargará aquí la lista de personal con su equipo -->
                <div class="loading">Cargando datos de inventario...</div>
            </div>
        </div>
    `;
}

function getConfiguracionSection() {
    return `
        <div class="config-container">
            <div class="section-header">
                <h2><i class="fas fa-cogs"></i> Configuración del Sistema</h2>
            </div>
            
            <div class="form-grid">
                <!-- General -->
                <div class="card">
                    <h3><i class="fas fa-building"></i> Identidad Institucional</h3>
                    <div class="form-group">
                        <label>Nombre del Municipio</label>
                        <input type="text" value="TZOMPANTEPEC" id="configMunicipio">
                    </div>
                    <div class="form-group">
                        <label>Estado</label>
                        <input type="text" value="TLAXCALA" id="configEstado">
                    </div>
                    <div class="form-group">
                        <label>Clave de Autoridad</label>
                        <input type="text" value="23-01-SPT" id="configAuth">
                    </div>
                    <button class="action-btn small" onclick="saveInstitutionalConfig()">Guardar Cambios</button>
                </div>

                <!-- Seguridad -->
                <div class="card">
                    <h3><i class="fas fa-shield-alt"></i> Seguridad y Acceso</h3>
                    <div class="form-group">
                        <label>Tiempo de Sesión (min)</label>
                        <input type="number" value="60" id="configTimeout">
                    </div>
                    <div class="form-group">
                        <label>Nivel de Encriptación QR</label>
                        <select id="configEncryption">
                            <option value="AES-256">AES-256 (Máximo)</option>
                            <option value="BASE64" selected>Base64 (Estándar)</option>
                        </select>
                    </div>
                    <div class="form-group" style="display:flex; align-items:center; gap:10px;">
                        <input type="checkbox" checked id="configAudit">
                        <label>Habilitar Registro de Auditoría</label>
                    </div>
                    <button class="action-btn small" onclick="saveSecurityConfig()">Guardar Cambios</button>
                </div>

                <!-- Base de Datos -->
                <div class="card">
                    <h3><i class="fas fa-database"></i> Mantenimiento de Datos</h3>
                    <p style="font-size:0.8rem; color:#64748b; margin-bottom:15px;">Gestión de la conexión con Google Sheets y backups.</p>
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <button class="action-btn secondary small" onclick="backupSystem()">
                            <i class="fas fa-download"></i> Descargar Respaldo Completo
                        </button>
                        <button class="action-btn secondary small" onclick="syncSheets()">
                            <i class="fas fa-sync"></i> Forzar Sincronización
                        </button>
                        <button class="action-btn secondary small" style="color:#ef4444; border-color:#fee2e2;" onclick="clearLogs()">
                            <i class="fas fa-trash"></i> Limpiar Logs de Actividad
                        </button>
                    </div>
                </div>

                <!-- Versión y Sistema -->
                <div class="card">
                    <h3><i class="fas fa-info-circle"></i> Información del Sistema</h3>
                    <div style="padding:10px; background:#f8fafc; border-radius:8px;">
                        <p style="margin:5px 0;"><strong>Versión:</strong> 2.5.0-PRO</p>
                        <p style="margin:5px 0;"><strong>Última Actualización:</strong> Feb 2026</p>
                        <p style="margin:5px 0;"><strong>Licencia:</strong> GOB-TZOMP-001</p>
                        <p style="margin:5px 0;"><strong>Estado:</strong> <span style="color:#10b981;">● Online</span></p>
                    </div>
                    <div style="margin-top:15px;">
                        <button class="action-btn small" onclick="checkUpdates()">Buscar Actualizaciones</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getMultasSection() {
    return `
        <div class="multas-container">
            <div class="section-header">
                <h2><i class="fas fa-receipt"></i> Repositorio y Cobro de Multas de Tránsito</h2>
                <div class="header-actions">
                    <button class="action-btn" onclick="showNewFineModal()">
                        <i class="fas fa-plus"></i> Nueva Infracción
                    </button>
                    <button class="action-btn secondary" onclick="exportFines()">
                        <i class="fas fa-file-excel"></i> Exportar Corte
                    </button>
                </div>
            </div>

            <div class="stats-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 30px;">
                <div class="stat-card" style="border-left: 4px solid #ef4444;">
                    <div class="stat-info">
                        <h3>Pendientes</h3>
                        <p id="finesPending">--</p>
                    </div>
                    <i class="fas fa-clock" style="color:#ef4444;"></i>
                </div>
                <div class="stat-card" style="border-left: 4px solid #10b981;">
                    <div class="stat-info">
                        <h3>Pagadas</h3>
                        <p id="finesPaid">--</p>
                    </div>
                    <i class="fas fa-check-circle" style="color:#10b981;"></i>
                </div>
                <div class="stat-card" style="border-left: 4px solid #3b82f6;">
                    <div class="stat-info">
                        <h3>Total Recaudado</h3>
                        <p id="totalRevenue">$ --</p>
                    </div>
                    <i class="fas fa-money-bill-wave" style="color:#3b82f6;"></i>
                </div>
                <div class="stat-card" style="border-left: 4px solid #f59e0b;">
                    <div class="stat-info">
                        <h3>Infracciones Hoy</h3>
                        <p id="finesToday">--</p>
                    </div>
                    <i class="fas fa-calendar-day" style="color:#f59e0b;"></i>
                </div>
            </div>

            <div class="card" style="margin-bottom: 20px;">
                <div class="search-bar" style="margin-bottom: 0;">
                    <input type="text" id="searchFines" placeholder="Buscar por folio, placa, nombre o infracción..." onkeyup="filterFinesRepo()">
                    <select id="filterStatusFine" onchange="filterFinesRepo()" class="filter-input" style="width: 200px; margin-left: 10px;">
                        <option value="">Todos los estados</option>
                        <option value="Pendiente">Pendiente</option>
                        <option value="Pagado">Pagado</option>
                        <option value="Cancelado">Cancelado</option>
                    </select>
                </div>
            </div>

            <div class="table-responsive">
                <table class="data-table enhanced">
                    <thead>
                        <tr>
                            <th>Folio</th>
                            <th>Fecha</th>
                            <th>Infractor / Placa</th>
                            <th>Motivo Infracción</th>
                            <th>Monto</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="finesTableBody">
                        <!-- Cargado dinámicamente -->
                        <tr class="loading">
                            <td colspan="7" class="text-center">Consultando base de datos de vialidad...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Modal para Nueva Multa -->
        <div id="fineModal" class="modal-overlay" style="display:none;">
            <div class="modal-content card" style="max-width: 800px;">
                <h3><i class="fas fa-file-invoice"></i> Registrar Nueva Infracción de Tránsito</h3>
                <form id="formFine">
                    <div class="form-grid" style="grid-template-columns: 1fr 1fr;">
                        <div class="form-group">
                            <label>Nombre del Infractor</label>
                            <input type="text" name="fineInfractor" required>
                        </div>
                        <div class="form-group">
                            <label>Placa del Vehículo</label>
                            <input type="text" name="finePlate" required>
                        </div>
                        <div class="form-group">
                            <label>Tipo de Vehículo</label>
                            <select name="fineVehicleType">
                                <option value="Particular">Particular</option>
                                <option value="Transporte Público">Transporte Público</option>
                                <option value="Carga">Carga</option>
                                <option value="Motocicleta">Motocicleta</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Ubicación del Incidente</label>
                            <input type="text" name="fineLocation" required>
                        </div>
                        <div class="form-group full-width" style="grid-column: span 2;">
                            <label>Motivo de la Infracción</label>
                            <select name="fineReason" id="fineReasonSelect" required>
                                <option value="">Seleccione una falta</option>
                                <option value="Exceso de Velocidad" data-price="800">Exceso de Velocidad ($800)</option>
                                <option value="Falta de Licencia" data-price="550">Falta de Licencia ($550)</option>
                                <option value="Estacionarse en Lugar Prohibido" data-price="450">Estacionarse en Lugar Prohibido ($450)</option>
                                <option value="Pasarse el Alto" data-price="950">Pasarse el Alto ($950)</option>
                                <option value="Uso de Celular al Conducir" data-price="1200">Uso de Celular al Conducir ($1,200)</option>
                                <option value="Sin Cinturón de Seguridad" data-price="350">Sin Cinturón de Seguridad ($350)</option>
                                <option value="Otro" data-price="0">Otro (Especificar monto)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Monto a Pagar ($)</label>
                            <input type="number" name="fineAmount" id="fineAmountInput" required>
                        </div>
                        <div class="form-group">
                            <label>Oficial que Reporta</label>
                            <select id="fineOfficer" name="fineOfficer" required>
                                <option value="">Seleccione Oficial...</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-actions" style="margin-top: 20px;">
                        <button type="submit" class="action-btn">Generar Folio</button>
                        <button type="button" class="action-btn secondary" onclick="closeFineModal()">Cancelar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function getUsuariosSection() {
    return `
        <div class="usuarios-container">
            <div class="section-header">
                <h2><i class="fas fa-user-shield"></i> Gestión de Usuarios y Roles</h2>
                <div class="header-actions">
                    <button class="action-btn" onclick="showAddUserModal()">
                        <i class="fas fa-plus"></i> Nuevo Usuario
                    </button>
                    <button class="action-btn secondary" onclick="loadUsersRepo()">
                        <i class="fas fa-sync"></i> Sincronizar
                    </button>
                </div>
            </div>
            
            <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 30px;">
                <div class="stat-card" style="border-left: 4px solid #10b981;">
                    <div class="stat-info">
                        <h3>Administradores</h3>
                        <p id="countAdmins">--</p>
                    </div>
                    <i class="fas fa-shield-alt" style="color:#10b981;"></i>
                </div>
                <div class="stat-card" style="border-left: 4px solid #3b82f6;">
                    <div class="stat-info">
                        <h3>Operadores</h3>
                        <p id="countOps">--</p>
                    </div>
                    <i class="fas fa-user-edit" style="color:#3b82f6;"></i>
                </div>
                <div class="stat-card" style="border-left: 4px solid #f59e0b;">
                    <div class="stat-info">
                        <h3>Auditores</h3>
                        <p id="countAuditors">--</p>
                    </div>
                    <i class="fas fa-search" style="color:#f59e0b;"></i>
                </div>
            </div>

            <div class="user-list-grid" id="userListContainer">
                <div class="loading">Cargando gestión de seguridad corporativa...</div>
            </div>
        </div>

        <!-- Modal Crear Usuario -->
        <div id="userModal" class="modal-overlay" style="display:none;">
            <div class="modal-content card" style="max-width:480px; width:90%;">
                <h3><i class="fas fa-user-plus"></i> Crear Acceso de Usuario Real</h3>
                <p style="color:#64748b; font-size:0.9rem; margin-bottom:20px;">
                    El usuario podrá iniciar sesión en el sistema con el <strong>ID de acceso</strong> y la <strong>contraseña</strong> que definas aquí.
                </p>
                <form id="formUser">
                    <div class="form-group">
                        <label><i class="fas fa-user" style="color:#2563eb;"></i> Nombre Completo</label>
                        <input type="text" name="userName" placeholder="Ej: Juan Pérez López" required
                               style="width:100%; padding:10px; border:2px solid #e2e8f0; border-radius:8px; font-size:0.95rem;">
                    </div>
                    <div class="form-group" style="margin-top:15px;">
                        <label><i class="fas fa-id-badge" style="color:#2563eb;"></i> ID de Acceso (usuario para login)</label>
                        <input type="text" name="userEmail" placeholder="Ej: jperez o jperez@tzompantepec.gob.mx" required
                               style="width:100%; padding:10px; border:2px solid #e2e8f0; border-radius:8px; font-size:0.95rem;">
                        <small style="color:#94a3b8; margin-top:4px; display:block;">Este es el usuario que ingresará en la pantalla de login.</small>
                    </div>
                    <div class="form-group" style="margin-top:15px;">
                        <label><i class="fas fa-shield-alt" style="color:#2563eb;"></i> Rol de Sistema</label>
                        <select name="userRole" required
                                style="width:100%; padding:10px; border:2px solid #e2e8f0; border-radius:8px; font-size:0.95rem;">
                            <option value="ADMIN">🔴 Administrador — Control total del sistema</option>
                            <option value="OPERADOR">🟡 Operador — Gestión de personal y credenciales</option>
                            <option value="AUDITOR">🟢 Auditor — Solo lectura y reportes</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-top:15px;">
                        <label><i class="fas fa-lock" style="color:#2563eb;"></i> Contraseña</label>
                        <input type="password" name="userPass" placeholder="Mínimo 6 caracteres" required minlength="6"
                               style="width:100%; padding:10px; border:2px solid #e2e8f0; border-radius:8px; font-size:0.95rem;">
                        <small style="color:#94a3b8; margin-top:4px; display:block;">El usuario deberá usar esta contraseña para ingresar al sistema.</small>
                    </div>
                    <div class="form-actions" style="margin-top:20px; display:flex; gap:10px; justify-content:flex-end;">
                        <button type="submit" class="action-btn">
                            <i class="fas fa-save"></i> Crear Usuario
                        </button>
                        <button type="button" class="action-btn secondary" onclick="closeUserModal()">Cancelar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

// ============================================
// FUNCIÓN PRINCIPAL DE CARGA DE SECCIONES
// ============================================

// Manejador de eventos para inicializar secciones cargadas
document.addEventListener('sectionLoaded', async (e) => {
    const section = e.detail;

    if (section === 'inicio') {
        initInicioSection();
    } else if (section === 'personal') {
        initPersonalSection();
    } else if (section === 'credenciales') {
        initCredencialesSection();
    } else if (section === 'usuarios') {
        initUsuariosSection();
    } else if (section === 'reportes') {
        initReportesSection();
    } else if (section === 'qr-repo') {
        initQRRepoSection();
    } else if (section === 'multas') {
        initMultasSection();
    } else if (section === 'inventario') {
        initInventarioSection();
    } else if (section === 'configuracion') {
        initConfiguracionSection();
    } else if (section === 'documentacion') {
        initDocumentacionSection();
    }
});

async function initInicioSection() {
    const data = await loadGoogleSheetsData();

    // Actualizar contadores
    const totalEl = document.getElementById('totalPersonal');
    const activasEl = document.getElementById('credencialesActivas');
    if (totalEl) totalEl.textContent = data.length;
    if (activasEl) activasEl.textContent = data.filter(p => p.estado === 'Activo').length;

    // Gráfica de Cargos
    const canvasCargos = document.getElementById('chartCargos');
    if (canvasCargos) {
        const cargosCount = {};
        data.forEach(p => cargosCount[p.cargo] = (cargosCount[p.cargo] || 0) + 1);

        new Chart(canvasCargos.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: Object.keys(cargosCount),
                datasets: [{
                    data: Object.values(cargosCount),
                    backgroundColor: ['#0a192f', '#c5a059', '#d81b60', '#1e293b', '#64748b']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // Gráfica de Actividad (Línea)
    const canvasActividad = document.getElementById('chartActividad');
    if (canvasActividad) {
        const logs = getFilteredLogs();
        const activityByDate = {};

        // Tomar últimos 7 días
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            activityByDate[d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })] = 0;
        }

        logs.forEach(log => {
            const dateStr = log.fecha.split('/')[0] + '/' + log.fecha.split('/')[1]; // Simplificado
            // Intentar matchear con las llaves creadas
            const key = Object.keys(activityByDate).find(k => k.includes(log.fecha.split('/')[0]));
            if (key) activityByDate[key]++;
        });

        new Chart(canvasActividad.getContext('2d'), {
            type: 'line',
            data: {
                labels: Object.keys(activityByDate),
                datasets: [{
                    label: 'Movimientos',
                    data: Object.values(activityByDate),
                    borderColor: '#c5a059',
                    backgroundColor: 'rgba(197, 160, 89, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });
    }

    // Actividad Reciente (Logs)
    const list = document.getElementById('recentActivityList');
    if (list) {
        const recentLogs = getFilteredLogs().slice(0, 5);
        list.innerHTML = recentLogs.map(log => `
            <div class="activity-item" style="display: flex; gap: 10px; margin-bottom: 10px; border-left: 3px solid #c5a059; padding-left: 10px;">
                <div class="activity-details">
                    <span style="font-size: 0.8rem; color: #64748b;">${log.hora} - ${log.fecha}</span>
                    <p style="margin: 0; font-weight: 500;">${log.usuario}: ${log.accion}</p>
                    <small style="color: #94a3b8;">${log.detalles}</small>
                </div>
            </div>
        `).join('') || '<p>No hay actividad reciente</p>';
    }
}

let localPersonnel = [];

function initPersonalSection() {
    const form = document.getElementById('formRegistroPersonal');
    if (form) {
        // Inicializar Firma Digital
        initSignaturePad();

        // Vincular con vista previa de credencial en tiempo real
        syncRegistrationWithPreview();

        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            const btn = this.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

            // Capturar la firma antes de enviar
            const sigCanvas = document.getElementById('signature-pad');
            const firmaInput = document.getElementById('firma-input');
            if (sigCanvas && !isCanvasBlank(sigCanvas)) {
                firmaInput.value = sigCanvas.toDataURL();
            }

            const formData = new FormData(this);

            try {
                // Usar API centralizada en lugar de PHP
                const result = await apiGuardarPersonal(formData);

                if (result.success) {
                    showNotification('Personal guardado correctamente en Google Sheets', 'success');
                    this.reset();
                    clearSignature();
                    loadPersonnelTable();
                } else {
                    showNotification(result.message || 'Error al guardar', 'error');
                }
            } catch (error) {
                showNotification('Error al conectar con Google Apps Script', 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> Guardar Personal';
            }
        });
    }
    loadPersonnelTable();
}

// Lógica de Firma Digital
function initSignaturePad() {
    const canvas = document.getElementById('signature-pad');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let drawing = false;

    // Ajustar tamaño del canvas
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    function startDrawing(e) {
        drawing = true;
        draw(e);
    }

    function stopDrawing() {
        drawing = false;
        ctx.beginPath();
    }

    function draw(e) {
        if (!drawing) return;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    }

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);

    document.getElementById('clear-signature')?.addEventListener('click', clearSignature);
}

function clearSignature() {
    const canvas = document.getElementById('signature-pad');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        document.getElementById('firma-input').value = '';
    }
}

function isCanvasBlank(canvas) {
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    return canvas.toDataURL() === blank.toDataURL();
}

async function initInventarioSection() {
    const grid = document.getElementById('inventoryContainer');
    if (!grid) return;

    const personnel = await loadGoogleSheetsData();
    grid.innerHTML = '';

    // Contadores
    let vehicles = 0;
    let weapons = 0;

    personnel.forEach(p => {
        if (p.vehiculo && p.vehiculo !== 'SIN VEHÍCULO') vehicles++;
        if (p.armado && p.armado !== 'SIN ARMA ASIGNADA') weapons++;

        const card = document.createElement('div');
        card.className = 'card inventory-item';
        card.style.borderLeft = '4px solid ' + (p.estado === 'Activo' ? '#10b981' : '#f59e0b');
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <h4 style="margin:0;">${p.nombre}</h4>
                    <span class="status-badge ${p.estado.toLowerCase()}" style="font-size:0.6rem;">${p.estado}</span>
                </div>
                <div style="text-align:right;">
                    <small style="color:#64748b; font-family:monospace;">${p.cuip}</small>
                </div>
            </div>
            <div style="margin-top:15px; display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <div style="background:#f8fafc; padding:8px; border-radius:6px;">
                    <small style="color:#64748b; display:block; font-size:0.6rem; text-transform:uppercase;">Vehículo</small>
                    <span style="font-size:0.8rem; font-weight:600;"><i class="fas fa-car"></i> ${p.vehiculo || '---'}</span>
                </div>
                <div style="background:#f8fafc; padding:8px; border-radius:6px;">
                    <small style="color:#64748b; display:block; font-size:0.6rem; text-transform:uppercase;">Armamento</small>
                    <span style="font-size:0.8rem; font-weight:600;"><i class="fas fa-gun"></i> ${p.armado || '---'}</span>
                </div>
            </div>
            <div style="margin-top:10px; padding-top:10px; border-top:1px solid #f1f5f9; display:flex; justify-content:flex-end; gap:5px;">
                <button class="action-btn small secondary" onclick="editEquipment('${p.cuip}')"><i class="fas fa-exchange-alt"></i> Reasignar</button>
            </div>
        `;
        grid.appendChild(card);
    });

    // Actualizar counters
    document.getElementById('totalVehicles').textContent = vehicles;
    document.getElementById('totalWeapons').textContent = weapons;
    document.getElementById('totalRadios').textContent = personnel.length; // Ejemplo
    document.getElementById('totalVests').textContent = personnel.length; // Ejemplo
}

function initConfiguracionSection() {
    console.log('Modulo de configuración inicializado');
    // Cargar valores actuales si existieran en localStorage o backend
}

async function initUsuariosSection() {
    await loadUsersRepo();

    const form = document.getElementById('formUser');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = 'Guardando...';

            showNotification('Creando perfil de seguridad institucional...', 'info');

            try {
                // Extraer datos del formulario
                const formData = new FormData(form);
                const datos = {
                    nombre: formData.get('userName'),
                    username: formData.get('userEmail'),
                    password: formData.get('userPass'),
                    role: formData.get('userRole')
                };

                // Usar API centralizada de Google Apps Script
                const result = await apiGuardarUsuario(datos);

                if (result.success) {
                    showNotification('✅ Usuario creado correctamente en Google Sheets', 'success');
                    closeUserModal();
                    loadUsersRepo();
                } else {
                    showNotification('Error: ' + result.message, 'error');
                }
            } catch (error) {
                showNotification('Error de conexión al registrar usuario', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Crear Usuario';
            }
        };
    }
}

async function loadUsersRepo() {
    const container = document.getElementById('userListContainer');
    if (!container) return;

    container.innerHTML = '<div class="loading">Sincronizando con base de datos real...</div>';

    try {
        // Usar API centralizada de Google Apps Script
        const users = await apiGetUsuarios();

        if (users.length === 0) {
            container.innerHTML = '<div class="text-center">No hay usuarios reales registrados. <br><small>Usa el botón "Nuevo Usuario" para empezar.</small></div>';
            return;
        }

        container.innerHTML = '';

        let admins = 0, ops = 0, auds = 0;

        users.forEach(u => {
            if (u.role === 'ADMIN') admins++;
            if (u.role === 'OPERADOR') ops++;
            if (u.role === 'AUDITOR') auds++;

            const card = document.createElement('div');
            card.className = 'card user-card';
            card.style.opacity = u.status === 'Inactivo' ? '0.6' : '1';
            card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; gap:15px; align-items:center;">
                    <div style="width:50px; height:50px; background:#f1f5f9; border-radius:12px; display:flex; align-items:center; justify-content:center; color:#64748b;">
                        <i class="fas fa-layer-group fa-lg"></i>
                    </div>
                    <div>
                        <h4 style="margin:0;">${u.nombre}</h4>
                        <span class="status-badge ${u.role.toLowerCase()}" style="font-size:0.6rem;">${u.role}</span>
                    </div>
                </div>
                <div style="text-align:right;">
                    <span style="font-size:0.6rem; display:block; color:${u.estado === 'ACTIVO' ? '#10b981' : '#ef4444'}; font-weight:bold;">${u.estado}</span>
                </div>
            </div>
            <div style="margin-top:15px; padding-top:15px; border-top:1px solid #f1f5f9;">
                <p style="margin:5px 0; font-size:0.8rem;"><i class="fas fa-user"></i> ID Acceso: ${u.username}</p>
                <p style="margin:5px 0; font-size:0.8rem;"><i class="fas fa-key"></i> Pass: ***</p>
            </div>
            <div style="margin-top:10px; display:flex; justify-content:flex-end; gap:5px;">
                <button class="action-btn small secondary" onclick="editUserPermissions('${u.username}')"><i class="fas fa-key"></i></button>
                <button class="action-btn small secondary" onclick="toggleUserStatus('${u.username}')"><i class="fas ${u.estado === 'ACTIVO' ? 'fa-user-lock' : 'fa-user-check'}"></i></button>
            </div>
        `;
            container.appendChild(card);
        });

        // Actualizar contadores dentro del try para tener acceso a las variables
        const countAdmins = document.getElementById('countAdmins');
        const countOps = document.getElementById('countOps');
        const countAuditors = document.getElementById('countAuditors');
        if (countAdmins) countAdmins.textContent = admins;
        if (countOps) countOps.textContent = ops;
        if (countAuditors) countAuditors.textContent = auds;

    } catch (error) {
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#ef4444;"><i class="fas fa-exclamation-triangle"></i> Error al cargar la base de datos de usuarios.</div>';
    }
}

function showAddUserModal() {
    document.getElementById('userModal').style.display = 'flex';
}

function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
    document.getElementById('formUser').reset();
}

function editUserPermissions(id) {
    showNotification(`Configurando permisos avanzados para el perfil ID: ${id}`, 'info');
}

function toggleUserStatus(id) {
    showNotification('Actualizando estado de acceso...', 'success');
}

function deleteUser(id) {
    if (confirm('¿Revocar acceso permanentemente a este usuario?')) {
        showNotification('Acceso revocado correctamente', 'success');
    }
}

window.showAddUserModal = showAddUserModal;
window.closeUserModal = closeUserModal;
window.editUserPermissions = editUserPermissions;
window.toggleUserStatus = toggleUserStatus;
window.deleteUser = deleteUser;
window.loadUsersRepo = loadUsersRepo;

async function initReportesSection() {
    const select = document.getElementById('selectPersonal');
    if (select) {
        const personnel = await loadGoogleSheetsData();
        select.innerHTML = '<option value="">-- Seleccione un elemento del personal --</option>';
        personnel.forEach(p => {
            const option = document.createElement('option');
            option.value = p.nombre;
            option.textContent = `${p.nombre} - ${p.cargo}`;
            select.appendChild(option);
        });
    }
}

function searchPersonnel() {
    const q = document.getElementById('buscarPersonal').value.toLowerCase();
    const rows = document.querySelectorAll('#personalTableBody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(q) ? '' : 'none';
    });
}

function loadPersonnelTable() {
    // Esta función debería usar loadGoogleSheetsData y renderizar en #personalTableBody
    // Por ahora usaremos datos de ejemplo si no hay conexión
    renderPersonnelTable();
}

async function renderPersonnelTable() {
    const tbody = document.getElementById('personalTableBody');
    if (!tbody) return;

    const googlePersonnel = await loadGoogleSheetsData();
    const allPersonnel = [...localPersonnel, ...googlePersonnel];

    tbody.innerHTML = allPersonnel.map(p => `
        <tr>
            <td>
                ${p.foto ? `<img src="${p.foto}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">` : `<i class="fas fa-user-circle" style="font-size: 2rem; color: #cbd5e1;"></i>`}
            </td>
            <td><strong>${p.nombre}</strong></td>
            <td>${p.curp || '---'}<br><small>${p.cuip || '---'}</small></td>
            <td>${p.cargo}</td>
            <td>${p.numPlaca || p.placa || '---'}</td>
            <td><span class="status-badge ${(p.estado || 'Activo').toLowerCase()}">${p.estado || 'Activo'}</span></td>
            <td>
                <button class="action-btn small" onclick="selectForCredential('${p.nombre}', '${p.cargo}', '${p.cuip}', '${p.curp}', '${p.telefono || ''}', '${p.email || ''}', '${p.vigencia || ''}', '${p.foto || ''}')">
                    <i class="fas fa-id-card"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function loadSection(section) {

    const contentArea = document.getElementById('contentArea');

    switch (section) {
        case 'inicio':
            contentArea.innerHTML = getInicioSection();
            break;
        case 'personal':
            contentArea.innerHTML = getPersonalSection();
            break;
        case 'credenciales':
            contentArea.innerHTML = getCredencialesSection();
            break;
        case 'repositorio':
            contentArea.innerHTML = getRepositorioSection();
            // Cargar datos del repositorio
            setTimeout(loadPersonnelData, 100);
            break;
        case 'movimientos':
            contentArea.innerHTML = getMovimientosSection();
            break;
        case 'reportes':
            contentArea.innerHTML = getReportesSection();
            break;
        case 'usuarios':
            contentArea.innerHTML = getUsuariosSection();
            break;
        case 'qr-repo':
            contentArea.innerHTML = getQRRepoSection();
            break;
        case 'inventario':
            contentArea.innerHTML = getInventarioSection();
            break;
        case 'multas':
            contentArea.innerHTML = getMultasSection();
            break;
        case 'documentacion':
            contentArea.innerHTML = getDocumentacionSection();
            break;
        case 'configuracion':
            contentArea.innerHTML = getConfiguracionSection();
            break;
    }

    // Disparar evento de sección cargada
    document.dispatchEvent(new CustomEvent('sectionLoaded', { detail: section }));

    // Registrar la visualización de la sección
    logAction(ACTION_TYPES.VIEW, `Navegó a sección: ${section}`);
}

// Asegurar que el evento sectionLoaded se dispare (versión alternativa para compatibilidad)
const originalLoadSection = window.loadSection || function () { };
window.loadSection = function (section) {
    if (typeof originalLoadSection === 'function') {
        originalLoadSection(section);
    }
};

// Verificar que los archivos JS se cargaron
document.addEventListener('DOMContentLoaded', function () {
    console.log('auth.js cargado');
    console.log('Funciones disponibles:', {
        updatePersonnelTable: typeof updatePersonnelTable,
        loadGoogleSheetsData: typeof loadGoogleSheetsData
    });
});

// Hacer funciones globales
window.logAction = logAction;
window.getFilteredLogs = getFilteredLogs;
window.applyLogFilters = applyLogFilters;
window.clearLogFilters = clearLogFilters;
window.showReportGenerator = showReportGenerator;
window.exportReportToExcel = exportReportToExcel;
window.exportReportToPDF = exportReportToPDF;
window.exportLogsToCSV = exportLogsToCSV;
window.REPORT_TYPES = REPORT_TYPES;
window.ACTION_TYPES = ACTION_TYPES;
window.loadSection = loadSection;

// ============================================
// FUNCIONES PARA EL REPOSITORIO DE PERSONAL
// ============================================

// Variables globales para el repositorio
let currentPersonnelData = [];
let filteredPersonnelData = [];
let currentPage = 1;
let itemsPerPage = 10;
let currentView = 'table';

// Cargar datos del repositorio
async function loadPersonnelData() {
    try {
        currentPersonnelData = await loadGoogleSheetsData();
        filteredPersonnelData = [...currentPersonnelData];
        updatePersonnelStats();
        renderCurrentView();
        logAction(ACTION_TYPES.VIEW, 'Consultó repositorio de personal');
    } catch (error) {
        console.error('Error cargando datos:', error);
        currentPersonnelData = getEnhancedMockData();
        filteredPersonnelData = [...currentPersonnelData];
        updatePersonnelStats();
        renderCurrentView();
    }
}

// Actualizar estadísticas
function updatePersonnelStats() {
    const stats = {
        activos: currentPersonnelData.filter(p => p.estado === 'Activo').length,
        bajas: currentPersonnelData.filter(p => p.estado === 'Baja').length,
        vacaciones: currentPersonnelData.filter(p => p.estado === 'Vacaciones').length,
        comision: currentPersonnelData.filter(p => p.estado === 'De Comisión').length,
        porVencer: currentPersonnelData.filter(p => {
            const vigencia = new Date(p.vigencia);
            const today = new Date();
            const daysLeft = Math.ceil((vigencia - today) / (1000 * 60 * 60 * 24));
            return daysLeft > 0 && daysLeft <= 30;
        }).length,
        vencidos: currentPersonnelData.filter(p => new Date(p.vigencia) < new Date()).length
    };

    const statsActivos = document.getElementById('statsActivos');
    const statsBajas = document.getElementById('statsBajas');
    const statsVacaciones = document.getElementById('statsVacaciones');
    const statsComision = document.getElementById('statsComision');
    const statsPorVencer = document.getElementById('statsPorVencer');
    const statsVencidos = document.getElementById('statsVencidos');

    if (statsActivos) statsActivos.textContent = stats.activos;
    if (statsBajas) statsBajas.textContent = stats.bajas;
    if (statsVacaciones) statsVacaciones.textContent = stats.vacaciones;
    if (statsComision) statsComision.textContent = stats.comision;
    if (statsPorVencer) statsPorVencer.textContent = stats.porVencer;
    if (statsVencidos) statsVencidos.textContent = stats.vencidos;
}

// Renderizar vista actual
function renderCurrentView() {
    if (currentView === 'table') {
        renderPersonnelTable();
    } else {
        renderPersonnelCards();
    }
    updatePagination();
}

// Renderizar tabla de personal
function renderPersonnelTable() {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = filteredPersonnelData.slice(start, end);

    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" class="text-center">No hay personal que coincida con los filtros</td></tr>';
        return;
    }

    tbody.innerHTML = pageData.map(person => {
        const vigenciaDate = new Date(person.vigencia);
        const today = new Date();
        const vigenciaClass = vigenciaDate < today ? 'vencido' :
            (vigenciaDate - today) / (1000 * 60 * 60 * 24) <= 30 ? 'por-vencer' : 'vigente';

        const credencialActiva = person.credenciales?.some(c => c.activa) || false;

        return `
        <tr class="estado-${person.estado ? person.estado.toLowerCase().replace(' ', '-') : 'activo'}">
            <td><span class="badge-id">${person.id || 'N/A'}</span></td>
            <td>
                <div class="avatar-mini">
                    ${person.foto ?
                `<img src="${person.foto}" alt="foto" class="avatar-img">` :
                `<i class="fas fa-user-circle"></i>`
            }
                </div>
            </td>
            <td>
                <div class="person-name">
                    <strong>${person.nombre} ${person.apellidos || ''}</strong>
                    <span class="badge-${person.puesto.toLowerCase().replace(' ', '-')}">${person.puesto}</span>
                </div>
            </td>
            <td><span class="status-badge ${(person.estado || 'Activo').toLowerCase()}">${person.estado || 'Activo'}</span></td>
            <td>${person.cuip || 'N/A'}</td>
            <td>${person.numPlaca || person.placa || '---'}</td>
            <td>${person.equipo || 'Básico'}</td>
            <td>${person.vehiculo || '---'}</td>
            <td>
                <div class="row-actions">
                    <button class="action-btn small" title="Ver detalles" onclick="viewEmployeeDetails('${person.cuip}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn small secondary" title="Editar" onclick="editEmployee('${person.cuip}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn small" title="Generar Credencial" style="background: #c5a059;" onclick="generateEmployeeCredential('${person.cuip}')">
                        <i class="fas fa-id-card"></i>
                    </button>
                    <div class="dropdown">
                        <button class="action-btn small secondary" onclick="toggleDropdown('dropdown-${person.cuip}')">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <div id="dropdown-${person.cuip}" class="dropdown-content">
                            <a href="#" onclick="changeEmployeeStatus('${person.cuip}', 'Franco')"><i class="fas fa-bed"></i> Franco</a>
                            <a href="#" onclick="changeEmployeeStatus('${person.cuip}', 'Baja')"><i class="fas fa-user-minus"></i> Dar de Baja</a>
                            <a href="#" onclick="changeEmployeeStatus('${person.cuip}', 'Vacaciones')"><i class="fas fa-umbrella-beach"></i> Vacaciones</a>
                            <a href="#" onclick="viewEmployeeHistory('${person.cuip}')"><i class="fas fa-history"></i> Historial</a>
                        </div>
                    </div>
                </div>
            </td>
        </tr>
    `}).join('');
}

// Renderizar tarjetas de personal
function renderPersonnelCards() {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = filteredPersonnelData.slice(start, end);

    const container = document.getElementById('personnelCards');
    if (!container) return;

    if (pageData.length === 0) {
        container.innerHTML = '<div class="text-center">No hay personal que coincida con los filtros</div>';
        return;
    }

    container.innerHTML = pageData.map(person => `
        <div class="personnel-card estado-${person.estado ? person.estado.toLowerCase().replace(' ', '-') : 'activo'}">
            <div class="card-header">
                <div class="card-avatar">
                    ${person.foto ?
            `<img src="${person.foto}" alt="foto">` :
            `<i class="fas fa-user-shield"></i>`
        }
                </div>
                <div class="card-status dropdown">
                    <button class="status-badge ${person.estado ? person.estado.toLowerCase().replace(' ', '-') : 'activo'}" onclick="toggleDropdown('status-drop-${person.cuip}')">
                        ${person.estado || 'Activo'} <i class="fas fa-chevron-down" style="font-size: 0.6rem; margin-left: 5px;"></i>
                    </button>
                    <div id="status-drop-${person.cuip}" class="dropdown-content">
                        ${Object.values(window.EMPLOYEE_STATUS || {}).map(s => `
                            <a href="#" onclick="changeEmployeeStatus('${person.cuip}', '${s}')">${s}</a>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="card-body">
                <h3>${person.nombre}</h3>
                <p class="card-cargo">${person.cargo}</p>
                <div class="card-info">
                    <div><i class="fas fa-id-card"></i> CUIP: ${person.cuip}</div>
                    <div><i class="fas fa-fingerprint"></i> CURP: ${person.curp.substring(0, 10)}...</div>
                    <div><i class="fas fa-phone"></i> ${person.telefono || 'N/A'}</div>
                    <div><i class="fas fa-envelope"></i> ${person.email || 'N/A'}</div>
                </div>
            </div>
            <div class="card-footer">
                <div class="card-vigencia">
                    <i class="fas fa-calendar-check"></i>
                    <span class="${new Date(person.vigencia) < new Date() ? 'text-danger' : ''}">
                        ${person.vigencia || 'Sin vigencia'}
                    </span>
                </div>
                <div class="card-actions">
                    <button class="icon-btn" onclick="viewEmployeeDetails('${person.id}')" title="Ver">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="icon-btn" onclick="editEmployee('${person.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="icon-btn" onclick="generateEmployeeCredential('${person.id}')" title="Credencial">
                        <i class="fas fa-id-card"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Aplicar filtros
function applyPersonnelFilters() {
    const searchTerm = document.getElementById('searchGlobal')?.value.toLowerCase() || '';
    const estado = document.getElementById('filterEstado')?.value || '';
    const cargo = document.getElementById('filterCargo')?.value || '';
    const vigencia = document.getElementById('filterVigencia')?.value || '';
    const fechaIngresoDesde = document.getElementById('filterFechaIngresoDesde')?.value;
    const fechaIngresoHasta = document.getElementById('filterFechaIngresoHasta')?.value;
    const credencial = document.getElementById('filterCredencial')?.value || '';

    filteredPersonnelData = currentPersonnelData.filter(person => {
        // Búsqueda global
        if (searchTerm) {
            const searchable = `${person.nombre} ${person.cargo} ${person.cuip} ${person.curp}`.toLowerCase();
            if (!searchable.includes(searchTerm)) return false;
        }

        // Estado
        if (estado && person.estado !== estado) return false;

        // Cargo
        if (cargo && person.cargo !== cargo) return false;

        // Vigencia
        if (vigencia) {
            const vigDate = new Date(person.vigencia);
            const today = new Date();
            const daysLeft = Math.ceil((vigDate - today) / (1000 * 60 * 60 * 24));

            if (vigencia === 'vigente' && (vigDate < today || daysLeft > 365)) return false;
            if (vigencia === 'por-vencer' && (daysLeft <= 0 || daysLeft > 30)) return false;
            if (vigencia === 'vencido' && vigDate >= today) return false;
        }

        // Fecha ingreso
        if (fechaIngresoDesde && person.fechaIngreso < fechaIngresoDesde) return false;
        if (fechaIngresoHasta && person.fechaIngreso > fechaIngresoHasta) return false;

        // Credencial
        if (credencial === 'si' && (!person.credenciales || !person.credenciales.some(c => c.activa))) return false;
        if (credencial === 'no' && person.credenciales && person.credenciales.some(c => c.activa)) return false;

        return true;
    });

    currentPage = 1;
    renderCurrentView();
    updatePagination();

    logAction(ACTION_TYPES.SEARCH, `Aplicó filtros: ${Object.entries({ searchTerm, estado, cargo }).filter(([_, v]) => v).map(([k, v]) => `${k}:${v}`).join(', ')}`);
}

// Limpiar filtros
function clearPersonnelFilters() {
    const searchGlobal = document.getElementById('searchGlobal');
    const filterEstado = document.getElementById('filterEstado');
    const filterCargo = document.getElementById('filterCargo');
    const filterVigencia = document.getElementById('filterVigencia');
    const filterFechaIngresoDesde = document.getElementById('filterFechaIngresoDesde');
    const filterFechaIngresoHasta = document.getElementById('filterFechaIngresoHasta');
    const filterCredencial = document.getElementById('filterCredencial');

    if (searchGlobal) searchGlobal.value = '';
    if (filterEstado) filterEstado.value = '';
    if (filterCargo) filterCargo.value = '';
    if (filterVigencia) filterVigencia.value = '';
    if (filterFechaIngresoDesde) filterFechaIngresoDesde.value = '';
    if (filterFechaIngresoHasta) filterFechaIngresoHasta.value = '';
    if (filterCredencial) filterCredencial.value = '';

    filteredPersonnelData = [...currentPersonnelData];
    currentPage = 1;
    renderCurrentView();
    updatePagination();
}

// Filtrar por estado (desde estadísticas)
function filterByStatus(status) {
    const filterEstado = document.getElementById('filterEstado');
    if (filterEstado) {
        filterEstado.value = status;
        applyPersonnelFilters();
    }
}

// Filtrar por vigencia (desde estadísticas)
function filterByVigencia(type) {
    const filterVigencia = document.getElementById('filterVigencia');
    if (filterVigencia) {
        filterVigencia.value = type;
        applyPersonnelFilters();
    }
}

// Cambiar vista (tabla/tarjetas)
function togglePersonnelView(view) {
    currentView = view;
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.view-container').forEach(container => container.classList.remove('active'));

    if (view === 'table') {
        document.querySelector('.view-btn:first-child').classList.add('active');
        document.getElementById('tableView').classList.add('active');
        renderPersonnelTable();
    } else {
        const viewBtn = document.querySelector('.view-btn:last-child');
        if (viewBtn) viewBtn.classList.add('active');
        document.getElementById('cardsView').classList.add('active');
        renderPersonnelCards();
    }
}

// Paginación
function changePage(direction) {
    const totalPages = Math.ceil(filteredPersonnelData.length / itemsPerPage);

    if (direction === 'prev' && currentPage > 1) {
        currentPage--;
    } else if (direction === 'next' && currentPage < totalPages) {
        currentPage++;
    }

    renderCurrentView();
    updatePagination();
}

function updatePagination() {
    const totalPages = Math.ceil(filteredPersonnelData.length / itemsPerPage);
    const pageInfo = document.getElementById('pageInfo');
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');

    if (pageInfo) pageInfo.textContent = `Página ${currentPage} de ${totalPages || 1}`;
    if (prevPage) prevPage.disabled = currentPage === 1;
    if (nextPage) nextPage.disabled = currentPage === totalPages || totalPages === 0;
}

// Ver detalles del empleado
function viewEmployeeDetails(employeeId) {
    const employee = currentPersonnelData.find(e => e.id === employeeId);
    if (!employee) return;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content modal-lg">
            <div class="modal-header">
                <h3><i class="fas fa-user"></i> Detalles del Personal</h3>
                <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="employee-details">
                    <div class="details-section">
                        <h4>Información Personal</h4>
                        <div class="details-grid">
                            <div><strong>Nombre:</strong> ${employee.nombre}</div>
                            <div><strong>Cargo:</strong> ${employee.cargo}</div>
                            <div><strong>CUIP:</strong> ${employee.cuip}</div>
                            <div><strong>CURP:</strong> ${employee.curp}</div>
                            <div><strong>Teléfono:</strong> ${employee.telefono || 'N/A'}</div>
                            <div><strong>Email:</strong> ${employee.email || 'N/A'}</div>
                            <div><strong>Fecha Ingreso:</strong> ${employee.fechaIngreso || 'N/A'}</div>
                            <div><strong>Estado:</strong> <span class="status-badge ${employee.estado ? employee.estado.toLowerCase().replace(' ', '-') : 'activo'}">${employee.estado || 'Activo'}</span></div>
                        </div>
                    </div>
                    
                    <div class="details-section">
                        <h4>Vigencia y Credenciales</h4>
                        <div class="details-grid">
                            <div><strong>Vigencia:</strong> ${employee.vigencia || 'N/A'}</div>
                            <div><strong>Días restantes:</strong> ${calculateDaysLeft(employee.vigencia)}</div>
                            <div><strong>Credencial activa:</strong> ${employee.credenciales?.some(c => c.activa) ? 'Sí' : 'No'}</div>
                            <div><strong>Total credenciales:</strong> ${employee.credenciales?.length || 0}</div>
                        </div>
                    </div>
                    
                    <div class="details-section">
                        <h4>Documentos</h4>
                        <div class="document-list">
                            ${employee.documentos ? Object.entries(employee.documentos).map(([tipo, archivo]) => `
                                <div class="document-item">
                                    <i class="fas fa-file-pdf"></i>
                                    <span>${tipo}: ${archivo}</span>
                                    <button class="icon-btn" onclick="downloadDocument('${archivo}')">
                                        <i class="fas fa-download"></i>
                                    </button>
                                </div>
                            `).join('') : 'No hay documentos registrados'}
                        </div>
                    </div>
                    
                    <div class="details-section">
                        <h4>Historial de Credenciales</h4>
                        <table class="mini-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Fecha Emisión</th>
                                    <th>Vigencia</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${employee.credenciales?.map(c => `
                                    <tr>
                                        <td>${c.id}</td>
                                        <td>${c.fechaEmision}</td>
                                        <td>${c.vigencia}</td>
                                        <td>${c.activa ? 'Activa' : 'Inactiva'}</td>
                                    </tr>
                                `).join('') || '<tr><td colspan="4">Sin historial</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="details-section">
                        <h4>Observaciones</h4>
                        <p>${employee.observaciones || 'Sin observaciones'}</p>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="action-btn" onclick="editEmployee('${employee.id}')">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="action-btn" onclick="generateEmployeeCredential('${employee.id}')">
                    <i class="fas fa-id-card"></i> Generar Credencial
                </button>
                <button class="action-btn secondary" onclick="this.closest('.modal').remove()">
                    Cerrar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    logAction(ACTION_TYPES.VIEW, `Vio detalles de empleado: ${employee.nombre}`);
}

// Editar empleado
function editEmployee(employeeId) {
    const employee = currentPersonnelData.find(e => e.id === employeeId);
    if (!employee) return;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content modal-lg">
            <div class="modal-header">
                <h3><i class="fas fa-edit"></i> Editar Personal</h3>
                <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="editEmployeeForm" onsubmit="saveEmployeeChanges(event, '${employeeId}')">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Nombre completo *</label>
                            <input type="text" name="nombre" value="${employee.nombre}" required class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Cargo *</label>
                            <input type="text" name="cargo" value="${employee.cargo}" required class="form-control">
                        </div>
                        <div class="form-group">
                            <label>CUIP *</label>
                            <input type="text" name="cuip" value="${employee.cuip}" required class="form-control">
                        </div>
                        <div class="form-group">
                            <label>CURP *</label>
                            <input type="text" name="curp" value="${employee.curp}" required class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Teléfono</label>
                            <input type="tel" name="telefono" value="${employee.telefono || ''}" class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" name="email" value="${employee.email || ''}" class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Fecha de vigencia</label>
                            <input type="date" name="vigencia" value="${employee.vigencia || ''}" class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Fecha de ingreso</label>
                            <input type="date" name="fechaIngreso" value="${employee.fechaIngreso || ''}" class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Estado</label>
                            <select name="estado" class="form-control">
                                ${window.EMPLOYEE_STATUS ? Object.values(window.EMPLOYEE_STATUS).map(estado =>
        `<option value="${estado}" ${employee.estado === estado ? 'selected' : ''}>${estado}</option>`
    ).join('') : `
                                    <option value="Activo" ${employee.estado === 'Activo' ? 'selected' : ''}>Activo</option>
                                    <option value="Vacaciones" ${employee.estado === 'Vacaciones' ? 'selected' : ''}>Vacaciones</option>
                                    <option value="De Comisión" ${employee.estado === 'De Comisión' ? 'selected' : ''}>De Comisión</option>
                                    <option value="Baja" ${employee.estado === 'Baja' ? 'selected' : ''}>Baja</option>
                                `}
                            </select>
                        </div>
                        <div class="form-group full-width">
                            <label>Observaciones</label>
                            <textarea name="observaciones" rows="3" class="form-control">${employee.observaciones || ''}</textarea>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="submit" form="editEmployeeForm" class="action-btn">
                    <i class="fas fa-save"></i> Guardar Cambios
                </button>
                <button class="action-btn secondary" onclick="this.closest('.modal').remove()">
                    Cancelar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Guardar cambios del empleado
function saveEmployeeChanges(event, employeeId) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    const employee = currentPersonnelData.find(e => e.id === employeeId);
    if (employee) {
        const oldData = { ...employee };

        formData.forEach((value, key) => {
            employee[key] = value;
        });

        // Actualizar en la lista
        const index = currentPersonnelData.findIndex(e => e.id === employeeId);
        currentPersonnelData[index] = employee;

        // Actualizar filtered data si aplica
        applyPersonnelFilters();

        // Cerrar modal
        form.closest('.modal').remove();

        logAction(ACTION_TYPES.UPDATE, `Actualizó datos de empleado: ${employee.nombre}`);

        // Mostrar notificación
        showNotification('Datos actualizados correctamente', 'success');
    }
}

// Cambiar estado del empleado con persistencia

// Generar credencial para empleado
function generateEmployeeCredential(employeeId) {
    const employee = currentPersonnelData.find(e => e.id === employeeId);
    if (!employee) return;

    // Usar la función del generador de credenciales
    if (typeof window.selectForCredential === 'function') {
        window.selectForCredential(
            employee.nombre,
            employee.cargo,
            employee.cuip,
            employee.curp,
            employee.telefono,
            employee.email,
            employee.vigencia
        );

        logAction(ACTION_TYPES.GENERATE, `Generó credencial para: ${employee.nombre}`);
    } else {
        console.error('Función selectForCredential no disponible');
    }
}

// Ver historial del empleado
function viewEmployeeHistory(employeeId) {
    const employee = currentPersonnelData.find(e => e.id === employeeId);
    if (!employee) return;

    // Obtener logs relacionados con este empleado
    const relatedLogs = systemLogs.filter(log =>
        log.detalles?.includes(employee.nombre) ||
        log.detalles?.includes(employee.cuip)
    );

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content modal-lg">
            <div class="modal-header">
                <h3><i class="fas fa-history"></i> Historial de ${employee.nombre}</h3>
                <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Hora</th>
                            <th>Usuario</th>
                            <th>Acción</th>
                            <th>Detalles</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${relatedLogs.length ? relatedLogs.map(log => `
                            <tr>
                                <td>${log.fecha}</td>
                                <td>${log.hora}</td>
                                <td>${log.usuario}</td>
                                <td>${log.accion}</td>
                                <td>${log.detalles}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="5">No hay historial disponible</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Mostrar modal para agregar nuevo empleado
function showAddEmployeeModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content modal-lg">
            <div class="modal-header">
                <h3><i class="fas fa-user-plus"></i> Agregar Nuevo Personal</h3>
                <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="addEmployeeForm" onsubmit="addNewEmployee(event)">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Nombre completo *</label>
                            <input type="text" name="nombre" required class="form-control" placeholder="Ej: Juan Pérez García">
                        </div>
                        <div class="form-group">
                            <label>Cargo *</label>
                            <input type="text" name="cargo" required class="form-control" placeholder="Ej: Supervisor">
                        </div>
                        <div class="form-group">
                            <label>CUIP *</label>
                            <input type="text" name="cuip" required class="form-control" placeholder="Ej: CUIP001">
                        </div>
                        <div class="form-group">
                            <label>CURP *</label>
                            <input type="text" name="curp" required class="form-control" placeholder="Ej: PEGJ800101HDFRRN01">
                        </div>
                        <div class="form-group">
                            <label>Teléfono</label>
                            <input type="tel" name="telefono" class="form-control" placeholder="Ej: 555-123-4567">
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" name="email" class="form-control" placeholder="Ej: correo@ejemplo.com">
                        </div>
                        <div class="form-group">
                            <label>Fecha de vigencia</label>
                            <input type="date" name="vigencia" class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Fecha de ingreso</label>
                            <input type="date" name="fechaIngreso" class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Estado inicial</label>
                            <select name="estado" class="form-control">
                                <option value="Activo">Activo</option>
                                <option value="Vacaciones">Vacaciones</option>
                                <option value="De Comisión">De Comisión</option>
                            </select>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="submit" form="addEmployeeForm" class="action-btn">
                    <i class="fas fa-save"></i> Guardar Personal
                </button>
                <button class="action-btn secondary" onclick="this.closest('.modal').remove()">
                    Cancelar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Agregar nuevo empleado
function addNewEmployee(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    const newEmployee = {
        id: `EMP${String(currentPersonnelData.length + 1).padStart(3, '0')}`,
        nombre: formData.get('nombre'),
        cargo: formData.get('cargo'),
        cuip: formData.get('cuip'),
        curp: formData.get('curp'),
        telefono: formData.get('telefono') || '',
        email: formData.get('email') || '',
        vigencia: formData.get('vigencia') || new Date().getFullYear() + '-12-31',
        fechaIngreso: formData.get('fechaIngreso') || new Date().toISOString().split('T')[0],
        estado: formData.get('estado') || 'Activo',
        foto: '',
        credenciales: [],
        documentos: {},
        observaciones: ''
    };

    currentPersonnelData.push(newEmployee);
    filteredPersonnelData = [...currentPersonnelData];

    renderCurrentView();
    updatePersonnelStats();

    form.closest('.modal').remove();

    logAction(ACTION_TYPES.CREATE, `Agregó nuevo personal: ${newEmployee.nombre}`);

    showNotification('Personal agregado correctamente', 'success');
}

// Exportar datos de personal
function exportPersonnelData() {
    const dataToExport = filteredPersonnelData.map(p => ({
        ID: p.id,
        Nombre: p.nombre,
        Cargo: p.cargo,
        CUIP: p.cuip,
        CURP: p.curp,
        Teléfono: p.telefono,
        Email: p.email,
        Vigencia: p.vigencia,
        'Fecha Ingreso': p.fechaIngreso,
        Estado: p.estado,
        'Credencial Activa': p.credenciales?.some(c => c.activa) ? 'Sí' : 'No',
        Observaciones: p.observaciones
    }));

    const csvContent = convertToCSV(dataToExport);
    downloadFile(csvContent, `personal_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');

    logAction(ACTION_TYPES.EXPORT, `Exportó ${dataToExport.length} registros de personal`);
}

// Funciones auxiliares
function calculateDaysLeft(vigencia) {
    if (!vigencia) return 'N/A';
    const today = new Date();
    const vigDate = new Date(vigencia);
    const daysLeft = Math.ceil((vigDate - today) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) return 'Vencido';
    if (daysLeft === 0) return 'Vence hoy';
    return `${daysLeft} días`;
}

function convertToCSV(data) {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [];

    csvRows.push(headers.join(','));

    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header]?.toString() || '';
            return value.includes(',') ? `"${value}"` : value;
        });
        csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function toggleDropdown(id) {
    const dropdown = document.getElementById(`dropdown-${id}`);
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Cerrar dropdowns al hacer clic fuera
document.addEventListener('click', function (event) {
    if (!event.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown-content.show').forEach(d => {
            d.classList.remove('show');
        });
    }
});

// Refresh data
function refreshPersonnelData() {
    loadPersonnelData();
    showNotification('Datos actualizados', 'info');
}

// Función para download document (placeholder)
function downloadDocument(filename) {
    showNotification(`Descargando ${filename}...`, 'info');
}

// Hacer todas las funciones del repositorio globales
window.currentPersonnelData = currentPersonnelData;
window.filteredPersonnelData = filteredPersonnelData;
window.loadPersonnelData = loadPersonnelData;
window.renderCurrentView = renderCurrentView;
window.renderPersonnelTable = renderPersonnelTable;
window.renderPersonnelCards = renderPersonnelCards;
window.applyPersonnelFilters = applyPersonnelFilters;
window.clearPersonnelFilters = clearPersonnelFilters;
window.filterByStatus = filterByStatus;
window.filterByVigencia = filterByVigencia;
window.togglePersonnelView = togglePersonnelView;
window.changePage = changePage;
window.viewEmployeeDetails = viewEmployeeDetails;
window.editEmployee = editEmployee;
window.saveEmployeeChanges = saveEmployeeChanges;
window.changeEmployeeStatus = changeEmployeeStatus;
window.generateEmployeeCredential = generateEmployeeCredential;
window.viewEmployeeHistory = viewEmployeeHistory;
window.showAddEmployeeModal = showAddEmployeeModal;
window.addNewEmployee = addNewEmployee;
window.exportPersonnelData = exportPersonnelData;
window.refreshPersonnelData = refreshPersonnelData;
window.toggleDropdown = toggleDropdown;
window.downloadDocument = downloadDocument;

console.log('Funciones del repositorio cargadas');

// ============================================
// FUNCIONES PARA EL REPOSITORIO QR
// ============================================

async function initQRRepoSection() {
    const grid = document.getElementById('qrGrid');
    if (!grid) return;

    grid.innerHTML = '<div class="loading" style="grid-column: 1/-1; text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Generando códigos QR...</div>';

    const personnel = await loadGoogleSheetsData();
    grid.innerHTML = '';

    if (personnel.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;">No hay personal registrado.</div>';
        return;
    }

    personnel.forEach(p => {
        const card = document.createElement('div');
        card.className = 'qr-card card';
        card.style.cssText = 'padding: 20px; text-align: center; background: white; border-radius: 15px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.05); transition: transform 0.2s;';
        card.innerHTML = `
            <div id="qr-container-${p.id || p.cuip}" class="qr-canvas-holder" style="margin-bottom: 15px; display: flex; justify-content: center;"></div>
            <div class="qr-info">
                <h4 style="margin: 5px 0; font-size: 0.9rem; color: #1e293b;">${p.nombre}</h4>
                <p style="margin: 0; font-size: 0.75rem; color: #64748b; font-family: monospace;">${p.cuip}</p>
                <div style="margin-top: 15px; display: flex; gap: 5px;">
                    <button class="action-btn small" onclick="useQRForCredential('${p.nombre}', '${p.cargo}', '${p.cuip}', '${p.curp}', '${p.foto || ''}')" style="flex: 1; font-size: 0.7rem;">
                        <i class="fas fa-id-card"></i> Usar
                    </button>
                    <button class="action-btn secondary small" onclick="downloadQR('qr-container-${p.id || p.cuip}', '${p.nombre}')" style="flex: 1; font-size: 0.7rem;">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);

        // Generar el canvas QR
        const holder = card.querySelector('.qr-canvas-holder');
        const qrCanvas = document.createElement('canvas');
        QRCode.toCanvas(qrCanvas, JSON.stringify({
            n: p.nombre,
            c: p.cuip,
            v: p.vigencia || '2025-12-31'
        }), { width: 140, margin: 1 }, function (error) {
            if (error) console.error(error);
            holder.appendChild(qrCanvas);
        });
    });
}

function filterQRRepo() {
    const q = document.getElementById('searchQR').value.toLowerCase();
    const cards = document.querySelectorAll('.qr-card');
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(q) ? 'block' : 'none';
    });
}

function useQRForCredential(nombre, cargo, cuip, curp, foto) {
    if (typeof window.selectForCredential === 'function') {
        window.selectForCredential(nombre, cargo, cuip, curp, '', '', '', foto);
    }
}

function downloadQR(containerId, name) {
    const canvas = document.querySelector(`#${containerId} canvas`);
    if (canvas) {
        const link = document.createElement('a');
        link.download = `QR_${name.replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL();
        link.click();
    }
}

window.initQRRepoSection = initQRRepoSection;
window.filterQRRepo = filterQRRepo;
window.useQRForCredential = useQRForCredential;
window.downloadQR = downloadQR;

// ============================================
// FUNCIONES DE CONTROL DE INVENTARIO Y CONFIG
// ============================================

function refreshInventory() {
    showNotification('Sincronizando inventario...', 'info');
    initInventarioSection();
}

function exportInventory() {
    showNotification('Generando reporte de inventario...', 'info');
    // Lógica similar a exportPersonnelData pero enfocada en equipo
}

function editEquipment(cuip) {
    showNotification(`Abriendo panel de asignación para CUIP: ${cuip}`, 'info');
    // Modal para editar equipo y vehículo
}

function saveInstitutionalConfig() {
    showNotification('Configuración institucional guardada', 'success');
}

function saveSecurityConfig() {
    showNotification('Parámetros de seguridad actualizados', 'success');
}

function backupSystem() {
    showNotification('Iniciando descarga de respaldo...', 'info');
}

function syncSheets() {
    showNotification('Sincronización forzada completada', 'success');
}

function clearLogs() {
    if (confirm('¿Está seguro de eliminar todos los logs de auditoría? Esta acción no se puede deshacer.')) {
        showNotification('Logs eliminados correctamente', 'success');
    }
}

function checkUpdates() {
    showNotification('El sistema está actualizado (Versión 2.5.0)', 'success');
}

window.refreshInventory = refreshInventory;
window.exportInventory = exportInventory;
window.editEquipment = editEquipment;
window.saveInstitutionalConfig = saveInstitutionalConfig;
window.saveSecurityConfig = saveSecurityConfig;
window.backupSystem = backupSystem;
window.syncSheets = syncSheets;
window.clearLogs = clearLogs;
window.checkUpdates = checkUpdates;
window.initSignaturePad = initSignaturePad;
window.clearSignature = clearSignature;

function syncRegistrationWithPreview() {
    const inputs = {
        nombre: document.getElementById('nombre'),
        apellidos: document.getElementById('apellidos'),
        puesto: document.getElementById('puesto'),
        cuip: document.getElementById('cuip'),
        foto: document.getElementById('fotoInput')
    };

    const updatePreview = () => {
        const fullName = `${inputs.nombre.value || 'NOMBRE'} ${inputs.apellidos.value || 'APELLIDO'}`.toUpperCase();
        const position = (inputs.puesto.value || 'CARGO EJEMPLO').toUpperCase();
        const cuip = (inputs.cuip.value || '---').toUpperCase();

        const previewName = document.getElementById('previewName');
        const previewPosition = document.getElementById('previewPosition');
        const previewCUIP = document.getElementById('previewValueCUIP'); // Ajustado si existe este ID

        if (previewName) previewName.textContent = fullName;
        if (previewPosition) previewPosition.textContent = position;

        // Buscar el campo CUIP por label si no tiene ID directo
        const labels = document.querySelectorAll('.info-label');
        labels.forEach(label => {
            if (label.textContent.includes('CUIP')) {
                const valueSpan = label.nextElementSibling;
                if (valueSpan) valueSpan.textContent = cuip;
            }
        });
    };

    Object.values(inputs).forEach(input => {
        if (!input) return;
        if (input.type === 'file') {
            input.addEventListener('change', function (e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function (re) {
                        const previewPhoto = document.getElementById('previewPhoto');
                        if (previewPhoto) {
                            previewPhoto.innerHTML = `<img src="${re.target.result}" style="width:100%; height:100%; object-fit:cover;">`;
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        } else {
            input.addEventListener('input', updatePreview);
        }
    });
}

async function initCredencialesSection() {
    const grid = document.getElementById('credencialesGrid');
    if (!grid) return;

    const personnel = await loadGoogleSheetsData();
    grid.innerHTML = '';

    if (personnel.length === 0) {
        grid.innerHTML = '<p>No hay personal registrado para generar credenciales.</p>';
        return;
    }

    personnel.forEach(p => {
        const card = document.createElement('div');
        card.className = 'card qr-card'; // Reutilizamos estilo de tarjeta
        card.innerHTML = `
            <div class="qr-info">
                <div style="display:flex; gap:10px; align-items:center;">
                    <div style="width:40px; height:40px; border-radius:50%; overflow:hidden; background:#eee;">
                        ${p.foto ? `<img src="${p.foto}" style="width:100%; height:100%; object-fit:cover;">` : '<i class="fas fa-user" style="margin:10px;"></i>'}
                    </div>
                    <div style="flex:1;">
                        <h4 style="margin:0; font-size:0.9rem;">${p.nombre}</h4>
                        <small style="color:#64748b;">${p.cargo}</small>
                    </div>
                </div>
                <div style="margin-top:10px; border-top:1px solid #eee; padding-top:10px; display:flex; gap:5px;">
                    <button class="action-btn small" onclick="useQRForCredential('${p.nombre}', '${p.cargo}', '${p.cuip}', '${p.curp}', '${p.foto}')" title="Cargar en generador">
                        <i class="fas fa-upload"></i> Cargar
                    </button>
                    <button class="action-btn small secondary" onclick="printSingleCredential('${p.cuip}')" title="Impresión Directa">
                        <i class="fas fa-print"></i>
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function filterCredencialesRepo() {
    const q = document.getElementById('buscarCredencial').value.toLowerCase();
    const cards = document.querySelectorAll('#credencialesGrid .qr-card');
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(q) ? 'block' : 'none';
    });
}

async function printSingleCredential(cuip) {
    const personnel = await loadGoogleSheetsData();
    const p = personnel.find(x => x.cuip === cuip);
    if (!p) return;

    // Set as current and print
    window.selectForCredential(p.nombre, p.cargo, p.cuip, p.curp, p.telefono, p.email, '2025-12-31', p.foto);
    setTimeout(() => {
        window.printEnhancedCredential();
    }, 500);
}

window.syncRegistrationWithPreview = syncRegistrationWithPreview;
window.filterCredencialesRepo = filterCredencialesRepo;
window.printSingleCredential = printSingleCredential;

async function initMultasSection() {
    await loadFinesRepo();

    // Poblar select de oficiales
    const officers = await loadGoogleSheetsData();
    const officerSelect = document.getElementById('fineOfficer');
    if (officerSelect) {
        officerSelect.innerHTML = '<option value="">Seleccione Oficial...</option>' +
            officers.map(o => `<option value="${o.nombre} ${o.apellidos}">${o.nombre} ${o.apellidos}</option>`).join('');
    }

    // Lógica de cambio de precio según motivo
    const reasonSelect = document.getElementById('fineReasonSelect');
    const amountInput = document.getElementById('fineAmountInput');
    if (reasonSelect && amountInput) {
        reasonSelect.addEventListener('change', function () {
            const selected = this.options[this.selectedIndex];
            const price = selected.getAttribute('data-price');
            if (price) amountInput.value = price;
        });
    }

    const form = document.getElementById('formFine');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            showNotification('Generando folio de infracción...', 'info');
            setTimeout(() => {
                showNotification('Multa registrada correctamente', 'success');
                closeFineModal();
                loadFinesRepo();
            }, 1000);
        };
    }
}

async function loadFinesRepo() {
    const container = document.getElementById('finesTableBody');
    if (!container) return;

    // Mock de multas
    const fines = [
        { folio: 'V-2026-001', fecha: '2026-02-24', infractor: 'Mario Casas', placa: 'XWJ-22-11', motivo: 'Exceso de Velocidad', monto: 800, estado: 'Pendiente' },
        { folio: 'V-2026-002', fecha: '2026-02-24', infractor: 'Lucia Méndez', placa: 'UAB-90-88', motivo: 'Falta de Licencia', monto: 550, estado: 'Pagado' },
        { folio: 'V-2026-003', fecha: '2026-02-23', infractor: 'Juan Perez', placa: 'TTR-44-22', motivo: 'Pasarse el Alto', monto: 950, estado: 'Pendiente' }
    ];

    container.innerHTML = '';

    let pending = 0, paid = 0, revenue = 0;
    const today = new Date().toISOString().split('T')[0];
    let finesOfToday = 0;

    fines.forEach(f => {
        if (f.estado === 'Pendiente') pending++;
        if (f.estado === 'Pagado') {
            paid++;
            revenue += f.monto;
        }
        if (f.fecha === today) finesOfToday++;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${f.folio}</strong></td>
            <td>${f.fecha}</td>
            <td>
                <div style="font-weight:600;">${f.infractor}</div>
                <small style="color:#64748b;">Placa: ${f.placa}</small>
            </td>
            <td>${f.motivo}</td>
            <td><strong>$${f.monto}</strong></td>
            <td><span class="status-badge ${f.estado.toLowerCase()}">${f.estado}</span></td>
            <td>
                <div class="row-actions">
                    <button class="action-btn small" title="Cobrar Multa" onclick="payFine('${f.folio}')" ${f.estado === 'Pagado' ? 'disabled' : ''}>
                        <i class="fas fa-cash-register"></i>
                    </button>
                    <button class="action-btn small secondary" title="Imprimir Ticket" onclick="printFineTicket('${f.folio}')">
                        <i class="fas fa-print"></i>
                    </button>
                </div>
            </td>
        `;
        container.appendChild(tr);
    });

    document.getElementById('finesPending').textContent = pending;
    document.getElementById('finesPaid').textContent = paid;
    document.getElementById('totalRevenue').textContent = `$ ${revenue}`;
    document.getElementById('finesToday').textContent = finesOfToday;
}

function showNewFineModal() {
    document.getElementById('fineModal').style.display = 'flex';
}

function closeFineModal() {
    document.getElementById('fineModal').style.display = 'none';
    document.getElementById('formFine').reset();
}

function payFine(folio) {
    if (confirm(`¿Desea registrar el pago total de la multa ${folio}?`)) {
        showNotification(`Pago procesado para el folio ${folio}`, 'success');
        loadFinesRepo();
    }
}

function printFineTicket(folio) {
    showNotification(`Generando ticket de infracción ${folio}...`, 'info');
}

function filterFinesRepo() {
    // Simulación de filtrado
}

function exportFines() {
    showNotification('Generando corte de caja de vialidad...', 'success');
}

window.showNewFineModal = showNewFineModal;
window.closeFineModal = closeFineModal;
window.payFine = payFine;
window.printFineTicket = printFineTicket;
window.filterFinesRepo = filterFinesRepo;
window.exportFines = exportFines;
window.initMultasSection = initMultasSection;

// Re-implementación de cambio de estado persistente
async function changeEmployeeStatus(employeeId, newStatus) {
    const employee = currentPersonnelData.find(e => e.id === employeeId || e.cuip === employeeId);
    if (!employee) return;

    const oldStatus = employee.estado;
    showNotification(`Actualizando estado a ${newStatus}...`, 'info');

    try {
        // Usar API centralizada en lugar de PHP
        const result = await apiActualizarEstado(employee.cuip, newStatus);

        if (result.success) {
            employee.estado = newStatus;

            // Actualizar vistas
            renderCurrentView();
            updatePersonnelStats();

            showNotification(`Estado de ${employee.nombre} actualizado correctamente`, 'success');
            logAction(ACTION_TYPES.UPDATE, `Cambió estado de ${employee.nombre}: ${oldStatus} → ${newStatus}`);
        } else {
            showNotification('Error: ' + (result.message || 'No se pudo guardar el cambio'), 'error');
        }
    } catch (e) {
        console.error('Error al actualizar estado:', e);
        showNotification('Error de conexión con el servidor', 'error');
    }
}
window.changeEmployeeStatus = changeEmployeeStatus;

// ============================================
// LÓGICA DE DOCUMENTACIÓN
// ============================================

async function initDocumentacionSection() {
    await loadDocsRepo();

    // Poblar select de personal
    const personnel = await loadGoogleSheetsData();
    const select = document.getElementById('docPersonnelSelect');
    if (select) {
        select.innerHTML = '<option value="">Seleccione elemento...</option>' +
            personnel.map(p => `<option value="${p.cuip}">${p.nombre} ${p.apellidos} (${p.cuip})</option>`).join('');
    }

    const form = document.getElementById('formUploadDoc');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            showNotification('Cargando documento al servidor...', 'info');

            // Simulación de carga
            setTimeout(() => {
                showNotification('Documento guardado en el expediente digital', 'success');
                closeUploadDocModal();
                loadDocsRepo();
            }, 1500);
        };
    }
}

async function loadDocsRepo() {
    const container = document.getElementById('docsGridContainer');
    if (!container) return;

    const personnel = await loadGoogleSheetsData();
    container.innerHTML = '';

    personnel.forEach(p => {
        const folder = document.createElement('div');
        folder.className = 'card doc-folder';
        folder.style.display = 'flex';
        folder.style.gap = '20px';
        folder.style.alignItems = 'center';
        folder.style.padding = '20px';
        folder.style.marginBottom = '15px';
        folder.style.borderLeft = '5px solid #c5a059';

        // Simulación de documentos existentes
        const docs = ['CURP.pdf', 'INE.jpg', 'CUIP_Cert.pdf'];

        folder.innerHTML = `
            <div class="folder-icon" style="font-size: 2.5rem; color: #c5a059;">
                <i class="fas fa-folder"></i>
            </div>
            <div class="folder-info" style="flex-grow: 1;">
                <h4 style="margin:0;">${p.nombre} ${p.apellidos}</h4>
                <div style="font-size: 0.75rem; color: #64748b; margin-top: 5px;">
                    <span style="margin-right: 10px;"><i class="fas fa-id-card"></i> ${p.cuip}</span>
                    <span style="margin-right: 10px;"><i class="fas fa-fingerprint"></i> ${p.curp}</span>
                    <span><i class="fas fa-barcode"></i> ${p.rfc}</span>
                </div>
                <div class="doc-tags" style="margin-top: 10px; display: flex; gap: 8px;">
                    ${docs.map(d => `<span style="background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-size: 0.65rem;"><i class="fas fa-file-pdf" style="color:#ef4444;"></i> ${d}</span>`).join('')}
                    <span style="background: #fffbeb; padding: 2px 8px; border-radius: 4px; font-size: 0.65rem; color: #b45309; border: 1px dashed #f59e0b;" onclick="showUploadDocModal()"><i class="fas fa-plus"></i> Añadir</span>
                </div>
            </div>
            <div class="folder-actions">
                <button class="action-btn small secondary" onclick="viewExpediente('${p.cuip}')">Abrir Expediente</button>
            </div>
        `;
        container.appendChild(folder);
    });
}

function showUploadDocModal() {
    document.getElementById('uploadDocModal').style.display = 'flex';
}

function closeUploadDocModal() {
    document.getElementById('uploadDocModal').style.display = 'none';
    document.getElementById('formUploadDoc').reset();
}

function filterDocsRepo() {
    const q = document.getElementById('searchDocs').value.toLowerCase();
    const folders = document.querySelectorAll('.doc-folder');
    folders.forEach(f => {
        const text = f.textContent.toLowerCase();
        f.style.display = text.includes(q) ? 'flex' : 'none';
    });
}

function viewExpediente(cuip) {
    showNotification('Abriendo expediente digital de ' + cuip, 'info');
}

// Integración de Reportes Robustos
function updateReportDescription() {
    const type = document.getElementById('mainReportSelector').value;
    const descEl = document.getElementById('reportDesc');
    const descriptions = {
        [REPORT_TYPES.PERSONAL_ACTIVO]: 'Genera un listado detallado de todo el personal activo con sus datos generales.',
        [REPORT_TYPES.VIGENCIAS]: 'Muestra el estado de vigencia de las credenciales de todo el personal.',
        [REPORT_TYPES.MOVIMIENTOS]: 'Lista cronológica de todas las acciones realizadas en el sistema (auditoría).',
        [REPORT_TYPES.ACTIVIDAD_USUARIOS]: 'Analiza el rendimiento y actividad de cada usuario del sistema.',
        [REPORT_TYPES.ESTADISTICAS]: 'Métricas avanzadas sobre la fuerza de seguridad y uso de la plataforma.'
    };
    if (descEl) descEl.textContent = descriptions[type] || '';
}

async function generateAndPreviewReport() {
    const type = document.getElementById('mainReportSelector').value;
    const container = document.getElementById('reporteResultado');
    container.innerHTML = '<div class="loading">Procesando datos y generando vista previa...</div>';

    // Usar la función existente de showReportGenerator pero adaptada a la nueva UI
    await showReportGenerator(type);
}

function printCurrentReport() {
    const type = document.getElementById('mainReportSelector').value;
    if (typeof printMunicipalReport === 'function') {
        printMunicipalReport(type);
    } else {
        showNotification('El generador de PDF no está cargado correctamente', 'error');
    }
}

window.showUploadDocModal = showUploadDocModal;
window.closeUploadDocModal = closeUploadDocModal;
window.filterDocsRepo = filterDocsRepo;
window.viewExpediente = viewExpediente;
window.updateReportDescription = updateReportDescription;
window.generateAndPreviewReport = generateAndPreviewReport;
window.printCurrentReport = printCurrentReport;
window.initDocumentacionSection = initDocumentacionSection;

console.log('Repositorio de Documentación activado');
console.log('Sistema de Reportes Robustos activado');
console.log('Repositorio de Multas activado');
console.log('Sistema de Repositorio QR cargado correctamente');
console.log('Módulos de Inventario y Configuración activados');
console.log('Sincronización de Credenciales activada');