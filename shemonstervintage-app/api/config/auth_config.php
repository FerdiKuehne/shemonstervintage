<?php
// auth_config.php
return [
    'jwt_secret' => 'supersecretkey-change-this', // use a long random string
    'access_token_lifetime' => 900, // 15 minutes
    'refresh_token_lifetime' => 604800, // 7 days
];
