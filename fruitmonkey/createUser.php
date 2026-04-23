<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => false, 'message' => 'Method not allowed.']);
    exit;
}

$rawBody = file_get_contents('php://input');
$data = json_decode($rawBody ?: '', true);

if (!is_array($data) || $data === []) {
    $data = $_POST;
}

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['status' => false, 'message' => 'Invalid request payload.']);
    exit;
}

$os = $data['os'] ?? null;
$device = $data['device'] ?? null;

if ($os === null || $device === null) {
    http_response_code(422);
    echo json_encode(['status' => false, 'message' => 'os and device are required.']);
    exit;
}


require_once __DIR__ . '/db.php';

try {
    $mysqli = fruitmonkey_db();
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['status' => false, 'message' => 'Database connection failed.']);
    exit;
}

$checkSql = 'SELECT id FROM fruitmonkey_users WHERE device = ? LIMIT 1';
$checkStmt = $mysqli->prepare($checkSql);
if (!$checkStmt) {
    $mysqli->close();
    http_response_code(500);
    echo json_encode(['status' => false, 'message' => 'Failed to prepare database query.']);
    exit;
}

$checkStmt->bind_param('s', $device);

if (!$checkStmt->execute()) {
    $checkStmt->close();
    $mysqli->close();
    http_response_code(500);
    echo json_encode(['status' => false, 'message' => 'Failed to validate device uniqueness.']);
    exit;
}

$existing = $checkStmt->get_result();
$existingUser = $existing ? $existing->fetch_assoc() : null;
if ($existingUser) {
    $checkStmt->close();
    $mysqli->close();
    echo json_encode([
        'status' => true,
        'message' => 'Device already exists.',
        'data' => [
            'user_id' => (int) $existingUser['id'],
        ],
    ]);
    exit;
}
$checkStmt->close();

$sql = 'INSERT INTO fruitmonkey_users (os, device, created_at, updated_at)
        VALUES (?, ?,  NOW(), NOW())';

$stmt = $mysqli->prepare($sql);
if (!$stmt) {
    $mysqli->close();
    http_response_code(500);
    echo json_encode(['status' => false, 'message' => 'Failed to prepare database query.']);
    exit;
}

$stmt->bind_param('ss', $os, $device);

if (!$stmt->execute()) {
    $stmt->close();
    $mysqli->close();
    http_response_code(500);
    echo json_encode(['status' => false, 'message' => 'Failed to save user.']);
    exit;
}

$newId = (int) $mysqli->insert_id;
$stmt->close();
$mysqli->close();

echo json_encode([
    'status' => true,
    'message' => 'User created successfully.',
    'data' => [
        'user_id' => $newId,
    ],
]);
