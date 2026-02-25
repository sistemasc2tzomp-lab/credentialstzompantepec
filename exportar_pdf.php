<?php
// exportar_pdf.php
require_once('fpdf/fpdf.php');
require_once('config.php');

class PDF extends FPDF {
    function Header() {
        $this->SetFont('Arial','B',16);
        $this->Cell(0,10,'Seguridad Publica Tzompantepec',0,1,'C');
        $this->SetFont('Arial','B',12);
        $this->Cell(0,10,'Reporte de Personal',0,1,'C');
        $this->Ln(10);
        
        // Fecha de generación
        $this->SetFont('Arial','I',10);
        $this->Cell(0,10,'Fecha de generacion: ' . date('d/m/Y H:i:s'),0,1,'R');
        $this->Ln(5);
    }
    
    function Footer() {
        $this->SetY(-15);
        $this->SetFont('Arial','I',8);
        $this->Cell(0,10,utf8_decode('Página ') . $this->PageNo() . '/{nb}',0,0,'C');
    }
    
    function TablaPersonal($data) {
        // Encabezados
        $this->SetFillColor(0,51,102);
        $this->SetTextColor(255);
        $this->SetFont('Arial','B',9);
        
        $this->Cell(10,7,utf8_decode('N°'),1,0,'C',true);
        $this->Cell(45,7,'Nombre',1,0,'C',true);
        $this->Cell(45,7,'Apellidos',1,0,'C',true);
        $this->Cell(30,7,'RFC',1,0,'C',true);
        $this->Cell(30,7,'CURP',1,0,'C',true);
        $this->Cell(30,7,'Puesto',1,1,'C',true);
        
        // Datos
        $this->SetFillColor(224,235,255);
        $this->SetTextColor(0);
        $this->SetFont('Arial','',8);
        
        $fill = false;
        $contador = 1;
        
        foreach($data as $row) {
            $this->Cell(10,6,$contador,'LR',0,'C',$fill);
            $this->Cell(45,6,utf8_decode($row['nombre']),'LR',0,'L',$fill);
            $this->Cell(45,6,utf8_decode($row['apellidos']),'LR',0,'L',$fill);
            $this->Cell(30,6,$row['rfc'],'LR',0,'L',$fill);
            $this->Cell(30,6,$row['curp'],'LR',0,'L',$fill);
            $this->Cell(30,6,utf8_decode($row['puesto']),'LR',1,'L',$fill);
            
            $fill = !$fill;
            $contador++;
        }
        
        // Línea final
        $this->Cell(190,0,'','T');
    }
}

// Obtener datos de Google Sheets
$sheets = new GoogleSheetsDB();

if(isset($_GET['id'])) {
    // Buscar por ID (en este caso por RFC o CURP)
    $personal = $sheets->buscarPersonal($_GET['id']);
    $titulo = 'Reporte Individual';
} else {
    $personal = $sheets->getPersonal();
    $titulo = 'Reporte General';
}

// Crear PDF
$pdf = new PDF();
$pdf->AliasNbPages();
$pdf->AddPage();
$pdf->SetFont('Arial','B',12);
$pdf->Cell(0,10,$titulo,0,1,'L');
$pdf->Ln(5);

if (!empty($personal) && !isset($personal['error'])) {
    $pdf->TablaPersonal($personal);
} else {
    $pdf->SetFont('Arial','',12);
    $pdf->Cell(0,10,'No hay datos para mostrar',0,1,'C');
}

$pdf->Output('D', 'Reporte_Personal_Tzompantepec_' . date('Y-m-d') . '.pdf');
?>