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

$idRaw = $data['id'] ?? null;
$name = isset($data['name']) ? trim((string) $data['name']) : '';
$emoji = isset($data['emoji']) ? trim((string) $data['emoji']) : '';

if ($idRaw === null || $idRaw === '') {
    http_response_code(422);
    echo json_encode(['status' => false, 'message' => 'id is required.']);
    exit;
}

$id = filter_var($idRaw, FILTER_VALIDATE_INT);
if ($id === false || $id <= 0) {
    http_response_code(422);
    echo json_encode(['status' => false, 'message' => 'id must be a valid integer.']);
    exit;
}

if ($name === '' || $emoji === '') {
    http_response_code(422);
    echo json_encode(['status' => false, 'message' => 'name and emoji are required.']);
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

$checkStmt = $mysqli->prepare('SELECT id FROM users WHERE id = ? LIMIT 1');
if (!$checkStmt) {
    $mysqli->close();
    http_response_code(500);
    echo json_encode(['status' => false, 'message' => 'Failed to prepare lookup query.']);
    exit;
}

$checkStmt->bind_param('i', $id);
if (!$checkStmt->execute()) {
    $checkStmt->close();
    $mysqli->close();
    http_response_code(500);
    echo json_encode(['status' => false, 'message' => 'Failed to fetch user.']);
    exit;
}

$checkResult = $checkStmt->get_result();
$user = $checkResult ? $checkResult->fetch_assoc() : null;
$checkStmt->close();

if (!$user) {
    $mysqli->close();
    http_response_code(404);
    echo json_encode(['status' => false, 'message' => 'User not found.']);
    exit;
}

$stmt = $mysqli->prepare('UPDATE users SET name = ?, emoji = ?, updated_at = NOW() WHERE id = ?');
if (!$stmt) {
    $mysqli->close();
    http_response_code(500);
    echo json_encode(['status' => false, 'message' => 'Failed to prepare update query.']);
    exit;
}

$stmt->bind_param('ssi', $name, $emoji, $id);
if (!$stmt->execute()) {
    $stmt->close();
    $mysqli->close();
    http_response_code(500);
    echo json_encode(['status' => false, 'message' => 'Failed to update profile.']);
    exit;
}

$stmt->close();
$mysqli->close();

echo json_encode([
    'status' => true,
    'message' => 'Profile updated successfully.',
    'data' => [
        'user_id' => $id,
        'name' => $name,
        'emoji' => $emoji,
    ],
]);
