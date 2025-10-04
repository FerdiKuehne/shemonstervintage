<?php

require_once __DIR__ . '/src/PHPMailer.php';
require_once __DIR__ . '/src/SMTP.php';
require_once __DIR__ . '/src/Exception.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Handle CORS for frontend dev
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS')
    exit(200);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["message" => "Only POST allowed"]);
    exit();
}

// Get POSTed data
$input = file_get_contents('php://input');
$data = json_decode($input, true);

$person = $data['person'] ?? [];
$wishlist = $data['wishlist'] ?? [];

if (empty($person['email']) || empty($wishlist)) {
    echo json_encode(["message" => "Missing data"]);
    exit();
}

// sanitize for HTML output
$name = htmlspecialchars($person['name'] ?? 'No name', ENT_QUOTES, 'UTF-8');
$email = htmlspecialchars($person['email'] ?? 'no-reply@example.com', ENT_QUOTES, 'UTF-8');

// build HTML list/table
$itemsHtml = '';
foreach ($wishlist as $i => $item) {
    $nameItem = htmlspecialchars($item['name'] ?? '', ENT_QUOTES, 'UTF-8');
    $description = htmlspecialchars($item['description'] ?? '', ENT_QUOTES, 'UTF-8');
    $price = (int) ($item['price'] ?? 0);
    $itemsHtml .= "<tr>
        <td style=\"padding:6px;border:1px solid #ddd;\">" . ($i + 1) . "</td>
        <td style=\"padding:6px;border:1px solid #ddd;\">{$nameItem}</td>
        <td style=\"padding:6px;border:1px solid #ddd;\">{$description}</td>
        <td style=\"padding:6px;border:1px solid #ddd;text-align:center;\">{$price}</td>
    </tr>";
}

$htmlBody = "
<html>
<head>
  <meta charset=\"utf-8\">
  <title>Wishlist</title>
</head>
<body>
  <h2>New Wishlist from {$name}</h2>
  <p><strong>Email:</strong> {$email}</p>
  <table style=\"border-collapse:collapse;width:100%;max-width:600px;\">
    <thead>
      <tr>
        <th style=\"padding:6px;border:1px solid #ddd;background:#f5f5f5;\">#</th>
        <th style=\"padding:6px;border:1px solid #ddd;background:#f5f5f5;\">Item</th>
        <th style=\"padding:6px;border:1px solid #ddd;background:#f5f5f5;\">Description</th>
        <th style=\"padding:6px;border:1px solid #ddd;background:#f5f5f5;\">price</th>
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

$subject = "New Wishlist from " . $person['name'];

$plain = "Wishlist from {$person['name']} ({$person['email']})\n\n";
foreach ($wishlist as $item) {
    $plain .= ($item['name'] ?? '') . " x " . ($item['description'] ?? '') . "\n";
}

// PHPMailer setup
$mail = new PHPMailer();
try {
    $mail->isSMTP();
    $mail->Host = 'w01ff580.kasserver.com'; // replace with your SMTP host
    $mail->SMTPAuth = true;
    $mail->Username = 'm077c7fd'; // your domain email
    $mail->Password = '2m:FJcUe9sÄ+J4MF*NUTk';        // email password
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = 587;

    $mail->setFrom('info@shemonstervintage.com', 'shemonstervintage.com');
    $mail->addAddress('info@shemonstervintage.com');           // your domain email
    $mail->addAddress($person['email']);             // copy to customer

    $mail->isHTML(true);
    $mail->Subject = "Wishlist from {$person['name']}";
    $mail->Body = $htmlBody;
    $mail->AltBody = $plain; // plain-text fallback for clients that don't render HTML

    if ($mail->send()) {
        echo json_encode(["message" => "Wishlist sent successfully!"]);
    } else {
        echo json_encode(["message" => "Failed to send wishlist"]);
    }
} catch (Exception $e) {
    echo json_encode(["message" => "Mailer Error: {$mail->ErrorInfo}"]);
}
