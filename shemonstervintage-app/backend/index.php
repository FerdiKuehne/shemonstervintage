<?php
$request = $_SERVER['REQUEST_URI'];

if (preg_match('/^\/img\/(.+)$/', $request, $matches)) {
    $filename = $matches[1];
    $filepath = __DIR__ . '/img/' . $filename;

    if (file_exists($filepath)) {
        $mime = mime_content_type($filepath);
        header('Content-Type: ' . $mime);
        header('Content-Length: ' . filesize($filepath));
        readfile($filepath);
        exit;
    } else {
        http_response_code(404);
        echo "Image not found";
        exit;
    }
}

echo "Welcome to my site!";
