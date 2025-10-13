<?php
require __DIR__ . '/vendor/autoload.php';
$config = require __DIR__ . '/auth_config.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Credentials: true");

if (!isset($_COOKIE['refresh_token'])) {
    http_response_code(401);
    echo json_encode(["message" => "No refresh token"]);
    exit();
}

try {
    $decoded = JWT::decode($_COOKIE['refresh_token'], new Key($config['jwt_secret'], 'HS256'));
    if ($decoded->type !== 'refresh') {
        throw new Exception('Invalid token type');
    }

    $new_access_token = JWT::encode([
        'sub' => $decoded->sub,
        'exp' => time() + $config['access_token_lifetime'],
    ], $config['jwt_secret'], 'HS256');

    echo json_encode(["access_token" => $new_access_token]);
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(["message" => "Invalid or expired refresh token"]);
}
