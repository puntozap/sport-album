<?php
// Rota entre og-image-1.jpg … og-image-6.jpg cambiando cada día.
// El parámetro ?d= (enviado desde el meta tag) fuerza el refresco del caché.
$total = 7;
$index = (int)(date('z') % $total) + 1; // día del año → 1..7

$file = __DIR__ . "/og-image-{$index}.jpg";

// Fallback al primero si no existe
if (!file_exists($file)) {
    for ($i = 1; $i <= $total; $i++) {
        $try = __DIR__ . "/og-image-{$i}.jpg";
        if (file_exists($try)) { $file = $try; $index = $i; break; }
    }
}

if (!file_exists($file)) {
    http_response_code(404);
    exit('og-image not found. Upload og-image-1.jpg … og-image-6.jpg to /assets/');
}

$etag = '"og-' . $index . '-' . date('Ymd') . '"';
if (isset($_SERVER['HTTP_IF_NONE_MATCH']) && $_SERVER['HTTP_IF_NONE_MATCH'] === $etag) {
    http_response_code(304);
    exit;
}

header('Content-Type: image/jpeg');
header('Cache-Control: public, max-age=86400'); // caché 24h
header('ETag: ' . $etag);
header('Content-Length: ' . filesize($file));
readfile($file);
