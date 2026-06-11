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

$userIdRaw = $data['user_id'] ?? ($data['id'] ?? null);
if ($userIdRaw === null || $userIdRaw === '') {
    http_response_code(422);
    echo json_encode(['status' => false, 'message' => 'user_id is required.']);
    exit;
}

$userId = filter_var($userIdRaw, FILTER_VALIDATE_INT);
if ($userId === false || $userId <= 0) {
    http_response_code(422);
    echo json_encode(['status' => false, 'message' => 'user_id must be a valid integer.']);
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

$sql = 'SELECT * FROM fruitmonkey_users WHERE id = ? LIMIT 1';
$stmt = $mysqli->prepare($sql);

if (!$stmt) {
    $mysqli->close();
    http_response_code(500);
    echo json_encode(['status' => false, 'message' => 'Failed to prepare lookup query.']);
    exit;
}

$stmt->bind_param('i', $userId);
if (!$stmt->execute()) {
    $stmt->close();
    $mysqli->close();
    http_response_code(500);
    echo json_encode(['status' => false, 'message' => 'Failed to fetch user profile.']);
    exit;
}

$result = $stmt->get_result();
$user = $result ? $result->fetch_assoc() : null;

$stmt->close();
$mysqli->close();

if (!$user) {
    http_response_code(404);
    echo json_encode(['status' => false, 'message' => 'User not found.']);
    exit;
}

if (isset($user['id'])) {
    $user['id'] = (int) $user['id'];
}
if (isset($user['level'])) {
    $user['level'] = (int) $user['level'];
}
if (isset($user['points'])) {
    $user['points'] = (int) $user['points'];
}

echo json_encode([
    'status' => true,
    'message' => 'Profile fetched successfully.',
    'data' => $user,
]);
