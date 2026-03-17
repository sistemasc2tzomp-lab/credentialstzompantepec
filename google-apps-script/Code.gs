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
var SHEET_ARMAMENTO = 'ARMAMENTO';
var SHEET_VEHICULOS = 'VEHICULOS';
var SHEET_RADIO = 'RADIO';
var SHEET_CHALECOS = 'CHALECOS';
var SHEET_REPORTES = 'REPORTES';
// CONFIGURACIÓN DE GOOGLE DRIVE (IDs proporcionados por el usuario)
const FOLDER_ID_FOTOS = '1jgEvqN01I3eH0aGjGJdODxLkRlusiD59';
const FOLDER_ID_DOCS = '1oxAmRdspivrL7LLG7WD01kMym19RJbs-';

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
      case 'getArmamento':
        result = getSheetData(SHEET_ARMAMENTO);
        break;
      case 'getVehiculos':
        result = getSheetData(SHEET_VEHICULOS);
        break;
      case 'getRadios':
        result = getSheetData(SHEET_RADIO);
        break;
      case 'getChalecos':
        result = getSheetData(SHEET_CHALECOS);
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
    
    var action = (params.action || e.parameter.action || '').trim();
    var actionLower = action.toLowerCase();
    
    switch (actionLower) {
      case 'guardarpersonal':
        result = guardarPersonal(params);
        break;
      case 'actualizarpersonal':
        result = actualizarPersonal(params);
        break;
      case 'guardarusuario':
        result = guardarUsuario(params);
        break;
      case 'actualizarestado':
        result = actualizarEstado(String(params.cuip || e.parameter.cuip), String(params.estado || e.parameter.estado));
        break;
      case 'actualizarresguardo':
        result = actualizarResguardo(params);
        break;
      case 'eliminarpersonal':
        var cuipToDel = params.cuip || e.parameter.cuip || params.searchId || '';
        result = eliminarPersonal(cuipToDel);
        break;
      case 'guardarreporte':
        result = guardarReporte(params);
        break;
      default:
        result = { success: false, message: 'Acción POST no reconocida: ' + action + ' (Intentado: ' + actionLower + ')' };
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
          fechaRegistro        : row[0]  || '',
          nombre               : row[1]  || '',
          apellidos            : row[2]  || '',
          rfc                  : row[3]  || '',
          curp                 : row[4]  || '',
          cuip                 : row[5]  || '',
          fechaNacimiento      : row[6]  || '',
          cargo                : row[7]  || '',
          fechaIngreso         : row[8]  || '',
          tipoSangre           : row[9]  || '',
          nss                  : row[10] || '',
          email                : row[11] || '',
          telefono             : row[12] || '',
          armado               : row[13] || '',
          estado               : row[14] || 'Activo',
          foto                 : row[15] || '',
          firma                : row[16] || '',
          equipo               : row[17] || '',
          vehiculo             : row[18] || '',
          placas               : row[19] || '',
          vigencia             : row[20] || '',
          observaciones        : row[21] || '',
          // Campos de resguardo extendido (col W-AB = índices 22-27)
          tipoVehiculo         : row[22] || '',
          marcaVehiculo        : row[23] || '',
          colorVehiculo        : row[24] || '',
          estadoVehiculo       : row[25] || 'Operativo',
          numArma              : row[26] || '',
          tipoArma             : row[27] || '',
          calibre              : row[28] || '',
          fechaAsignacionArma  : row[29] || '',
          radio                : row[30] || '',
          chaleco              : row[31] || '',
          arma                 : row[26] || row[13] || '', // num de arma o campo armado
          id                   : row[5]  || 'EMP' + personal.length,
          // Documentos en Drive (Col AG-AJ = índices 32-35)
          ine_link             : row[32] || '',
          curp_link            : row[33] || '',
          cuip_doc_link        : row[34] || '',
          comprobante_link     : row[35] || ''
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
    
    // Si hay archivos para Drive, procesarlos
    var cuip = datos.cuip || 'SIN_CUIP';
    var folder = getOrCreateOfficerFolder(cuip);
    
    var fotoUrl = datos.foto;
    if (datos.foto && datos.foto.includes('base64')) {
      fotoUrl = saveFileToDrive(datos.foto, 'FOTO_' + cuip + '.png', folder);
    }

    var ineUrl = datos.ine_file ? saveFileToDrive(datos.ine_file, 'INE_' + cuip + '.pdf', folder) : '';
    var curpUrl = datos.curp_file ? saveFileToDrive(datos.curp_file, 'CURP_' + cuip + '.pdf', folder) : '';
    var cuipDocUrl = datos.cuip_doc_file ? saveFileToDrive(datos.cuip_doc_file, 'CUIP_DOC_' + cuip + '.pdf', folder) : '';
    var comprobanteUrl = datos.comprobante_file ? saveFileToDrive(datos.comprobante_file, 'COMPROBANTE_' + cuip + '.pdf', folder) : '';

    var row = [
      new Date().toISOString(),    // A: Fecha de registro
      datos.nombre     || '',      // B: Nombre
      datos.apellidos  || '',      // C: Apellidos
      datos.rfc        || '',      // D: RFC
      datos.curp       || '',      // E: CURP
      cuip,                        // F: CUIP
      datos.fechaNacimiento || '', // G: Fecha nacimiento
      datos.puesto || datos.cargo || '', // H: Cargo
      datos.fechaIngreso || '',    // I: Fecha ingreso
      datos.tipoSangre || '',      // J: Tipo sangre
      datos.nss        || '',      // K: NSS
      datos.email      || '',      // L: Email
      datos.telefono   || '',      // M: Teléfono
      datos.armado     || '',      // N: Armado
      datos.estado     || 'Activo',// O: Estado
      fotoUrl          || '',      // P: Foto (Drive Link o Base64)
      datos.firma      || '',      // Q: Firma (base64)
      datos.equipo     || '',      // R: Equipo
      datos.vehiculo   || '',      // S: Vehículo
      datos.numPlaca   || '',      // T: Placa
      datos.vigencia   || '',      // U: Vigencia
      datos.observaciones || '',   // V: Observaciones
      '', '', '', '', '', '', '', '', '', '', // W-AF: Reservados resguardo
      ineUrl,                      // AG: INE
      curpUrl,                     // AH: CURP
      cuipDocUrl,                  // AI: CUIP DOC
      comprobanteUrl               // AJ: COMPROBANTE
    ];
    
    sheet.appendRow(row);
    
    return {
      success: true,
      message: 'Personal guardado correctamente con expediente en Google Drive'
    };
    
  } catch (err) {
    return { success: false, message: 'Error al guardar personal: ' + err.toString() };
  }
}

