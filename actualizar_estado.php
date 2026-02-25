<?php
header('Content-Type: application/json');
require_once 'config.php';

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['cuip']) || !isset($input['estado'])) {
    echo json_encode(['success' => false, 'message' => 'Faltan datos']);
    exit;
}

$db = new GoogleSheetsDB();
$result = $db->actualizarEstado($input['cuip'], $input['estado']);

echo json_encode($result);
?>