<?php
// config/app_config.php

// Set default timezone
date_default_timezone_set(getenv('APP_TIMEZONE') ?: 'Europe/Berlin');

return [
    'env' => getenv('APP_ENV') ?: 'development',
    'debug' => getenv('APP_DEBUG') === 'true', // optional debug flag
    'base_url' => getenv('BASE_URL') ?: 'http://localhost',
];
