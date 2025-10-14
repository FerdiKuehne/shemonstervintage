<?php
// config/mail.php

return [
    'host'        => getenv('MAIL_HOST') ?: 'hidden.hidden.com',
    'username'    => getenv('MAIL_USER') ?: 'hiddenuser',
    'password'    => getenv('MAIL_PASS') ?: 'hidden',
    'port'        => getenv('MAIL_PORT') ?: 587,
    'encryption'  => getenv('MAIL_ENCRYPTION') ?: 'tls', // or 'ssl' if you use port 465
    'from_email'  => getenv('MAIL_FROM') ?: 'info@shemonstervintage.com',
    'from_name'   => getenv('MAIL_FROM_NAME') ?: 'shemonstervintage.com',
    'to_email'    => getenv('MAIL_TO_INTERN') ?: 'info@shemonstervintage.com',
];
