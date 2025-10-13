<?php
require_once __DIR__ . '/../../core/Response.php';
require_once __DIR__ . '/../../core/Helpers.php';
require_once __DIR__ . '/../../app/database/connection.php';
require_once __DIR__ . '/../../app/config/jwt.php';
require_once __DIR__ . '/../../vendor/jwt/src/JWT.php';

use Firebase\JWT\JWT;

// Load JWT config
$config = require __DIR__ . '/../../app/config/jwt.php';

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
// Read & sanitize input
// ----------------------------
$input = get_json_input();
$email = sanitize($input['email'] ?? '');
$password = $input['password'] ?? '';

if (empty($email) || empty($password)) {
    Response::error('Email and password are required.', 400);
}

if (!validate_email($email)) {
    Response::error('Invalid email format.', 422);
}

// ----------------------------
// Connect to DB and fetch user
// ----------------------------
$db = Database::getConnection();
$stmt = $db->prepare('SELECT id, email, password, name FROM users WHERE email = :email LIMIT 1');
$stmt->bindParam(':email', $email, PDO::PARAM_STR);
$stmt->execute();
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user || !password_verify($password, $user['password'])) {
    app_log(['email' => $email], 'FAILED_LOGIN');
    Response::error('Invalid email or password.', 401);
}

// ----------------------------
// Generate JWT using config
// ----------------------------
$issuedAt   = time();
$expiration = $issuedAt + $config['expiration'];

$payload = [
    'iss' => $config['issuer'],
    'aud' => $config['audience'],
    'iat' => $issuedAt,
    'exp' => $expiration,
    'sub' => $user['id'],
    'email' => $user['email'],
];

$jwt = JWT::encode($payload, $config['secret'], $config['algo']);

// ----------------------------
// Update last login
// ----------------------------
$update = $db->prepare('UPDATE users SET last_login = NOW() WHERE id = :id');
$update->execute([':id' => $user['id']]);

// ----------------------------
// Send response
// ----------------------------
Response::success([
    'message' => 'Login successful',
    'token' => $jwt,
    'user' => [
        'id' => (int)$user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
    ],
]);
