<?php
// server.php — local development router for PHP built-in server

error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', 'php://stdout'); // log errors to Docker logs

// Start output buffering to prevent headers issues
ob_start();

error_log('[SERVER.PHP CHECK COOKIE] ' . print_r($_COOKIE, true));
error_log( "[SERVER.PHP CHECK URL]". parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// Parse the request path
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$file = __DIR__ . '/public' . $path;

// Serve static files (images, CSS, JS) first
if (is_file($file)) {
    // Allow cross-origin access for static assets only (safe)
    header("Access-Control-Allow-Origin: http://localhost:3000");
    header("Access-Control-Allow-Methods: GET, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type");
    header("Access-Control-Allow-Credentials: false"); // no cookies needed for static
    header("Access-Control-Max-Age: 86400");

    header("Content-Type: " . mime_content_type($file));
    readfile($file);
    ob_end_flush();
    return true;
}


// Define $uri for API routing to avoid undefined variable
$uri = $path;


error_log("[SERVER:PHP:CORS] Handling URI: $uri");


// Route everything else to your API
require __DIR__ . '/public/index.php';

// If index.php doesn’t handle the route, return JSON 404
if (!headers_sent()) {
    http_response_code(404);
    echo json_encode(["error" => "Route not found: $uri"]);
}

ob_end_flush();
