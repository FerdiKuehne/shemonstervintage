<?php
require_once __DIR__ . '/../core/EnvLoader.php';
require_once __DIR__ . '/../core/Response.php';
require_once __DIR__ . '/../core/Router.php';
//require_once __DIR__ . '/../config/db.php'; // optional for now

// Load environment
EnvLoader::load(__DIR__ . '/../.env');
error_log('[ENV] Loaded environment: ' . getenv('APP_ENV'));

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

// -------------------------------------------------
// Instantiate Router and handle request
// -------------------------------------------------
$router = new Router(__DIR__ . '/../routes');
$router->handle($uri, $method);
