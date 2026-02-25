<?php
// obtener_personal.php
header('Content-Type: application/json');
require_once 'config.php';

try {
    $sheets = new GoogleSheetsDB();
    
    // Si hay término de búsqueda
    if (isset($_GET['buscar']) && !empty($_GET['buscar'])) {
        $personal = $sheets->buscarPersonal($_GET['buscar']);
    } else {
        $personal = $sheets->getPersonal();
    }
    
    if (isset($personal['error'])) {
        throw new Exception($personal['error']);
    }
    
    echo json_encode([
        'success' => true,
        'data' => $personal,
        'total' => count($personal)
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>