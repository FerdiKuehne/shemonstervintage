<?php

// Handle CORS for frontend dev
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS')
    exit(200);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["message" => "Only POST allowed"]);
    exit();
}

// Get POSTed data
$input = file_get_contents('php://input');
$data = json_decode($input, true);


if (empty($username) || empty($password) || empty($email) || empty($name) || empty($surname) || empty($zipcode) || empty($street) || empty($street_number) || empty($city) || empty($country) || empty($phone) || empty($instagram)) {
    echo json_encode(["message" => "Missing data"]);
    exit();
}

require __DIR__ . '/db.php';

$stmt = $pdo->prepare(;
$stmt->execute([]);




