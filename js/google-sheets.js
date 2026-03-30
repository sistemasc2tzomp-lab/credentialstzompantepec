// CONFIGURACIÓN (Ahora centralizada en gas-api.js)

// Estructura completa para el personal
const EMPLOYEE_STATUS_SHEETS = {
    ACTIVO: 'Activo',
    BAJA: 'Baja',
    VACACIONES: 'Vacaciones',
    COMISION: 'De Comisión'
};

// Cargar datos reales desde la API centralizada (Google Apps Script)
async function loadGoogleSheetsData() {
    try {
        console.log('🔄 Sincronizando repositorio de personal desde Google Apps Script...');

        // Llamar a la API centralizada definida en gas-api.js
        const realData = await apiGetPersonal();

        if (!realData || realData.length === 0) {
            console.log('⚠️ No hay datos en Google Sheets o el Web App no está configurado. Usando datos DEMO.');
            return getEnhancedMockData();
        }

        console.log('✅ Datos sincronizados correctamente:', realData.length, 'registros.');
        return realData;

    } catch (error) {
        console.error('❌ Error sincronizando con Google Apps Script:', error);
        return getEnhancedMockData();
    }
}

function processEnhancedSheetData(values) {
    const rows = values.slice(1); // Saltar encabezados

    return rows.map((row, index) => ({
        id: `EMP${String(index + 1).padStart(3, '0')}`,
        nombre: row[0] || 'Sin nombre',
        cargo: row[1] || 'Sin cargo',
        cuip: row[2] || 'Sin CUIP',
        curp: row[3] || 'Sin CURP',
        telefono: row[4] || 'Sin teléfono',
        email: row[5] || 'Sin email',
        vigencia: row[6] || '2024-12-31',
        fechaIngreso: calculateRandomDate(),
        estado: getRandomStatus(),
        foto: row[7] || '',
        credenciales: generateMockCredentials(row[2] || 'CUIP', row[6] || '2024-12-31'),
        documentos: {
            ine: 'Pendiente',
            rfc: 'Pendiente',
            comprobanteDomicilio: 'Pendiente'
        },
        observaciones: 'Registro cargado desde Google Sheets'
    })).filter(p => p.nombre !== 'Sin nombre');
}

// Función auxiliar para generar fecha aleatoria de ingreso
function calculateRandomDate() {
    const start = new Date(2020, 0, 1);
    const end = new Date(2023, 11, 31);
    const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return randomDate.toISOString().split('T')[0];
}

// Función auxiliar para obtener estado aleatorio
function getRandomStatus() {
    const statuses = Object.values(EMPLOYEE_STATUS);
    return statuses[Math.floor(Math.random() * statuses.length)];
}

// Función auxiliar para generar credenciales simuladas
function generateMockCredentials(cuip, vigenciaPrincipal) {
    const credentials = [];

    // Credencial actual
    credentials.push({
        id: `CRED${Math.floor(Math.random() * 1000)}`,
        fechaEmision: new Date().toISOString().split('T')[0],
        vigencia: vigenciaPrincipal,
        activa: true
    });

    // Posible credencial anterior (30% de probabilidad)
    if (Math.random() > 0.7) {
        const year = new Date().getFullYear() - 1;
        credentials.push({
            id: `CRED${Math.floor(Math.random() * 1000)}`,
            fechaEmision: `${year}-01-01`,
            vigencia: `${year}-12-31`,
            activa: false
        });
    }

    return credentials;
}