// ============================================================
// FUNCIÓN: Actualizar personal existente
// ============================================================
function actualizarPersonal(datos) {
  try {
    var cuip = datos.cuip;
    if (!cuip) return { success: false, message: 'CUIP es requerido para actualizar' };

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_PERSONAL);
    if (!sheet) return { success: false, message: 'Hoja PERSONAL no encontrada' };

    var data = sheet.getDataRange().getValues();
    
    // Procesar archivos nuevos organizados por NOMBRE
    var nombreCompleto = (datos.nombre || '') + ' ' + (datos.apellidos || '');
    var folderFotos = getOrCreateOfficerFolder(nombreCompleto, 'FOTO');
    var folderDocs = getOrCreateOfficerFolder(nombreCompleto, 'DOCS');
    
    // Búsqueda inteligente
    var cuipOrig = String(datos.cuip_original || datos.cuip || '').trim().toUpperCase();
    var nombreOrig = String(datos.nombre_original || datos.nombre || '').trim().toUpperCase();
    
    for (var i = 1; i < data.length; i++) {
        var cuipHoja = String(data[i][5]).trim().toUpperCase();
        var nombreHoja = String(data[i][1]).trim().toUpperCase();
        
        // Búsqueda robusta: Si el oficial es Administrativo (sin CUIP), buscamos por nombre original. 
        // Si tiene CUIP, usamos CUIP.
        var isAdministrativo = (cuipHoja === 'ADMINISTRATIVO' || !cuipHoja || cuipHoja === '---');
        var matchByCuip = cuipOrig && cuipHoja === cuipOrig && !isAdministrativo;
        var matchByName = nombreOrig && nombreHoja === nombreOrig;
        
        if (matchByCuip || matchByName) {
            var rowNum = i + 1;
        
        if (datos.nombre) sheet.getRange(rowNum, 2).setValue(datos.nombre);
        if (datos.apellidos) sheet.getRange(rowNum, 3).setValue(datos.apellidos);
        if (datos.rfc) sheet.getRange(rowNum, 4).setValue(datos.rfc);
        if (datos.curp) sheet.getRange(rowNum, 5).setValue(datos.curp);
        if (datos.fechaNacimiento) sheet.getRange(rowNum, 7).setValue(datos.fechaNacimiento);
        if (datos.puesto || datos.cargo) sheet.getRange(rowNum, 8).setValue(datos.puesto || datos.cargo);
        if (datos.fechaIngreso) sheet.getRange(rowNum, 9).setValue(datos.fechaIngreso);
        if (datos.tipoSangre) sheet.getRange(rowNum, 10).setValue(datos.tipoSangre);
        if (datos.nss) sheet.getRange(rowNum, 11).setValue(datos.nss);
        if (datos.email) sheet.getRange(rowNum, 12).setValue(datos.email);
        if (datos.telefono) sheet.getRange(rowNum, 13).setValue(datos.telefono);
        if (datos.armado) sheet.getRange(rowNum, 14).setValue(datos.armado);
        if (datos.estado) sheet.getRange(rowNum, 15).setValue(datos.estado);
        
        // Manejo de foto en Drive
        if (datos.foto && datos.foto.includes('base64')) {
          var fotoUrl = saveFileToDrive(datos.foto, 'FOTO_' + nombreCompleto + '.png', folderFotos);
          sheet.getRange(rowNum, 16).setValue(fotoUrl);
        } else if (datos.foto) {
           sheet.getRange(rowNum, 16).setValue(datos.foto);
        }

        if (datos.firma) sheet.getRange(rowNum, 17).setValue(datos.firma);
        if (datos.equipo) sheet.getRange(rowNum, 18).setValue(datos.equipo);
        if (datos.vehiculo) sheet.getRange(rowNum, 19).setValue(datos.vehiculo);
        if (datos.numPlaca) sheet.getRange(rowNum, 20).setValue(datos.numPlaca);
        if (datos.vigencia) sheet.getRange(rowNum, 21).setValue(datos.vigencia);
        if (datos.observaciones) sheet.getRange(rowNum, 22).setValue(datos.observaciones);

        // Documentos nuevos organizados por Nombre
        if (datos.ine_file) sheet.getRange(rowNum, 33).setValue(saveFileToDrive(datos.ine_file, 'INE_' + nombreCompleto + '.pdf', folderDocs));
        if (datos.curp_file) sheet.getRange(rowNum, 34).setValue(saveFileToDrive(datos.curp_file, 'CURP_' + nombreCompleto + '.pdf', folderDocs));
        if (datos.cuip_doc_file) sheet.getRange(rowNum, 35).setValue(saveFileToDrive(datos.cuip_doc_file, 'CUIP_DOC_' + nombreCompleto + '.pdf', folderDocs));
        if (datos.comprobante_file) sheet.getRange(rowNum, 36).setValue(saveFileToDrive(datos.comprobante_file, 'COMPROBANTE_' + nombreCompleto + '.pdf', folderDocs));

        return { success: true, message: 'Expediente actualizado en Google Drive y Sheets' };
      }
    }
    return { success: false, message: 'No se encontró el oficial con CUIP/Nombre proporcionado' };
  } catch (err) {
    return { success: false, message: 'Error: ' + err.toString() };
  }
}

