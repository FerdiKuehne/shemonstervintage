<?php
// config/jwt.php

return [
    'algo'       => getenv('JWT_ALGO') ?: 'HS256',
    'issuer'     => getenv('JWT_ISSUER') ?: 'shemonstervintage',
    'audience'   => getenv('JWT_AUD') ?: 'shemonstervintage_users',
    'secret'     => getenv('JWT_SECRET') ?: 'supersecretkey',  // must be set in .env
    'expiration' => getenv('JWT_EXPIRATION') ?: 900,           // 15 minutes
];
