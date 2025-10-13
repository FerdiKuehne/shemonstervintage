<?php
require_once __DIR__ . '/../../core/Response.php';
require_once __DIR__ . '/../../vendor/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/../../vendor/PHPMailer/SMTP.php';
require_once __DIR__ . '/../../vendor/PHPMailer/Exception.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// ----------------------------
// CORS & preflight
// ----------------------------
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Only POST requests allowed', 405);
}

// ----------------------------
// Parse input
// ----------------------------
$input = file_get_contents('php://input');
$data = json_decode($input, true) ?? [];

$person = $data['person'] ?? [];
$wishlist = $data['wishlist'] ?? [];

if (empty($person['email']) || empty($wishlist)) {
    Response::error('Missing person email or wishlist data', 400);
}

// ----------------------------
// Sanitize input
// ----------------------------
$name = htmlspecialchars($person['name'] ?? 'No name', ENT_QUOTES, 'UTF-8');
$email = htmlspecialchars($person['email'], ENT_QUOTES, 'UTF-8');

// ----------------------------
// Build HTML and plain content
// ----------------------------
$itemsHtml = '';
$plainText = "Wishlist from {$name} ({$email})\n\n";

foreach ($wishlist as $i => $item) {
    $itemName = htmlspecialchars($item['name'] ?? '', ENT_QUOTES, 'UTF-8');
    $desc = htmlspecialchars($item['description'] ?? '', ENT_QUOTES, 'UTF-8');
    $price = intval($item['price'] ?? 0);

    $itemsHtml .= "<tr>
        <td style=\"padding:6px;border:1px solid #ddd;\">" . ($i + 1) . "</td>
        <td style=\"padding:6px;border:1px solid #ddd;\">{$itemName}</td>
        <td style=\"padding:6px;border:1px solid #ddd;\">{$desc}</td>
        <td style=\"padding:6px;border:1px solid #ddd;text-align:center;\">{$price}</td>
    </tr>";

    $plainText .= "{$itemName} - {$desc} - {$price}\n";
}

$htmlBody = "
<html>
<head><meta charset='utf-8'><title>Wishlist</title></head>
<body>
<h2>New Wishlist from {$name}</h2>
<p><strong>Email:</strong> {$email}</p>
<table style='border-collapse:collapse;width:100%;max-width:600px;'>
<thead>
<tr>
<th style='padding:6px;border:1px solid #ddd;background:#f5f5f5;'>#</th>
<th style='padding:6px;border:1px solid #ddd;background:#f5f5f5;'>Item</th>
<th style='padding:6px;border:1px solid #ddd;background:#f5f5f5;'>Description</th>
<th style='padding:6px;border:1px solid #ddd;background:#f5f5f5;'>Price</th>
</tr>
</thead>
<tbody>
{$itemsHtml}
</tbody>
</table>
<p>Sent from your website.</p>
</body>
</html>
";

// ----------------------------
// Send email
// ----------------------------
try {
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = 'w01ff580.kasserver.com'; // SMTP host
    $mail->SMTPAuth = true;
    $mail->Username = 'm077c7fd';          // SMTP username
    $mail->Password = '2m:FJcUe9sÄ+J4MF*NUTk'; // SMTP password
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = 587;

    $mail->setFrom('info@shemonstervintage.com', 'shemonstervintage.com');
    $mail->addAddress('info@shemonstervintage.com');  // internal
    $mail->addAddress($person['email']);              // copy to customer

    $mail->isHTML(true);
    $mail->Subject = "Wishlist from {$name}";
    $mail->Body = $htmlBody;
    $mail->AltBody = $plainText;

    $mail->send();
    Response::success(['message' => 'Wishlist sent successfully!']);

} catch (Exception $e) {
    Response::error('Mailer Error: ' . $mail->ErrorInfo, 500);
}
