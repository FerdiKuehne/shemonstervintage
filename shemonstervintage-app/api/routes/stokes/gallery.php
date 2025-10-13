<?php
require_once __DIR__ . '/../../core/Response.php';
require_once __DIR__ . '/../../vendor/Mobile-Detect-4.8.x/standalone/autoloader.php';
require_once __DIR__ . '/../../vendor/Mobile-Detect-4.8.x/src/MobileDetectStandalone.php';

use Detection\MobileDetectStandalone;
use Detection\Exception\MobileDetectException;

// ----------------------------
// Disable HTML error output, log to file
// ----------------------------
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../../logs/php_errors.log'); // make sure logs folder exists
error_reporting(E_ALL);

// ----------------------------
// CORS headers
// ----------------------------
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ----------------------------
// Device detection
// ----------------------------
try {
    $detect = new MobileDetectStandalone();
    $isMobile = $detect->isMobile();
    $isTablet = $detect->isTablet();
    $isDesktop = !$isMobile && !$isTablet;
} catch (MobileDetectException $e) {
    $isMobile = $isTablet = false;
    $isDesktop = true;
}

// ----------------------------
// GD resizing helper
// ----------------------------
function createLowRes(string $sourcePath, string $destPath, int $maxWidth = 1024): bool
{
    if (!file_exists($sourcePath)) return false;

    [$width, $height, $type] = getimagesize($sourcePath);
    $scale = min($maxWidth / $width, 1);
    $newWidth = (int)($width * $scale);
    $newHeight = (int)($height * $scale);

    switch ($type) {
        case IMAGETYPE_JPEG: $src = imagecreatefromjpeg($sourcePath); break;
        case IMAGETYPE_PNG:  $src = imagecreatefrompng($sourcePath); break;
        case IMAGETYPE_WEBP: $src = imagecreatefromwebp($sourcePath); break;
        default: return false;
    }

    $dst = imagecreatetruecolor($newWidth, $newHeight);

    if ($type === IMAGETYPE_PNG || $type === IMAGETYPE_WEBP) {
        imagecolortransparent($dst, imagecolorallocatealpha($dst, 0, 0, 0, 127));
        imagealphablending($dst, false);
        imagesavealpha($dst, true);
    }

    imagecopyresampled($dst, $src, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

    $destPath = preg_replace('/\.(jpg|jpeg|png)$/i', '.webp', $destPath);
    imagewebp($dst, $destPath, 80);

    imagedestroy($src);
    imagedestroy($dst);

    return true;
}

// ----------------------------
// Base directories
// ----------------------------
$frontDir = __DIR__ . '/../../public/img/gallery/front';
$backDir  = __DIR__ . '/../../public/img/gallery/back';

if (!is_dir($frontDir) || !is_dir($backDir)) {
    Response::error('Gallery folders not found', 500);
}

// ----------------------------
// Gather images
// ----------------------------
$allFront = array_values(array_filter(scandir($frontDir), fn($f) => preg_match('/\.(jpg|jpeg|png)$/i', $f)));
$allBack  = array_values(array_filter(scandir($backDir), fn($f) => preg_match('/\.(jpg|jpeg|png)$/i', $f)));

natsort($allFront);
natsort($allBack);
$allFront = array_values($allFront);
$allBack  = array_values($allBack);

// ----------------------------
// Query params (sanitize!)
// ----------------------------
$type  = $_GET['type'] ?? 'front';
$batch = isset($_GET['batch']) && is_numeric($_GET['batch']) ? max(1, intval($_GET['batch'])) : 1;
$index = isset($_GET['index']) && is_numeric($_GET['index']) ? intval($_GET['index']) : null;
$perBatch = 8;
$dpr = isset($_GET['dpr']) && is_numeric($_GET['dpr']) ? min(max(floatval($_GET['dpr']), 1), 3) : 1;
$dprInt = round($dpr);

// ----------------------------
// Helper: get DPR WebP URL
// ----------------------------
function getImageUrl(string $dir, string $filename, int $dpr): string
{
    $sourcePath = "{$dir}/{$filename}";
    $target = preg_replace('/\.(jpg|jpeg|png)$/i', "_{$dpr}x.webp", $sourcePath);

    if (!file_exists($target)) {
        createLowRes($sourcePath, $target, 1024 * $dpr);
    }

    return str_replace(__DIR__ . '/../../public', '', $target);
}

// ----------------------------
// Build response
// ----------------------------
try {
    $response = [];

    if ($type === 'front') {
        $start = ($batch - 1) * $perBatch;
        $frontChunk = array_slice($allFront, $start, $perBatch);

        $response['front'] = [];
        foreach ($frontChunk as $img) {
            $response['front'][$img] = getImageUrl($frontDir, $img, $dprInt);
        }
    } elseif ($type === 'back' && $index !== null) {
        if (!isset($allBack[$index])) {
            Response::error('Invalid index', 400);
        }
        $backFile = $allBack[$index];
        $response['back'] = [];
        $response['back'][$backFile] = getImageUrl($backDir, $backFile, $dprInt);
    } else {
        Response::error('Invalid type', 400);
    }

    $response['dpr'] = $dprInt;
    $response['device'] = $isMobile ? 'mobile' : ($isTablet ? 'tablet' : 'desktop');

    Response::success($response);

} catch (\Throwable $e) {
    Response::error('Internal server error', 500);
}
