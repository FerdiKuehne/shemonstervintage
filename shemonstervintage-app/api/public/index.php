<?php
require_once __DIR__ . '/../core/router.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../config/db.php';

// Enable CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Get request URI
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = str_replace('/api', '', $uri); // adjust if /api prefix
$method = $_SERVER['REQUEST_METHOD'];

// Route it
handle_route($uri, $method);
