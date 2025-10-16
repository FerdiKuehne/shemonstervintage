<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', 'php://stdout'); // log errors to Docker logs


require_once __DIR__ . '/../core/EnvLoader.php';
require_once __DIR__ . '/../core/Response.php';
require_once __DIR__ . '/../core/Router.php';
//require_once __DIR__ . '/../config/db.php'; // optional for now

// Load environment
EnvLoader::load(__DIR__ . '/../.env');
error_log('[ENV] Loaded environment: ' . getenv('APP_ENV'));


error_log('[ENV] Loaded environment: ' . getenv('APP_ENV'));



if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Determine the origin
    $frontendOrigin = 'http://localhost:3000';

    // Apply CORS headers
    header("Access-Control-Allow-Origin: $frontendOrigin");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    header("Access-Control-Max-Age: 86400");

    http_response_code(204); // No content
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
