<?php
/**
 * Simple .env loader for environments without Composer
 */

final class EnvLoader
{
    public static function load(string $path): void
    {
        if (!file_exists($path)) {
            error_log("[ENV] .env file not found at: $path");
            return;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

        foreach ($lines as $line) {
            if (str_starts_with(trim($line), '#')) continue;

            [$name, $value] = array_map('trim', explode('=', $line, 2));
            if (!isset($_ENV[$name]) && !getenv($name)) {
                putenv("$name=$value");
                $_ENV[$name] = $value;
                $_SERVER[$name] = $value;
            }
        }
    }
}
