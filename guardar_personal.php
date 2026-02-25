<?php
// guardar_personal.php - VERSIÓN ACTUALIZADA
header('Content-Type: application/json');
require_once 'config.php';

try {
    // Validar datos requeridos (agregamos CUIP como requerido)
    $camposRequeridos = ['nombre', 'apellidos', 'rfc', 'curp', 'cuip', 'fechaNacimiento', 'puesto'];
    foreach ($camposRequeridos as $campo) {
        if (empty($_POST[$campo])) {
            throw new Exception("El campo $campo es requerido");
        }
    }

    // Validar formato de CUIP (ejemplo: 10 caracteres alfanuméricos)
    if (!preg_match('/^[A-Z0-9]{10,20}$/', strtoupper($_POST['cuip']))) {
        throw new Exception("El CUIP debe contener solo letras mayúsculas y números (10-20 caracteres)");
    }

    // Manejar fotografía
    $fotoBase64 = '';
    if (isset($_FILES['foto']) && $_FILES['foto']['error'] === UPLOAD_ERR_OK) {
        $fotoData = file_get_contents($_FILES['foto']['tmp_name']);
        $fotoBase64 = 'data:' . $_FILES['foto']['type'] . ';base64,' . base64_encode($fotoData);
    }

    // Preparar datos con nuevos campos
    $datos = [
        'nombre' => strtoupper($_POST['nombre']),
        'apellidos' => strtoupper($_POST['apellidos']),
        'rfc' => strtoupper($_POST['rfc']),
        'curp' => strtoupper($_POST['curp']),
        'cuip' => strtoupper($_POST['cuip']),
        'fechaNacimiento' => $_POST['fechaNacimiento'],
        'puesto' => strtoupper($_POST['puesto']),
        'fechaIngreso' => $_POST['fechaIngreso'] ?? date('Y-m-d'),
        'tipoSangre' => $_POST['tipoSangre'] ?? 'NO ESPECIFICADO',
        'nss' => $_POST['nss'] ?? '',
        'email' => strtolower($_POST['email'] ?? ''),
        'telefono' => $_POST['telefono'] ?? '',
        'armado' => strtoupper($_POST['armado'] ?? 'SIN ARMA ASIGNADA'),
        'foto' => $fotoBase64,
        'firma' => $_POST['firma'] ?? '', // Base64 desde el canvas
        'equipo' => $_POST['equipo'] ?? 'EQUIPO BÁSICO',
        'vehiculo' => $_POST['vehiculo'] ?? 'SIN VEHÍCULO'
    ];

    // Guardar en Google Sheets
    $sheets = new GoogleSheetsDB();
    $resultado = $sheets->guardarPersonal($datos);

    if ($resultado['success']) {
        echo json_encode([
            'success' => true,
            'message' => 'Personal guardado correctamente en Google Sheets',
            'datos' => $datos,
            'sheets_info' => $resultado
        ]);
    } else {
        throw new Exception($resultado['message']);
    }

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>