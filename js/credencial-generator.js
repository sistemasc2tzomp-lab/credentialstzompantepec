// =====================================================================
// CREDENCIAL-GENERATOR.JS v3.1 - Sistema SIBIM C2 Tzompantepec
// CORRECCIÓN DEFINITIVA: rutas absolutas, QR via img-tag, firma base64
// =====================================================================

let currentPersonData = null;

// ── Utilidades ────────────────────────────────────────────────────────

/** URL base del sitio (funciona en localhost y GitHub Pages) */
function getSiteBase() {
    return window.location.origin +
           window.location.pathname
               .replace(/dashboard\.html.*$/, '')
               .replace(/index\.html.*$/, '');
}

/** Convierte URL de Drive a thumbnail directo */
function toDirectDriveUrl(url) {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    const m = url.match(/\/d\/([-\w]+)/) || url.match(/[?&]id=([-\w]+)/);
    if (m && m[1]) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w400`;
    return url;
}

/**
 * Resuelve la URL de la foto.
 * IMPORTANTE: devuelve siempre una URL absoluta para que funcione en ventanas popup.
 */
function resolvePhotoSrc(foto, cuip, nombre) {
    let src = foto;

    // Si es Drive → thumbnail
    if (src && src.includes('drive.google.com') && !src.startsWith('data:')) {
        src = toDirectDriveUrl(src);
    }

    // Si sigue vacío/inválido → intentar archivo local con URL ABSOLUTA
    if (!src || src === '' || src === 'foto' || src === '---') {
        const cuipClean = (cuip || '').trim();
        if (cuipClean) {
            src = getSiteBase() + 'assets/FOTOGRAFIAS%20PERSONAL/' + encodeURIComponent(cuipClean) + '.png';
        }
    }

    // Último fallback → avatar de iniciales
    if (!src) {
        src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre || 'SN')}&background=0a192f&color=fff&size=200&bold=true`;
    }
    return src;
}

/** URL de validación para el QR */
function buildValidationUrl(cuip, nombre) {
    const id = (cuip && cuip !== '---' && cuip !== '') ? cuip : (nombre || 'INVALIDO');
    const base = getSiteBase();
    const validarUrl = base.endsWith('/') ? base + 'validar.html' : base + '/validar.html';
    return validarUrl + '?id=' + encodeURIComponent(id);
}

/**
 * Genera la URL de imagen de QR.
 * Usamos SIEMPRE la API externa (img tag) para garantizar compatibilidad
 * en ventanas popup donde la librería QRCode no está disponible.
 */
function getQRImageUrl(validationUrl, size) {
    const s = size || 300;
    return `https://api.qrserver.com/v1/create-qr-code/?size=${s}x${s}&data=${encodeURIComponent(validationUrl)}&ecc=H&margin=2`;
}

// ── Selección de persona ──────────────────────────────────────────────

function selectForCredential(nombre, cargo, cuip, curp, telefono, email, vigencia, foto, firma) {
    currentPersonData = {
        nombre:   nombre   || '',
        cargo:    cargo    || '',
        cuip:     cuip     || '',
        curp:     curp     || '',
        telefono: telefono || '',
        email:    email    || '',
        vigencia: vigencia || '1 AÑO',
        foto:     foto     || '',
        firma:    firma    || ''
    };

    if (typeof logAction !== 'undefined' && window.ACTION_TYPES) {
        logAction(ACTION_TYPES.GENERATE, 'Generó credencial para ' + nombre);
    }

    // Navegar a la sección de credenciales
    const link = document.querySelector('[data-section="credenciales"]');
    if (link) link.click();

    setTimeout(() => updateEnhancedCredential(currentPersonData), 600);
}

// ── Vista en Dashboard ────────────────────────────────────────────────

