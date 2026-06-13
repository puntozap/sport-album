<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Secret');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

define('SECRET', 'albumcromos2026');

// Try main path first, fallback to /tmp
$mainFile = __DIR__ . '/ar-cromos.json';
$tmpFile  = sys_get_temp_dir() . '/ar-cromos-album.json';
$file     = is_writable($mainFile) || is_writable(dirname($mainFile)) ? $mainFile : $tmpFile;

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  if (file_exists($mainFile)) { echo file_get_contents($mainFile); exit; }
  if (file_exists($tmpFile))  { echo file_get_contents($tmpFile);  exit; }
  echo '[]';
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo '{"error":"method"}'; exit; }

$secret = $_SERVER['HTTP_X_SECRET'] ?? '';
if ($secret !== SECRET) { http_response_code(403); echo '{"error":"forbidden"}'; exit; }

$body = file_get_contents('php://input');
$data = json_decode($body);
if (!is_array($data)) { http_response_code(400); echo '{"error":"invalid json"}'; exit; }

$json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

// Strategy 1: write directly to main path
$written = @file_put_contents($mainFile, $json);

// Strategy 2: write to /tmp then copy
if ($written === false) {
  @file_put_contents($tmpFile, $json);
  @copy($tmpFile, $mainFile);
  $written = @file_put_contents($mainFile, $json);
}

// Strategy 3: unlink and recreate
if ($written === false) {
  @unlink($mainFile);
  $written = @file_put_contents($mainFile, $json);
}

// Strategy 4: keep only in /tmp (serves from there on GET)
if ($written === false) {
  $written = @file_put_contents($tmpFile, $json);
  if ($written !== false) {
    echo json_encode(['ok' => true, 'saved' => count($data), 'note' => 'saved to tmp']);
    exit;
  }
  http_response_code(500);
  echo '{"error":"all write strategies failed"}';
  exit;
}

echo json_encode(['ok' => true, 'saved' => count($data)]);
