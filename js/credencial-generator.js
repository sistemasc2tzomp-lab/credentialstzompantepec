// =====================================================================
// CREDENCIAL-GENERATOR.JS - Sistema SIBIM C2 Tzompantepec
// Versión corregida: foto, firma, QR funcional en Preview/Print/Download
// =====================================================================

// Variables globales
let currentPersonData = null;

/** Convierte URL de Google Drive a thumbnail directo (sin CORS) */
function toDirectDriveUrl(url) {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    const idMatch = url.match(/\/d\/([-\w]+)/) || url.match(/[?&]id=([-\w]+)/) || url.match(/\/uc\?.*id=([-\w]+)/);
    if (idMatch && idMatch[1]) {
        return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w400`;
    }
    return url;
}

/** Obtiene la ruta/URL correcta de la foto de un elemento */
function resolvePhotoSrc(foto, cuip, nombre) {
    let src = foto;
    if (src && src.includes('drive.google.com') && !src.startsWith('data:')) {
        src = toDirectDriveUrl(src);
    }
    if (!src || src === '' || src === 'foto' || src === '---') {
        const cuipClean = (cuip || '').trim();
        if (cuipClean) {
            src = `assets/FOTOGRAFIAS PERSONAL/${cuipClean}.png`;
        }
    }
    if (!src) {
        src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre || 'SN')}&background=0a192f&color=fff&size=200&bold=true`;
    }
    return src;
}

/** Genera la URL de validación para el QR */
function buildValidationUrl(cuip, nombre) {
    const uniqueId = (cuip && cuip !== '---') ? cuip : (nombre || 'INVALID');
    const currentPath = window.location.origin + window.location.pathname
        .replace('dashboard.html', '')
        .replace('index.html', '');
    const base = currentPath.endsWith('/') ? currentPath + 'validar.html' : currentPath + '/validar.html';
    return `${base}?id=${encodeURIComponent(uniqueId)}`;
}

/** Genera un QR como dataURL (Promise). Usa librería qrcode o API externa. */
async function generateQRDataUrl(url, size = 300) {
    return new Promise((resolve) => {
        if (typeof QRCode !== 'undefined' && typeof QRCode.toCanvas === 'function') {
            const canvas = document.createElement('canvas');
            QRCode.toCanvas(canvas, url, {
                width: size,
                margin: 1,
                errorCorrectionLevel: 'H',
                color: { dark: '#000000', light: '#ffffff' }
            }, (err) => {
                if (err) {
                    resolve(`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&ecc=H`);
                } else {
                    resolve(canvas.toDataURL('image/png'));
                }
            });
        } else {
            resolve(`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&ecc=H`);
        }
    });
}

// ─────────────────────────────────────────────────
//  FUNCIÓN PRINCIPAL: Seleccionar persona para credencial
// ─────────────────────────────────────────────────
function selectForCredential(nombre, cargo, cuip, curp, telefono = '', email = '', vigencia = '2025-12-31', foto = '', firma = '') {
    currentPersonData = { nombre, cargo, cuip, curp, telefono, email, vigencia, foto, firma };

    if (typeof logAction !== 'undefined' && window.ACTION_TYPES) {
        logAction(ACTION_TYPES.GENERATE, `Generó credencial para ${nombre}`);
    }

    // Navegar a sección de credenciales
    const credencialesLink = document.querySelector('[data-section="credenciales"]');
    if (credencialesLink) credencialesLink.click();

    // Actualizar previsualización en dashboard
    setTimeout(() => updateEnhancedCredential(currentPersonData), 500);
}

