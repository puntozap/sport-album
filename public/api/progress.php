<?php
/**
 * Devuelve el progreso del álbum: cuántas imágenes de cromos existen en disco.
 * Lee stickerMap.json y comprueba file_exists() para cada ruta.
 *
 * GET /api/progress.php
 * Responde:
 *   {
 *     "total": 576,
 *     "found": 312,
 *     "percent": 54.2,
 *     "countries": {
 *       "mexico": { "total": 12, "found": 12, "missing": [] },
 *       "usa":    { "total": 12, "found":  9, "missing": [2,5,8] },
 *       ...
 *     }
 *   }
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// Directorio público (un nivel arriba de /api/)
$publicDir = realpath(__DIR__ . '/..');

// stickerMap copiado en la misma carpeta api/ durante el build
$stickerMapPath = __DIR__ . '/stickerMap.json';

if (!file_exists($stickerMapPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'stickerMap.json not found']);
    exit;
}

$map = json_decode(file_get_contents($stickerMapPath), true);
if (!is_array($map)) {
    http_response_code(500);
    echo json_encode(['error' => 'Invalid stickerMap.json']);
    exit;
}

$total   = 0;
$found   = 0;
$result  = [];

foreach ($map as $countryId => $slots) {
    $countryFound   = 0;
    $missingIndices = [];

    foreach ($slots as $idx => $relativePath) {
        $total++;
        $exists = false;

        if ($relativePath) {
            // Normalizar separadores y construir ruta absoluta
            $normalised = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, ltrim($relativePath, '/\\'));
            $fullPath   = $publicDir . DIRECTORY_SEPARATOR . $normalised;
            $exists     = file_exists($fullPath);
        }

        if ($exists) {
            $found++;
            $countryFound++;
        } else {
            $missingIndices[] = $idx;
        }
    }

    $result[$countryId] = [
        'total'   => count($slots),
        'found'   => $countryFound,
        'missing' => $missingIndices,
    ];
}

echo json_encode([
    'total'     => $total,
    'found'     => $found,
    'percent'   => $total > 0 ? round($found / $total * 100, 1) : 0.0,
    'countries' => $result,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
