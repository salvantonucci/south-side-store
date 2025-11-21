<?php
header("Content-Type: application/json");

$accessToken = "APP_USR-8206368240104915-111219-763cd6a9ef7171668ef3ac6278079eec-1138212761";

$input = json_decode(file_get_contents("php://input"), true);
$items    = $input["items"];
$shipping = $input["shipping"];
$orderId  = $input["order_id"]; // ID local de la orden

// Preferencia simple – ya no dependemos del shipping de MP
$preference = [
    "items" => $items,

    // Referencia interna para poder enlazar con pending_orders.json
    "external_reference" => $orderId,

    // Solo usamos el email en MP (ya tenemos el resto en nuestro JSON)
    "payer" => [
        "email" => $shipping["email"]
    ],

    "additional_info" => [
        "items"    => $items,
        "order_id" => $orderId
    ],

    "notification_url" => "https://southsidewear.store/mp-webhook.php",

    "back_urls" => [
        "success" => "https://southsidewear.store/gracias.html",
        "pending" => "https://southsidewear.store/pending.html",
        "failure" => "https://southsidewear.store/error.html"
    ],

    "auto_return" => "approved"
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://api.mercadopago.com/checkout/preferences");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "Authorization: Bearer $accessToken"
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($preference));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
curl_close($ch);

echo $response;
