<?php
// Enable full error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', 'php://stdout'); // Log to Docker logs

require_once __DIR__ . '/../../database/connect.php';
require_once __DIR__ . '/../../core/Response.php'; // Response class
require_once __DIR__ . '/../../vendor/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/../../vendor/PHPMailer/SMTP.php';
require_once __DIR__ . '/../../vendor/PHPMailer/Exception.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Load mail config
$config = require __DIR__ . '/../../config/mail.php';


// CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

// Only POST allowed
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error("Only POST allowed", 405);
}

// Get POSTed data
$input = file_get_contents('php://input');
$data = json_decode($input, true);

$username = $data['username'] ?? '';
$name = $data['name'] ?? '';
$surname = $data['surname'] ?? '';
$password = $data['password'] ?? '';
$email = $data['email'] ?? '';
$zipcode = $data['zipcode'] ?? '';
$street = $data['street'] ?? '';
$street_number = $data['street_number'] ?? '';
$city = $data['city'] ?? '';
$country = $data['country'] ?? '';
$phone = $data['phone'] ?? '';
$instagram = $data['instagram'] ?? '';

if (empty($username) || empty($password) || empty($email)) {
    Response::error("Missing required data", 400);
}

// Get PDO connection
$pdo = Database::getConnection();

try {
    // Check if email exists
    $check = $pdo->prepare("SELECT COUNT(*) FROM customers WHERE email = ?");
    $check->execute([$email]);

    if ($check->fetchColumn() > 0) {
        Response::error("Email already registered", 409);
    }

    // Insert new user
    $stmt = $pdo->prepare("
        INSERT INTO customers
        (username, password_hash, email, name, surname, zipcode, street, street_number, city, country, phone, instagram)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $username,
        password_hash($password, PASSWORD_DEFAULT),
        $email,
        $name,
        $surname,
        $zipcode,
        $street,
        $street_number,
        $city,
        $country,
        $phone,
        $instagram
    ]);

    // ----------------------------
// Send email
// ----------------------------

    $htmlBody = "
<html>
<head><meta charset='utf-8'><title>Wishlist</title></head>
<body>
<h2>Registrierung from {$name}</h2>
<p><strong>Email:</strong> {$email}</p>

<p>Sent from your website.</p>
</body>
</html>
";

    $plainText = "Registrierung  {$name} ({$email})\n\n";


    $name = htmlspecialchars($name ?? 'No name', ENT_QUOTES, 'UTF-8');
    $email = htmlspecialchars($email, ENT_QUOTES, 'UTF-8');

    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = getenv('MAIL_HOST'); // SMTP host
    $mail->SMTPAuth = true;
    $mail->Username = getenv('MAIL_USER') ;          // SMTP username
    $mail->Password = getenv('MAIL_PASS'); // SMTP password
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = 587;

    $mail->setFrom(getenv('MAIL_FROM'), getenv('MAIL_FROM_NAME') );
    $mail->addAddress(getenv('MAIL_TO_INTERN'));  // internal
    
    $mail->addAddress($email);     // copy to customer

    $mail->isHTML(true);
    $mail->Subject = "Registrierung from {$name}";
    $mail->Body = $htmlBody;
    $mail->AltBody = $plainText;

    $mail->send();


    Response::success(['id' => $pdo->lastInsertId()], "User registered successfully/Wishlist sent successfully!");

} catch (PDOException $e) {
    // Send error to Docker logs and respond with JSON
    error_log("DB Error: " . $e->getMessage());
    Response::error("Internal server error", 500, $e->getMessage());
}
