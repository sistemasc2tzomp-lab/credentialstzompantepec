// Variables globales
let currentPersonData = null;

function selectForCredential(nombre, cargo, cuip, curp, telefono = '', email = '', vigencia = '2025-12-31', foto = '') {
    currentPersonData = {
        nombre,
        cargo,
        cuip,
        curp,
        telefono,
        email,
        vigencia,
        foto
    };

    // Registrar la generación de credencial
    if (typeof logAction !== 'undefined' && window.ACTION_TYPES) {
        logAction(ACTION_TYPES.GENERATE, `Generó credencial para ${nombre}`);
    }

    // Navegar a credenciales
    const credencialesLink = document.querySelector('[data-section="credenciales"]');
    if (credencialesLink) {
        credencialesLink.click();
    }

    // Actualizar previsualización
    setTimeout(() => {
        updateEnhancedCredential(currentPersonData);
    }, 500);
}

function updateEnhancedCredential(data) {
    if (!data) return;

    // Formatear fecha de expedición (hoy)
    const hoy = new Date();
    const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    const fechaExp = `${hoy.getDate().toString().padStart(2, '0')}-${meses[hoy.getMonth()]}-${hoy.getFullYear().toString().substring(2)}`;

    // Actualizar campos en el DOM
    const fields = {
        'previewName': data.nombre,
        'previewPosition': data.cargo,
        'previewCUIP': data.cuip,
        'previewCURP': data.curp,
        'previewVigencia': data.vigencia || '1 AÑO',
        'previewExpedicion': data.fechaExpedicion || fechaExp
    };

    for (const [id, value] of Object.entries(fields)) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    // Actualizar foto si existe
    const photoArea = document.getElementById('previewPhoto');
    if (photoArea && data.foto) {
        photoArea.innerHTML = `<img src="${data.foto}" style="width: 100%; height: 100%; object-fit: cover;">`;
    }

    // Generar QR Real
    const qrContainer = document.getElementById('previewQR');
    if (qrContainer) {
        qrContainer.innerHTML = '';
        const qrCanvas = document.createElement('canvas');
        QRCode.toCanvas(qrCanvas, JSON.stringify({
            n: data.nombre,
            c: data.cuip,
            v: data.vigencia
        }), { width: 60, margin: 1 }, function (error) {
            if (error) console.error(error);
            qrContainer.appendChild(qrCanvas);
        });
    }
}

