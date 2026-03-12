<?php
// inicializar.php
require_once 'config.php';

echo "<h1>Configuración de Google Sheets</h1>";

try {
    $sheets = new GoogleSheetsDB();
    
    echo "<p>Inicializando hojas de cálculo...</p>";
    
    if ($sheets->inicializarHojas()) {
        echo "<p style='color:green'>✓ Hojas configuradas correctamente</p>";
        echo "<p>Hojas creadas/verificadas:</p>";
        echo "<ul>";
        echo "<li>PERSONAL - Para almacenar datos del personal</li>";
        echo "<li>REPORTES - Para registro de reportes generados</li>";
        echo "</ul>";
    } else {
        echo "<p style='color:red'>✗ Error al configurar las hojas</p>";
    }
    
} catch (Exception $e) {
    echo "<p style='color:red'>Error: " . $e->getMessage() . "</p>";
}

echo "<p><a href='index.html'>Ir al sistema</a></p>";
?>