// ============================================================
// FUNCIÓN: Eliminar personal existente
// ============================================================
function eliminarPersonal(searchId) {
  try {
    if (!searchId) return { success: false, message: 'ID o CUIP es requerido para eliminar' };
    
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_PERSONAL);
    if (!sheet) return { success: false, message: 'Hoja PERSONAL no encontrada' };
    
    var data = sheet.getDataRange().getValues();
    var search = String(searchId).trim().toUpperCase();
    
    for (var i = 1; i < data.length; i++) {
        var cuipHoja = String(data[i][5]).trim().toUpperCase();
        var idHoja = String(data[i][22] || '').trim().toUpperCase();
        var nombreHoja = String(data[i][1]).trim().toUpperCase();
        
        if (cuipHoja === search || idHoja === search || nombreHoja === search) {
            sheet.deleteRow(i + 1);
            return { success: true, message: 'Expediente eliminado correctamente' };
        }
    }
    return { success: false, message: 'No se encontró el expediente a eliminar' };
  } catch (err) {
    return { success: false, message: 'Error: ' + err.toString() };
  }
}

// ============================================================
// FUNCIONES DE GOOGLE DRIVE PARA EXPEDIENTES
// ============================================================
function getOrCreateOfficerFolder(nombrePersonal, tipo) {
  var rootId = (tipo === 'FOTO') ? FOLDER_ID_FOTOS : FOLDER_ID_DOCS;
  var root = DriveApp.getFolderById(rootId);
  var folderName = (nombrePersonal || 'SIN_NOMBRE').trim().toUpperCase();
  
  var folders = root.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    var newFolder = root.createFolder(folderName);
    newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return newFolder;
  }
}

