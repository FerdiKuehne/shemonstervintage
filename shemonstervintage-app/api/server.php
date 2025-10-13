<?php
// server.php — local development router for PHP built-in server

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$file = __DIR__ . '/public' . $path;

// Serve static files (images, CSS, JS) with CORS headers
if (is_file($file)) {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    header("Content-Type: " . mime_content_type($file));
    readfile($file);
    return true; // stop further routing
}

// Otherwise, route everything to your API
require __DIR__ . '/public/index.php';

