<?php
require_once __DIR__ . '/jwt_utils.php';
require_once __DIR__ . '/response.php';

$headers = getallheaders();
if (!isset($headers['Authorization'])) {
    json_response(["message" => "No token provided"], 401);
}

list(, $token) = explode(' ', $headers['Authorization']);
try {
    $decoded = verify_token($token);
} catch (Exception $e) {
    json_response(["message" => "Invalid or expired token"], 401);
}