function saveFileToDrive(base64Data, filename, folder) {
  try {
    if (!base64Data || !base64Data.includes('base64')) return '';
    
    var parts = base64Data.split(',');
    var contentType = parts[0].split(':')[1].split(';')[0];
    var data = Utilities.base64Decode(parts[1]);
    var blob = Utilities.newBlob(data, contentType, filename);
    
    // Eliminar versión anterior si existe
    var existingFiles = folder.getFilesByName(filename);
    while (existingFiles.hasNext()) {
      existingFiles.next().setTrashed(true);
    }
    
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Formato directo para previsualización web y etiquetas <img>
    return 'https://drive.google.com/uc?id=' + file.getId();
  } catch (e) {
    return '';
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
    var cuipBusqueda = String(cuip).trim().toUpperCase();
    for (var i = 1; i < data.length; i++) {
      var cuipHoja = String(data[i][5]).trim().toUpperCase();
      if (cuipHoja === cuipBusqueda) {
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
// FUNCIÓN: Generérica para obtener datos de cualquier hoja
// ============================================================
function getSheetData(sheetName) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) return [];
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    
    var headers = data[0];
    var rows = data.slice(1);
    
    return rows.map(function(row) {
      var obj = {};
      headers.forEach(function(header, i) {
        // Normalizar header a camelCase o similar si es necesario
        var key = header.toLowerCase().replace(/_/g, '').replace(/\s+/g, '');
        obj[key] = row[i];
      });
      return obj;
    });
  } catch (err) {
    return { error: err.toString() };
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
        'EQUIPO', 'VEHICULO', 'PLACAS', 'VIGENCIA', 'OBSERVACIONES',
        'TIPO_VEHICULO', 'MARCA_VEHICULO', 'COLOR_VEHICULO', 'ESTADO_VEHICULO',
        'NUM_ARMA', 'TIPO_ARMA', 'CALIBRE', 'FECHA_ASIG_ARMA', 'RADIO', 'CHALECO',
        'INE_LINK', 'CURP_LINK', 'CUIP_DOC_LINK', 'COMPROBANTE_LINK'
      ]);
      personalSheet.getRange(1, 1, 1, 36).setBackground('#0a192f').setFontColor('#c5a059').setFontWeight('bold');
    }
    
    // Crear hoja USUARIOS si no existe
    var usuariosSheet = ss.getSheetByName(SHEET_USUARIOS);
    if (!usuariosSheet) {
      usuariosSheet = ss.insertSheet(SHEET_USUARIOS);
      usuariosSheet.appendRow([
        'FECHA_CREACION', 'NOMBRE', 'USERNAME', 'PASSWORD', 'ROLE', 'ESTADO'
      ]);
      usuariosSheet.getRange(1, 1, 1, 6).setBackground('#0a192f').setFontColor('#c5a059').setFontWeight('bold');
      
      usuariosSheet.appendRow([
        new Date().toISOString(),
        'Administrador del Sistema',
        'admin',
        'admin123',
        'ADMIN',
        'ACTIVO'
      ]);
    }

    // Crear hojas Tácticas
    var tacticas = [
      { name: SHEET_ARMAMENTO, headers: ['ID', 'SERIE', 'TIPO', 'MARCA', 'MODELO', 'CALIBRE', 'ESTADO', 'ASIGNADO'] },
      { name: SHEET_VEHICULOS, headers: ['ID', 'PLACA', 'TIPO', 'MARCA', 'MODELO', 'COLOR', 'KILOMETRAJE', 'ESTADO', 'ASIGNADO'] },
      { name: SHEET_RADIO, headers: ['ID', 'SERIE', 'MATRA', 'MARCA', 'MODELO', 'ESTADO', 'ASIGNADO'] },
      { name: SHEET_CHALECOS, headers: ['ID', 'SERIE', 'NIVEL', 'MARCA', 'TALLA', 'VIGENCIA', 'ESTADO', 'ASIGNADO'] }
    ];

    tacticas.forEach(function(t) {
      var s = ss.getSheetByName(t.name);
      if (!s) {
        s = ss.insertSheet(t.name);
        s.appendRow(t.headers);
        s.getRange(1, 1, 1, t.headers.length).setBackground('#0a192f').setFontColor('#c5a059').setFontWeight('bold');
      }
    });
    
    // Crear hoja REPORTES si no existe
    var reportesSheet = ss.getSheetByName(SHEET_REPORTES);
    if (!reportesSheet) {
      reportesSheet = ss.insertSheet(SHEET_REPORTES);
      reportesSheet.appendRow(['FECHA', 'TIPO_REPORTE', 'GENERADO_POR', 'HASH_SEGURIDAD', 'FORMATO', 'DESCRIPCION']);
      reportesSheet.getRange(1, 1, 1, 6).setBackground('#0a192f').setFontColor('#c5a059').setFontWeight('bold');
    }

    return { success: true, message: 'Hojas inicializadas correctamente' };
    
  } catch (err) {
    return { success: false, message: 'Error al inicializar: ' + err.toString() };
  }
}