function updateEnhancedCredential(data) {
    if (!data) return;

    const hoy   = new Date();
    const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    const fechaExp = hoy.getDate().toString().padStart(2,'0') + '-' + meses[hoy.getMonth()] + '-' + String(hoy.getFullYear()).slice(-2);

    // Actualizar textos
    const map = {
        previewName:       data.nombre,
        previewPosition:   data.cargo,
        previewCUIP:       data.cuip  || '---',
        previewCURP:       data.curp  || '---',
        previewVigencia:   data.vigencia || '1 AÑO',
        previewExpedicion: data.fechaExpedicion || fechaExp
    };
    Object.entries(map).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    });

    // Foto
    const photoArea = document.getElementById('previewPhoto');
    if (photoArea) {
        const src = resolvePhotoSrc(data.foto, data.cuip, data.nombre);
        photoArea.innerHTML =
            '<img src="' + src + '" ' +
            'onerror="this.onerror=null;this.src=\'https://ui-avatars.com/api/?name=' + encodeURIComponent(data.nombre) + '&background=0a192f&color=fff&size=200&bold=true\'" ' +
            'style="width:100%;height:100%;object-fit:cover;object-position:center top;">';
    }

    // Firma
    const firmaBox = document.getElementById('previewSignature');
    if (firmaBox) {
        firmaBox.innerHTML = data.firma
            ? '<img src="' + data.firma + '" style="max-width:100%;max-height:100%;object-fit:contain;mix-blend-mode:multiply;filter:contrast(1.2);">'
            : '';
    }

    // QR via img tag (URL de api.qrserver.com)
    const validUrl = buildValidationUrl(data.cuip, data.nombre);
    const qrSrc    = getQRImageUrl(validUrl, 280);

    ['previewQR', 'backQR'].forEach(function(id) {
        const c = document.getElementById(id);
        if (!c) return;
        c.innerHTML = '<img src="' + qrSrc + '" style="width:100%;height:100%;display:block;" alt="QR">';
    });
}

// ── HTML compartido de la tarjeta (print + preview) ───────────────────

function buildCardHTML(data, qrSrc, photoSrc, fechaExp, baseUrl) {
    // Foto: si es ruta local relativa, hacerla absoluta
    let photo = photoSrc;
    if (photo && !photo.startsWith('http') && !photo.startsWith('data:')) {
        photo = baseUrl + photo;
    }

    const firmaHtml = data.firma
        ? '<img src="' + data.firma + '" style="max-width:100%;max-height:100%;object-fit:contain;mix-blend-mode:multiply;filter:contrast(1.15);">'
        : '';

    return `
    <div class="card-print front-bg">
        <div class="photo-oficial">
            <img src="${photo}"
                 onerror="this.onerror=null;this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(data.nombre)}&background=0a192f&color=fff&size=200'">
        </div>
        <div class="data-column">
            <div class="field-group"><span class="field-label">Nombre</span><span class="field-value">${data.nombre}</span></div>
            <div class="field-group"><span class="field-label">Cargo</span><span class="field-value">${data.cargo}</span></div>
            <div class="field-group"><span class="field-label">CUIP</span><span class="field-value">${data.cuip || '---'}</span></div>
            <div class="field-group"><span class="field-label">Vigencia SIBIM</span><span class="field-value">${data.vigencia || '1 AÑO'}</span></div>
            <div class="field-group"><span class="field-label">Expedición</span><span class="field-value">${fechaExp}</span></div>
        </div>
        <div class="firma-oficial">${firmaHtml}</div>
        <div class="qr-front-pos"><img src="${qrSrc}" alt="QR Credencial"></div>
    </div>
    <div class="card-print back-bg">
        <div class="qr-back-pos"><img src="${qrSrc}" alt="QR Credencial"></div>
    </div>`;
}

