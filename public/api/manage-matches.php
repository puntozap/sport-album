<?php
/**
 * Endpoint para gestionar resultados de partidos del grupo.
 *
 * Los resultados se guardan en matches-override.json (mismo directorio).
 * El frontend hace polling cada 30s y actualiza el marcador en pantalla.
 *
 * ACCIONES GET (públicas):
 *   ?action=get-matches              → devuelve matches-override.json completo
 *   ?action=get-group&group=A        → devuelve solo los partidos del grupo A
 *
 * ACCIONES POST (X-Upload-Token requerido):
 *   update-match  → guarda resultado de un partido
 *                   Campos: match_id (ej "A1"), home_score, away_score, status
 *                   status: "pending" | "live" | "played"
 *
 *   set-matches   → reemplaza todos los partidos (usado por n8n con el sheet completo)
 *                   Campo: matches (JSON string con array de objetos)
 *
 *   reset-match   → elimina el override de un partido (vuelve a pending)
 *                   Campo: match_id
 *
 * FORMATO matches-override.json:
 * {
 *   "A1": { "home_score": 2, "away_score": 1, "status": "played" },
 *   "A2": { "home_score": null, "away_score": null, "status": "live" }
 * }
 */

define('UPLOAD_TOKEN', 'xK9#mP2$qR7nL4vT8wY1');

$OVERRIDE_FILE = __DIR__ . '/matches-override.json';
$SCHEDULE_FILE = __DIR__ . '/match-schedule.json';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: X-Upload-Token, Content-Type');
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// Debug público (GET /api/manage-matches?debug=1)
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
        'current_matches'   => file_exists($OVERRIDE_FILE)
            ? json_decode(file_get_contents($OVERRIDE_FILE), true)
            : null,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// ── Helpers ────────────────────────────────────────────────────

function loadMatches($file) {
    if (!file_exists($file)) return [];
    $data = json_decode(file_get_contents($file), true);
    return is_array($data) ? $data : [];
}

function saveMatches($file, $data) {
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if ($json === false) return false;
    $bytes = @file_put_contents($file, $json);
    return $bytes !== false;
}

function loadSchedule($file) {
    if (!file_exists($file)) return [];
    $data = json_decode(file_get_contents($file), true);
    return is_array($data) ? $data : [];
}

function matchIsInFuture($matchId, $schedule) {
    $id = (string)$matchId;
    if (!isset($schedule[$id])) return false;
    $date = $schedule[$id]['date'] ?? null;
    $time = $schedule[$id]['timeET'] ?? null;
    if (!$date || !$time) return false;

    // ET = UTC-5 (aprox; sin DST, igual que frontend)
    $dt = DateTime::createFromFormat('Y-m-d H:i P', "{$date} {$time} -05:00");
    if (!$dt) return false;
    return time() < $dt->getTimestamp();
}

// ── GET (público) ──────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? 'get-matches';
    $all    = loadMatches($OVERRIDE_FILE);

    if ($action === 'get-group' && isset($_GET['group'])) {
        $prefix = strtoupper($_GET['group']);
        $filtered = array_filter($all, fn($id) => strpos($id, $prefix) === 0, ARRAY_FILTER_USE_KEY);
        echo json_encode(array_values($filtered));
    } else {
        echo json_encode($all);
    }
    exit;
}

// ── Auth POST ──────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); echo json_encode(['error' => 'Method not allowed']); exit;
}

// Leer parámetros desde form-data o JSON body (n8n puede mandar cualquiera)
$bodyJson = [];
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
if (stripos($contentType, 'application/json') !== false) {
    $bodyJson = json_decode(file_get_contents('php://input'), true) ?: [];
}
function param($key, $default = '') {
    global $bodyJson;
    return $_POST[$key] ?? $bodyJson[$key] ?? $default;
}

