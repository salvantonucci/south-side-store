<?php
// === Mercado Pago Preferencia ===
// Archivo: crear-preferencia.php

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: https://southsidewear.store");
header("Access-Control-Allow-Headers: *");

// TOKEN REAL (PRODUCCIÓN)
$ACCESS_TOKEN = "APP_USR-5371829220109665-111219-f80402a99c412f799bb73ad9921c9b09-2986591652";

// Leer datos enviados desde el frontend
$input = json_decode(file_get_contents("php://input"), true);
$items = $input["items"] ?? [];

// Validación
if (!$items || !is_array($items)) {
    echo json_encode([
        "error" => true,
        "message" => "items_missing"
    ]);
    exit;
}

// Construcción del body para Mercado Pago
$body = [
    "items" => array_map(function($p) {
        return [
            "title" => $p["title"],
            "quantity" => 1,
            "unit_price" => floatval($p["unit_price"]),
            "currency_id" => "ARS"
        ];
    }, $items),

    "back_urls" => [
        "success" => "https://southsidewear.store/gracias",
        "failure" => "https://southsidewear.store/error",
        "pending" => "https://southsidewear.store/pending"
    ],
    "auto_return" => "approved"
];

// === CURL REQUEST ===
$ch = curl_init();

curl_setopt($ch, CURLOPT_URL, "https://api.mercadopago.com/checkout/preferences");
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer $ACCESS_TOKEN",
    "Content-Type: application/json"
]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Si Mercado Pago responde mal:
if (!$response || $httpCode >= 300) {
    echo json_encode([
        "error" => true,
        "message" => "mp_api_error",
        "httpCode" => $httpCode,
        "response" => $response
    ]);
    exit;
}

// Respuesta limpia al frontend
echo $response;
exit;
