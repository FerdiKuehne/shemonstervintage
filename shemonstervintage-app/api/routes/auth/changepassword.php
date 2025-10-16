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


error_log('[CHANGE PASSWORD START]');

$config = require __DIR__ . '/../../config/jwt.php';
$pdo = Database::getConnection();

// Parse JSON body
$input = json_decode(file_get_contents("php://input"), true);
$newPassword = $input['newPassword'] ?? null;
$oldPassword = $input['oldPassword'] ?? null;

if (!$newPassword || !$oldPassword) {
    Response::error("Missing old or new password", 400);
}

// Get JWT token
$jwtToken = $_COOKIE['auth_token'] ?? null;
if (!$jwtToken) {
    Response::error("No auth token found", 401);
}

// Decode JWT
try {
    $decoded = JWT::decode($jwtToken, new Key($config['secret'], $config['algo']));
} catch (Exception $e) {
    error_log('[CHANGE PASSWORD ERROR] ' . $e->getMessage());
    Response::error("Invalid or expired token", 401);
}

// Extract email
$email = $decoded->email ?? null;
if (!$email) {
    Response::error("Email missing in token", 400);
}

// Get current user
$stmt = $pdo->prepare("SELECT password_hash FROM customers WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    Response::error("User not found", 404);
}

// Verify old password
if (!password_verify($oldPassword, $user['password_hash'])) {
    Response::error("Old password incorrect", 403);
}

// Hash new password
$hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);

// Update DB
$update = $pdo->prepare("UPDATE customers SET password_hash = ? WHERE email = ?");
$update->execute([$hashedPassword, $email]);

if ($update->rowCount() === 0) {
    Response::error("Password update failed", 500);
}

$response = [
    'message' => 'Password updated successfully',
    'email' => $email
];

error_log('[CHANGE PASSWORD RESPONSE] ' . print_r($response, true));
Response::success($response);