// ============================================================
// FUNCIÓN: Actualizar datos de resguardo de equipo
// Columnas: W(22)=TipoVehiculo, X(23)=MarcaVehiculo, Y(24)=ColorVehiculo,
//           Z(25)=EstadoVehiculo, AA(26)=NumArma, AB(27)=TipoArma,
//           AC(28)=Calibre, AD(29)=FechaAsigArma, AE(30)=Radio, AF(31)=Chaleco
//           También actualiza S(18)=Vehiculo, T(19)=Placas
// ============================================================
function actualizarResguardo(datos) {
  try {
    var cuip = datos.cuip;
    if (!cuip) return { success: false, message: 'CUIP requerido' };

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_PERSONAL);
    if (!sheet) return { success: false, message: 'Hoja PERSONAL no encontrada' };

    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][5]) === String(cuip)) {
        var row = i + 1; // 1-indexed
        // Columnas básicas
        sheet.getRange(row, 19).setValue(datos.vehiculo   || ''); // S = Vehículo
        sheet.getRange(row, 20).setValue(datos.placas     || ''); // T = Placas
        // Columnas extendidas de resguardo
        sheet.getRange(row, 23).setValue(datos.tipoVehiculo         || ''); // W
        sheet.getRange(row, 24).setValue(datos.marcaVehiculo        || ''); // X
        sheet.getRange(row, 25).setValue(datos.colorVehiculo        || ''); // Y
        sheet.getRange(row, 26).setValue(datos.estadoVehiculo       || 'Operativo'); // Z
        sheet.getRange(row, 27).setValue(datos.numArma              || ''); // AA
        sheet.getRange(row, 28).setValue(datos.tipoArma             || ''); // AB
        sheet.getRange(row, 29).setValue(datos.calibre              || ''); // AC
        sheet.getRange(row, 30).setValue(datos.fechaAsignacionArma  || ''); // AD
        sheet.getRange(row, 31).setValue(datos.radio                || ''); // AE
        sheet.getRange(row, 32).setValue(datos.chaleco              || ''); // AF
        return { success: true, message: 'Resguardo actualizado para CUIP: ' + cuip };
      }
    }
    return { success: false, message: 'Personal con CUIP ' + cuip + ' no encontrado' };
  } catch (err) {
    return { success: false, message: 'Error al actualizar resguardo: ' + err.toString() };
  }
}

