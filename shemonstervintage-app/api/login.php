<?php
require __DIR__ . '/vendor/autoload.php';
require __DIR__ . '/db.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

$config = require __DIR__ . '/auth_config.php';

header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);
$email = $data['email'] ?? '';
$password = $data['password'] ?? '';

if (!$email || !$password) {
    http_response_code(400);
    echo json_encode(["message" => "Missing email or password"]);
    exit();
}

$stmt = $pdo->prepare("SELECT * FROM customers WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password'])) {
    http_response_code(401);
    echo json_encode(["message" => "Invalid credentials"]);
    exit();
}

// ✅ Create Access + Refresh Tokens
$now = time();
$access_payload = [
    'sub' => $user['id'],
    'email' => $user['email'],
    'exp' => $now + $config['access_token_lifetime'],
];
$refresh_payload = [
    'sub' => $user['id'],
    'type' => 'refresh',
    'exp' => $now + $config['refresh_token_lifetime'],
];

$access_token = JWT::encode($access_payload, $config['jwt_secret'], 'HS256');
$refresh_token = JWT::encode($refresh_payload, $config['jwt_secret'], 'HS256');

// Store refresh token in cookie (HttpOnly)
setcookie(
    'refresh_token',
    $refresh_token,
    [
        'expires' => time() + $config['refresh_token_lifetime'],
        'httponly' => true,
        'secure' => false, // set to true in production with HTTPS
        'samesite' => 'Lax',
    ]
);

echo json_encode([
    "access_token" => $access_token,
    "user" => [
        "id" => $user['id'],
        "email" => $user['email'],
        "name" => $user['name'],
    ],
]);
