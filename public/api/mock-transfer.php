<?php
/**
 * Mock local del backend de transferencias para pruebas.
 * Guarda transferencias en un archivo JSON temporal.
 * 
 * Endpoints:
 *   ?action=createTransfer&data=[{"countryId":"mexico","slotIndex":1}]
 *   ?action=transferStatus&id=UUID
 *   ?action=acceptTransfer&id=UUID
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$DATA_FILE = __DIR__ . '/transfers.json';

function loadTransfers() {
    global $DATA_FILE;
    if (!file_exists($DATA_FILE)) return [];
    $json = file_get_contents($DATA_FILE);
    return json_decode($json, true) ?: [];
}

function saveTransfers($transfers) {
    global $DATA_FILE;
    file_put_contents($DATA_FILE, json_encode($transfers, JSON_PRETTY_PRINT));
}

function generateId() {
    return bin2hex(random_bytes(16));
}

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'createTransfer':
        $data = $_GET['data'] ?? '[]';
        $stickers = json_decode($data, true);
        if (empty($stickers)) {
            echo json_encode(['error' => 'Sin cromos']);
            exit;
        }
        $transfers = loadTransfers();
        $id = generateId();
        $transfers[$id] = [
            'id' => $id,
            'stickers' => $stickers,
            'status' => 'pending',
            'createdAt' => date('c')
        ];
        saveTransfers($transfers);
        echo json_encode(['id' => $id]);
        break;

    case 'transferStatus':
        $id = $_GET['id'] ?? '';
        $transfers = loadTransfers();
        if (!isset($transfers[$id])) {
            echo json_encode(['error' => 'No encontrado']);
            exit;
        }
        echo json_encode([
            'status' => $transfers[$id]['status'],
            'stickers' => $transfers[$id]['stickers']
        ]);
        break;

    case 'acceptTransfer':
        $id = $_GET['id'] ?? '';
        $transfers = loadTransfers();
        if (!isset($transfers[$id])) {
            echo json_encode(['error' => 'No encontrado']);
            exit;
        }
        $transfers[$id]['status'] = 'accepted';
        saveTransfers($transfers);
        echo json_encode(['ok' => true]);
        break;

    default:
        echo json_encode(['error' => 'Acción desconocida: ' . $action]);
}
