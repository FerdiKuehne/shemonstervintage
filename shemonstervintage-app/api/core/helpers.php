<?php
// core/Helpers.php

if (!function_exists('get_json_input')) {
    /**
     * Safely decode JSON input from php://input.
     *
     * @return array
     */
    function get_json_input(): array
    {
        $input = file_get_contents('php://input');
        if (!$input) return [];

        $data = json_decode($input, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log('Invalid JSON input: ' . json_last_error_msg());
            return [];
        }

        return is_array($data) ? $data : [];
    }
}

if (!function_exists('get_bearer_token')) {
    /**
     * Extract Bearer token from Authorization header.
     *
     * @return string|null
     */
    function get_bearer_token(): ?string
    {
        $headers = getallheaders();

        if (!isset($headers['Authorization'])) {
            return null;
        }

        $authHeader = trim($headers['Authorization']);

        if (stripos($authHeader, 'Bearer ') === 0) {
            return substr($authHeader, 7);
        }

        return null;
    }
}

if (!function_exists('sanitize')) {
    /**
     * Sanitize user input safely (basic XSS & trim).
     *
     * @param string|null $value
     * @return string
     */
    function sanitize(?string $value): string
    {
        return htmlspecialchars(trim((string)$value), ENT_QUOTES, 'UTF-8');
    }
}

if (!function_exists('validate_email')) {
    /**
     * Validate email format.
     *
     * @param string $email
     * @return bool
     */
    function validate_email(string $email): bool
    {
        return (bool)filter_var($email, FILTER_VALIDATE_EMAIL);
    }
}

if (!function_exists('validate_password')) {
    /**
     * Validate password strength (min length 8, one uppercase, one number)
     *
     * @param string $password
     * @return bool
     */
    function validate_password(string $password): bool
    {
        return (bool)preg_match('/^(?=.*[A-Z])(?=.*\d).{8,}$/', $password);
    }
}

if (!function_exists('app_log')) {
    /**
     * Log data safely in production or dev.
     *
     * @param mixed $data
     * @param string $label
     * @return void
     */
    function app_log($data, string $label = 'DEBUG'): void
    {
        $formatted = '[' . date('Y-m-d H:i:s') . "] [$label] " . print_r($data, true) . "\n";
        error_log($formatted);
    }
}

if (!function_exists('is_json_request')) {
    /**
     * Check if the request is a JSON API request.
     *
     * @return bool
     */
    function is_json_request(): bool
    {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        return stripos($contentType, 'application/json') !== false;
    }
}

if (!function_exists('get_query_param')) {
    /**
     * Get a single query param from $_GET safely.
     *
     * @param string $key
     * @param mixed $default
     * @return mixed
     */
    function get_query_param(string $key, $default = null)
    {
        return isset($_GET[$key]) ? sanitize($_GET[$key]) : $default;
    }
}

if (!function_exists('get_request_method')) {
    /**
     * Return current HTTP method.
     *
     * @return string
     */
    function get_request_method(): string
    {
        return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    }
}

if (!function_exists('get_client_ip')) {
    /**
     * Get client IP address safely (works behind proxies).
     *
     * @return string
     */
    function get_client_ip(): string
    {
        $keys = [
            'HTTP_CLIENT_IP',
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_FORWARDED',
            'HTTP_X_CLUSTER_CLIENT_IP',
            'HTTP_FORWARDED_FOR',
            'HTTP_FORWARDED',
            'REMOTE_ADDR'
        ];

        foreach ($keys as $key) {
            if (!empty($_SERVER[$key])) {
                $ipList = explode(',', $_SERVER[$key]);
                foreach ($ipList as $ip) {
                    $ip = trim($ip);
                    if (filter_var($ip, FILTER_VALIDATE_IP)) {
                        return $ip;
                    }
                }
            }
        }

        return 'UNKNOWN';
    }
}
