<?php
header("Content-Type: application/json");

// Leer JSON enviado desde el frontend
$input = json_decode(file_get_contents("php://input"), true);

$orderId  = $input["order_id"]  ?? null;
$items    = $input["items"]     ?? [];
$shipping = $input["shipping"]  ?? [];

if (!$orderId) {
    echo json_encode(["ok" => false, "error" => "Falta order_id"]);
    exit;
}

$file = "pending_orders.json";
$existing = [];

// Si ya existe el archivo, lo cargamos
if (file_exists($file)) {
    $json = file_get_contents($file);
    $decoded = json_decode($json, true);
    if (is_array($decoded)) {
        $existing = $decoded;
    }
}

// Guardar / actualizar la orden
$existing[$orderId] = [
    "items"      => $items,
    "shipping"   => $shipping,
    "created_at" => date("Y-m-d H:i:s")
];

// Escribir archivo actualizado
file_put_contents($file, json_encode($existing, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

echo json_encode(["ok" => true]);