function printEnhancedCredential() {
    if (!currentPersonData) {
        alert('Selecciona un empleado primero del Repositorio');
        return;
    }

    const data = currentPersonData;
    const hoy = new Date();
    const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    const fechaExp = `${hoy.getDate().toString().padStart(2, '0')}-${meses[hoy.getMonth()]}-${hoy.getFullYear()}`;

    // Registrar la impresión
    if (typeof logAction !== 'undefined' && window.ACTION_TYPES) {
        logAction(ACTION_TYPES.PRINT, `Imprimió credencial de ${data.nombre}`);
    }

    // Generar QR para la impresión
    const tempCanvas = document.createElement('canvas');
    QRCode.toCanvas(tempCanvas, JSON.stringify({
        n: data.nombre,
        c: data.cuip,
        v: data.vigencia || '2025-12-31'
    }), { width: 150, margin: 1 });
    const qrDataUrl = tempCanvas.toDataURL();

    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Credencial - ${data.nombre}</title>
            <link rel="stylesheet" href="css/style.css">
            <style>
                body { background: white; margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 30px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
                .credential-tzomp { 
                    width: 325px; 
                    height: 204px; 
                    border: 1px solid #ddd; 
                    border-radius: 12px; 
                    overflow: hidden; 
                    position: relative; 
                    background: white;
                    page-break-inside: avoid;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                }
                .banner { background: #0a192f; color: white; text-align: center; padding: 5px; font-weight: bold; font-size: 0.8rem; letter-spacing: 1px; }
                .main-content { display: flex; padding: 10px; gap: 10px; height: 130px; }
                .photo-area { width: 90px; height: 110px; border: 2px solid #0a192f; border-radius: 8px; overflow: hidden; background: #f8fafc; }
                .info-area { flex: 1; display: flex; flex-direction: column; justify-content: center; }
                .info-field { margin-bottom: 2px; line-height: 1.1; }
                .info-label { font-weight: bold; font-size: 0.65rem; color: #64748b; text-transform: uppercase; display: block; }
                .info-value { font-size: 0.75rem; color: #1e293b; font-weight: 600; }
                
                .back-layout { padding: 10px; display: flex; flex-direction: column; align-items: center; height: 110px; }
                .auth-section { text-align: center; margin-top: 5px; flex: 1; }
                .signature-line { width: 120px; border-top: 1px solid #000; margin: 30px auto 5px; }
                
                .bottom-banner { 
                    background: #f8fafc; 
                    border-top: 1px solid #e2e8f0; 
                    padding: 5px 10px; 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    font-size: 0.5rem; 
                    color: #64748b;
                    position: absolute;
                    bottom: 0;
                    width: 100%;
                    box-sizing: border-box;
                }
                .qr-area { width: 45px; height: 45px; }
                
                @media print { 
                    .no-print { display: none; }
                    body { padding: 0; }
                    .credential-tzomp { box-shadow: none; border: 1px solid #eee; }
                }
            </style>
        </head>
        <body>
            <div class="no-print" style="margin-bottom: 20px;">
                <button onclick="window.print()" style="padding: 12px 24px; background: #0a192f; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                    <i class="fas fa-print"></i> CONFIRMAR IMPRESIÓN
                </button>
            </div>
            
            <!-- FRENTE -->
            <div class="credential-tzomp">
                <div class="top-logos" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 15px;">
                    <img src="assets/escudo_tzomp.png" style="width: 50px; height: auto;">
                    <img src="assets/c2_logo.png" style="width: 60px; height: auto;">
                    <img src="assets/spt_logo.png" style="width: 50px; height: auto;">
                </div>
                <div class="banner">
                    <div>SEGURIDAD PÚBLICA</div>
                    <div style="font-size: 0.7rem;">TZOMPANTEPEC</div>
                </div>
                <div class="main-content">
                    <div class="photo-area">
                        ${data.foto ? `<img src="${data.foto}" style="width:100%;height:100%;object-fit:cover;">` : '<div style="font-size:4rem;color:#ccc;text-align:center;line-height:110px;">👤</div>'}
                    </div>
                    <div class="info-area">
                        <div class="info-field"><span class="info-label">Nombre:</span> <span class="info-value">${data.nombre}</span></div>
                        <div class="info-field"><span class="info-label">Cargo:</span> <span class="info-value">${data.cargo}</span></div>
                        <div class="info-field"><span class="info-label">CUIP:</span> <span class="info-value" style="font-family: monospace;">${data.cuip}</span></div>
                        <div class="info-field"><span class="info-label">CURP:</span> <span class="info-value" style="font-family: monospace;">${data.curp}</span></div>
                        <div class="info-field" style="display:flex; gap: 10px; margin-top: 5px;">
                            <div><span class="info-label">Vigencia:</span> <span class="info-value">${data.vigencia || '1 AÑO'}</span></div>
                            <div><span class="info-label">Fecha Exp.:</span> <span class="info-value">${fechaExp}</span></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- REVERSO -->
            <div class="credential-tzomp">
                <div class="top-logos" style="display: flex; justify-content: space-around; align-items: center; padding: 10px;">
                    <img src="assets/escudo_tzomp.png" style="height: 35px; width: auto;">
                    <img src="assets/c2_logo.png" style="height: 35px; width: auto;">
                    <img src="assets/spt_logo.png" style="height: 35px; width: auto;">
                </div>
                <div class="banner">
                    <div>SEGURIDAD PÚBLICA</div>
                    <div style="font-size: 0.7rem;">TZOMPANTEPEC</div>
                </div>
                <div class="back-layout">
                    <div class="auth-section">
                        <div class="signature-line"></div>
                        <div style="font-size: 0.5rem; font-weight: bold;">C.P. MARCELINO RAMOS MONTIEL</div>
                        <div style="font-size: 0.4rem; color: #64748b;">PRESIDENTE MUNICIPAL</div>
                    </div>
                    <div class="fingerprint-section" style="margin-top: 10px;">
                        <div style="width:50px;height:65px;border:1px dashed #cbd5e1;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:0.5rem;">HUELLA</div>
                    </div>
                </div>
                <div class="bottom-banner">
                    <div style="display: flex; flex-direction: column;">
                        <span>PROPIEDAD DE GOBIERNO DE TZOMPANTEPEC</span>
                        <span style="font-size: 0.4rem; margin-top: 2px;">DOCUMENTO OFICIAL E INTRANSFERIBLE</span>
                    </div>
                    <img src="${qrDataUrl}" class="qr-area" alt="QR Code">
                </div>
            </div>

            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
}

// Hacer funciones globales
window.selectForCredential = selectForCredential;
window.printEnhancedCredential = printEnhancedCredential;
window.generateCredential = function () {
    printEnhancedCredential();
};

// Mantener compatibilidad con funciones anteriores
window.updateCredentialPreview = function (nombre, cargo, cuip, curp) {
    selectForCredential(nombre, cargo, cuip, curp);
};

window.generateQRCode = function (data) {
    if (currentPersonData) {
        generateEnhancedQRDisplay(currentPersonData);
    }
};

// Función existente para agregar personal
function showAddPersonForm() {
    alert('Funcionalidad para agregar personal (requiere permisos de escritura en Google Sheets)');

    // Registrar el intento de agregar personal
    if (typeof logAction !== 'undefined' && window.ACTION_TYPES) {
        logAction(ACTION_TYPES.CREATE, 'Intentó agregar personal (función no implementada)');
    }
}
window.showAddPersonForm = showAddPersonForm;

// Verificar que las funciones de logging estén disponibles
document.addEventListener('DOMContentLoaded', function () {
    console.log('credencial-generator.js cargado correctamente');
    console.log('Funciones de logging disponibles:', {
        logAction: typeof logAction,
        ACTION_TYPES: typeof ACTION_TYPES
    });
});

console.log('credencial-generator.js cargado correctamente');