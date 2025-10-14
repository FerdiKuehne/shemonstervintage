<?php
// server.php — local development router for PHP built-in server

error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', 'php://stdout'); // log errors to Docker logs

// Start output buffering to prevent headers issues
ob_start();

// Parse the request path
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$file = __DIR__ . '/public' . $path;

// Serve static files (images, CSS, JS) first
if (is_file($file)) {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    header("Content-Type: " . mime_content_type($file));
    readfile($file);
    ob_end_flush();
    return true; // stop further routing
}

// Define $uri for API routing to avoid undefined variable
$uri = $path;

// Route everything else to your API
require __DIR__ . '/public/index.php';

// If index.php doesn’t handle the route, return JSON 404
if (!headers_sent()) {
    http_response_code(404);
    echo json_encode(["error" => "Route not found: $uri"]);
}

ob_end_flush();
