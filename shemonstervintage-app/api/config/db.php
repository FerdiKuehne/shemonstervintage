<?php
// config/db.php
return [
    'host' => getenv('DB_HOST') ?: 'db',
    'port' => getenv('DB_PORT') ?: 3306,
    'name' => getenv('DB_NAME') ?: 'shemonstervintage',
    'user' => getenv('DB_USER') ?: 'wishlist_user',
    'pass' => getenv('DB_PASS') ?: 'wishlist_pass',
    'charset' => 'utf8mb4',
];