<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'ERROR', 'message' => 'Method not allowed.']);
    exit;
}

$rawBody = file_get_contents('php://input');
$data = json_decode($rawBody ?: '', true);

if (!is_array($data) || $data === []) {
    $data = $_POST;
}

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['status' => 'ERROR', 'message' => 'Invalid request payload.']);
    exit;
}

$name = trim((string)($data['name'] ?? ''));
$platform = trim((string)($data['platform'] ?? ''));
$os = trim((string)($data['os'] ?? ''));
$levelRaw = $data['level'] ?? null;
$points = $data['points'] ?? 0;

if ($name === '' || $platform === '' || $os === '' || $levelRaw === null || $levelRaw === '') {
    http_response_code(422);
    echo json_encode(['status' => 'ERROR', 'message' => 'name, platform, os, and level are required.']);
    exit;
}

$level = filter_var($levelRaw, FILTER_VALIDATE_INT);
if ($level === false) {
    http_response_code(422);
    echo json_encode(['status' => 'ERROR', 'message' => 'level must be an integer.']);
    exit;
}

require_once __DIR__ . '/db.php';

try {
    $mysqli = fruitmonkey_db();
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['status' => 'ERROR', 'message' => 'Database connection failed.']);
    exit;
}

$sql = 'INSERT INTO users (name, platform, os, level, points, created_at, updated_at)
        VALUES (?, ?, ?, ?, NOW(), NOW())';

$stmt = $mysqli->prepare($sql);
if (!$stmt) {
    $mysqli->close();
    http_response_code(500);
    echo json_encode(['status' => 'ERROR', 'message' => 'Failed to prepare database query.']);
    exit;
}

$stmt->bind_param('sssis', $name, $platform, $os, $level, $points);

if (!$stmt->execute()) {
    $stmt->close();
    $mysqli->close();
    http_response_code(500);
    echo json_encode(['status' => 'ERROR', 'message' => 'Failed to save user.']);
    exit;
}

$newId = (int) $mysqli->insert_id;
$stmt->close();
$mysqli->close();

echo json_encode([
    'status' => 'OK',
    'id' => $newId,
]);
