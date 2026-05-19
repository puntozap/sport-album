<?php
/**
 * Endpoint para gestionar cromos en el servidor.
 *
 * ACCIONES (POST, header X-Upload-Token requerido):
 *
 *   list-groups  → lista grupos y equipos disponibles
 *                  Responde: { "groups": { "a": ["1","2","3","4"], "b": [...], ... } }
 *
 *   list-files   → lista los .png de un grupo/equipo
 *                  Campos: grupo, numero
 *                  Responde: { "files": ["00.png", "01.png", ...] }
 *
 *   delete       → borra uno o varios archivos
 *                  Campos: grupo, numero, files (JSON array, ej: ["00.png","05.png"])
 *                  Responde: { "deleted": [...], "failed": [...] }
 */

define('UPLOAD_TOKEN', 'xK9#mP2$qR7nL4vT8wY1');

$CROMOS_DIR = realpath(__DIR__ . '/../cromos_extraidos') ?: (__DIR__ . '/../cromos_extraidos');

// ── CORS ──────────────────────────────────────────────────────
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: X-Upload-Token, Content-Type');
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ── Auth ───────────────────────────────────────────────────────
$token = $_SERVER['HTTP_X_UPLOAD_TOKEN'] ?? '';
if ($token !== UPLOAD_TOKEN) {
    http_response_code(401); echo json_encode(['error' => 'Unauthorized']); exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); echo json_encode(['error' => 'Method not allowed']); exit;
}

$action = $_POST['action'] ?? '';

// ── Helpers ────────────────────────────────────────────────────

function validarGrupoNumero($grupo, $numero) {
    if (!preg_match('/^[a-z]$/i', $grupo))    return false;
    if (!preg_match('/^\d{1,3}$/', $numero))  return false;
    return true;
}

function dirCarpeta($base, $grupo, $numero) {
    return $base . '/grupos/' . strtolower($grupo) . '/' . $numero;
}

// ════════════════════════════════════════════════════════════
//  ACCIÓN: list-groups
// ════════════════════════════════════════════════════════════
if ($action === 'list-groups') {
    $grupos_dir = $CROMOS_DIR . '/grupos';
    $result = [];

    if (!is_dir($grupos_dir)) {
        echo json_encode(['groups' => $result]); exit;
    }

    $grupos = scandir($grupos_dir);
    foreach ($grupos as $g) {
        if ($g === '.' || $g === '..') continue;
        $gPath = $grupos_dir . '/' . $g;
        if (!is_dir($gPath)) continue;

        $nums = [];
        $subs = scandir($gPath);
        foreach ($subs as $n) {
            if ($n === '.' || $n === '..') continue;
            if (is_dir($gPath . '/' . $n)) $nums[] = $n;
        }
        sort($nums);
        $result[$g] = $nums;
    }

    ksort($result);
    echo json_encode(['groups' => $result]);
    exit;
}

// ════════════════════════════════════════════════════════════
//  ACCIÓN: list-files
// ════════════════════════════════════════════════════════════
if ($action === 'list-files') {
    $grupo  = strtolower(trim($_POST['grupo']  ?? ''));
    $numero = trim($_POST['numero'] ?? '');

    if (!validarGrupoNumero($grupo, $numero)) {
        http_response_code(400); echo json_encode(['error' => 'grupo/numero inválido']); exit;
    }

    $dir = dirCarpeta($CROMOS_DIR, $grupo, $numero);

    if (!is_dir($dir)) {
        echo json_encode(['files' => []]); exit;
    }

    $files = glob($dir . '/*.png');
    $names = array_map('basename', $files ?: []);
    sort($names);

    echo json_encode(['files' => $names, 'path' => "grupos/$grupo/$numero"]);
    exit;
}

// ════════════════════════════════════════════════════════════
//  ACCIÓN: delete
// ════════════════════════════════════════════════════════════
if ($action === 'delete') {
    $grupo  = strtolower(trim($_POST['grupo']  ?? ''));
    $numero = trim($_POST['numero'] ?? '');
    $raw    = $_POST['files'] ?? '[]';
    $files  = json_decode($raw, true);

    if (!validarGrupoNumero($grupo, $numero)) {
        http_response_code(400); echo json_encode(['error' => 'grupo/numero inválido']); exit;
    }
    if (!is_array($files) || empty($files)) {
        http_response_code(400); echo json_encode(['error' => 'files debe ser un array JSON no vacío']); exit;
    }

    $dir     = dirCarpeta($CROMOS_DIR, $grupo, $numero);
    $deleted = [];
    $failed  = [];

    foreach ($files as $filename) {
        // Normalizar: si no trae .png, agregarlo
        $name = preg_replace('/[^a-zA-Z0-9_\-\.]/', '', $filename);
        if (!preg_match('/\.png$/i', $name)) $name .= '.png';

        // Solo permite nombres tipo 00.png–99.png (dos dígitos)
        if (!preg_match('/^\d{2}\.png$/i', $name)) {
            $failed[] = ['file' => $filename, 'reason' => 'nombre inválido'];
            continue;
        }

        $fullPath = $dir . '/' . $name;

        if (!file_exists($fullPath)) {
            $failed[] = ['file' => $name, 'reason' => 'no existe'];
            continue;
        }

        if (unlink($fullPath)) {
            $deleted[] = $name;
        } else {
            $failed[] = ['file' => $name, 'reason' => 'no se pudo borrar'];
        }
    }

    echo json_encode(['deleted' => $deleted, 'failed' => $failed]);
    exit;
}

// ── Acción desconocida ─────────────────────────────────────
http_response_code(400);
echo json_encode(['error' => 'Acción inválida. Usa: list-groups | list-files | delete']);