// ─────────────────────────────────────────────────
//  ACTUALIZAR VISTA DE CREDENCIAL EN DASHBOARD
// ─────────────────────────────────────────────────
async function updateEnhancedCredential(data) {
    if (!data) return;

    const hoy = new Date();
    const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    const fechaExp = `${hoy.getDate().toString().padStart(2,'0')}-${meses[hoy.getMonth()]}-${hoy.getFullYear().toString().substring(2)}`;

    // Actualizar campos texto
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

    // Foto
    const photoArea = document.getElementById('previewPhoto');
    if (photoArea) {
        const photoSrc = resolvePhotoSrc(data.foto, data.cuip, data.nombre);
        photoArea.innerHTML = `
            <img src="${photoSrc}"
                 onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(data.nombre)}&background=0a192f&color=fff&size=200&bold=true'"
                 style="width:100%; height:100%; object-fit:cover; object-position:center top;">
        `;
    }

    // Firma
    const firmaPreview = document.getElementById('previewSignature');
    if (firmaPreview) {
        firmaPreview.innerHTML = data.firma
            ? `<img src="${data.firma}" style="max-width:100%; max-height:100%; object-fit:contain; mix-blend-mode:multiply; filter:contrast(1.2);">`
            : '';
    }

    // QR: generar dataURL para que aparezca en dashboard y en html2canvas
    const validationUrl = buildValidationUrl(data.cuip, data.nombre);
    const qrDataUrl = await generateQRDataUrl(validationUrl, 300);

    const qrContainers = [
        document.getElementById('previewQR'),
        document.getElementById('backQR')
    ];
    qrContainers.forEach(container => {
        if (!container) return;
        container.innerHTML = '';
        const img = document.createElement('img');
        img.src = qrDataUrl;
        img.style.cssText = 'width:100%; height:100%; display:block;';
        img.alt = 'QR Credencial';
        container.appendChild(img);
    });
}

