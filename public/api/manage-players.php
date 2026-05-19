<?php
/**
 * Endpoint para editar nombres de jugadores en el álbum.
 *
 * Los overrides se guardan en players-override.json (mismo directorio).
 * El frontend fetcha ese JSON al arrancar y parchea los nombres en memoria.
 *
 * ACCIONES (POST, X-Upload-Token requerido):
 *
 *   get-overrides  → devuelve el contenido actual de players-override.json
 *
 *   update-player  → guarda o actualiza un nombre
 *                    Campos: code (ej "MEX"), slot (0-11), name (nuevo nombre)
 *
 *   reset-player   → elimina el override (vuelve al nombre original)
 *                    Campos: code, slot
 */

define('UPLOAD_TOKEN', 'xK9#mP2$qR7nL4vT8wY1');

$OVERRIDE_FILE = __DIR__ . '/players-override.json';

// ── CORS ──────────────────────────────────────────────────────
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: X-Upload-Token, Content-Type');
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ── Debug público (GET /api/manage-players?debug=1) ───────────
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['debug'])) {
    $testWrite = false;
    $testMsg   = '';
    try {
        $testFile = __DIR__ . '/_write_test.tmp';
        file_put_contents($testFile, 'ok');
        $testWrite = file_exists($testFile);
        if ($testWrite) unlink($testFile);
    } catch (Throwable $e) {
        $testMsg = $e->getMessage();
    }
    echo json_encode([
        'override_file'     => $OVERRIDE_FILE,
        'override_exists'   => file_exists($OVERRIDE_FILE),
        'override_readable' => is_readable($OVERRIDE_FILE),
        'override_writable' => is_writable($OVERRIDE_FILE),
        'dir_writable'      => is_writable(__DIR__),
        'write_test'        => $testWrite,
        'write_error'       => $testMsg,
        'current_overrides' => file_exists($OVERRIDE_FILE)
            ? json_decode(file_get_contents($OVERRIDE_FILE), true)
            : null,
        'php_user'          => get_current_user(),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// ── Auth ───────────────────────────────────────────────────────
$token = $_SERVER['HTTP_X_UPLOAD_TOKEN'] ?? '';
if ($token !== UPLOAD_TOKEN) {
    http_response_code(401); echo json_encode(['error' => 'Unauthorized']); exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); echo json_encode(['error' => 'Method not allowed']); exit;
}

// ── Helpers ────────────────────────────────────────────────────

function loadOverrides($file) {
    if (!file_exists($file)) return [];
    $data = json_decode(file_get_contents($file), true);
    return is_array($data) ? $data : [];
}

function saveOverrides($file, $data) {
    file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

$action = $_POST['action'] ?? '';

// ════════════════════════════════════════════════════════════
//  ACCIÓN: get-overrides
// ════════════════════════════════════════════════════════════
if ($action === 'get-overrides') {
    echo json_encode(loadOverrides($OVERRIDE_FILE));
    exit;
}

// ════════════════════════════════════════════════════════════
//  ACCIÓN: update-player
// ════════════════════════════════════════════════════════════
if ($action === 'update-player') {
    $code = strtoupper(trim($_POST['code'] ?? ''));
    $slot = intval($_POST['slot'] ?? -1);
    $name = trim($_POST['name'] ?? '');

    if (!$code || $slot < 0 || $slot > 11) {
        http_response_code(400); echo json_encode(['error' => 'code y slot requeridos (slot 0-11)']); exit;
    }
    if ($name === '') {
        http_response_code(400); echo json_encode(['error' => 'name no puede estar vacío']); exit;
    }

    $overrides = loadOverrides($OVERRIDE_FILE);
    if (!isset($overrides[$code])) $overrides[$code] = [];
    $overrides[$code][(string)$slot] = $name;
    saveOverrides($OVERRIDE_FILE, $overrides);

    echo json_encode(['success' => true, 'code' => $code, 'slot' => $slot, 'name' => $name]);
    exit;
}

// ════════════════════════════════════════════════════════════
//  ACCIÓN: reset-player
// ════════════════════════════════════════════════════════════
if ($action === 'reset-player') {
    $code = strtoupper(trim($_POST['code'] ?? ''));
    $slot = intval($_POST['slot'] ?? -1);

    if (!$code || $slot < 0 || $slot > 11) {
        http_response_code(400); echo json_encode(['error' => 'code y slot requeridos']); exit;
    }

    $overrides = loadOverrides($OVERRIDE_FILE);
    unset($overrides[$code][(string)$slot]);
    if (isset($overrides[$code]) && empty($overrides[$code])) unset($overrides[$code]);
    saveOverrides($OVERRIDE_FILE, $overrides);

    echo json_encode(['success' => true, 'reset' => "$code/$slot"]);
    exit;
}

// ── Acción desconocida ──────────────────────────────────────
http_response_code(400);
echo json_encode(['error' => 'Acción inválida. Usa: get-overrides | update-player | reset-player']);