$token = $_SERVER['HTTP_X_UPLOAD_TOKEN'] ?? '';
if ($token !== UPLOAD_TOKEN) {
    http_response_code(401); echo json_encode(['error' => 'Unauthorized']); exit;
}

$action = param('action');

// ════════════════════════════════════════════════════════════
//  ACCIÓN: update-match
// ════════════════════════════════════════════════════════════
if ($action === 'update-match') {
    $raw_id     = trim(param('match_id'));
    $match_id   = is_numeric($raw_id) ? (string)intval((float)$raw_id) : strtoupper($raw_id);
    $home_score = param('home_score', null);
    $away_score = param('away_score', null);
    $status     = trim(param('status', 'played'));

    if (!$match_id) {
        http_response_code(400); echo json_encode(['error' => 'match_id requerido']); exit;
    }

    $valid_statuses = ['pending', 'live', 'played'];
    if (!in_array($status, $valid_statuses)) {
        http_response_code(400); echo json_encode(['error' => 'status inválido: pending|live|played']); exit;
    }

    $all = loadMatches($OVERRIDE_FILE);
    $all[$match_id] = [
        'home_score' => $home_score !== null && $home_score !== '' ? intval($home_score) : null,
        'away_score' => $away_score !== null && $away_score !== '' ? intval($away_score) : null,
        'status'     => $status,
    ];
    if (!saveMatches($OVERRIDE_FILE, $all)) {
        http_response_code(500);
        echo json_encode(['error' => 'No se pudo escribir matches-override.json']);
        exit;
    }

    echo json_encode(['success' => true, 'match_id' => $match_id, 'data' => $all[$match_id]]);
    exit;
}

// ════════════════════════════════════════════════════════════
//  ACCIÓN: set-matches (n8n envía el sheet completo)
// ════════════════════════════════════════════════════════════
if ($action === 'set-matches') {
    $raw = param('matches', '');
    $incoming = json_decode($raw, true);

    if (!is_array($incoming)) {
        http_response_code(400); echo json_encode(['error' => 'matches debe ser un JSON array']); exit;
    }

    $all = loadMatches($OVERRIDE_FILE);

    foreach ($incoming as $match) {
        // Normalizar a string de entero para evitar "1.0" de Google Sheets
        $raw_id = trim($match['match_id'] ?? '');
        if ($raw_id === '') continue;
        $match_id = is_numeric($raw_id) ? (string)intval((float)$raw_id) : strtoupper($raw_id);
        if (!$match_id) continue;

        $home = $match['home_score'] ?? null;
        $away = $match['away_score'] ?? null;
        $status = $match['status'] ?? 'pending';

        $all[$match_id] = [
            'home_score' => ($home !== null && $home !== '') ? intval($home) : null,
            'away_score' => ($away !== null && $away !== '') ? intval($away) : null,
            'status'     => in_array($status, ['pending','live','played']) ? $status : 'pending',
        ];
    }

    if (!saveMatches($OVERRIDE_FILE, $all)) {
        http_response_code(500);
        echo json_encode(['error' => 'No se pudo escribir matches-override.json']);
        exit;
    }
    echo json_encode(['success' => true, 'updated' => count($incoming)]);
    exit;
}

// ════════════════════════════════════════════════════════════
//  ACCIÓN: reset-match
// ════════════════════════════════════════════════════════════
if ($action === 'reset-match') {
    $match_id = strtoupper(trim(param('match_id')));
    if (!$match_id) {
        http_response_code(400); echo json_encode(['error' => 'match_id requerido']); exit;
    }

    $all = loadMatches($OVERRIDE_FILE);
    unset($all[$match_id]);
    if (!saveMatches($OVERRIDE_FILE, $all)) {
        http_response_code(500);
        echo json_encode(['error' => 'No se pudo escribir matches-override.json']);
        exit;
    }

    echo json_encode(['success' => true, 'reset' => $match_id]);
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Acción inválida: update-match | set-matches | reset-match']);