// ============================================================
// FUNCIÓN: Guardar registro de reporte generado
// ============================================================
function guardarReporte(datos) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_REPORTES);
    
    if (!sheet) {
      inicializarHojas();
      sheet = ss.getSheetByName(SHEET_REPORTES);
    }
    
    sheet.appendRow([
      new Date().toISOString(),
      datos.tipoReporte || 'DESCONOCIDO',
      datos.generadoPor || 'SISTEMA',
      datos.hashSeguridad || '',
      datos.formato || 'PDF',
      datos.descripcion || ''
    ]);
    
    return { success: true, message: 'Reporte registrado en la bitácora.' };
  } catch (err) {
    return { success: false, message: 'Error al reportar: ' + err.toString() };
  }
}

// ============================================================
// FUNCIÓN: Obtener usuarios del sistema (Acceso)
// ============================================================
function getUsuarios() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_USUARIOS);
    if (!sheet) return [];
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    
    var users = [];
    for (var i = 1; i < data.length; i++) {
      users.push({
        id: i,
        fecha: data[i][0],
        nombre: data[i][1],
        username: data[i][2],
        password: data[i][3],
        role: data[i][4],
        estado: data[i][5] || 'ACTIVO',
        ultimoacceso: data[i][6] || '---'
      });
    }
    return users;
  } catch (err) {
    return [];
  }
}

// ============================================================
// FUNCIÓN: Actualizar datos de personal existente
// ============================================================
function actualizarPersonal(datos) {
  try {
    var cuip = datos.cuip;
    if (!cuip) return { success: false, message: 'CUIP es requerido' };

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_PERSONAL);
    if (!sheet) return { success: false, message: 'Hoja no encontrada' };

    var data = sheet.getDataRange().getValues();
    var rowIndex = -1;

    for (var i = 1; i < data.length; i++) {
      var sheetCuip = String(data[i][5]  || '').trim().toUpperCase();
      var sheetCurp = String(data[i][4]  || '').trim().toUpperCase();
      var sheetName = String(data[i][1]  || '').trim().toUpperCase();
      
      var targetCuip = String(cuip).trim().toUpperCase();
      var targetCurp = String(datos.curp || '').trim().toUpperCase();
      var targetName = String(datos.nombre || '').trim().toUpperCase();

      if (sheetCuip === targetCuip || 
          (targetCurp !== '' && sheetCurp === targetCurp) ||
          (targetName !== '' && sheetName === targetName)) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) return { success: false, message: 'No se encontró el personal con CUIP: ' + cuip };

    // Manejo de archivos en Drive
    var folder = getOrCreateOfficerFolder(cuip, datos.nombre);
    
    // Si se envía foto nueva (en base64)
    if (datos.foto && datos.foto.includes('base64')) {
      datos.foto = saveFileToDrive(datos.foto, 'FOTO_' + cuip + '.png', folder);
    }
    
    // Archivos de expediente (PDFs)
    if (datos.ine_file && datos.ine_file.includes('base64')) {
      datos.ine_link = saveFileToDrive(datos.ine_file, 'INE_' + cuip + '.pdf', folder);
    }
    if (datos.curp_file && datos.curp_file.includes('base64')) {
      datos.curp_link = saveFileToDrive(datos.curp_file, 'CURP_' + cuip + '.pdf', folder);
    }
    if (datos.cuip_doc_file && datos.cuip_doc_file.includes('base64')) {
      datos.cuip_doc_link = saveFileToDrive(datos.cuip_doc_file, 'CUIP_DOC_' + cuip + '.pdf', folder);
    }
    if (datos.comprobante_file && datos.comprobante_file.includes('base64')) {
      datos.comprobante_link = saveFileToDrive(datos.comprobante_file, 'COMPROBANTE_' + cuip + '.pdf', folder);
    }

    // Actualizar fila
    // Mapeo: B=2, C=3, ..., O=15, P=16 (foto), AG=33 (ine_link) etc.
    if (datos.nombre)    sheet.getRange(rowIndex, 2).setValue(datos.nombre);
    if (datos.apellidos) sheet.getRange(rowIndex, 3).setValue(datos.apellidos);
    if (datos.rfc)       sheet.getRange(rowIndex, 4).setValue(datos.rfc);
    if (datos.curp)      sheet.getRange(rowIndex, 5).setValue(datos.curp);
    if (datos.puesto || datos.cargo) sheet.getRange(rowIndex, 8).setValue(datos.puesto || datos.cargo);
    if (datos.estado)    sheet.getRange(rowIndex, 15).setValue(datos.estado);
    if (datos.foto)      sheet.getRange(rowIndex, 16).setValue(datos.foto);
    if (datos.firma)     sheet.getRange(rowIndex, 17).setValue(datos.firma);
    
    // Links de expedientes (AG-AJ = 33-36)
    if (datos.ine_link)         sheet.getRange(rowIndex, 33).setValue(datos.ine_link);
    if (datos.curp_link)        sheet.getRange(rowIndex, 34).setValue(datos.curp_link);
    if (datos.cuip_doc_link)    sheet.getRange(rowIndex, 35).setValue(datos.cuip_doc_link);
    if (datos.comprobante_link) sheet.getRange(rowIndex, 36).setValue(datos.comprobante_link);

    return { success: true, message: 'Expediente actualizado correctamente para ' + (datos.nombre || cuip) };

  } catch (err) {
    return { success: false, message: 'Error al actualizar: ' + err.toString() };
  }
}

