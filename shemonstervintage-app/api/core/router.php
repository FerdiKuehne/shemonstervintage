<?php
// core/Router.php

require_once __DIR__ . '/Response.php';

/**
 * Lightweight, production-ready router for structured route files.
 *
 * Example mapping:
 *   /auth/login           → routes/auth/login.php
 *   /gallery/page/3       → routes/gallery/page.php + $params = [3]
 *   /wishlist             → routes/wishlist/index.php
 */
class Router
{
    private string $basePath;
    private ?string $fallbackRoute = null;

    public function __construct(string $basePath)
    {
        $this->basePath = rtrim($basePath, '/');
    }

    /**
     * Optional: define a fallback route (for 404 or SPA)
     */
    public function setFallback(string $routeFile): void
    {
        $this->fallbackRoute = $routeFile;
    }

    /**
     * Main router entry point.
     */
    public function handle(string $uri, string $method): void
    {
        try {
            // Handle CORS preflight requests automatically
            if ($method === 'OPTIONS') {
                $this->sendCorsHeaders();
                http_response_code(204); // No content
                exit;
            }

            $this->sendCorsHeaders(); // always allow configured origins

            $path = parse_url($uri, PHP_URL_PATH);
            $path = $this->sanitizePath($path);

            // Handle root
            if ($path === '' || $path === '/') {
                $this->requireRoute('index');
                return;
            }

            $segments = explode('/', $path);
            $folder = $segments[0] ?? '';
            $file = $segments[1] ?? 'index';

            $routeFile = "{$this->basePath}/{$folder}/{$file}.php";

            if (file_exists($routeFile)) {
                $params = array_slice($segments, 2);
                // Make parameters locally available to included route
                $this->executeRoute($routeFile, $params, $method);
            } elseif ($this->fallbackRoute && file_exists($this->fallbackRoute)) {
                require $this->fallbackRoute;
            } else {
                $this->respondNotFound($path);
            }

        } catch (Throwable $e) {
            $this->handleException($e);
        }
    }

    /**
     * Clean and normalize the request path.
     */
    private function sanitizePath(string $path): string
    {
        // Prevent directory traversal (e.g., ../../../etc/passwd)
        $path = preg_replace('/\.\.+/', '', $path);
        return trim($path, '/');
    }

    /**
     * Executes the matched route file safely.
     */
    private function executeRoute(string $file, array $params, string $method): void
    {
        // Avoid polluting the global namespace
        $routeParams = $params;
        $requestMethod = strtoupper($method);

        // Optionally make available via $params in the route scope
        require $file;
    }

    /**
     * Send safe CORS headers.
     */
    private function sendCorsHeaders(): void
    {
        // In production, set your domain instead of *
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        header('Access-Control-Max-Age: 86400');
    }

    /**
     * Standardized 404 response.
     */
    private function respondNotFound(string $path): void
    {
        error_log("[404] Route not found: $path");
        Response::error('Internal Server Error', 404);
    }

    /**
     * Centralized exception handler.
     */
    private function handleException(Throwable $e): void
    {
        error_log("[RouterError] " . $e->getMessage() . "\n" . $e->getTraceAsString());

        Response::error('Internal Server Error', 500);
    }

    /**
     * Optional utility for requiring simple route files.
     */
    private function requireRoute(string $name): void
    {
        $file = "{$this->basePath}/{$name}.php";
        if (file_exists($file)) {
            require $file;
        } else {
            $this->respondNotFound($name);
        }
    }
}
