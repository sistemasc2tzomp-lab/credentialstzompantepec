// Variables globales
let currentPersonData = null;

/**
 * Convierte URL de Google Drive a formato de miniatura accesible sin CORS.
 * Este formato funciona correctamente en etiquetas <img> sin bloqueos del navegador.
 */
function toDirectDriveUrl(url) {
    if (!url) return '';
    // Si ya es base64, devolver directamente
    if (url.startsWith('data:')) return url;
    // Extraer el ID del archivo de Drive
    const idMatch = url.match(/\/d\/([-\w]+)/) || url.match(/[?&]id=([-\w]+)/) || url.match(/\/uc\?.*id=([-\w]+)/);
    if (idMatch && idMatch[1]) {
        // Usar formato thumbnail que funciona sin CORS en <img>
        return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w400`;
    }
    return url;
}

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

    // Actualizar foto con lógica de fallback robusta
    const photoArea = document.getElementById('previewPhoto');
    if (photoArea) {
        let photoSrc = data.foto;
        const cuipLimpio = data.cuip ? data.cuip.trim() : '';

        // Convertir URLs de Google Drive al formato thumbnail (sin CORS)
        if (photoSrc && photoSrc.includes('drive.google.com') && !photoSrc.startsWith('data:')) {
            photoSrc = toDirectDriveUrl(photoSrc);
        }

        // Si no hay foto, intentar fallback local por CUIP
        if (!photoSrc || photoSrc === '' || photoSrc === 'foto') {
            if (cuipLimpio) {
                photoSrc = `assets/FOTOGRAFIAS PERSONAL/${cuipLimpio}.png`;
            }
        }

        photoArea.innerHTML = `
            <img src="${photoSrc || ''}" 
                 onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(data.nombre)}&background=0a192f&color=fff&size=200&bold=true'"
                 style="width: 100%; height: 100%; object-fit: cover;">
        `;
    }

    // Generar QR Real con datos de validación oficial
    const qrContainers = [document.getElementById('previewQR'), document.getElementById('backQR')];
    
    // Identificador único para validación (CUIP o Nombre como backup)
    const uniqueId = data.cuip && data.cuip !== '---' ? data.cuip : (data.nombre || 'INVALID');
    const baseUrl = 'https://sistemasc2tzomp-lab.github.io/credentialstzompantepec/validar.html';
    const validationUrl = `${baseUrl}?id=${encodeURIComponent(uniqueId)}`;

    qrContainers.forEach(container => {
        if (container) {
            container.innerHTML = '';
            const qrCanvas = document.createElement('canvas');
            // QR de la parte trasera con tamaño óptimo y margen para lectura rápida
            const size = container.id === 'backQR' ? 75 : 80; 

            if (typeof QRCode !== 'undefined' && typeof QRCode.toCanvas === 'function') {
                QRCode.toCanvas(qrCanvas, validationUrl, {
                    width: size,
                    margin: 2,
                    errorCorrectionLevel: 'M',
                    color: {
                        dark: '#000000',
                        light: '#ffffff'
                    }
                }, function (error) {
                    if (error) console.error('QR Error:', error);
                    else container.appendChild(qrCanvas);
                });
            } else {
                const img = document.createElement('img');
                img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(validationUrl)}&ecc=H`;
                img.style.cssText = `width:${size}px;height:${size}px;`;
                container.appendChild(img);
            }
        }
    });
}
function printEnhancedCredential() {
    if (!currentPersonData) {
        alert('Selecciona un oficial primero desde el Repositorio de Personal.');
        return;
    }

    const data = currentPersonData;
    const hoy = new Date();
    const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    const fechaExp = `${hoy.getDate().toString().padStart(2, '0')}-${meses[hoy.getMonth()]}-${hoy.getFullYear().toString().substring(2)}`;

    if (typeof logAction !== 'undefined' && window.ACTION_TYPES) {
        logAction(ACTION_TYPES.PRINT, `Generó impresión de credencial: ${data.nombre}`);
    }

    const tempCanvas = document.createElement('canvas');
    
    // Identificador único para validación (CUIP o Nombre como backup)
    const uniqueId = data.cuip && data.cuip !== '---' ? data.cuip : (data.nombre || 'INVALID');
    const validationUrl = `https://sistemasc2tzomp-lab.github.io/credentialstzompantepec/validar.html?id=${encodeURIComponent(uniqueId)}`;
 
    // Generar el QR para la impresión (un poco más grande para mejor escaneo)
    QRCode.toCanvas(tempCanvas, validationUrl, { width: 400, margin: 1, errorCorrectionLevel: 'H' });
    const qrDataUrl = tempCanvas.toDataURL();

    const printContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Impresión Oficial - ${data.nombre}</title>
            <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@800&family=Inter:wght@700;800&display=swap" rel="stylesheet">
            <style>
                body { margin: 0; padding: 40px; font-family: 'Inter', sans-serif; background: #fff; display: flex; flex-direction: column; align-items: center; }
                .no-print-header { 
                    background: #0a192f; color: white; padding: 20px; width: 100%; max-width: 800px; 
                    text-align: center; border-radius: 12px; margin-bottom: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                .print-btn { 
                    background: #c5a059; color: #000; border: none; padding: 12px 30px; border-radius: 8px; 
                    font-weight: 800; cursor: pointer; font-family: 'Montserrat', sans-serif; margin-top: 15px;
                }
                
                /* =============================================
                   TARJETA DE IMPRESIÓN
                   324 x 504 px (escala 0.9 del preview 360x550)
                   Ratio: card-print / preview = 0.9 en X, 0.916 en Y
                   ============================================= */
                /* =============================================
                   TARJETA DE IMPRESIÓN V3 (PHASE 3)
                   324 x 504 px
                   ============================================= */
                .card-print {
                    width: 324px;
                    height: 504px;
                    border-radius: 12px;
                    position: relative;
                    overflow: hidden;
                    background-size: 100% 100%;
                    background-position: center;
                    background-repeat: no-repeat;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                    page-break-inside: avoid;
                    margin-bottom: 30px;
                    background-color: #f0f0f0;
                }
                
                .front-bg { background-image: url('assets/cred_frente.png'); }
                .back-bg { background-image: url('assets/cred_vuelta.png'); }

                /* --- Foto del oficial (impresion V3) --- 
                   Posicionada dentro del recuadro gris del template
                */
                .photo-oficial {
                    position: absolute;
                    top: 178px;
                    left: 45px;
                    width: 88px;
                    height: 110px;
                    border-radius: 4px;
                    overflow: hidden;
                    border: 1px solid rgba(0,0,0,0.1);
                    z-index: 5;
                }

                .photo-oficial img { width: 100%; height: 100%; object-fit: cover; }

                /* --- Contenedor de Datos (Derecha de la foto) --- */
                .data-column {
                    position: absolute;
                    top: 180px;
                    left: 145px;
                    width: 155px;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    z-index: 10;
                }

                .field-group {
                    display: flex;
                    flex-direction: column;
                    background: transparent;
                }

                .field-label {
                    font-family: 'Montserrat', sans-serif;
                    font-size: 6pt;
                    font-weight: 800;
                    color: #1e3a6e;
                    text-transform: uppercase;
                    margin: 0;
                    line-height: 1;
                }

                .field-value {
                    font-family: 'Inter', sans-serif;
                    font-size: 8pt;
                    font-weight: 700;
                    color: #000;
                    text-transform: uppercase;
                    margin: 0 0 2px 0;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                /* --- Firma y Huella --- */
                .firma-oficial {
                    position: absolute;
                    bottom: 85px;
                    left: 44px;
                    width: 125px;
                    height: 48px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 15;
                }
                .firma-oficial img { 
                    max-width: 100%; 
                    max-height: 100%; 
                    mix-blend-mode: multiply; /* Para quitar fondo blanco si existe */
                }

                .huella-oficial {
                    position: absolute;
                    bottom: 74px;
                    right: 44px;
                    width: 100px;
                    height: 85px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 15;
                }

                /* --- QR trasera --- */
                .qr-back-print {
                    position: absolute;
                    bottom: 15px;
                    right: 25px;
                    width: 60px;
                    height: 60px;
                    background: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 4px;
                    padding: 2px;
                }
                .qr-back-print img, .qr-back-print canvas { width: 100% !important; height: 100% !important; }

                @media print {
                    @page { margin: 0; }
                    body { padding: 0.5cm; }
                    .no-print-header { display: none; }
                    .card-print { margin-bottom: 0.5cm; box-shadow: none; border: none; }
                }
            </style>
        </head>
        <body>
            <div class="no-print-header">
                <div style="font-family: 'Montserrat', sans-serif; font-size: 1.2rem; font-weight: 800; letter-spacing: 1px;">PREPARACIÓN DE CREDENCIAL OFICIAL V3</div>
                <p style="font-size: 0.9rem; opacity: 0.8; margin: 8px 0;">Nueva Plantilla Dynamica Phase 3 - Tzompantepec</p>
                <button class="print-btn" onclick="window.print()"><i class="fas fa-print"></i> MANDAR A IMPRESORA</button>
            </div>

            <div class="card-print front-bg">
                <div class="photo-oficial">
                    <img src="${toDirectDriveUrl(data.foto) || 'assets/FOTOGRAFIAS PERSONAL/' + (data.cuip || 'NONE').trim() + '.png'}" 
                         onerror="this.onerror=null;this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(data.nombre)}&background=0a192f&color=fff&size=200'">
                </div>
                
                <div class="data-column">
                    <div class="field-group">
                        <span class="field-label">Nombre</span>
                        <span class="field-value">${data.nombre}</span>
                    </div>
                    <div class="field-group">
                        <span class="field-label">Cargo</span>
                        <span class="field-value">${data.cargo}</span>
                    </div>
                    <div class="field-group">
                        <span class="field-label">CUIP</span>
                        <span class="field-value">${data.cuip || '---'}</span>
                    </div>
                    <div class="field-group">
                        <span class="field-label">CURP</span>
                        <span class="field-value">${data.curp || '---'}</span>
                    </div>
                    <div class="field-group">
                        <span class="field-label">Vigencia</span>
                        <span class="field-value">${data.vigencia || 'OFICIAL'}</span>
                    </div>
                </div>

                <!-- Zona de Firma -->
                <div class="firma-oficial">
                    ${data.firma ? `<img src="${data.firma}">` : ''}
                </div>

                <!-- Reservado para Huella (Fisica o Digital) -->
                <div class="huella-oficial"></div>
            </div>

            <div class="card-print back-bg">
                <div class="qr-back-print">
                    <img src="${qrDataUrl}">
                </div>
            </div>

            <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/js/all.min.js"></script>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
}

async function downloadCredential() {
    if (!currentPersonData) {
        alert('Selecciona un empleado primero del Repositorio');
        return;
    }

    showNotification('Generando archivos de credencial...', 'info');

    try {
        const front = document.getElementById('tzompFront');
        const back = document.getElementById('tzompBack');

        if (!front || !back) {
            alert('Error: No se encontró el contenedor de la credencial');
            return;
        }

        // Descargar Frente
        const canvasFront = await html2canvas(front, { scale: 3, useCORS: true, backgroundColor: null });
        const linkFront = document.createElement('a');
        linkFront.download = `CREDENTIAL_FRONT_${currentPersonData.cuip}.png`;
        linkFront.href = canvasFront.toDataURL('image/png');
        linkFront.click();

        // Descargar Reverso
        const canvasBack = await html2canvas(back, { scale: 3, useCORS: true, backgroundColor: null });
        const linkBack = document.createElement('a');
        linkBack.download = `CREDENTIAL_BACK_${currentPersonData.cuip}.png`;
        linkBack.href = canvasBack.toDataURL('image/png');
        linkBack.click();

        showNotification('Credenciales descargadas correctamente', 'success');
        if (typeof logAction !== 'undefined') logAction(ACTION_TYPES.DOWNLOAD, `Descargó credencial de ${currentPersonData.nombre}`);
    } catch (e) {
        console.error(e);
        showNotification('Error al generar la descarga', 'error');
    }
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
        updateEnhancedCredential(currentPersonData);
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