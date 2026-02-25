// ============================================================
// SISTEMA C2 - SEGURIDAD PÚBLICA TZOMPANTEPEC
// Google Apps Script Web App - Backend Completo
// Reemplaza todos los archivos PHP
// ID de Google Sheet: 12_nohX3MHsU8WrvhDKLYbQYr0uoMFvlx30ICjjJsT2M
// ============================================================

// CONFIGURACIÓN GLOBAL
var SPREADSHEET_ID = '12_nohX3MHsU8WrvhDKLYbQYr0uoMFvlx30ICjjJsT2M';
var SHEET_PERSONAL = 'PERSONAL';
var SHEET_USUARIOS = 'USUARIOS';

// ============================================================
// MANEJADOR PRINCIPAL - GET (lecturas)
// ============================================================
function doGet(e) {
  var action = e.parameter.action || '';
  var callback = e.parameter.callback || '';
  
  var result;
  
  try {
    switch (action) {
      case 'getPersonal':
        result = getPersonal();
        break;
      case 'getUsuarios':
        result = getUsuarios();
        break;
      case 'inicializar':
        result = inicializarHojas();
        break;
      default:
        result = { success: false, message: 'Acción no reconocida: ' + action };
    }
  } catch (err) {
    result = { success: false, message: 'Error interno: ' + err.toString() };
  }
  
  var json = JSON.stringify(result);
  
  // Soporte JSONP para evitar problemas de CORS en algunos casos
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// MANEJADOR PRINCIPAL - POST (escrituras)
// ============================================================
function doPost(e) {
  var result;
  
  try {
    var params;
    
    // Intentar leer como JSON primero, luego como form data
    try {
      params = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      params = e.parameter;
    }
    
    var action = params.action || e.parameter.action || '';
    
    switch (action) {
      case 'guardarPersonal':
        result = guardarPersonal(params);
        break;
      case 'guardarUsuario':
        result = guardarUsuario(params);
        break;
      case 'actualizarEstado':
        result = actualizarEstado(params.cuip, params.estado);
        break;
      default:
        result = { success: false, message: 'Acción POST no reconocida: ' + action };
    }
  } catch (err) {
    result = { success: false, message: 'Error en POST: ' + err.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// FUNCIÓN: Obtener todo el personal
// ============================================================
function getPersonal() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_PERSONAL);
    
    if (!sheet) {
      inicializarHojas();
      return [];
    }
    
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) return []; // Solo encabezados o vacío
    
    var headers = data[0];
    var rows = data.slice(1);
    var personal = [];
    
    rows.forEach(function(row) {
      if (row[1] || row[0]) { // Si hay nombre o fecha
        personal.push({
          fechaRegistro : row[0]  || '',
          nombre        : row[1]  || '',
          apellidos     : row[2]  || '',
          rfc           : row[3]  || '',
          curp          : row[4]  || '',
          cuip          : row[5]  || '',
          fechaNacimiento: row[6] || '',
          cargo         : row[7]  || '',
          fechaIngreso  : row[8]  || '',
          tipoSangre    : row[9]  || '',
          nss           : row[10] || '',
          email         : row[11] || '',
          telefono      : row[12] || '',
          armado        : row[13] || '',
          estado        : row[14] || 'Activo',
          foto          : row[15] || '',
          firma         : row[16] || '',
          equipo        : row[17] || '',
          vehiculo      : row[18] || '',
          placa         : row[19] || '',
          vigencia      : row[20] || '',
          observaciones : row[21] || '',
          id            : row[5] || 'EMP' + personal.length
        });
      }
    });
    
    return personal;
    
  } catch (err) {
    return { error: err.toString() };
  }
}

// ============================================================
// FUNCIÓN: Guardar nuevo personal
// ============================================================
function guardarPersonal(datos) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_PERSONAL);
    
    if (!sheet) {
      inicializarHojas();
      sheet = ss.getSheetByName(SHEET_PERSONAL);
    }
    
    var row = [
      new Date().toISOString(),    // A: Fecha de registro
      datos.nombre     || '',      // B: Nombre
      datos.apellidos  || '',      // C: Apellidos
      datos.rfc        || '',      // D: RFC
      datos.curp       || '',      // E: CURP
      datos.cuip       || '',      // F: CUIP
      datos.fechaNacimiento || '', // G: Fecha nacimiento
      datos.puesto || datos.cargo || '', // H: Cargo
      datos.fechaIngreso || '',    // I: Fecha ingreso
      datos.tipoSangre || '',      // J: Tipo sangre
      datos.nss        || '',      // K: NSS
      datos.email      || '',      // L: Email
      datos.telefono   || '',      // M: Teléfono
      datos.armado     || '',      // N: Armado
      datos.estado     || 'Activo',// O: Estado
      datos.foto       || '',      // P: Foto (base64)
      datos.firma      || '',      // Q: Firma (base64)
      datos.equipo     || '',      // R: Equipo
      datos.vehiculo   || '',      // S: Vehículo
      datos.numPlaca   || '',      // T: Placa
      datos.vigencia   || '',      // U: Vigencia
      datos.observaciones || ''    // V: Observaciones
    ];
    
    sheet.appendRow(row);
    
    return {
      success: true,
      message: 'Personal guardado correctamente en Google Sheets'
    };
    
  } catch (err) {
    return { success: false, message: 'Error al guardar personal: ' + err.toString() };
  }
}

