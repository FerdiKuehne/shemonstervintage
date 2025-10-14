<?php
require __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/../../core/Response.php';

$config = require __DIR__ . '/auth_config.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

// ----------------------------
// CORS & preflight
// ----------------------------
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Only GET requests allowed', 405);
}

// ----------------------------
// Check refresh token cookie
// ----------------------------
if (!isset($_COOKIE['refresh_token'])) {
    Response::error('No refresh token provided', 401);
}

try {
    $decoded = JWT::decode($_COOKIE['refresh_token'], new Key($config['jwt_secret'], 'HS256'));

    if (!isset($decoded->type) || $decoded->type !== 'refresh') {
        throw new Exception('Invalid token type');
    }

    // ----------------------------
    // Generate new access token
    // ----------------------------
    $newAccessToken = JWT::encode([
        'sub' => $decoded->sub,
        'exp' => time() + $config['access_token_lifetime'],
    ], $config['jwt_secret'], 'HS256');

    Response::success(['access_token' => $newAccessToken]);

} catch (Exception $e) {
    Response::error('Invalid or expired refresh token', 401);
}
