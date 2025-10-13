<?php
// core/Response.php

/**
 * Unified JSON Response handler for the API.
 *
 * Usage:
 *   Response::json(['foo' => 'bar']);
 *   Response::success(['id' => 1]);
 *   Response::error('Something went wrong', 500);
 */

class Response
{
    /**
     * Send a JSON response.
     */
    public static function json(mixed $data, int $status = 200, array $headers = []): void
    {
        if (php_sapi_name() !== 'cli') {
            if (!headers_sent()) {
                // Clean any output buffer
                if (ob_get_length()) ob_clean();

                // Default JSON headers
                header('Content-Type: application/json; charset=utf-8');
                header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
                header('Pragma: no-cache');

                // Custom headers
                foreach ($headers as $key => $value) {
                    header("$key: $value");
                }

                http_response_code($status);
            } else {
                error_log('Headers already sent before Response::json()');
            }
        }

        // Encode JSON
        $flags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;
        if (getenv('APP_ENV') !== 'production') $flags |= JSON_PRETTY_PRINT;

        $json = json_encode($data, $flags);

        // Handle encoding errors
        if ($json === false) {
            $json = json_encode([
                'error' => true,
                'message' => 'JSON encoding failed',
                'reason' => json_last_error_msg()
            ], $flags);
            http_response_code(500);
        }

        echo $json;
        exit;
    }

    /**
     * Standardized success response.
     */
    public static function success(mixed $data = [], string $message = 'OK', int $status = 200): void
    {
        self::json([
            'success' => true,
            'message' => $message,
            'data' => $data
        ], $status);
    }

    /**
     * Standardized error response.
     */
    public static function error(string $message = 'Something went wrong.', int $status = 500, mixed $details = null): void
    {
        $response = [
            'success' => false,
            'message' => $message,
        ];

        if ($details && getenv('APP_ENV') !== 'production') {
            $response['details'] = $details;
        }

        self::json($response, $status);
    }
}
