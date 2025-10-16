<?php
require_once __DIR__ . '/../core/Response.php';
require_once __DIR__ . '/../config/jwt.php';
require_once __DIR__ . '/../vendor/jwt/src/JWT.php';
require_once __DIR__ . '/../vendor/jwt/src/Key.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

/**
 * Verifies the JWT stored in HttpOnly cookie.
 * Returns the decoded token payload if valid.
 * Sends a 401 response and exits if invalid.
 */
function requireAuth() {
    global $config;

    // 1️⃣ Read JWT from HttpOnly cookie
    $jwt = $_COOKIE['auth_token'] ?? null;
    if (!$jwt) {
        Response::error('Unauthorized: missing token', 401);
    }

    // 2️⃣ Verify and decode the token
    try {
        $decoded = JWT::decode($jwt, new Key($config['secret'], $config['algo']));
        return (array)$decoded; // return payload as array
    } catch (Exception $e) {
        Response::error('Unauthorized: invalid or expired token', 401);
    }
}
