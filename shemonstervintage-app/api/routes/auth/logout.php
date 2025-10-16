<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', 'php://stdout');

require_once __DIR__ . '/../../core/Response.php';



// ----------------------------
// Clear auth cookie
// ----------------------------
$isLocal = $_SERVER['SERVER_NAME'] === 'localhost';

$cookieOptions = [
    'expires' => time() - 3600, 
    'path' => '/',
    'domain' => 'localhost',      // Must match your frontend domain if testing
    'secure' => false,            // localhost is not HTTPS
    'httponly' => true,
    'samesite' => 'Lax'           // Lax allows cross-site requests from top-level navigation
];

error_log('[LOGOUT cookieOptions] ' . print_r($cookieOptions, true));

setcookie('auth_token', '', $cookieOptions);

// ----------------------------
// Send confirmation
// ----------------------------
Response::success([
    'message' => 'Logged out successfully',
]);
