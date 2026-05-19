<?php
/**
 * Endpoint receptor de cromos desde n8n.
 *
 * ACCIONES (POST, campo "action"):
 *   upload  → guarda/actualiza un cromo. Si el fileId ya existe con otra ruta,
 *              borra el archivo viejo primero (maneja renombrados desde Drive).
 *   delete  → borra el cromo por fileId (cuando se elimina en Drive).
 *
 * Campos comunes:
 *   X-Upload-Token (header)  ← token de seguridad
 *   action                   ← "upload" | "delete"
 *   fileId                   ← ID único de Google Drive (no cambia al renombrar)
 *
 * Campos extra para "upload":
 *   path  ← ruta relativa destino: "grupos/a/1/00.png"
 *   file  ← binario PNG (multipart/form-data)
 *
 * El registro fileId→ruta se guarda en drive-manifest.json junto a este script.
 */

define('UPLOAD_TOKEN', 'xK9#mP2$qR7nL4vT8wY1');

// Rutas base
$CROMOS_DIR    = realpath(__DIR__ . '/../cromos_extraidos') ?: (__DIR__ . '/../cromos_extraidos');
$MANIFEST_FILE = __DIR__ . '/drive-manifest.json';

// ── CORS ─────────────────────────────────────────────────────
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: X-Upload-Token, Content-Type');
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ── Auth ──────────────────────────────────────────────────────
$token = $_SERVER['HTTP_X_UPLOAD_TOKEN'] ?? '';
if ($token !== UPLOAD_TOKEN) {
    http_response_code(401); echo json_encode(['error' => 'Unauthorized']); exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); echo json_encode(['error' => 'Method not allowed']); exit;
}

// ── Cargar manifiesto fileId→ruta ─────────────────────────────
function loadManifest($file) {
    if (!file_exists($file)) return [];
    $data = json_decode(file_get_contents($file), true);
    return is_array($data) ? $data : [];
}
function saveManifest($file, $manifest) {
    file_put_contents($file, json_encode($manifest, JSON_PRETTY_PRINT));
}

// ── Validar path ──────────────────────────────────────────────
function validPath($raw) {
    $p = ltrim(str_replace('\\', '/', $raw), '/');
    // Solo permite: grupos/{letra}/{numero}/{slot}.png
    if (!preg_match('/^grupos\/[a-z]+\/\d+\/\d{2}\.png$/i', $p)) return false;
    return $p;
}

$action = $_POST['action'] ?? 'upload';
$fileId = trim($_POST['fileId'] ?? '');

if (!$fileId) {
    http_response_code(400); echo json_encode(['error' => 'fileId requerido']); exit;
}

$manifest = loadManifest($MANIFEST_FILE);

// ════════════════════════════════════════════════════════════
//  ACCIÓN: delete
// ════════════════════════════════════════════════════════════
if ($action === 'delete') {
    if (!isset($manifest[$fileId])) {
        echo json_encode(['success' => true, 'note' => 'fileId no registrado, nada que borrar']);
        exit;
    }
    $oldPath = $CROMOS_DIR . '/' . $manifest[$fileId];
    if (file_exists($oldPath)) unlink($oldPath);
    unset($manifest[$fileId]);
    saveManifest($MANIFEST_FILE, $manifest);
    echo json_encode(['success' => true, 'deleted' => $manifest[$fileId] ?? $oldPath]);
    exit;
}

// ════════════════════════════════════════════════════════════
//  ACCIÓN: upload (crear o renombrar)
// ════════════════════════════════════════════════════════════
$newPath = validPath($_POST['path'] ?? '');
if (!$newPath) {
    http_response_code(400);
    echo json_encode(['error' => 'path inválido. Formato: grupos/a/1/00.png']);
    exit;
}

$uploadedFile = $_FILES['file'] ?? null;
if (!$uploadedFile || $uploadedFile['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400); echo json_encode(['error' => 'Archivo no recibido']); exit;
}

// Verificar PNG
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime  = finfo_file($finfo, $uploadedFile['tmp_name']);
finfo_close($finfo);
if ($mime !== 'image/png') {
    http_response_code(400); echo json_encode(['error' => 'Solo PNG']); exit;
}

// Si el fileId ya tenía otra ruta → borrar el archivo viejo (fue renombrado en Drive)
$oldPath = $manifest[$fileId] ?? null;
if ($oldPath && $oldPath !== $newPath) {
    $oldFull = $CROMOS_DIR . '/' . $oldPath;
    if (file_exists($oldFull)) {
        unlink($oldFull);
    }
}

// Guardar nuevo archivo
$fullPath = $CROMOS_DIR . '/' . $newPath;
$dir      = dirname($fullPath);
if (!is_dir($dir)) mkdir($dir, 0755, true);

if (move_uploaded_file($uploadedFile['tmp_name'], $fullPath)) {
    $manifest[$fileId] = $newPath;
    saveManifest($MANIFEST_FILE, $manifest);
    echo json_encode([
        'success'  => true,
        'path'     => $newPath,
        'replaced' => $oldPath && $oldPath !== $newPath ? $oldPath : null,
    ]);
} else {
    http_response_code(500);
    $err = error_get_last();
    echo json_encode([
        'error'    => 'No se pudo guardar',
        'detail'   => $err,
        'dir'      => $dir,
        'exists'   => is_dir($dir),
        'writable' => is_writable($dir),
        'cromos_dir' => $CROMOS_DIR,
        'cromos_exists' => is_dir($CROMOS_DIR),
        'cromos_writable' => is_writable($CROMOS_DIR),
    ]);
}