function buildCardCSS(baseUrl) {
    const frontBg = baseUrl + 'assets/credencial_front_v3.jpg';
    const backBg  = baseUrl + 'assets/credencial_back_v3.jpg';
    return `
        body { margin:0; padding:40px; font-family:'Inter',sans-serif; background:#fff; display:flex; flex-direction:column; align-items:center; }
        .cards-row { display:flex; gap:40px; justify-content:center; align-items:flex-start; flex-wrap:wrap; }
        .card-wrap { display:flex; flex-direction:column; align-items:center; gap:12px; }
        .card-label { font-weight:900; letter-spacing:2px; color:#0a192f; font-size:0.8rem; text-transform:uppercase; }
        .card-print {
            width:324px; height:504px; border-radius:12px; position:relative; overflow:hidden;
            background-size:100% 100%; background-position:center; background-repeat:no-repeat;
            box-shadow:0 5px 15px rgba(0,0,0,0.25); page-break-inside:avoid; background-color:#e0e0e0;
        }
        .front-bg { background-image: url('${frontBg}'); }
        .back-bg  { background-image: url('${backBg}'); }

        .photo-oficial {
            position:absolute; top:178px; left:20px;
            width:112px; height:144px; border-radius:4px; overflow:hidden; z-index:5;
        }
        .photo-oficial img { width:100%; height:100%; object-fit:cover; object-position:center top; }

        .data-column {
            position:absolute; top:170px; left:148px; width:163px;
            display:flex; flex-direction:column; gap:2px; z-index:40;
        }
        .field-group { display:flex; flex-direction:column; }
        .field-label {
            font-family:'Montserrat',sans-serif; font-size:6.5pt; font-weight:900;
            color:#000; text-transform:uppercase; margin:0; line-height:1.1; opacity:0.9;
        }
        .field-value {
            font-family:'Inter',sans-serif; font-size:9pt; font-weight:900;
            color:#000; text-transform:uppercase; margin:0 0 1px;
            white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        }

        .firma-oficial {
            position:absolute; bottom:80px; left:15px;
            width:150px; height:64px;
            display:flex; align-items:center; justify-content:center;
            overflow:hidden; z-index:20;
        }
        .firma-oficial img { max-width:100%; max-height:100%; object-fit:contain; mix-blend-mode:multiply; filter:contrast(1.15); }

        .qr-front-pos {
            position:absolute; bottom:10px; right:12px;
            width:64px; height:64px; background:white; padding:3px;
            border-radius:5px; display:flex; align-items:center; justify-content:center;
            z-index:100; box-shadow:0 1px 4px rgba(0,0,0,0.2);
        }
        .qr-front-pos img { width:100%; height:100%; display:block; }

        .qr-back-pos {
            position:absolute; bottom:15px; right:25px;
            width:62px; height:62px; background:white; padding:2px;
            border-radius:4px; display:flex; align-items:center; justify-content:center; z-index:100;
        }
        .qr-back-pos img { width:100%; height:100%; display:block; }

        @media print {
            @page { margin:0; }
            body { padding:0.5cm; background:white; }
            .no-print { display:none !important; }
            .card-print { box-shadow:none; margin-bottom:0.5cm; }
        }`;
}

// ── PREVISUALIZAR ─────────────────────────────────────────────────────

