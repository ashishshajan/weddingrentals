<?php
declare(strict_types=1);

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed.',
    ]);
    exit;
}

$rawBody = file_get_contents('php://input');
$data = json_decode($rawBody ?: '', true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Invalid request payload.',
    ]);
    exit;
}

$fullName = trim((string)($data['fullName'] ?? ''));
$phone = preg_replace('/\D+/', '', (string)($data['phone'] ?? '')) ?? '';
$email = trim((string)($data['email'] ?? ''));
$eventDate = trim((string)($data['eventDate'] ?? ''));
$startLocation = trim((string)($data['startLocation'] ?? ''));
$endLocation = trim((string)($data['endLocation'] ?? ''));
$pickupTime = trim((string)($data['pickupTime'] ?? ''));
$hoursRequired = (int)($data['hours'] ?? 0);
$vehicleId = trim((string)($data['vehicleId'] ?? ''));
$vehicleName = trim((string)($data['vehicleName'] ?? ''));
$estimatedTotal = (float)($data['estimatedTotal'] ?? 0);

if (
    $fullName === '' || $phone === '' || $email === '' || $eventDate === '' ||
    $startLocation === '' || $endLocation === '' || $pickupTime === '' ||
    $hoursRequired <= 0 || $vehicleName === ''
) {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'message' => 'Please fill all required booking fields.',
    ]);
    exit;
}

$dbHost = '127.0.0.1';
$dbUser = 'adhamsworld_user';
$dbPass = 'GgsT($cBFZ8C';
$dbName = 'adhamsworld';

$mysqli = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
if ($mysqli->connect_error) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed.',
    ]);
    exit;
}

$sql = "INSERT INTO enquiry (
    fullName,
    phone,
    email,
    eventDate,
    startLocation,
    endLocation,
    pickupTime,
    hoursRequired,
    vehicleId,
    vehicleName,
    estimatedTotal
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

$stmt = $mysqli->prepare($sql);
if (!$stmt) {
    $mysqli->close();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to prepare database query.',
    ]);
    exit;
}

$stmt->bind_param(
    'sssssssissd',
    $fullName,
    $phone,
    $email,
    $eventDate,
    $startLocation,
    $endLocation,
    $pickupTime,
    $hoursRequired,
    $vehicleId,
    $vehicleName,
    $estimatedTotal
);

if (!$stmt->execute()) {
    $stmt->close();
    $mysqli->close();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to save enquiry. Please check table columns.',
    ]);
    exit;
}

$stmt->close();
$mysqli->close();

echo json_encode([
    'success' => true,
    'message' => 'Booking saved successfully.',
]);
