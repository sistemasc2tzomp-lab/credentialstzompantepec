<?php
// config.php - Versión actualizada
require_once 'vendor/autoload.php';

class GoogleSheetsDB
{
    private $client;
    private $service;
    private $spreadsheetId;

    public function __construct()
    {
        $this->client = new Google_Client();
        $this->client->setApplicationName('Seguridad Publica Tzompantepec');
        $this->client->setScopes([Google_Service_Sheets::SPREADSHEETS]);
        $this->client->setAccessType('offline');
        $this->client->setPrompt('select_account consent');

        // Cargar credenciales
        $this->client->setAuthConfig('credentials.json');

        $this->service = new Google_Service_Sheets($this->client);

        // Configurar el ID de tu Google Sheet
        $this->spreadsheetId = 'TU_ID_DE_GOOGLE_SHEET_AQUI';
    }

    // Guardar nuevo personal - VERSIÓN ACTUALIZADA
    public function guardarPersonal($datos)
    {
        try {
            $values = [
                [
                    date('Y-m-d H:i:s'), // A: Fecha de registro
                    $datos['nombre'],     // B: Nombre
                    $datos['apellidos'],  // C: Apellidos
                    $datos['rfc'],        // D: RFC
                    $datos['curp'],       // E: CURP
                    $datos['cuip'],       // F: CUIP (NUEVO)
                    $datos['fechaNacimiento'], // G: Fecha nacimiento (recorrida)
                    $datos['puesto'],      // H: Puesto
                    $datos['fechaIngreso'], // I: Fecha ingreso
                    $datos['tipoSangre'],  // J: Tipo sangre
                    $datos['nss'],         // K: NSS
                    $datos['email'],       // L: Email
                    $datos['telefono'],    // M: Teléfono
                    $datos['armado'],      // N: ARMADO (NUEVO)
                    'ACTIVO',               // O: Estado
                    $datos['foto'] ?? '',   // P: FOTO
                    $datos['firma'] ?? '',  // Q: FIRMA (NUEVO)
                    $datos['equipo'] ?? '', // R: EQUIPO (NUEVO)
                    $datos['vehiculo'] ?? ''// S: VEHICULO (NUEVO)
                ]
            ];

            $body = new Google_Service_Sheets_ValueRange([
                'values' => $values
            ]);

            $params = ['valueInputOption' => 'RAW'];

            $result = $this->service->spreadsheets_values->append(
                $this->spreadsheetId,
                'PERSONAL!A:S', // Actualizado hasta columna S
                $body,
                $params
            );

            return [
                'success' => true,
                'message' => 'Personal guardado correctamente en Google Sheets',
                'row' => $result->getUpdates()->getUpdatedRange()
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error en Google Sheets: ' . $e->getMessage()
            ];
        }
    }

    // Obtener todo el personal - VERSIÓN ACTUALIZADA
    public function getPersonal()
    {
        try {
            $range = 'PERSONAL!A:S'; // Actualizado hasta S para incluir firma, equipo, vehiculo
            $response = $this->service->spreadsheets_values->get($this->spreadsheetId, $range);
            $values = $response->getValues();

            if (empty($values)) {
                return [];
            }

            // Quitar encabezados y devolver datos
            array_shift($values);

            $personal = [];
            foreach ($values as $row) {
                if (count($row) >= 6) { // Mínimo necesario para identificar (CUIP en F)
                    $personal[] = [
                        'fecha_registro' => $row[0] ?? '',
                        'nombre' => $row[1] ?? '',
                        'apellidos' => $row[2] ?? '',
                        'rfc' => $row[3] ?? '',
                        'curp' => $row[4] ?? '',
                        'cuip' => $row[5] ?? '',
                        'fecha_nacimiento' => $row[6] ?? '',
                        'puesto' => $row[7] ?? '',
                        'fecha_ingreso' => $row[8] ?? '',
                        'tipo_sangre' => $row[9] ?? '',
                        'nss' => $row[10] ?? '',
                        'email' => $row[11] ?? '',
                        'telefono' => $row[12] ?? '',
                        'armado' => $row[13] ?? '',
                        'estado' => $row[14] ?? 'ACTIVO', // Columna O
                        'foto' => $row[15] ?? '',
                        'firma' => $row[16] ?? '',
                        'equipo' => $row[17] ?? '',
                        'vehiculo' => $row[18] ?? ''
                    ];
                }
            }

            return $personal;

        } catch (Exception $e) {
            return ['error' => $e->getMessage()];
        }
    }