// ============================================================
// FUNCIÓN: Actualizar estado del personal
// ============================================================
function actualizarEstado(cuip, nuevoEstado) {
  try {
    if (!cuip || !nuevoEstado) {
      return { success: false, message: 'CUIP y estado son requeridos' };
    }
    
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_PERSONAL);
    
    if (!sheet) return { success: false, message: 'Hoja PERSONAL no encontrada' };
    
    var data = sheet.getDataRange().getValues();
    
    // Columna F (index 5) = CUIP, Columna O (index 14) = Estado
    for (var i = 1; i < data.length; i++) {
      if (data[i][5] === cuip) {
        sheet.getRange(i + 1, 15).setValue(nuevoEstado); // Fila (1-indexed), col 15 = O
        return {
          success: true,
          message: 'Estado actualizado correctamente a: ' + nuevoEstado
        };
      }
    }
    
    return { success: false, message: 'Personal con CUIP ' + cuip + ' no encontrado' };
    
  } catch (err) {
    return { success: false, message: 'Error al actualizar estado: ' + err.toString() };
  }
}

// ============================================================
// FUNCIÓN: Obtener usuarios del sistema
// ============================================================
function getUsuarios() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_USUARIOS);
    
    if (!sheet) {
      inicializarHojas();
      return [];
    }
    
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) return []; // Solo encabezados
    
    var rows = data.slice(1);
    var usuarios = [];
    
    rows.forEach(function(row) {
      if (row[2]) { // Si hay username
        usuarios.push({
          fechaCreacion : row[0] || '',
          nombre        : row[1] || '',
          username      : row[2] || '',
          password      : row[3] || '',
          role          : row[4] || 'OPERADOR',
          estado        : row[5] || 'ACTIVO'
        });
      }
    });
    
    return usuarios;
    
  } catch (err) {
    return { error: err.toString() };
  }
}

// ============================================================
// FUNCIÓN: Guardar nuevo usuario
// ============================================================
function guardarUsuario(datos) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_USUARIOS);
    
    if (!sheet) {
      inicializarHojas();
      sheet = ss.getSheetByName(SHEET_USUARIOS);
    }
    
    // Verificar si el username ya existe
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][2] === datos.username) {
        return { success: false, message: 'El ID de acceso "' + datos.username + '" ya está en uso' };
      }
    }
    
    sheet.appendRow([
      new Date().toISOString(), // A: Fecha creación
      datos.nombre   || '',     // B: Nombre real
      datos.username || '',     // C: ID de acceso
      datos.password || '',     // D: Contraseña
      datos.role     || 'OPERADOR', // E: Rol
      'ACTIVO'                  // F: Estado
    ]);
    
    return { success: true, message: 'Usuario "' + datos.username + '" creado correctamente' };
    
  } catch (err) {
    return { success: false, message: 'Error al crear usuario: ' + err.toString() };
  }
}

// ============================================================
// FUNCIÓN: Inicializar hojas si no existen
// ============================================================
function inicializarHojas() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Crear hoja PERSONAL si no existe
    var personalSheet = ss.getSheetByName(SHEET_PERSONAL);
    if (!personalSheet) {
      personalSheet = ss.insertSheet(SHEET_PERSONAL);
      personalSheet.appendRow([
        'FECHA_REGISTRO', 'NOMBRE', 'APELLIDOS', 'RFC', 'CURP', 'CUIP',
        'FECHA_NACIMIENTO', 'CARGO', 'FECHA_INGRESO', 'TIPO_SANGRE', 'NSS',
        'EMAIL', 'TELEFONO', 'ARMADO', 'ESTADO', 'FOTO', 'FIRMA',
        'EQUIPO', 'VEHICULO', 'PLACA', 'VIGENCIA', 'OBSERVACIONES'
      ]);
      // Estilo de encabezado
      personalSheet.getRange(1, 1, 1, 22).setBackground('#0a192f').setFontColor('#c5a059').setFontWeight('bold');
    }
    
    // Crear hoja USUARIOS si no existe
    var usuariosSheet = ss.getSheetByName(SHEET_USUARIOS);
    if (!usuariosSheet) {
      usuariosSheet = ss.insertSheet(SHEET_USUARIOS);
      usuariosSheet.appendRow([
        'FECHA_CREACION', 'NOMBRE', 'USERNAME', 'PASSWORD', 'ROLE', 'ESTADO'
      ]);
      usuariosSheet.getRange(1, 1, 1, 6).setBackground('#0a192f').setFontColor('#c5a059').setFontWeight('bold');
      
      // Crear usuario administrador por defecto
      usuariosSheet.appendRow([
        new Date().toISOString(),
        'Administrador del Sistema',
        'admin',
        'admin123',
        'ADMIN',
        'ACTIVO'
      ]);
    }
    
    return { success: true, message: 'Hojas inicializadas correctamente' };
    
  } catch (err) {
    return { success: false, message: 'Error al inicializar: ' + err.toString() };
  }
}
