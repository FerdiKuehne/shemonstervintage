<?php
// ----------------------------
// CORS headers
// ----------------------------
header("Access-Control-Allow-Origin: http://localhost:3000"); 
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// ----------------------------
// MobileDetect
// ----------------------------
require_once __DIR__ . '/src/MobileDetectStandalone.php';
use Detection\MobileDetectStandalone;

// ----------------------------
// GD resizing function
// ----------------------------
function createLowRes($sourcePath, $destPath, $maxWidth = 1024) {
    if (!file_exists($sourcePath)) return false;

    list($width, $height, $type) = getimagesize($sourcePath);
    $scale = min($maxWidth / $width, 1); // do not upscale
    $newWidth = (int)($width * $scale);
    $newHeight = (int)($height * $scale);

    switch ($type) {
        case IMAGETYPE_JPEG: $src = imagecreatefromjpeg($sourcePath); break;
        case IMAGETYPE_PNG:  $src = imagecreatefrompng($sourcePath);  break;
        default: return false;
    }

    $dst = imagecreatetruecolor($newWidth, $newHeight);
    imagecopyresampled($dst, $src, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

    switch ($type) {
        case IMAGETYPE_JPEG: imagejpeg($dst, $destPath, 80); break;
        case IMAGETYPE_PNG:  imagepng($dst, $destPath, 6);   break;
    }

    imagedestroy($src);
    imagedestroy($dst);
    return true;
}

// ----------------------------
// Base paths & filenames
// ----------------------------
$highRes = __DIR__ . '/../public/img/panorama_high.jpg';
$baseDir = __DIR__ . '/../public/img/';
$desktop = 'panorama_desktop.jpg';
$tablet  = 'panorama_tablet.jpg';
$mobile  = 'panorama_mobile.jpg';

// Max widths (1x)
$desktopMax = 4096;
$tabletMax  = 2048;
$mobileMax  = 1440;

// DPR levels
$dprLevels = [1,2,3,4]; // added 4x

// ----------------------------
// Generate DPR variants
// ----------------------------
function generateDprVariantsGD($baseName, $maxWidth, $sourcePath, $dir, $dprLevels) {
    foreach ($dprLevels as $dpr) {
        $suffix = $dpr > 1 ? "_{$dpr}x" : "";
        $target = "{$dir}" . str_replace(".jpg", "{$suffix}.jpg", $baseName);
        $resizeWidth = min($maxWidth * $dpr, 12288); // larger cap for 4x
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
// Get DPR from JS query string
// ----------------------------
$dpr = isset($_GET['dpr']) ? floatval($_GET['dpr']) : 1;
if ($dpr < 1) $dpr = 1;
$dpr = min($dpr, 4); // allow 4x
$dprInt = round($dpr);

// ----------------------------
// Select base texture
// ----------------------------
if ($isMobile) $base = $mobile;
elseif ($isTablet) $base = $tablet;
else $base = $desktop;

// Append DPR suffix
$suffix = $dprInt > 1 ? "_{$dprInt}x" : "";
$texture = "/img/" . str_replace(".jpg", "{$suffix}.jpg", $base);

// ----------------------------
// Return JSON
// ----------------------------
header('Content-Type: application/json');
echo json_encode([
    'texture' => $texture,
    'dpr' => $dprInt
]);
