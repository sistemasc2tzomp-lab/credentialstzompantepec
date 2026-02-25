<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once 'config.php';

try {
    $db = new GoogleSheetsDB();
    $usuarios = $db->getUsuarios();

    // Si getUsuarios devolvió un error, retornar array vacío
    if (isset($usuarios['error'])) {
        echo json_encode([]);
        exit;
    }

    echo json_encode($usuarios);
} catch (Exception $e) {
    // Ante cualquier error de conexión, devolver array vacío
    // para que el JS use el fallback de emergencia
    http_response_code(200);
    echo json_encode([]);
}
?>