<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if (!in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', ['GET', 'POST'], true)) {
    http_response_code(405);
    echo json_encode(['status' => 'ERROR', 'message' => 'Method not allowed.']);
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

// Optional limit (?limit=50). Clamped to 1..500
$limit = 100;
if (isset($_GET['limit'])) {
    $tmp = filter_var($_GET['limit'], FILTER_VALIDATE_INT);
    if ($tmp !== false) $limit = $tmp;
}
$limit = max(1, min(500, $limit));

$sql = "SELECT id, name, platform, os, level, points
        FROM users
        ORDER BY level DESC, id DESC
        LIMIT ?";

$stmt = $mysqli->prepare($sql);
if (!$stmt) {
    $mysqli->close();
    http_response_code(500);
    echo json_encode(['status' => 'ERROR', 'message' => 'Failed to prepare database query.']);
    exit;
}

$stmt->bind_param('i', $limit);

if (!$stmt->execute()) {
    $stmt->close();
    $mysqli->close();
    http_response_code(500);
    echo json_encode(['status' => 'ERROR', 'message' => 'Failed to fetch leaderboard.']);
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
    'status' => 'OK',
    'count' => count($rows),
    'users' => $rows,
]);
