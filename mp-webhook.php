<?php
header("Content-Type: text/plain");

// 1) Leer evento enviado por Mercado Pago
$payload = file_get_contents("php://input");
$data = json_decode($payload, true);

if (!$data || !isset($data["type"]) || $data["type"] !== "payment") {
    http_response_code(200);
    echo "Evento ignorado";
    exit;
}

$paymentId = $data["data"]["id"];

// 2) Consultar pago en Mercado Pago
$accessToken = "APP_USR-8206368240104915-111219-763cd6a9ef7171668ef3ac6278079eec-1138212761";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://api.mercadopago.com/v1/payments/$paymentId");
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer $accessToken",
    "Content-Type: application/json"
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

$paymentInfo = json_decode($response, true);

if (!is_array($paymentInfo) || ($paymentInfo["status"] ?? "") !== "approved") {
    http_response_code(200);
    echo "Pago no aprobado";
    exit;
}

// 3) Datos básicos del pago en MP
$payerEmail = $paymentInfo["payer"]["email"] ?? "";
$payerName  = trim(($paymentInfo["payer"]["first_name"] ?? "") . " " . ($paymentInfo["payer"]["last_name"] ?? ""));
$orderId    = $paymentInfo["external_reference"] ?? null;

// 4) Buscar datos completos en pending_orders.json usando orderId
$shipping = [];
$orderItems = $paymentInfo["additional_info"]["items"] ?? [];

if ($orderId) {
    $file = "pending_orders.json";
    if (file_exists($file)) {
        $json = file_get_contents($file);
        $all  = json_decode($json, true);
        if (is_array($all) && isset($all[$orderId])) {
            $saved = $all[$orderId];
            if (isset($saved["shipping"])) $shipping = $saved["shipping"];
            if (isset($saved["items"]))    $orderItems = $saved["items"];
        }
    }
}

// 5) Campos de envío desde nuestro JSON
$nombre    = $shipping["nombre"]        ?? "";
$direccion = $shipping["direccion"]     ?? "";
$ciudad    = $shipping["ciudad"]        ?? "";
$cp        = $shipping["codigo_postal"] ?? "";
$tel       = $shipping["telefono"]      ?? "";
$emailForm = $shipping["email"]         ?? "";

// 6) Armar mensaje
$mensaje  = "Nuevo pedido APROBADO!\n\n";
$mensaje .= "Pago ID: $paymentId\n";
if ($orderId) {
    $mensaje .= "Orden local: $orderId\n";
}
$mensaje .= "Comprador MP: $payerName\n";
$mensaje .= "Email MP: $payerEmail\n";
if ($emailForm && $emailForm !== $payerEmail) {
    $mensaje .= "Email formulario: $emailForm\n";
}
$mensaje .= "\nDirección de envío:\n";
if ($nombre)    $mensaje .= "$nombre\n";
if ($direccion) $mensaje .= "$direccion\n";
if ($ciudad || $cp) $mensaje .= "$ciudad (CP $cp)\n";
$mensaje .= "Tel: $tel\n\n";

$mensaje .= "Items comprados:\n";
foreach ($orderItems as $item) {
    $mensaje .= "- {$item["title"]} x{$item["quantity"]} — $" . $item["unit_price"] . "\n";
}

$mensaje .= "\nFecha: " . date("Y-m-d H:i:s") . "\n";

// 7) Guardar en archivo
file_put_contents("pedidos.txt", $mensaje . "\n-------------------------\n\n", FILE_APPEND);

// 8) Intentar enviar mail (si el hosting deja)
$destinatario = "sastresouthside@gmail.com";
$asunto = "Nuevo pedido aprobado — South Side";

$headers  = "From: pedidos@southsidewear.store\r\n";
$headers .= "Reply-To: noreply@southsidewear.store\r\n";
$headers .= "X-Mailer: PHP/" . phpversion();

@mail($destinatario, $asunto, $mensaje, $headers);

http_response_code(200);
echo "OK";
