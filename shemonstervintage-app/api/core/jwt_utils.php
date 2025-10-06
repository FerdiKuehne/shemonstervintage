<?php
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

require_once __DIR__ . '/../config/auth_config.php';
$config = require __DIR__ . '/../config/auth_config.php';

function generate_tokens($user_id, $email) {
    global $config;

    $access_payload = [
        'sub' => $user_id,
        'email' => $email,
        'exp' => time() + $config['access_token_lifetime']
    ];

    $refresh_payload = [
        'sub' => $user_id,
        'type' => 'refresh',
        'exp' => time() + $config['refresh_token_lifetime']
    ];

    return [
        'access' => JWT::encode($access_payload, $config['jwt_secret'], 'HS256'),
        'refresh' => JWT::encode($refresh_payload, $config['jwt_secret'], 'HS256'),
    ];
}

function verify_token($token) {
    global $config;
    return JWT::decode($token, new Key($config['jwt_secret'], 'HS256'));
}
