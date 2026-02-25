// Generador de QR mejorado
function generateEnhancedQR(data) {
    // Crear objeto con toda la información
    const qrData = {
        nombre: data.nombre,
        cargo: data.cargo,
        cuip: data.cuip,
        curp: data.curp,
        telefono: data.telefono,
        email: data.email,
        vigencia: data.vigencia,
        empresa: 'SecureID System',
        id: Date.now()
    };
    
    // Convertir a JSON y codificar
    const jsonString = JSON.stringify(qrData);
    const encodedData = btoa(jsonString); // Base64
    
    // Generar URL para verificación
    const verificationURL = `https://tu-sitio.com/verificar?data=${encodedData}`;
    
    return {
        raw: jsonString,
        encoded: encodedData,
        url: verificationURL,
        data: qrData
    };
}

// Mostrar QR en la credencial
function displayQRCode(data) {
    const qrContainer = document.querySelector('.qr-placeholder');
    if (!qrContainer) return;
    
    const qrInfo = generateEnhancedQR(data);
    
    // Aquí integrarías una librería real de QR como:
    // - qrcode.js
    // Por ahora mostramos la información
    qrContainer.innerHTML = `
        <div class="qr-code">
            <i class="fas fa-qrcode" style="font-size: 48px;"></i>
            <div class="qr-tooltip">
                <small>Escanea para ver:</small><br>
                ${data.nombre}<br>
                ${data.cargo}<br>
                Vigencia: ${data.vigencia}
            </div>
        </div>
    `;
}