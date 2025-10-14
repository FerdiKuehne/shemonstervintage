<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', 'php://stdout');

require_once __DIR__ . '/../../core/Response.php';
require_once __DIR__ . '/../../vendor/Mobile-Detect-4.8.x/standalone/autoloader.php';
require_once __DIR__ . '/../../vendor/Mobile-Detect-4.8.x/src/MobileDetectStandalone.php';

use Detection\MobileDetectStandalone;

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
// GD helper
// ----------------------------
function createLowRes($sourcePath, $destPath, $maxWidth = 1024): bool
{
    if (!file_exists($sourcePath)) return false;

    [$width, $height, $type] = getimagesize($sourcePath);
    $scale = min($maxWidth / $width, 1);
    $newWidth = (int)($width * $scale);
    $newHeight = (int)($height * $scale);

    switch ($type) {
        case IMAGETYPE_JPEG: $src = imagecreatefromjpeg($sourcePath); break;
        case IMAGETYPE_PNG:  $src = imagecreatefrompng($sourcePath); break;
        default: return false;
    }

    $dst = imagecreatetruecolor($newWidth, $newHeight);

    if ($type === IMAGETYPE_PNG) {
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
// Generate DPR variants
// ----------------------------
function generateDprVariantsGD($baseName, $maxWidth, $sourcePath, $dir, $dprLevels): void
{
    foreach ($dprLevels as $dpr) {
        $suffix = $dpr > 1 ? "_{$dpr}x" : "";
        $target = "{$dir}/" . preg_replace('/\.(jpg|jpeg|png)$/i', "{$suffix}.webp", $baseName);
        $resizeWidth = min($maxWidth * $dpr, 12288);
        if (!file_exists($target)) {
            createLowRes($sourcePath, $target, $resizeWidth);
        }
    }
}

// ----------------------------
// Base directories
// ----------------------------
$frontDir = realpath(__DIR__ . '/../../public/img/gallery/front');
$backDir  = realpath(__DIR__ . '/../../public/img/gallery/back');

if (!$frontDir || !$backDir) {
    Response::error('Gallery folders not found', 500);
}

// ----------------------------
// Gather images
// ----------------------------
$allFront = array_values(array_filter(scandir($frontDir), fn($f) =>
    preg_match('/\.(jpg|jpeg)$/i', $f) && is_file("$frontDir/$f")
));
$allBack  = array_values(array_filter(scandir($backDir), fn($f) =>
    preg_match('/\.(jpg|jpeg)$/i', $f) && is_file("$backDir/$f")
));

natsort($allFront);
natsort($allBack);
$allFront = array_values($allFront);
$allBack  = array_values($allBack);

// ----------------------------
// Query params
// ----------------------------
$type  = $_GET['type'] ?? 'front';
$batch = isset($_GET['batch']) && is_numeric($_GET['batch']) ? max(1, intval($_GET['batch'])) : 1;
$index = isset($_GET['index']) && is_numeric($_GET['index']) ? intval($_GET['index']) : null;
$perBatch = 16;
$dpr = isset($_GET['dpr']) && is_numeric($_GET['dpr']) ? min(max(floatval($_GET['dpr']), 1), 4) : 1;
$dprInt = round($dpr);

// ----------------------------
// Batch validation
// ----------------------------
$maxBatch = ceil(count($allFront) / $perBatch);
if ($batch > $maxBatch) {
    Response::error("Batch {$batch} does not exist. Max batch is {$maxBatch}", 400);
}

// ----------------------------
// Device detection
// ----------------------------
$detect = new MobileDetectStandalone();
$isMobile = $detect->isMobile();
$isTablet = $detect->isTablet();
$isDesktop = !$isMobile && !$isTablet;

// ----------------------------
// Pick DPR WebP files, auto-generate if missing
// ----------------------------
function pickDprFile(array $files, int $dpr, string $dir, int $maxWidth = 1024): array
{
    $result = [];
    $dprLevels = [1, 2, 3, 4];

    // Absolute path to your public folder
    $publicPath = realpath(__DIR__ . '/../../public');

    foreach ($files as $f) {
        $sourcePath = "$dir/$f";

        // Generate all DPR variants
        generateDprVariantsGD($f, $maxWidth, $sourcePath, $dir, $dprLevels);

        $baseName = pathinfo($f, PATHINFO_FILENAME);
        $suffix = $dpr > 1 ? "_{$dpr}x" : "";
        $fileName = $baseName . $suffix . '.webp';
        $targetPath = "$dir/$fileName";

        if (file_exists($targetPath)) {
            // Make URL relative to public folder
            $result[$f] = str_replace($publicPath, '', $targetPath);
            // Ensure leading slash
            if ($result[$f][0] !== '/') {
                $result[$f] = '/' . $result[$f];
            }
        }
    }

    return $result;
}


// ----------------------------
// Build response
// ----------------------------
try {
    $response = [];

    if ($type === 'front') {
        $start = ($batch - 1) * $perBatch;
        $frontChunk = array_slice($allFront, $start, $perBatch);
        $response['front'] = pickDprFile($frontChunk, $dprInt, $frontDir, 1024);
    } elseif ($type === 'back' && $index !== null) {
        if (!isset($allBack[$index])) {
            Response::error('Invalid index', 400);
        }
        $backFile = $allBack[$index];
        $response['back'] = pickDprFile([$backFile], $dprInt, $backDir, 1024);
    } else {
        Response::error('Invalid type', 400);
    }

    $response['dpr'] = $dprInt;
    $response['device'] = $isMobile ? 'mobile' : ($isTablet ? 'tablet' : 'desktop');

    Response::success($response);

} catch (\Throwable $e) {
    error_log("Gallery endpoint error: " . $e->getMessage());
    Response::error('Internal server error', 500);
}
