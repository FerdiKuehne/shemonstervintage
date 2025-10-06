<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php-error.log');

header("Access-Control-Allow-Origin: *"); 
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

// Only POST allowed
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["message" => "Only POST allowed"]);
    exit();
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
    echo json_encode(["message" => "Missing data"]);
    exit();
}

require __DIR__ . '/db.php';

try {
    error_log("Checking if email exists");
    $check = $pdo->prepare("SELECT COUNT(*) FROM customers WHERE email = ?");
    $check->execute([$email]);

    if ($check->fetchColumn() > 0) {
        http_response_code(409);
        echo json_encode(["message" => "Email already registered"]);
        exit();
    }

    $stmt = $pdo->prepare("INSERT INTO customers (username, password_hash, email, name, surname, zipcode, street, street_number, city, country, phone, instagram) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
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

    echo json_encode(["message" => "User registered successfully"]);

} catch (PDOException $e) {
    http_response_code(500);
    error_log("DB Error: " . $e->getMessage());
    echo json_encode(["message" => "Internal server error"]);
}
