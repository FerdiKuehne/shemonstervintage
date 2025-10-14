<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php-error.log');

header("Access-Control-Allow-Origin: *"); 
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["message" => "Only POST allowed"]);
    exit();
}

require __DIR__ . '/db.php';

try {
    // Sample user
    $username = 'testuser';
    $password = 'testpass';
    $email = 'testuser@example.com';
    $name = 'Test';
    $surname = 'User';

    // Check if user exists
    $check = $pdo->prepare("SELECT id FROM customers WHERE email = ?");
    $check->execute([$email]);
    $customer_id = $check->fetchColumn();

    if (!$customer_id) {
        $stmt = $pdo->prepare("INSERT INTO customers (username, password_hash, email, name, surname) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([
            $username,
            password_hash($password, PASSWORD_DEFAULT),
            $email,
            $name,
            $surname
        ]);
        $customer_id = $pdo->lastInsertId();
    }

    // Sample wishlist items
    $wishlistItems = [
        ['category'=>'Clothes','sub_category'=>'T-Shirt','size'=>'M','color'=>'Black','brand'=>'Nike','style'=>'Casual'],
        ['category'=>'Shoes','sub_category'=>'Sneakers','size'=>'42','color'=>'White','brand'=>'Adidas','style'=>'Sport']
    ];

    $insertedItems = [];
    foreach ($wishlistItems as $item) {
        $stmt = $pdo->prepare("INSERT INTO wishlist (customer_id, category, sub_category, size, color, brand, style) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $customer_id,
            $item['category'],
            $item['sub_category'],
            $item['size'],
            $item['color'],
            $item['brand'],
            $item['style']
        ]);
        $insertedItems[] = $item;
    }

    echo json_encode([
        "message" => "Test user and wishlist seeded successfully",
        "customer_id" => $customer_id,
        "wishlist_items" => $insertedItems
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    error_log("DB Error: " . $e->getMessage());
    echo json_encode(["message" => "Internal server error"]);
}
