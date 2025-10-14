<?php
// Enable full error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', 'php://stdout');

require_once __DIR__ . '/../../database/connect.php';
require_once __DIR__ . '/../../core/Response.php';

// CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

// Only POST requests allowed
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error("Only POST allowed", 405);
}

// Get POSTed data
$input = file_get_contents('php://input');
$data = json_decode($input, true);
$email = $data['email'] ?? '';

if (empty($email)) {
    Response::error("Missing email", 400);
}

// Connect to database
$pdo = Database::getConnection();

try {
    // Check if user exists
    $check = $pdo->prepare("SELECT id FROM customers WHERE email = ?");
    $check->execute([$email]);
    $user = $check->fetch();

    if (!$user) {
        Response::error("No user found with this email", 404);
    }

    // Delete user
    $stmt = $pdo->prepare("DELETE FROM customers WHERE email = ?");
    $stmt->execute([$email]);

    Response::success(["deleted_email" => $email], "User deleted successfully");

} catch (PDOException $e) {
    error_log("DB Error: " . $e->getMessage());
    Response::error("Internal server error", 500, $e->getMessage());
}
