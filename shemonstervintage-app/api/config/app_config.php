<?php
return [
    // App settings
    'app_name' => 'SheMonsterVintage API',
    'environment' => 'development', // or 'production'
    'debug' => true,

    // Base URL (optional: useful if you deploy later)
    'base_url' => 'http://localhost:8000/api',

    // Logging
    'log_path' => __DIR__ . '/../logs/php-error.log',

    // Security
    'allowed_origins' => [
        'http://localhost:3000',  // your frontend (Vue)
        // add production frontend domain later, e.g.:
        // 'https://shemonsvintage.com'
    ],

    // Database info (optional if you prefer db.php)
    'database' => [
        'host' => 'db',
        'name' => 'shemonstervintage',
        'user' => 'root',
        'pass' => 'rootpass',
        'charset' => 'utf8mb4'
    ]
];
