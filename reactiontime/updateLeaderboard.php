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
$modeRaw = $data['mode'] ?? null;

if ($idRaw === null || $idRaw === '') {
    http_response_code(422);
    echo json_encode(['status' => false, 'message' => 'id is required.']);
    exit;
}

if ($modeRaw === null || $modeRaw === '') {
    http_response_code(422);
    echo json_encode(['status' => false, 'message' => 'mode is required.']);
    exit;
}

$id = filter_var($idRaw, FILTER_VALIDATE_INT);
if ($id === false || $id <= 0) {
    http_response_code(422);
    echo json_encode(['status' => false, 'message' => 'id must be a valid integer.']);
    exit;
}

$mode = filter_var($modeRaw, FILTER_VALIDATE_INT);
if ($mode === false || !in_array($mode, [1, 2], true)) {
    http_response_code(422);
    echo json_encode(['status' => false, 'message' => 'mode must be 1 or 2.']);
    exit;
}

$pointsRaw = $data['points'] ?? null;
if ($pointsRaw === null || $pointsRaw === '') {
    http_response_code(422);
    echo json_encode(['status' => false, 'message' => 'points is required.']);
    exit;
}

$points = filter_var($pointsRaw, FILTER_VALIDATE_INT);
if ($points === false) {
    http_response_code(422);
    echo json_encode(['status' => false, 'message' => 'points must be an integer.']);
    exit;
}

$level = null;
if ($mode === 1) {
    $levelRaw = $data['level'] ?? null;
    if ($levelRaw === null || $levelRaw === '') {
        http_response_code(422);
        echo json_encode(['status' => false, 'message' => 'level is required when mode is 1.']);
        exit;
    }

    $level = filter_var($levelRaw, FILTER_VALIDATE_INT);
    if ($level === false) {
        http_response_code(422);
        echo json_encode(['status' => false, 'message' => 'level must be an integer.']);
        exit;
    }
}

require_once __DIR__ . '/db.php';

try {
    $mysqli = reactiontime_db();
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['status' => false, 'message' => 'Database connection failed.']);
    exit;
}

$checkStmt = $mysqli->prepare('SELECT id, level, points FROM reactiontime_users WHERE id = ? LIMIT 1');
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

$result = $checkStmt->get_result();
$user = $result ? $result->fetch_assoc() : null;
$checkStmt->close();

if (!$user) {
    $mysqli->close();
    http_response_code(404);
    echo json_encode(['status' => false, 'message' => 'User not found.']);
    exit;
}

$currentLevel = (int) ($user['level'] ?? 0);
$currentPoints = (int) ($user['points'] ?? 0);

$levelToUpdate = $currentLevel;
$pointsToUpdate = $currentPoints;

if ($mode === 1) {
    if ($level > $currentLevel) {
        $levelToUpdate = $level;
    }
    if ($points > $currentPoints) {
        $pointsToUpdate = $points;
    }

    if ($levelToUpdate === $currentLevel && $pointsToUpdate === $currentPoints) {
        $mysqli->close();
        echo json_encode([
            'status' => true,
            'message' => 'Update skipped. level and points are not greater than existing values.',
            'data' => [
                'id' => $id,
                'current_level' => $currentLevel,
                'current_points' => $currentPoints,
            ],
        ]);
        exit;
    }
}

if ($mode === 2 && !($points > $currentPoints)) {
    $mysqli->close();
    echo json_encode([
        'status' => true,
        'message' => 'Update skipped. points must be greater than existing points.',
        'data' => [
            'id' => $id,
            'current_points' => $currentPoints,
        ],
    ]);
    exit;
}

if ($mode === 1) {
    $sql = 'UPDATE reactiontime_users
            SET level = ?, points = ?, updated_at = NOW()
            WHERE id = ?';

    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        $mysqli->close();
        http_response_code(500);
        echo json_encode(['status' => false, 'message' => 'Failed to prepare update query.']);
        exit;
    }

    $stmt->bind_param('iii', $levelToUpdate, $pointsToUpdate, $id);
} else {
    $sql = 'UPDATE reactiontime_users
            SET points = ?, updated_at = NOW()
            WHERE id = ?';

    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        $mysqli->close();
        http_response_code(500);
        echo json_encode(['status' => false, 'message' => 'Failed to prepare update query.']);
        exit;
    }

    $stmt->bind_param('ii', $points, $id);
}

if (!$stmt->execute()) {
    $stmt->close();
    $mysqli->close();
    http_response_code(500);
    echo json_encode(['status' => false, 'message' => 'Failed to update user.']);
    exit;
}

$stmt->close();
$mysqli->close();

echo json_encode([
    'status' => true,
    'message' => 'User updated successfully.',
    'data' => [
        'id' => $id,
        'mode' => $mode,
        'level' => $mode === 1 ? $levelToUpdate : $currentLevel,
        'points' => $mode === 1 ? $pointsToUpdate : $points,
    ],
]);
