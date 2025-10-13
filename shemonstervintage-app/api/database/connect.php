<?php
/**
 * Database Connection (Production-Ready)
 * --------------------------------------
 * Secure and reusable PDO connection handler.
 * Uses UTF-8MB4, exception mode, and environment-aware config.
 */

require_once __DIR__ . '/../config/app_config.php';
require_once __DIR__ . '/../../core/Response.php';

final class Database
{
    private static ?PDO $connection = null;

    /**
     * Prevent instantiation
     */
    private function __construct() {}
    private function __clone() {}
    private function __wakeup() {}

    /**
     * Returns a shared PDO instance.
     * @return PDO
     */
    public static function getConnection(): PDO
    {
        if (self::$connection instanceof PDO) {
            return self::$connection;
        }

        $dsn = sprintf(
            'mysql:host=%s;dbname=%s;charset=utf8mb4',
            DB_HOST,
            DB_NAME
        );

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // Throw exceptions
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // Fetch as associative arrays
            PDO::ATTR_EMULATE_PREPARES   => false,                  // Native prepared statements
            PDO::ATTR_PERSISTENT         => true,                   // Persistent connection
        ];

        try {
            self::$connection = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            self::handleConnectionError($e);
        }

        return self::$connection;
    }

    /**
     * Graceful database connection error handler.
     */
    private static function handleConnectionError(PDOException $e): void
    {
        error_log('[DB ERROR] ' . $e->getMessage());

        // Use unified API JSON response for consistency
        json_response([
            'error' => 'Database connection failed.',
            'details' => APP_ENV !== 'production' ? $e->getMessage() : null,
        ], 500);
    }
}
