<?php
require __DIR__ . '/db.php';

$data = json_decode(file_get_contents("php://input"), true);

$username = $data['username'] ?? '';
$password = $data['password'] ?? '';

$stmt = $pdo->prepare("SELECT * FROM admins WHERE username = ?");
$stmt->execute([$username]);
$admin = $stmt->fetch(PDO::FETCH_ASSOC);

if ($admin && password_verify($password, $admin['password_hash'])) {
    $_SESSION['admin'] = $admin['username'];
    echo json_encode(["success" => true]);
} else {
    http_response_code(401);
    echo json_encode(["error" => "Invalid credentials"]);
}