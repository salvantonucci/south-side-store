<?php
// crear-preferencia.php

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");

// TOKEN REAL DE PRODUCCIÓN
$ACCESS_TOKEN = "APP_USR-5371829220109665-111219-f80402a99c412f799bb73ad9921c9b09-2986591652";

// Recibir items desde el frontend
$input = json_decode(file_get_contents("php://input"), true);
$items = $input["items"] ?? [];

// Cuerpo de la preferencia
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
        "success" => "https://TUDOMINIO.COM/gracias.html",
        "failure" => "https://TUDOMINIO.COM/error.html",
        "pending" => "https://TUDOMINIO.COM/pending.html"
    ],
    "auto_return" => "approved"
];

// Llamar API Mercado Pago
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

// Enviar respuesta al frontend
echo $response;
?>
