<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', 'php://stdout');

require_once __DIR__ . '/../../core/Response.php';


if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Only POST requests allowed', 405);
}

// ----------------------------
// Clear auth cookie
// ----------------------------
$isLocal = $_SERVER['SERVER_NAME'] === 'localhost';

$cookieOptions = [
    'expires' => time() - 3600, 
    'path' => '/',
    'domain' => $isLocal ? '' : getenv('DOMAIN'),
    'secure' => !$isLocal,
    'httponly' => true,
    'samesite' => $isLocal ? 'Lax' : 'Strict',
];

setcookie('auth_token', '', $cookieOptions);

// ----------------------------
// Send confirmation
// ----------------------------
Response::success([
    'message' => 'Logged out successfully',
]);
