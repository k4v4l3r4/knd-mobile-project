<?php
echo "PHP is working\n";
require __DIR__ . '/vendor/autoload.php';
echo "Autoload loaded\n";
$app = require_once __DIR__ . '/bootstrap/app.php';
echo "App bootstrapped\n";
