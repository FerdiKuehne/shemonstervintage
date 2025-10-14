<?php
// /api/database/connect.php

class Database {
    private static ?PDO $connection = null;

    public static function getConnection(): PDO {
        if (self::$connection === null) {
            // Load configuration
            $configPath = __DIR__ . '/../config/db.php';
            if (!file_exists($configPath)) {
                error_log("Database config not found at $configPath");
                throw new Exception("Database configuration missing");
            }

            $config = require $configPath;

            // Extract config values
            $host     = $config['host'] ?? 'db';
            $port     = $config['port'] ?? 3306;
            $dbname   = $config['name'] ?? 'shemonstervintage';
            $user     = $config['user'] ?? 'wishlist_user';
            $pass     = $config['pass'] ?? 'wishlist_pass';
            $charset  = $config['charset'] ?? 'utf8mb4';

            $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset={$charset}";

            try {
                self::$connection = new PDO($dsn, $user, $pass, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]);
            } catch (PDOException $e) {
                error_log("Database connection failed: " . $e->getMessage());
                // Return a clear JSON response for API
                header('Content-Type: application/json', true, 500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Database connection failed.',
                    'details' => $e->getMessage(),
                ]);
                exit;
            }
        }

        return self::$connection;
    }

    // Optional — avoid PHP warning for magic methods
    public function __wakeup() {}
}
