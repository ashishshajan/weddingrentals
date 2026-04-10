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

$idRaw = $data['id'] ?? null;
$levelWasPosted = array_key_exists('level', $data) && $data['level'] !== '';
$pointsWasPosted = array_key_exists('points', $data) && $data['points'] !== '';

if ($idRaw === null || $idRaw === '') {
    http_response_code(422);
    echo json_encode(['status' => 'ERROR', 'message' => 'id is required.']);
    exit;
}

if (!$levelWasPosted && !$pointsWasPosted) {
    http_response_code(422);
    echo json_encode(['status' => 'ERROR', 'message' => 'Post at least one of level or points.']);
    exit;
}

$id = filter_var($idRaw, FILTER_VALIDATE_INT);
if ($id === false || $id <= 0) {
    http_response_code(422);
    echo json_encode(['status' => 'ERROR', 'message' => 'id must be a valid integer.']);
    exit;
}

$level = null;
if ($levelWasPosted) {
    $level = filter_var($data['level'], FILTER_VALIDATE_INT);
    if ($level === false) {
        http_response_code(422);
        echo json_encode(['status' => 'ERROR', 'message' => 'level must be an integer.']);
        exit;
    }
}

$points = null;
if ($pointsWasPosted) {
    $points = filter_var($data['points'], FILTER_VALIDATE_INT);
    if ($points === false) {
        http_response_code(422);
        echo json_encode(['status' => 'ERROR', 'message' => 'points must be an integer.']);
        exit;
    }
}

require_once __DIR__ . '/db.php';

try {
    $mysqli = fruitmonkey_db();
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['status' => 'ERROR', 'message' => 'Database connection failed.']);
    exit;
}

$checkStmt = $mysqli->prepare('SELECT id, level, points FROM users WHERE id = ? LIMIT 1');
if (!$checkStmt) {
    $mysqli->close();
    http_response_code(500);
    echo json_encode(['status' => 'ERROR', 'message' => 'Failed to prepare lookup query.']);
    exit;
}

$checkStmt->bind_param('i', $id);

if (!$checkStmt->execute()) {
    $checkStmt->close();
    $mysqli->close();
    http_response_code(500);
    echo json_encode(['status' => 'ERROR', 'message' => 'Failed to fetch user.']);
    exit;
}

$result = $checkStmt->get_result();
$user = $result ? $result->fetch_assoc() : null;
$checkStmt->close();

if (!$user) {
    $mysqli->close();
    http_response_code(404);
    echo json_encode(['status' => 'ERROR', 'message' => 'User not found.']);
    exit;
}

$currentLevel = (int) ($user['level'] ?? 0);
$newLevel = $currentLevel;
$levelUpdated = false;

if ($levelWasPosted && $level > $currentLevel) {
    $newLevel = $level;
    $levelUpdated = true;
}

$sql = 'UPDATE users
        SET level = ?, points = COALESCE(?, points), updated_at = NOW()
        WHERE id = ?';

$stmt = $mysqli->prepare($sql);
if (!$stmt) {
    $mysqli->close();
    http_response_code(500);
    echo json_encode(['status' => 'ERROR', 'message' => 'Failed to prepare update query.']);
    exit;
}

$stmt->bind_param('iii', $newLevel, $points, $id);

if (!$stmt->execute()) {
    $stmt->close();
    $mysqli->close();
    http_response_code(500);
    echo json_encode(['status' => 'ERROR', 'message' => 'Failed to update user.']);
    exit;
}

$stmt->close();
$mysqli->close();

echo json_encode([
    'status' => 'OK',
    'id' => $id,
    'level_updated' => $levelUpdated,
    'level' => $newLevel,
    'points_updated' => $pointsWasPosted,
    'points' => $pointsWasPosted ? $points : null,
]);