// ─────────────────────────────────────────────────
//  IMPRIMIR CREDENCIAL
// ─────────────────────────────────────────────────
async function printEnhancedCredential() {
    if (!currentPersonData) {
        alert('Selecciona un oficial primero desde el Repositorio de Personal.');
        return;
    }

    const data = currentPersonData;
    const hoy = new Date();
    const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    const fechaExp = `${hoy.getDate().toString().padStart(2,'0')}-${meses[hoy.getMonth()]}-${hoy.getFullYear().toString().substring(2)}`;

    if (typeof logAction !== 'undefined' && window.ACTION_TYPES) {
        logAction(ACTION_TYPES.PRINT, `Generó impresión de credencial: ${data.nombre}`);
    }

    // Generar QR como dataURL
    const validationUrl = buildValidationUrl(data.cuip, data.nombre);
    const qrDataUrl = await generateQRDataUrl(validationUrl, 400);

    // Resolver foto
    const photoSrc = resolvePhotoSrc(data.foto, data.cuip, data.nombre);

    // HTML de impresión
    const printContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Impresión Oficial - ${data.nombre}</title>
            <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@800&family=Inter:wght@700;800;900&display=swap" rel="stylesheet">
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
                .cards-row { display: flex; gap: 40px; justify-content: center; align-items: flex-start; }
                .card-label { text-align:center; font-weight:900; font-size:0.8rem; letter-spacing:2px; color:#0a192f; margin-bottom:10px; text-transform:uppercase; }
                .card-print {
                    width: 324px; height: 504px; border-radius: 12px; position: relative; overflow: hidden;
                    background-size: 100% 100%; background-position: center; background-repeat: no-repeat;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.2); page-break-inside: avoid; margin-bottom: 30px;
                    background-color: #f0f0f0;
                }
                .front-bg { background-image: url('assets/credencial_front_v3.jpg'); }
                .back-bg  { background-image: url('assets/credencial_back_v3.jpg'); }

                /* Foto */
                .photo-oficial {
                    position: absolute; top: 178px; left: 20px;
                    width: 112px; height: 142px; border-radius: 4px; overflow: hidden; z-index: 5;
                }
                .photo-oficial img { width:100%; height:100%; object-fit:cover; object-position:center top; }

                /* Datos */
                .data-column {
                    position: absolute; top: 170px; left: 148px; width: 162px;
                    display: flex; flex-direction: column; gap: 3px; z-index: 40;
                }
                .field-group { display: flex; flex-direction: column; background: transparent; }
                .field-label {
                    font-family: 'Montserrat', sans-serif; font-size: 6.5pt; font-weight: 900;
                    color: #000; text-transform: uppercase; margin: 0; line-height: 1; opacity: 0.9;
                }
                .field-value {
                    font-family: 'Inter', sans-serif; font-size: 9pt; font-weight: 900;
                    color: #000; text-transform: uppercase; margin: 0 0 2px 0;
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }

                /* Firma */
                .firma-oficial {
                    position: absolute; bottom: 80px; left: 16px;
                    width: 148px; height: 62px;
                    display: flex; align-items: center; justify-content: center;
                    z-index: 15; overflow: hidden;
                }
                .firma-oficial img {
                    max-width:100%; max-height:100%; object-fit:contain;
                    mix-blend-mode: multiply; filter: contrast(1.15);
                }

                /* QR Frontal */
                .qr-front-print {
                    position: absolute; bottom: 10px; right: 12px;
                    width: 62px; height: 62px; background: white; padding: 3px;
                    border-radius: 5px; display: flex; align-items: center; justify-content: center;
                    z-index: 100; box-shadow: 0 1px 4px rgba(0,0,0,0.2);
                }
                .qr-front-print img { width:100%; height:100%; display:block; }

                /* QR Trasera */
                .qr-back-print {
                    position: absolute; bottom: 15px; right: 25px;
                    width: 60px; height: 60px; background: white; padding: 2px;
                    border-radius: 4px; display: flex; align-items: center; justify-content: center;
                }
                .qr-back-print img { width:100%; height:100%; display:block; }

                @media print {
                    @page { margin: 0; }
                    body { padding: 0.5cm; }
                    .no-print-header { display: none; }
                    .card-print { margin-bottom: 0.5cm; box-shadow: none; }
                }
            </style>
        </head>
        <body>
            <div class="no-print-header">
                <div style="font-family:'Montserrat',sans-serif; font-size:1.2rem; font-weight:800; letter-spacing:1px;">CREDENCIAL OFICIAL C2 TZOMPANTEPEC</div>
                <p style="font-size:0.9rem; opacity:0.8; margin:8px 0;">Verifique los datos antes de imprimir</p>
                <button class="print-btn" onclick="window.print()">🖨 MANDAR A IMPRESORA</button>
            </div>

            <div class="cards-row">
                <div>
                    <div class="card-label">Vista Frontal</div>
                    <div class="card-print front-bg">
                        <div class="photo-oficial">
                            <img src="${photoSrc}"
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
                                <span class="field-label">Vigencia SIBIM</span>
                                <span class="field-value">${data.vigencia || '1 AÑO'}</span>
                            </div>
                            <div class="field-group">
                                <span class="field-label">Expedición</span>
                                <span class="field-value">${fechaExp}</span>
                            </div>
                        </div>

                        <div class="firma-oficial">
                            ${data.firma ? `<img src="${data.firma}">` : ''}
                        </div>

                        <div class="qr-front-print">
                            <img src="${qrDataUrl}" alt="QR Credencial">
                        </div>
                    </div>
                </div>

                <div>
                    <div class="card-label">Vista Trasera</div>
                    <div class="card-print back-bg">
                        <div class="qr-back-print">
                            <img src="${qrDataUrl}" alt="QR Credencial">
                        </div>
                    </div>
                </div>
            </div>

            <script>
                // Asegurar que las imágenes carguen antes de imprimir
                window.addEventListener('load', function() {
                    document.querySelectorAll('img').forEach(img => {
                        img.crossOrigin = 'anonymous';
                    });
                });
            <\/script>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
}

