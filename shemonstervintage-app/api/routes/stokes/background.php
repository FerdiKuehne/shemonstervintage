<?php
require_once __DIR__ . '/../../core/Response.php';
require_once __DIR__ . '/../../vendor/Mobile-Detect-4.8.x/standalone/autoloader.php';
require_once __DIR__ . '/../../vendor/Mobile-Detect-4.8.x/src/MobileDetectStandalone.php';

use Detection\MobileDetectStandalone;
use Detection\Exception\MobileDetectException;

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
// GD resizing helper
// ----------------------------
function createLowRes($sourcePath, $destPath, $maxWidth = 1024): bool
{
    if (!file_exists($sourcePath)) {
        return false;
    }

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
// Base paths
// ----------------------------
$baseDir = realpath(__DIR__ . '/../../public/img/background');
$highRes = "{$baseDir}/panorama.jpg";

if (!$baseDir || !file_exists($highRes)) {
    Response::error('Background image not found', 404);
}

$desktop = 'panorama_desktop.webp';
$tablet  = 'panorama_tablet.webp';
$mobile  = 'panorama_mobile.webp';

// Max widths
$desktopMax = 4096;
$tabletMax  = 2048;
$mobileMax  = 1440;
$dprLevels = [1, 2, 3, 4];

// ----------------------------
// Generate DPR variants
// ----------------------------
function generateDprVariantsGD($baseName, $maxWidth, $sourcePath, $dir, $dprLevels): void
{
    foreach ($dprLevels as $dpr) {
        $suffix = $dpr > 1 ? "_{$dpr}x" : "";
        $target = "{$dir}/" . str_replace(".webp", "{$suffix}.webp", $baseName);
        $resizeWidth = min($maxWidth * $dpr, 12288);
        if (!file_exists($target)) {
            createLowRes($sourcePath, $target, $resizeWidth);
        }
    }
}

generateDprVariantsGD($desktop, $desktopMax, $highRes, $baseDir, $dprLevels);
generateDprVariantsGD($tablet, $tabletMax, $highRes, $baseDir, $dprLevels);
generateDprVariantsGD($mobile, $mobileMax, $highRes, $baseDir, $dprLevels);

// ----------------------------
// Device detection
// ----------------------------
$detect = new MobileDetectStandalone();
$isMobile = $detect->isMobile();
$isTablet = $detect->isTablet();
$isDesktop = !$isMobile && !$isTablet;

// ----------------------------
// DPR handling
// ----------------------------
$dpr = isset($_GET['dpr']) ? floatval($_GET['dpr']) : 1;
$dpr = max(1, min($dpr, 4));
$dprInt = round($dpr);

// ----------------------------
// Select base texture
// ----------------------------
if ($isMobile) {
    $base = $mobile;
} elseif ($isTablet) {
    $base = $tablet;
} else {
    $base = $desktop;
}

$suffix = $dprInt > 1 ? "_{$dprInt}x" : "";
$texture = "/img/background/" . str_replace(".webp", "{$suffix}.webp", $base);

// ----------------------------
// Return JSON using Response class
// ----------------------------
Response::success([
    'texture' => $texture,
    'device' => $isMobile ? 'mobile' : ($isTablet ? 'tablet' : 'desktop'),
    'dpr' => $dprInt,
    'source_exists' => file_exists($highRes),
]);
