<?php
// routes/auth/me.php
require_once __DIR__ . '/../../core/Response.php';


if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}


error_log('[CHECK] ' . print_r($_COOKIE, true));

// Check JWT cookie
if (isset($_COOKIE['auth_token'])) {
    Response::success(['loggedIn' => true]);
} else {
    Response::success(['loggedIn' => false]);
}
