<?php
// Enable full error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', 'php://stdout'); // Log to Docker logs

require_once __DIR__ . '/../../database/connect.php';
require_once __DIR__ . '/../../core/Response.php'; // Response class

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

$username      = $data['username'] ?? '';
$name          = $data['name'] ?? '';
$surname       = $data['surname'] ?? '';
$password      = $data['password'] ?? '';
$email         = $data['email'] ?? '';
$zipcode       = $data['zipcode'] ?? '';
$street        = $data['street'] ?? '';
$street_number = $data['street_number'] ?? '';
$city          = $data['city'] ?? '';
$country       = $data['country'] ?? '';
$phone         = $data['phone'] ?? '';
$instagram     = $data['instagram'] ?? '';

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

    Response::success(['id' => $pdo->lastInsertId()], "User registered successfully");

} catch (PDOException $e) {
    // Send error to Docker logs and respond with JSON
    error_log("DB Error: " . $e->getMessage());
    Response::error("Internal server error", 500, $e->getMessage());
}