    // Actualizar estado de empleado
    public function actualizarEstado($cuip, $nuevoEstado)
    {
        try {
            // 1. Buscar la fila por CUIP
            $range = 'PERSONAL!A:S';
            $response = $this->service->spreadsheets_values->get($this->spreadsheetId, $range);
            $values = $response->getValues();

            $rowIndex = -1;
            foreach ($values as $index => $row) {
                if (($row[5] ?? '') == $cuip) {
                    $rowIndex = $index + 1; // 1-indexed para Sheets
                    break;
                }
            }

            if ($rowIndex === -1)
                return ['success' => false, 'message' => 'No se encontró el CUIP'];

            // 2. Actualizar columna O (Estado) - Columna 15
            $updateRange = "PERSONAL!O$rowIndex";
            $body = new Google_Service_Sheets_ValueRange([
                'values' => [[$nuevoEstado]]
            ]);
            $params = ['valueInputOption' => 'RAW'];

            $this->service->spreadsheets_values->update(
                $this->spreadsheetId,
                $updateRange,
                $body,
                $params
            );

            return ['success' => true, 'message' => 'Estado actualizado correctamente'];

        } catch (Exception $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    // Las demás funciones (buscarPersonal, guardarReporte, inicializarHojas) 
    // se mantienen igual pero ajustando los rangos donde sea necesario

    // Inicializar hojas - VERSIÓN ACTUALIZADA
    public function inicializarHojas()
    {
        try {
            // Verificar si existe la hoja PERSONAL
            $spreadsheet = $this->service->spreadsheets->get($this->spreadsheetId);
            $sheets = $spreadsheet->getSheets();

            $hojasExistentes = [];
            foreach ($sheets as $sheet) {
                $hojasExistentes[] = $sheet->getProperties()->getTitle();
            }

            $requests = [];

            // Crear hoja PERSONAL si no existe con la nueva estructura
            if (!in_array('PERSONAL', $hojasExistentes)) {
                $requests[] = new Google_Service_Sheets_Request([
                    'addSheet' => [
                        'properties' => [
                            'title' => 'PERSONAL'
                        ]
                    ]
                ]);

                // Agregar encabezados ACTUALIZADOS
                $headers = [
                    [
                        'FECHA_REGISTRO',
                        'NOMBRE',
                        'APELLIDOS',
                        'RFC',
                        'CURP',
                        'CUIP',
                        'FECHA_NACIMIENTO',
                        'PUESTO',
                        'FECHA_INGRESO',
                        'TIPO_SANGRE',
                        'NSS',
                        'EMAIL',
                        'TELEFONO',
                        'ARMADO',
                        'ESTADO',
                        'FOTO',
                        'FIRMA',
                        'EQUIPO',
                        'VEHICULO'
                    ]
                ];

                $body = new Google_Service_Sheets_ValueRange([
                    'values' => $headers
                ]);

                $this->service->spreadsheets_values->update(
                    $this->spreadsheetId,
                    'PERSONAL!A1:O1', // Actualizado hasta O1
                    $body,
                    ['valueInputOption' => 'RAW']
                );
            }

            // Crear hoja REPORTES si no existe
            if (!in_array('REPORTES', $hojasExistentes)) {
                $requests[] = new Google_Service_Sheets_Request([
                    'addSheet' => [
                        'properties' => [
                            'title' => 'REPORTES'
                        ]
                    ]
                ]);

                // Agregar encabezados
                $headers = [
                    [
                        'FECHA',
                        'TIPO_REPORTE',
                        'DATOS',
                        'IP_USUARIO'
                    ]
                ];

                $body = new Google_Service_Sheets_ValueRange([
                    'values' => $headers
                ]);

                $this->service->spreadsheets_values->update(
                    $this->spreadsheetId,
                    'REPORTES!A1:D1',
                    $body,
                    ['valueInputOption' => 'RAW']
                );
            }

            // Crear hoja USUARIOS si no existe
            if (!in_array('USUARIOS', $hojasExistentes)) {
                $requests[] = new Google_Service_Sheets_Request([
                    'addSheet' => [
                        'properties' => [
                            'title' => 'USUARIOS'
                        ]
                    ]
                ]);

                // Agregar encabezados
                $headers = [['FECHA_CREACION', 'NOMBRE', 'USUARIO', 'PASSWORD', 'ROL', 'ESTADO']];
                $body = new Google_Service_Sheets_ValueRange(['values' => $headers]);

                $this->service->spreadsheets_values->update(
                    $this->spreadsheetId,
                    'USUARIOS!A1:F1',
                    $body,
                    ['valueInputOption' => 'RAW']
                );
            }

            // Ejecutar creación de hojas
            if (!empty($requests)) {
                $batchUpdateRequest = new Google_Service_Sheets_BatchUpdateSpreadsheetRequest([
                    'requests' => $requests
                ]);
                $this->service->spreadsheets->batchUpdate($this->spreadsheetId, $batchUpdateRequest);
            }

            return true;

        } catch (Exception $e) {
            return false;
        }
    }

    // Obtener todos los usuarios reales registrados
    public function getUsuarios()
    {
        try {
            $range = 'USUARIOS!A:F';
            $response = $this->service->spreadsheets_values->get($this->spreadsheetId, $range);
            $values = $response->getValues();

            if (empty($values))
                return [];

            array_shift($values); // Quitar encabezados

            $usuarios = [];
            foreach ($values as $row) {
                if (count($row) >= 4) {
                    $usuarios[] = [
                        'nombre' => $row[1] ?? '',
                        'username' => $row[2] ?? '',
                        'password' => $row[3] ?? '',
                        'role' => $row[4] ?? 'user',
                        'estado' => $row[5] ?? 'ACTIVO'
                    ];
                }
            }
            return $usuarios;
        } catch (Exception $e) {
            return ['error' => $e->getMessage()];
        }
    }
}
?>