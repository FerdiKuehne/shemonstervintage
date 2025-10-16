<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', 'php://stdout');

require_once __DIR__ . '/../../core/Response.php';
require_once __DIR__ . '/../../core/Helpers.php';
require_once __DIR__ . '/../../database/connect.php';
require_once __DIR__ . '/../../config/jwt.php';
require_once __DIR__ . '/../../vendor/jwt/src/JWT.php';

use Firebase\JWT\JWT;

$config = require __DIR__ . '/../../config/jwt.php';

// ----------------------------
// Ensure POST
// ----------------------------
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Only POST requests allowed', 405);
}

// ----------------------------
// Read & sanitize input
// ----------------------------
$input = json_decode(file_get_contents('php://input'), true);
$email = trim($input['email'] ?? '');
$password = $input['password'] ?? '';

if (empty($email) || empty($password)) {
    Response::error('Email and password are required.', 400);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    Response::error('Invalid email format.', 422);
}

// ----------------------------
// Connect to DB
// ----------------------------
$db = Database::getConnection();
$stmt = $db->prepare('SELECT id, email, password_hash AS password, username AS name FROM customers WHERE email = :email LIMIT 1');
$stmt->bindParam(':email', $email, PDO::PARAM_STR);
$stmt->execute();
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user || !password_verify($password, $user['password'])) {
    app_log(['email' => $email], 'FAILED_LOGIN');
    Response::error('Invalid email or password.', 401);
}

// ----------------------------
// JWT generation
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
$update = $db->prepare('UPDATE customers SET last_login = NOW() WHERE id = :id');
$update->execute([':id' => $user['id']]);

// ----------------------------
// Set cookie
// ----------------------------
$isLocal = in_array($_SERVER['SERVER_NAME'], ['localhost', '127.0.0.1']);
$cookieOptions = [
    'expires' => time() + 1800,
    'path' => '/',
    'domain' => $isLocal ? '' : 'shemonstervintage.com',
    'secure' => !$isLocal,
    'httponly' => true,
    'samesite' => $isLocal ? 'Lax' : 'Strict',
];

setcookie('auth_token', $jwt, $cookieOptions);

// ----------------------------
// Respond
// ----------------------------
Response::success([
    'message' => 'Login successful',
    'user' => [
        'id' => (int)$user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
    ],
]);