// ─────────────────────────────────────────────────
//  DESCARGAR CREDENCIAL (como imagen PNG)
// ─────────────────────────────────────────────────
async function downloadCredential() {
    if (!currentPersonData) {
        alert('Selecciona un empleado primero del Repositorio');
        return;
    }

    showNotification('Preparando imágenes de credencial...', 'info');

    const data = currentPersonData;
    const hoy = new Date();
    const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    const fechaExp = `${hoy.getDate().toString().padStart(2,'0')}-${meses[hoy.getMonth()]}-${hoy.getFullYear().toString().substring(2)}`;

    try {
        // Generar QR como dataURL
        const validationUrl = buildValidationUrl(data.cuip, data.nombre);
        const qrDataUrl = await generateQRDataUrl(validationUrl, 400);

        // Resolver foto
        const photoSrc = resolvePhotoSrc(data.foto, data.cuip, data.nombre);

        // Generar en una ventana temporal y usar html2canvas ahí
        const dlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@800&family=Inter:wght@700;800;900&display=swap" rel="stylesheet">
                <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>
                <style>
                    * { margin:0; padding:0; box-sizing:border-box; }
                    body { background:#fff; display:flex; gap:20px; padding:10px; }
                    .card {
                        width: 324px; height: 504px; position: relative; overflow: hidden;
                        background-size: 100% 100%; background-position: center; flex-shrink:0;
                    }
                    .front-bg { background-image: url('${window.location.origin}${window.location.pathname.replace('dashboard.html','').replace('index.html','')}assets/credencial_front_v3.jpg'); }
                    .back-bg  { background-image: url('${window.location.origin}${window.location.pathname.replace('dashboard.html','').replace('index.html','')}assets/credencial_back_v3.jpg'); }
                    .photo-box {
                        position:absolute; top:178px; left:20px;
                        width:112px; height:142px; border-radius:4px; overflow:hidden;
                    }
                    .photo-box img { width:100%; height:100%; object-fit:cover; object-position:center top; }
                    .data-col {
                        position:absolute; top:170px; left:148px; width:162px;
                        display:flex; flex-direction:column; gap:3px; z-index:40;
                    }
                    .f-label { font-family:'Montserrat',sans-serif; font-size:6.5pt; font-weight:900; color:#000; text-transform:uppercase; margin:0; line-height:1; }
                    .f-value { font-family:'Inter',sans-serif; font-size:9pt; font-weight:900; color:#000; text-transform:uppercase; margin:0 0 2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
                    .firma-box { position:absolute; bottom:80px; left:16px; width:148px; height:62px; display:flex; align-items:center; justify-content:center; overflow:hidden; }
                    .firma-box img { max-width:100%; max-height:100%; object-fit:contain; mix-blend-mode:multiply; }
                    .qr-front { position:absolute; bottom:10px; right:12px; width:62px; height:62px; background:white; padding:3px; border-radius:5px; display:flex; align-items:center; justify-content:center; }
                    .qr-front img { width:100%; height:100%; }
                    .qr-back  { position:absolute; bottom:15px; right:25px; width:60px; height:60px; background:white; padding:2px; border-radius:4px; display:flex; align-items:center; justify-content:center; }
                    .qr-back img { width:100%; height:100%; }
                </style>
            </head>
            <body>
                <div class="card front-bg" id="dlFront">
                    <div class="photo-box">
                        <img id="dlPhoto" src="${photoSrc}" crossorigin="anonymous"
                             onerror="this.onerror=null;this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(data.nombre)}&background=0a192f&color=fff&size=200'">
                    </div>
                    <div class="data-col">
                        <div><span class="f-label">Nombre</span><span class="f-value">${data.nombre}</span></div>
                        <div><span class="f-label">Cargo</span><span class="f-value">${data.cargo}</span></div>
                        <div><span class="f-label">CUIP</span><span class="f-value">${data.cuip || '---'}</span></div>
                        <div><span class="f-label">Vigencia SIBIM</span><span class="f-value">${data.vigencia || '1 AÑO'}</span></div>
                        <div><span class="f-label">Expedición</span><span class="f-value">${fechaExp}</span></div>
                    </div>
                    <div class="firma-box">
                        ${data.firma ? `<img src="${data.firma}" crossorigin="anonymous">` : ''}
                    </div>
                    <div class="qr-front"><img src="${qrDataUrl}" crossorigin="anonymous"></div>
                </div>
                <div class="card back-bg" id="dlBack">
                    <div class="qr-back"><img src="${qrDataUrl}" crossorigin="anonymous"></div>
                </div>
                <script>
                    window.onload = async function() {
                        await new Promise(r => setTimeout(r, 1200));
                        try {
                            const front = document.getElementById('dlFront');
                            const back  = document.getElementById('dlBack');

                            const cf = await html2canvas(front, { scale:3, useCORS:true, backgroundColor:null });
                            const lf = document.createElement('a');
                            lf.download = 'CREDENTIAL_FRONT_${data.cuip || 'TZ'}.png';
                            lf.href = cf.toDataURL('image/png');
                            lf.click();

                            await new Promise(r => setTimeout(r, 800));

                            const cb = await html2canvas(back, { scale:3, useCORS:true, backgroundColor:null });
                            const lb = document.createElement('a');
                            lb.download = 'CREDENTIAL_BACK_${data.cuip || 'TZ'}.png';
                            lb.href = cb.toDataURL('image/png');
                            lb.click();

                            setTimeout(() => window.close(), 2000);
                        } catch(e) {
                            console.error(e);
                            alert('Error al generar: ' + e.message);
                        }
                    };
                <\/script>
            </body>
            </html>
        `;

        const dlWin = window.open('', '_blank', 'width=720,height=540');
        dlWin.document.write(dlContent);
        dlWin.document.close();

        showNotification('Generando descarga... la ventana se cerrará automáticamente.', 'success');
        if (typeof logAction !== 'undefined') logAction(ACTION_TYPES.DOWNLOAD, `Descargó credencial de ${data.nombre}`);

    } catch (e) {
        console.error(e);
        showNotification('Error al generar la descarga: ' + e.message, 'error');
    }
}

// ─────────────────────────────────────────────────
//  PREVISUALIZAR (ventana nueva con datos completos)
// ─────────────────────────────────────────────────
async function previewFullCredential() {
    if (!currentPersonData) {
        showNotification('Selecciona un empleado primero', 'warning');
        return;
    }

    showNotification('Generando previsualización táctica...', 'info');

    const data = currentPersonData;
    const hoy = new Date();
    const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    const fechaExp = `${hoy.getDate().toString().padStart(2,'0')}-${meses[hoy.getMonth()]}-${hoy.getFullYear().toString().substring(2)}`;

    // Generar QR y resolver foto antes de abrir la ventana
    const validationUrl = buildValidationUrl(data.cuip, data.nombre);
    const qrDataUrl = await generateQRDataUrl(validationUrl, 400);
    const photoSrc  = resolvePhotoSrc(data.foto, data.cuip, data.nombre);

    const previewWindow = window.open('', '_blank');
    previewWindow.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Previsualización - ${data.nombre}</title>
            <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@800&family=Inter:wght@700;800;900&display=swap" rel="stylesheet">
            <style>
                *, *::before, *::after { box-sizing: border-box; }
                body {
                    margin: 0; padding: 50px;
                    background: #0a192f;
                    display: flex; flex-direction: column; align-items: center;
                    font-family: 'Inter', sans-serif; color: white;
                }
                .preview-header { text-align:center; margin-bottom:40px; }
                .preview-header h1 { color:#c5a059; margin:0; font-size:1.5rem; letter-spacing:1px; }
                .preview-header p  { opacity:0.7; margin:8px 0; font-size:0.9rem; }
                .preview-container { display:flex; gap:50px; flex-wrap:wrap; justify-content:center; }
                .card-wrapper { display:flex; flex-direction:column; align-items:center; gap:15px; }
                .card-label { font-weight:900; letter-spacing:2px; color:#c5a059; font-size:0.8rem; text-transform:uppercase; }
                .card-print {
                    width: 324px; height: 504px; border-radius: 14px; position: relative; overflow: hidden;
                    background-size: 100% 100%; background-position: center; background-repeat: no-repeat;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                }
                .front-bg { background-image: url('assets/credencial_front_v3.jpg'); }
                .back-bg  { background-image: url('assets/credencial_back_v3.jpg'); }

                .photo-oficial {
                    position:absolute; top:178px; left:20px;
                    width:112px; height:142px; border-radius:4px; overflow:hidden; z-index:5;
                }
                .photo-oficial img { width:100%; height:100%; object-fit:cover; object-position:center top; }

                .data-column {
                    position:absolute; top:170px; left:148px; width:162px;
                    display:flex; flex-direction:column; gap:3px; z-index:40;
                }
                .field-group { display:flex; flex-direction:column; }
                .field-label {
                    font-family:'Montserrat',sans-serif; font-size:6.5pt; font-weight:900;
                    color:#000; text-transform:uppercase; margin:0; line-height:1; opacity:0.9;
                }
                .field-value {
                    font-family:'Inter',sans-serif; font-size:9pt; font-weight:900;
                    color:#000; text-transform:uppercase; margin:0 0 2px;
                    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
                }

                .firma-oficial {
                    position:absolute; bottom:80px; left:16px;
                    width:148px; height:62px; display:flex; align-items:center; justify-content:center;
                    overflow:hidden; z-index:15;
                }
                .firma-oficial img {
                    max-width:100%; max-height:100%; object-fit:contain;
                    mix-blend-mode:multiply; filter:contrast(1.15);
                }

                .qr-front-pos {
                    position:absolute; bottom:10px; right:12px;
                    width:62px; height:62px; background:white; padding:3px;
                    border-radius:5px; display:flex; align-items:center; justify-content:center;
                    z-index:100; box-shadow:0 1px 4px rgba(0,0,0,0.2);
                }
                .qr-front-pos img { width:100%; height:100%; display:block; }

                .qr-back-pos {
                    position:absolute; bottom:15px; right:25px;
                    width:60px; height:60px; background:white; padding:2px;
                    border-radius:4px; display:flex; align-items:center; justify-content:center;
                    z-index:100;
                }
                .qr-back-pos img { width:100%; height:100%; display:block; }

                .btn-print-floating {
                    position:fixed; bottom:30px; right:30px;
                    background:#c5a059; color:#0a192f; border:none;
                    padding:15px 30px; border-radius:50px; font-weight:900;
                    cursor:pointer; box-shadow:0 10px 30px rgba(0,0,0,0.3);
                    font-family:'Montserrat',sans-serif; font-size:0.9rem;
                    transition: all 0.3s ease; letter-spacing:1px;
                }
                .btn-print-floating:hover { transform:scale(1.05); background:#b08945; }

                @media print {
                    .btn-print-floating, .preview-header { display:none; }
                    body { background:white; padding:0; }
                }
            </style>
        </head>
        <body>
            <div class="preview-header">
                <h1>DOCUMENTO DE PREVISUALIZACIÓN TÁCTICA</h1>
                <p>Verifique los datos antes de proceder con el timbrado e impresión física.</p>
            </div>

            <div class="preview-container">
                <div class="card-wrapper">
                    <span class="card-label">Vista Frontal</span>
                    <div class="card-print front-bg">
                        <div class="photo-oficial">
                            <img src="${photoSrc}"
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
                                <span class="field-label">Vigencia SIBIM</span>
                                <span class="field-value">${data.vigencia || '1 AÑO'}</span>
                            </div>
                            <div class="field-group">
                                <span class="field-label">Expedición</span>
                                <span class="field-value">${fechaExp}</span>
                            </div>
                        </div>
                        <div class="firma-oficial">
                            ${data.firma ? `<img src="${data.firma}">` : ''}
                        </div>
                        <div class="qr-front-pos">
                            <img src="${qrDataUrl}" alt="QR Credencial">
                        </div>
                    </div>
                </div>

                <div class="card-wrapper">
                    <span class="card-label">Vista Trasera</span>
                    <div class="card-print back-bg">
                        <div class="qr-back-pos">
                            <img src="${qrDataUrl}" alt="QR Credencial">
                        </div>
                    </div>
                </div>
            </div>

            <button class="btn-print-floating" onclick="window.print()">🖨 PROCESAR IMPRESIÓN</button>
        </body>
        </html>
    `);
    previewWindow.document.close();
}

// ─────────────────────────────────────────────────
//  EXPORTAR AL ÁMBITO GLOBAL
// ─────────────────────────────────────────────────
window.selectForCredential   = selectForCredential;
window.printEnhancedCredential = printEnhancedCredential;
window.downloadCredential    = downloadCredential;
window.previewFullCredential = previewFullCredential;
window.generateCredential    = function () { printEnhancedCredential(); };

// Compatibilidad con funciones anteriores
window.updateCredentialPreview = function (nombre, cargo, cuip, curp) {
    selectForCredential(nombre, cargo, cuip, curp);
};
window.generateQRCode = function () {
    if (currentPersonData) updateEnhancedCredential(currentPersonData);
};

// Función placeholder para agregar personal
function showAddPersonForm() {
    alert('Funcionalidad para agregar personal (requiere permisos de escritura en Google Sheets)');
    if (typeof logAction !== 'undefined' && window.ACTION_TYPES) {
        logAction(ACTION_TYPES.CREATE, 'Intentó agregar personal');
    }
}
window.showAddPersonForm = showAddPersonForm;

document.addEventListener('DOMContentLoaded', function () {
    console.log('✅ credencial-generator.js cargado - Versión corregida firma+QR+foto');
});