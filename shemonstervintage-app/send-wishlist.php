<?php
// Require PHPMailer classes
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require '/src/Exception.php';
require '/src/PHPMailer.php';
require '/src/SMTP.php';

// Allow CORS for your frontend domain (adjust accordingly)
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

// Read JSON POST data
$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['wishes'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request']);
    exit;
}

$wishes = $data['wishes'];

// Build HTML email body
$body = "<h2>Neue Wunschliste</h2><ul>";
foreach ($wishes as $item) {
    $title = htmlspecialchars($item['title'] ?? 'Kein Titel');
    $img = htmlspecialchars($item['img'] ?? '');
    $url = htmlspecialchars($item['url'] ?? '#');

    $body .= "<li>";
    if ($img) {
        $body .= "<img src='$img' alt='$title' style='max-width:100px;'><br>";
    }
    $body .= "<a href='$url'>$title</a>";
    $body .= "</li>";
}
$body .= "</ul>";

// Configure PHPMailer
$mail = new PHPMailer(true);

try {
    //Server settings
    $mail->isSMTP();
    $mail->Host       = 'smtp.all-inkl.com';       // Your SMTP server
    $mail->SMTPAuth   = true;
    $mail->Username   = 'your-email@yourdomain.de'; // Your All-Inkl email address
    $mail->Password   = 'your-email-password';      // Your email password
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS; 
    $mail->Port       = 587;

    //Recipients
    $mail->setFrom('your-email@yourdomain.de', 'Wunschliste');
    $mail->addAddress('storeowner@example.com', 'Store Owner');

    // Content
    $mail->isHTML(true);
    $mail->Subject = 'Neue Wunschliste';
    $mail->Body    = $body;

    $mail->send();

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => "Mailer Error: {$mail->ErrorInfo}"]);
}