// Datos de ejemplo mejorados
function getEnhancedMockData() {
    return [
        {
            id: 'EMP001',
            nombre: 'Juan Romero',
            cargo: 'Supervisor',
            cuip: '181119880',
            curp: 'RONJ8811H8TLMVN08',
            telefono: '555-123-4567',
            email: 'juan.romero@seguridad.com',
            vigencia: '2025-12-31',
            fechaIngreso: '2020-01-15',
            estado: EMPLOYEE_STATUS.ACTIVO,
            foto: '',
            credenciales: [
                { id: 'CRED001', fechaEmision: '2024-01-01', vigencia: '2025-12-31', activa: true },
                { id: 'CRED002', fechaEmision: '2023-01-01', vigencia: '2023-12-31', activa: false }
            ],
            documentos: {
                ine: 'INE001.pdf',
                rfc: 'RFC001.pdf',
                comprobanteDomicilio: 'COMP001.pdf'
            },
            observaciones: 'Supervisor certificado'
        },
        {
            id: 'EMP002',
            nombre: 'María González',
            cargo: 'Guardia',
            cuip: '181119881',
            curp: 'GOMM850201MDFRN09',
            telefono: '555-234-5678',
            email: 'maria.gonzalez@seguridad.com',
            vigencia: '2024-12-31',
            fechaIngreso: '2021-03-20',
            estado: EMPLOYEE_STATUS.VACACIONES,
            foto: '',
            credenciales: [
                { id: 'CRED003', fechaEmision: '2024-02-01', vigencia: '2024-12-31', activa: true }
            ],
            documentos: {
                ine: 'INE002.pdf',
                rfc: 'RFC002.pdf',
                comprobanteDomicilio: 'COMP002.pdf'
            },
            observaciones: 'En proceso de recertificación'
        },
        {
            id: 'EMP003',
            nombre: 'Pedro Sánchez',
            cargo: 'Jefe de Turno',
            cuip: '181119882',
            curp: 'SAPE900305HDFRN10',
            telefono: '555-345-6789',
            email: 'pedro.sanchez@seguridad.com',
            vigencia: '2025-06-30',
            fechaIngreso: '2019-11-10',
            estado: EMPLOYEE_STATUS.ACTIVO,
            foto: '',
            credenciales: [
                { id: 'CRED004', fechaEmision: '2024-01-15', vigencia: '2025-06-30', activa: true }
            ],
            documentos: {
                ine: 'INE003.pdf',
                rfc: 'RFC003.pdf',
                comprobanteDomicilio: 'COMP003.pdf'
            },
            observaciones: 'Jefe de turno nocturno'
        },
        {
            id: 'EMP004',
            nombre: 'Ana Hernández',
            cargo: 'Coordinadora',
            cuip: '181119883',
            curp: 'HECA950410MDFRN04',
            telefono: '555-456-7890',
            email: 'ana.hernandez@seguridad.com',
            vigencia: '2024-08-31',
            fechaIngreso: '2022-06-01',
            estado: EMPLOYEE_STATUS.COMISION,
            foto: '',
            credenciales: [],
            documentos: {
                ine: 'INE004.pdf',
                rfc: 'RFC004.pdf',
                comprobanteDomicilio: 'COMP004.pdf'
            },
            observaciones: 'En comisión en sucursal norte'
        }
    ];
}

// Función original para mantener compatibilidad
async function updatePersonnelTable() {
    console.log('Actualizando tabla de personal...');
    const data = await loadGoogleSheetsData();
    const tableBody = document.getElementById('tableBody');

    if (!tableBody) {
        console.log('No se encontró tableBody');
        return;
    }

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5">No hay datos disponibles</td></tr>';
        return;
    }

    tableBody.innerHTML = data.map((person, index) => {
        // Escapar comillas para evitar errores
        const nombre = person.nombre.replace(/'/g, "\\'");
        const cargo = person.cargo.replace(/'/g, "\\'");

        return `
        <tr>
            <td>${person.nombre}</td>
            <td>${person.cargo}</td>
            <td>${person.cuip}</td>
            <td>${person.curp}</td>
            <td>
                <button class="action-btn" onclick="selectForCredential('${nombre}', '${cargo}', '${person.cuip}', '${person.curp}')">
                    <i class="fas fa-id-card"></i> Generar
                </button>
            </td>
        </tr>
    `}).join('');

    // Actualizar contadores
    const totalPersonal = document.getElementById('totalPersonal');
    const credencialesActivas = document.getElementById('credencialesActivas');

    if (totalPersonal) totalPersonal.textContent = data.length;
    if (credencialesActivas) {
        const activas = data.reduce((sum, person) =>
            sum + (person.credenciales?.filter(c => c.activa).length || 0), 0);
        credencialesActivas.textContent = activas;
    }

    // Registrar la actualización
    if (typeof logAction !== 'undefined' && window.ACTION_TYPES) {
        logAction(ACTION_TYPES.VIEW, `Actualizó tabla de personal (${data.length} registros)`);
    }

    console.log('Tabla actualizada con', data.length, 'registros');
}

function searchPersonnel() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#tableBody tr');

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });

    // Registrar la búsqueda
    if (searchTerm && typeof logAction !== 'undefined' && window.ACTION_TYPES) {
        logAction(ACTION_TYPES.SEARCH, `Búsqueda en repositorio: "${searchTerm}"`);
    }
}

function showErrorMessage(message) {
    const tableBody = document.getElementById('tableBody');
    if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="5" style="color: red; text-align: center; padding: 20px;">
            <i class="fas fa-exclamation-triangle"></i> ${message}<br>
            <small>Usando datos de prueba temporalmente</small>
        </td></tr>`;
    }
}

// Hacer funciones globales
window.loadGoogleSheetsData = loadGoogleSheetsData;
window.updatePersonnelTable = updatePersonnelTable;
window.searchPersonnel = searchPersonnel;

// Event listener para cuando se carga la sección
document.addEventListener('sectionLoaded', function (e) {
    console.log('Sección cargada:', e.detail);
    if (e.detail === 'repositorio') {
        setTimeout(updatePersonnelTable, 500);
    }
});

// Verificar que las funciones de logging estén disponibles
document.addEventListener('DOMContentLoaded', function () {
    console.log('google-sheets.js cargado correctamente');
    console.log('Funciones de logging disponibles:', {
        logAction: typeof logAction,
        ACTION_TYPES: typeof ACTION_TYPES
    });
});

console.log('google-sheets.js cargado correctamente');