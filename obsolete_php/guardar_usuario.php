<?php
header('Content-Type: application/json');
require_once 'config.php';

// Obtener datos del POST
$nombre = $_POST['userName'] ?? '';
$username = $_POST['userEmail'] ?? ''; // Usamos el email como nombre de usuario por simplicidad o el que el usuario decida
$password = $_POST['userPass'] ?? '';
$role = $_POST['userRole'] ?? 'OPERADOR';

if (empty($nombre) || empty($username) || empty($password)) {
    echo json_encode(['success' => false, 'message' => 'Todos los campos son obligatorios']);
    exit;
}

$db = new GoogleSheetsDB();
$result = $db->guardarUsuario([
    'nombre' => $nombre,
    'username' => $username,
    'password' => $password,
    'role' => $role
]);

echo json_encode($result);
?>