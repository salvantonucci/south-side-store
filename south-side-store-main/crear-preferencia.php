<?php
// crear-preferencia.php

// Vamos a devolver JSON
header("Content-Type: application/json");
// Permitimos que tu JS del front llame a este PHP
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");

// 1. TU TOKEN DE MERCADO PAGO (de prueba por ahora)
$ACCESS_TOKEN = "TEST-TU-TOKEN-DE-MP-AQUI"; // <-- CAMBIAR

// 2. Leer lo que mandó el frontend
$input = json_decode(file_get_contents("php://input"), true);
$items = $input["items"] ?? [];

// 3. Armar el cuerpo para Mercado Pago
$body = [
    "items" => array_map(function($it) {
        return [
            "title" => $it["title"],
            "quantity" => $it["quantity"],
            "currency_id" => "ARS",
            "unit_price" => $it["unit_price"],
        ];
    }, $items),
    "back_urls" => [
        // 👇 estas 3 páginas las tenés que crear vos (abajo te las paso)
        "success" => "https://tudominio.com/gracias.html",
        "failure" => "https://tudominio.com/error.html",
        "pending" => "https://tudominio.com/pending.html"
    ],
    "auto_return" => "approved"
];

// 4. Llamar a la API de Mercado Pago
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://api.mercadopago.com/checkout/preferences");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "Authorization: Bearer $ACCESS_TOKEN"
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));

$response = curl_exec($ch);
curl_close($ch);

// 5. Devolver lo que diga Mercado Pago al frontend
echo $response;
?>
