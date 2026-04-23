<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    http_response_code(405);
    echo json_encode(['message' => 'Method not allowed. Use POST.']);
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

// Require user_id in POST body (form-data/x-www-form-urlencoded or JSON body).
$input = $_POST;
if (empty($input)) {
    $raw = file_get_contents('php://input');
    if ($raw !== false && $raw !== '') {
        $json = json_decode($raw, true);
        if (is_array($json)) {
            $input = $json;
        }
    }
}

$userId = filter_var($input['user_id'] ?? null, FILTER_VALIDATE_INT);
if ($userId === false || $userId === null || $userId <= 0) {
    http_response_code(400);
    echo json_encode(['message' => 'user_id is required and must be a positive integer.']);
    $mysqli->close();
    exit;
}

// Optional limit (?limit=50). Clamped to 1..500
$limit = 100;
if (isset($_GET['limit'])) {
    $tmp = filter_var($_GET['limit'], FILTER_VALIDATE_INT);
    if ($tmp !== false) $limit = $tmp;
}
$limit = max(1, min(500, $limit));

$sql = "SELECT id, name, level, points
        FROM fruitmonkey_users
        ORDER BY level DESC, points DESC, id DESC
        LIMIT ?";

$stmt = $mysqli->prepare($sql);
if (!$stmt) {
    $mysqli->close();
    http_response_code(500);
    echo json_encode(['status' => false, 'message' => 'Failed to prepare database query.']);
    exit;
}

$stmt->bind_param('i', $limit);

if (!$stmt->execute()) {
    $stmt->close();
    $mysqli->close();
    http_response_code(500);
    echo json_encode(['status' => false, 'message' => 'Failed to fetch leaderboard.']);
    exit;
}

$result = $stmt->get_result();
$rows = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $row['id'] = (int)$row['id'];
        $row['level'] = (int)$row['level'];
        $row['points'] = (int)$row['points'];
        $rows[] = $row;
    }
}

$stmt->close();
$mysqli->close();

echo json_encode([
    'status' => true,
    'message' => 'Leaderboard fetched successfully.',
    'data' => $rows,
]);
