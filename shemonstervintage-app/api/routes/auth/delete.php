<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', 'php://stdout');

require_once __DIR__ . '/../../core/Response.php';
require_once __DIR__ . '/../../database/connect.php';
require_once __DIR__ . '/../../config/jwt.php';
require_once __DIR__ . '/../../vendor/jwt/src/JWT.php';
require_once __DIR__ . '/../../vendor/jwt/src/Key.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;


// ----------------------------
// Get inpu
// ----------------------------
$input = json_decode(file_get_contents('php://input'), true);
$email = trim($input['email'] ?? '');
$jwtToken = $_COOKIE['auth_token'] ?? '';

if (empty($email) || empty($jwtToken)) {
    Response::error("Email and auth token are required", 400);
}

// ----------------------------
// Verify JWT
// ----------------------------
$config = require __DIR__ . '/../../config/jwt.php';


try {
    $decoded = JWT::decode($jwtToken, new Key($config['secret'], $config['algo']));
} catch (\Firebase\JWT\ExpiredException $e) {
    error_log('[ExpiredException] ' . print_r($e, true));
    Response::error("Token expired", 401);
} catch (\Firebase\JWT\SignatureInvalidException $e) {
    error_log('[SignatureInvalidException] ' . print_r($e, true));
    Response::error("Invalid token signature", 401);
} catch (\UnexpectedValueException $e) {
    error_log('[UnexpectedValueException] ' . print_r($e, true));
    Response::error("Invalid token", 401);
}

// ----------------------------
// Delete user
// ----------------------------
$pdo = Database::getConnection();

try {
    $stmt = $pdo->prepare("DELETE FROM customers WHERE email = ?");
    $stmt->execute([$email]);

    if ($stmt->rowCount() === 0) {
        Response::error("No user found with this email", 404);
    }

    // Clear auth cookie
    setcookie('auth_token', '', [
        'expires' => time() - 3600,
        'path' => '/',
        'domain' => 'localhost',
        'secure' => false,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);

    Response::success(['email' => $email], "User deleted successfully");

} catch (PDOException $e) {
    Response::error("Internal server error", 500, $e->getMessage());
}
