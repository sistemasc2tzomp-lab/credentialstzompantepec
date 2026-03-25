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

function selectForCredential(nombre, cargo, cuip, curp, telefono = '', email = '', vigencia = '2025-12-31', foto = '', firma = '') {
    currentPersonData = {
        nombre,
        cargo,
        cuip,
        curp,
        telefono,
        email,
        vigencia,
        foto,
        firma
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
                 style="width: 100%; height: 100%; object-fit: cover; object-position: center top;">
        `;
    }

    // Actualizar firma en la vista previa
    const firmaPreview = document.getElementById('previewSignature');
    if (firmaPreview) {
        if (data.firma) {
            firmaPreview.innerHTML = `<img src="${data.firma}" style="max-width:100%; max-height:100%; object-fit:contain; mix-blend-mode:multiply;">`;
        } else {
            firmaPreview.innerHTML = '';
        }
    }

    // Generar QR Real con datos de validación oficial
    const qrContainers = [document.getElementById('previewQR'), document.getElementById('backQR')];
    
    // Identificador único para validación (CUIP o Nombre como backup)
    const uniqueId = data.cuip && data.cuip !== '---' ? data.cuip : (data.nombre || 'INVALID');
    
    // Detectar base URL automáticamente (soporta localhost y github pages)
    const currentPath = window.location.origin + window.location.pathname.replace('dashboard.html', '').replace('index.html', '');
    const baseUrl = currentPath.endsWith('/') ? currentPath + 'validar.html' : currentPath + '/validar.html';
    const validationUrl = `${baseUrl}?id=${encodeURIComponent(uniqueId)}`;

    qrContainers.forEach(container => {
        if (container) {
            container.innerHTML = '';
            const qrCanvas = document.createElement('canvas');
            // QR con tamaño óptimo y margen para lectura rápida
            const size = container.id === 'backQR' ? 75 : 80; 

            if (typeof QRCode !== 'undefined' && typeof QRCode.toCanvas === 'function') {
                QRCode.toCanvas(qrCanvas, validationUrl, {
                    width: size,
                    margin: 1, /* Menor margen para que luzca mejor */
                    errorCorrectionLevel: 'H', /* Mayor nivel de error */
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
    const currentPath = window.location.origin + window.location.pathname.replace('dashboard.html', '').replace('index.html', '');
    const baseUrl = currentPath.endsWith('/') ? currentPath + 'validar.html' : currentPath + '/validar.html';
    const validationUrl = `${baseUrl}?id=${encodeURIComponent(uniqueId)}`;
 
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
                .front-bg { background-image: url('assets/credential_front_bg.jpg'); }
                .back-bg { background-image: url('assets/credential_back_bg.jpg'); }

                /* --- Foto del oficial (impresion V3) --- 
                   Posicionada dentro del recuadro gris del template
                */
                .photo-oficial {
                    position: absolute;
                    top: 160px; /* Shifting up */
                    left: 65px; /* Shifting right */
                    width: 90px;
                    height: 112px;
                    border-radius: 4px;
                    overflow: hidden;
                    border: 1px solid rgba(0,0,0,0.1);
                    z-index: 5;
                }

                .photo-oficial img { width: 100%; height: 100%; object-fit: cover; object-position: center top; }

                /* --- Contenedor de Datos (Derecha de la foto) --- */
                .data-column {
                    position: absolute;
                    top: 175px; 
                    left: 160px; /* Shifted right */
                    width: 155px;
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
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
                    bottom: 82px;
                    left: 48px;
                    width: 125px;
                    height: 52px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 15;
                    border-bottom: 2px solid rgba(0,0,0,0.5); /* Más visible */
                }
                .firma-oficial img { 
                    max-width: 95%; 
                    max-height: 95%; 
                    mix-blend-mode: multiply;
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

                <!-- QR Frontal -->
                <div style="position:absolute; bottom:15px; left:48px; width:55px; height:55px; background:white; padding:3px; border-radius:4px; display:flex; align-items:center; justify-content:center; z-index:100;">
                    <img src="${qrDataUrl}" style="width:100%; height:100%;">
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

async function previewFullCredential() {
    if (!currentPersonData) {
        showNotification('Selecciona un empleado primero', 'warning');
        return;
    }

    showNotification('Generando previsualización en nueva pestaña...', 'info');
    
    // Clonar los elementos actuales
    const front = document.getElementById('tzompFront').outerHTML;
    const back = document.getElementById('tzompBack').outerHTML;
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(s => s.outerHTML)
        .join('\n');

    const previewWindow = window.open('', '_blank');
    previewWindow.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Previsualización SIBIM - ${currentPersonData.nombre}</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Montserrat:wght@800&display=swap" rel="stylesheet">
            ${styles}
            <style>
                body { 
                    background: #0a192f; 
                    display: flex; 
                    flex-direction: column; 
                    align-items: center; 
                    padding: 50px; 
                    margin: 0;
                    color: white;
                    font-family: 'Inter', sans-serif;
                }
                .preview-header {
                    margin-bottom: 40px;
                    text-align: center;
                }
                .preview-header h1 { color: #c5a059; margin: 0; font-size: 1.5rem; }
                .preview-container { 
                    display: flex; 
                    gap: 40px; 
                    flex-wrap: wrap;
                    justify-content: center;
                }
                .card-wrapper {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 15px;
                }
                .card-label { 
                    font-weight: 800; 
                    letter-spacing: 2px;
                    color: #c5a059;
                    font-size: 0.8rem;
                }
                @media print {
                    .no-print { display: none; }
                    body { background: white; padding: 0; }
                }
                .btn-print-floating {
                    position: fixed;
                    bottom: 30px;
                    right: 30px;
                    background: #c5a059;
                    color: #0a192f;
                    border: none;
                    padding: 15px 30px;
                    border-radius: 50px;
                    font-weight: 900;
                    cursor: pointer;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    transition: all 0.3s ease;
                }
                .btn-print-floating:hover { transform: scale(1.05); background: #b08945; }
            </style>
        </head>
        <body>
            <div class="preview-header no-print">
                <h1>DOCUMENTO DE PREVISUALIZACIÓN TÁCTICA</h1>
                <p>Verifique los datos antes de proceder con el timbrado e impresión física.</p>
            </div>
            
            <div class="preview-container">
                <div class="card-wrapper">
                    <span class="card-label">VISTA FRONTAL</span>
                    ${front}
                </div>
                <div class="card-wrapper">
                    <span class="card-label">VISTA TRASERA</span>
                    ${back}
                </div>
            </div>

            <button class="btn-print-floating no-print" onclick="window.print()">
                <i class="fas fa-print"></i> PROCESAR IMPRESIÓN
            </button>
        </body>
        </html>
    `);
    previewWindow.document.close();
}

// Hacer funciones globales
window.selectForCredential = selectForCredential;
window.printEnhancedCredential = printEnhancedCredential;
window.downloadCredential = downloadCredential;
window.previewFullCredential = previewFullCredential;
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