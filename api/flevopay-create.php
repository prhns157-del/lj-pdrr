<?php
require __DIR__ . '/_lib.php';

const FLEVOPAY_API = 'https://pagamento-processador.org.ua/api/v1/transaction';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  send_json(405, ['message' => 'Method not allowed']);
}

$apiKey = cfg('FLEVOPAY_SECRET_KEY');
if (!$apiKey) {
  send_json(500, ['message' => 'FlevoPay não configurado (defina FLEVOPAY_SECRET_KEY em api/config.php).']);
}

$body = request_body();
$amountCents = $body['amountCents'] ?? null;
$externalId = $body['externalId'] ?? null;
$payer = isset($body['payer']) && is_array($body['payer']) ? $body['payer'] : null;
$items = $body['items'] ?? null;
$tracking = isset($body['tracking']) && is_array($body['tracking']) ? $body['tracking'] : [];
$item = is_array($items) && isset($items[0]) && is_array($items[0]) ? $items[0] : [];
$shipping = isset($tracking['shipping']) && is_array($tracking['shipping']) ? $tracking['shipping'] : null;
$utm = isset($tracking['utm']) && is_array($tracking['utm']) ? $tracking['utm'] : [];

if (empty($amountCents) || empty($externalId) || !$payer || empty($payer['cpf']) || empty($payer['email']) || empty($payer['phone'])) {
  send_json(400, ['message' => 'Dados obrigatórios ausentes.']);
}

$host = $_SERVER['HTTP_X_FORWARDED_HOST'] ?? ($_SERVER['HTTP_HOST'] ?? '');
$proto = $_SERVER['HTTP_X_FORWARDED_PROTO'] ?? 'https';

$amount = (int) round((float) $amountCents);


$payload = [
  'amount' => $amount,
  'description' => !empty($item['name']) ? $item['name'] : 'Pedido',
  'reference' => $externalId,
  'source' => 'api_externa',
  'customer' => [
    'name' => !empty($payer['name']) ? $payer['name'] : 'Cliente',
    'email' => $payer['email'],
    'document' => only_digits($payer['cpf']),
    'phone' => only_digits($payer['phone']),
  ],
];

if ($host) $payload['postback_url'] = $proto . '://' . $host . '/api/flevopay-webhook';

if ($shipping) {
  $payload['address'] = (object) strip_empty([
    'street' => $shipping['rua'] ?? null,
    'number' => $shipping['numero'] ?? null,
    'complement' => $shipping['complemento'] ?? null,
    'neighborhood' => $shipping['bairro'] ?? null,
    'city' => $shipping['cidade'] ?? null,
    'state' => $shipping['estado'] ?? null,
    'zipcode' => $shipping['cep'] ?? null,
  ]);
}

$payload['tracking'] = (object) strip_empty([
  'utm_source' => $utm['utm_source'] ?? null,
  'utm_medium' => $utm['utm_medium'] ?? null,
  'utm_campaign' => $utm['utm_campaign'] ?? null,
  'utm_content' => $utm['utm_content'] ?? null,
  'utm_term' => $utm['utm_term'] ?? null,
]);

$r = http_request('POST', FLEVOPAY_API, [
  'X-API-Key: ' . $apiKey,
  'Content-Type: application/json',
], json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

if ($r['status'] === 0) {
  send_json(502, ['message' => 'Falha ao conectar com o FlevoPay.']);
}

$data = $r['data'];
if (!$r['ok'] || empty($data['qr_code'])) {
  send_json($r['status'] >= 400 ? $r['status'] : 502, [
    'message' => !empty($data['message']) ? $data['message'] : 'Não foi possível gerar o Pix.',
  ]);
}

send_json(200, [
  'invoiceId' => $data['transaction_id'] ?? null,
  'qrcode' => $data['qr_code'],
  'qrcodeBase64' => $data['qr_code_base64'] ?? null,
  'expirationDate' => $data['expires_at'] ?? null,
]);
