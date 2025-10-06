<?php
function handle_route($uri, $method) {
    $base = __DIR__ . '/../routes';

    $path = explode('/', trim($uri, '/'));
    if (empty($path[0])) {
        require $base . '/index.php';
        return;
    }

    $folder = $path[0];
    $file = $path[1] ?? 'index';
    $routeFile = "$base/$folder/$file.php";

    if (file_exists($routeFile)) {
        require $routeFile;
    } else {
        http_response_code(404);
        echo json_encode(["message" => "Endpoint not found"]);
    }
}
