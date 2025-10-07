<?php
session_start();
header('Content-Type: application/json');

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Routing
switch ($path) {
    case '/api/v1/login':
        require __DIR__ . '/login.php';
        break;

    case '/api/v1/logout':
        require __DIR__ . '/logout.php';
        break;

    case '/api/v1/wishlists':
        require __DIR__ . '/wishlists.php';
        break;

    case '/api/v1/texture.php':
        require __DIR__ . '/texture.php';
        break;

    case '/api/v1/register.php':
            require __DIR__ . '/register.php';
            break;     

    default:
        http_response_code(404);
        echo json_encode(["error" => "Not found"]);
}
