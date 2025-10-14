<?php
// routes/admin/debug.php

require_once __DIR__ . '/../../core/EnvLoader.php';
require_once __DIR__ . '/../../core/Response.php';

EnvLoader::load(__DIR__ . '/../../.env');

// Utility function to mask sensitive fields
function mask_sensitive($data) {
    if (is_array($data)) {
        foreach ($data as $key => $value) {
            if (preg_match('/(password|pass|secret|token|key)/i', $key)) {
                $data[$key] = '[hidden]';
            } elseif (is_array($value)) {
                $data[$key] = mask_sensitive($value);
            }
        }
    }
    return $data;
}

// Load config files
$app_config  = file_exists(__DIR__ . '/../../config/app_config.php') ? require __DIR__ . '/../../config/app_config.php' : null;
$auth_config = file_exists(__DIR__ . '/../../config/auth_config.php') ? require __DIR__ . '/../../config/auth_config.php' : null;
$db_config   = file_exists(__DIR__ . '/../../config/db.php') ? require __DIR__ . '/../../config/db.php' : null;
$jwt_config  = file_exists(__DIR__ . '/../../config/jwt.php') ? require __DIR__ . '/../../config/jwt.php' : null;

// Detect available routes
$routes_root = realpath(__DIR__ . '/../../routes');
$routes_list = [];
if ($routes_root) {
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($routes_root, RecursiveDirectoryIterator::SKIP_DOTS)
    );
    foreach ($iterator as $file) {
        if ($file->getExtension() === 'php') {
            $path = str_replace($routes_root, '', $file->getPathname());
            $routes_list[] = str_replace('.php', '', $path);
        }
    }
}

// Request info
$request_info = [
    'method' => $_SERVER['REQUEST_METHOD'] ?? 'CLI',
    'uri' => $_SERVER['REQUEST_URI'] ?? null,
    'ip' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
];

// ----------------------------
// Database connection and full data
// ----------------------------
$db_info = null;
try {
    $pdo = new PDO(
        'mysql:host=db;port=3306;dbname=shemonstervintage;charset=utf8mb4',
        'wishlist_user',
        'wishlist_pass',
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );

    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

    $all_data = [];
    foreach ($tables as $table) {
        $data_stmt = $pdo->query("SELECT * FROM `$table`");
        $rows = $data_stmt->fetchAll(PDO::FETCH_ASSOC);
        $all_data[$table] = mask_sensitive($rows);
    }

    $db_info = [
        'connected' => true,
        'tables' => $tables,
        'rows' => $all_data,
    ];

} catch (PDOException $e) {
    $db_info = [
        'connected' => false,
        'error' => $e->getMessage(),
    ];
}

// Build debug output
$debug_info = [
    'Environment' => [
        'PHP Version' => phpversion(),
        'App Env' => getenv('APP_ENV'),
        'App Debug' => getenv('APP_DEBUG'),
        'Current Time' => date('Y-m-d H:i:s'),
    ],
    'Configs' => mask_sensitive([
        'App Config' => $app_config,
        'Auth Config' => $auth_config,
        'DB Config' => $db_config,
        'JWT Config' => $jwt_config,
    ]),
    'Request Info' => $request_info,
    'Loaded Environment Variables' => mask_sensitive([
        'DB_HOST' => getenv('DB_HOST'),
        'DB_NAME' => getenv('DB_NAME'),
        'DB_USER' => getenv('DB_USER'),
        'JWT_SECRET' => getenv('JWT_SECRET'),
    ]),
    'Database' => $db_info,
    'Available Routes' => $routes_list,
];

// Send JSON response
Response::json($debug_info);
