<?php
header('Content-Type: application/json');
require_once 'config.php';

$db = new GoogleSheetsDB();
$usuarios = $db->getUsuarios();

echo json_encode($usuarios);
?>