async function previewFullCredential() {
    if (!currentPersonData) {
        showNotification('Selecciona un empleado primero', 'warning');
        return;
    }
    showNotification('Generando previsualización táctica...', 'info');

    const data     = currentPersonData;
    const baseUrl  = getSiteBase();
    const hoy      = new Date();
    const meses    = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    const fechaExp = hoy.getDate().toString().padStart(2,'0') + '-' + meses[hoy.getMonth()] + '-' + String(hoy.getFullYear()).slice(-2);
    const valUrl   = buildValidationUrl(data.cuip, data.nombre);
    const qrSrc    = getQRImageUrl(valUrl, 380);
    const photoSrc = resolvePhotoSrc(data.foto, data.cuip, data.nombre);

    const cardHtml = buildCardHTML(data, qrSrc, photoSrc, fechaExp, baseUrl);
    const cardCss  = buildCardCSS(baseUrl);

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Previsualización - ${data.nombre}</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@800;900&family=Inter:wght@700;800;900&display=swap" rel="stylesheet">
    <style>
        ${cardCss}
        body { background:#0a192f; color:white; }
        .header { text-align:center; margin-bottom:40px; }
        .header h1 { color:#c5a059; margin:0; font-size:1.5rem; font-family:'Montserrat',sans-serif; }
        .header p  { opacity:0.7; margin:8px 0; }
        .btn-float {
            position:fixed; bottom:30px; right:30px;
            background:#c5a059; color:#0a192f; border:none;
            padding:15px 30px; border-radius:50px; font-weight:900;
            cursor:pointer; box-shadow:0 10px 30px rgba(0,0,0,0.3);
            font-family:'Montserrat',sans-serif; font-size:0.9rem;
        }
        .btn-float:hover { background:#b08945; }
    </style>
</head>
<body>
    <div class="header no-print">
        <h1>DOCUMENTO DE PREVISUALIZACIÓN TÁCTICA</h1>
        <p>Verifique los datos antes de proceder con el timbrado e impresión física.</p>
    </div>
    <div class="cards-row">
        <div class="card-wrap"><span class="card-label">Vista Frontal</span></div>
        <div class="card-wrap"><span class="card-label">Vista Trasera</span></div>
    </div>
    <div class="cards-row" style="margin-top:0;">
        ${cardHtml}
    </div>
    <button class="btn-float no-print" onclick="window.print()">🖨 PROCESAR IMPRESIÓN</button>
</body>
</html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
}

// ── IMPRIMIR ──────────────────────────────────────────────────────────

async function printEnhancedCredential() {
    if (!currentPersonData) {
        alert('Selecciona un oficial primero desde el Repositorio de Personal.');
        return;
    }
    if (typeof logAction !== 'undefined' && window.ACTION_TYPES) {
        logAction(ACTION_TYPES.PRINT, 'Imprimió credencial: ' + currentPersonData.nombre);
    }

    const data     = currentPersonData;
    const baseUrl  = getSiteBase();
    const hoy      = new Date();
    const meses    = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    const fechaExp = hoy.getDate().toString().padStart(2,'0') + '-' + meses[hoy.getMonth()] + '-' + String(hoy.getFullYear()).slice(-2);
    const valUrl   = buildValidationUrl(data.cuip, data.nombre);
    const qrSrc    = getQRImageUrl(valUrl, 380);
    const photoSrc = resolvePhotoSrc(data.foto, data.cuip, data.nombre);

    const cardHtml = buildCardHTML(data, qrSrc, photoSrc, fechaExp, baseUrl);
    const cardCss  = buildCardCSS(baseUrl);

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Impresión Oficial - ${data.nombre}</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@800;900&family=Inter:wght@700;800;900&display=swap" rel="stylesheet">
    <style>
        ${cardCss}
        .no-print-header {
            background:#0a192f; color:white; padding:20px; width:100%; max-width:800px;
            text-align:center; border-radius:12px; margin-bottom:40px;
        }
        .print-btn {
            background:#c5a059; color:#000; border:none; padding:12px 30px; border-radius:8px;
            font-weight:800; cursor:pointer; margin-top:15px; font-size:1rem;
        }
    </style>
</head>
<body>
    <div class="no-print-header no-print">
        <div style="font-family:'Montserrat',sans-serif;font-size:1.2rem;font-weight:800;">CREDENCIAL OFICIAL C2 TZOMPANTEPEC</div>
        <p style="font-size:0.9rem;opacity:0.8;margin:8px 0;">Verifique los datos antes de imprimir</p>
        <button class="print-btn" onclick="window.print()">🖨 MANDAR A IMPRESORA</button>
    </div>
    <div class="cards-row">
        <div class="card-wrap">
            <div class="card-label">Vista Frontal</div>
        </div>
        <div class="card-wrap">
            <div class="card-label">Vista Trasera</div>
        </div>
    </div>
    <div class="cards-row" style="margin-top:0;">
        ${cardHtml}
    </div>
</body>
</html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
}

// ── DESCARGAR ─────────────────────────────────────────────────────────

async function downloadCredential() {
    if (!currentPersonData) {
        alert('Selecciona un empleado primero del Repositorio');
        return;
    }
    showNotification('Generando descarga de credencial...', 'info');

    const data     = currentPersonData;
    const baseUrl  = getSiteBase();
    const hoy      = new Date();
    const meses    = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    const fechaExp = hoy.getDate().toString().padStart(2,'0') + '-' + meses[hoy.getMonth()] + '-' + String(hoy.getFullYear()).slice(-2);
    const valUrl   = buildValidationUrl(data.cuip, data.nombre);
    const qrSrc    = getQRImageUrl(valUrl, 380);
    const photoSrc = resolvePhotoSrc(data.foto, data.cuip, data.nombre);

    const frontBg  = baseUrl + 'assets/credencial_front_v3.jpg';
    const backBg   = baseUrl + 'assets/credencial_back_v3.jpg';

    const firmaHtml = data.firma
        ? '<img src="' + data.firma + '" crossorigin="anonymous" style="max-width:100%;max-height:100%;object-fit:contain;mix-blend-mode:multiply;">'
        : '';

    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@800;900&family=Inter:wght@700;800;900&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"><\/script>
    <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:#fff;display:flex;gap:20px;padding:10px;width:688px;}
        .card{width:324px;height:504px;position:relative;overflow:hidden;background-size:100% 100%;background-position:center;}
        .front-bg{background-image:url('${frontBg}');}
        .back-bg{background-image:url('${backBg}');}
        .photo-box{position:absolute;top:178px;left:20px;width:112px;height:144px;border-radius:4px;overflow:hidden;}
        .photo-box img{width:100%;height:100%;object-fit:cover;object-position:center top;}
        .data-col{position:absolute;top:170px;left:148px;width:163px;display:flex;flex-direction:column;gap:2px;z-index:40;}
        .f-label{font-family:'Montserrat',sans-serif;font-size:6.5pt;font-weight:900;color:#000;text-transform:uppercase;margin:0;line-height:1.1;}
        .f-value{font-family:'Inter',sans-serif;font-size:9pt;font-weight:900;color:#000;text-transform:uppercase;margin:0 0 1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .firma-box{position:absolute;bottom:80px;left:15px;width:150px;height:64px;display:flex;align-items:center;justify-content:center;overflow:hidden;}
        .qr-front{position:absolute;bottom:10px;right:12px;width:64px;height:64px;background:white;padding:3px;border-radius:5px;}
        .qr-front img{width:100%;height:100%;display:block;}
        .qr-back{position:absolute;bottom:15px;right:25px;width:62px;height:62px;background:white;padding:2px;border-radius:4px;}
        .qr-back img{width:100%;height:100%;display:block;}
    </style>
</head>
<body>
    <div class="card front-bg" id="dlFront">
        <div class="photo-box">
            <img src="${photoSrc}" crossorigin="anonymous"
                 onerror="this.onerror=null;this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(data.nombre)}&background=0a192f&color=fff&size=200'">
        </div>
        <div class="data-col">
            <div><span class="f-label">Nombre</span><span class="f-value">${data.nombre}</span></div>
            <div><span class="f-label">Cargo</span><span class="f-value">${data.cargo}</span></div>
            <div><span class="f-label">CUIP</span><span class="f-value">${data.cuip || '---'}</span></div>
            <div><span class="f-label">Vigencia SIBIM</span><span class="f-value">${data.vigencia || '1 AÑO'}</span></div>
            <div><span class="f-label">Expedición</span><span class="f-value">${fechaExp}</span></div>
        </div>
        <div class="firma-box">${firmaHtml}</div>
        <div class="qr-front"><img src="${qrSrc}" crossorigin="anonymous" alt="QR"></div>
    </div>
    <div class="card back-bg" id="dlBack">
        <div class="qr-back"><img src="${qrSrc}" crossorigin="anonymous" alt="QR"></div>
    </div>
    <script>
    window.onload = async function() {
        // Esperar a que QR y fondos carguen por completo
        await new Promise(r => setTimeout(r, 2200));
        try {
            const opts = { scale: 3, useCORS: true, allowTaint: true, backgroundColor: null };

            const cf = await html2canvas(document.getElementById('dlFront'), opts);
            const lf = document.createElement('a');
            lf.download = 'CREDENCIAL_FRENTE_${(data.cuip || data.nombre || 'TZ').replace(/[^a-zA-Z0-9]/g,'_')}.png';
            lf.href = cf.toDataURL('image/png');
            lf.click();

            await new Promise(r => setTimeout(r, 900));

            const cb = await html2canvas(document.getElementById('dlBack'), opts);
            const lb = document.createElement('a');
            lb.download = 'CREDENCIAL_REVERSO_${(data.cuip || data.nombre || 'TZ').replace(/[^a-zA-Z0-9]/g,'_')}.png';
            lb.href = cb.toDataURL('image/png');
            lb.click();

            setTimeout(() => window.close(), 2000);
        } catch(e) {
            document.body.innerHTML = '<p style="color:red;padding:20px;">Error: ' + e.message + '</p>';
        }
    };
    <\/script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=730,height=560');
    win.document.write(html);
    win.document.close();

    if (typeof logAction !== 'undefined') logAction(ACTION_TYPES.DOWNLOAD, 'Descargó credencial de ' + data.nombre);
}

// ── Exportar globales ─────────────────────────────────────────────────

window.selectForCredential     = selectForCredential;
window.updateEnhancedCredential = updateEnhancedCredential;
window.printEnhancedCredential = printEnhancedCredential;
window.downloadCredential      = downloadCredential;
window.previewFullCredential   = previewFullCredential;
window.generateCredential      = function() { printEnhancedCredential(); };
window.updateCredentialPreview = function(n,c,cu,cu2) { selectForCredential(n,c,cu,cu2); };
window.generateQRCode          = function() { if (currentPersonData) updateEnhancedCredential(currentPersonData); };

function showAddPersonForm() {
    alert('Funcionalidad para agregar personal (requiere permisos de escritura en Google Sheets)');
}
window.showAddPersonForm = showAddPersonForm;

console.log('✅ credencial-generator.js v3.1 cargado – rutas absolutas, QR img-tag, firma base64');