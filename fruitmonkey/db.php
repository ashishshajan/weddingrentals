<?php
declare(strict_types=1);

function fruitmonkey_db(): mysqli
{
    $dbHost = 'localhost';
    $dbUser = 'fruitmonkey_user';
    $dbPass = 'GgsT($cBFZ8C';
    $dbName = 'fruitmonkey';

    $mysqli = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
    if ($mysqli->connect_error) {
        throw new RuntimeException('Database connection failed.');
    }

    $mysqli->set_charset('utf8mb4');
    return $mysqli;
}