// ============================================================
// FUNCIÓN: Eliminar personal o usuario
// ============================================================
function eliminarPersonal(id) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Intentar en hoja PERSONAL primero (por CUIP)
    var sheetP = ss.getSheetByName(SHEET_PERSONAL);
    if (sheetP) {
      var dataP = sheetP.getDataRange().getValues();
      for (var i = 1; i < dataP.length; i++) {
        if (String(dataP[i][5]) === String(id)) {
          sheetP.deleteRow(i + 1);
          return { success: true, message: 'Expediente eliminado correctamente' };
        }
      }
    }
    
    // Intentar en hoja USUARIOS (por USERNAME)
    var sheetU = ss.getSheetByName(SHEET_USUARIOS);
    if (sheetU) {
      var dataU = sheetU.getDataRange().getValues();
      for (var j = 1; j < dataU.length; j++) {
        if (String(dataU[j][2]) === String(id)) {
          sheetU.deleteRow(j + 1);
          return { success: true, message: 'Usuario de sistema eliminado' };
        }
      }
    }
    
    return { success: false, message: 'No se encontró el registro: ' + id };
  } catch (err) {
    return { success: false, message: 'Error al borrar: ' + err.toString() };
  }
}

// ============================================================
// FUNCIÓN: Gestionar carpetas en Drive para cada oficial
// ============================================================
function getOrCreateOfficerFolder(cuip, nombre) {
  try {
    var parentFolder = DriveApp.getFolderById(FOLDER_ID_DOCS);
    var folderName = '[' + cuip + '] ' + (nombre || 'SIN_NOMBRE');
    
    var folders = parentFolder.getFoldersByName(folderName);
    if (folders.hasNext()) {
      return folders.next();
    } else {
      // Intentar buscar solo por CUIP si el nombre cambió
      var allSubFolders = parentFolder.getFolders();
      while(allSubFolders.hasNext()){
        var f = allSubFolders.next();
        if(f.getName().indexOf('[' + cuip + ']') === 0){
          f.setName(folderName); // Actualizar nombre si es necesario
          return f;
        }
      }
      return parentFolder.createFolder(folderName);
    }
  } catch (e) {
    return DriveApp.getFolderById(FOLDER_ID_DOCS); // Fallback al padre
  }
}

// ============================================================
// FUNCIÓN: Guardar archivo base64 en Drive y obtener link
// ============================================================
function saveFileToDrive(base64, filename, folder) {
  try {
    var contentType = base64.split(';')[0].split(':')[1];
    var data = Utilities.base64Decode(base64.split(',')[1]);
    var blob = Utilities.newBlob(data, contentType, filename);
    
    // Borrar versión anterior si existe con el mismo nombre en esa carpeta
    var existingFiles = folder.getFilesByName(filename);
    while (existingFiles.hasNext()) {
      existingFiles.next().setTrashed(true);
    }
    
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    // Link directo para img src (UC export)
    return 'https://drive.google.com/uc?export=download&id=' + file.getId();
  } catch (e) {
    return '';
  }
}

