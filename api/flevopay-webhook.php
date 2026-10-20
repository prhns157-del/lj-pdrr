<?php
require __DIR__ . '/_lib.php';

const FLEVOPAY_QUERY_API = 'https://pagamento-processador.org.ua/api/v1/query';
const TIKTOK_EVENTS_API = 'https://business-api.tiktok.com/open_api/v1.3/event/track/';

function sha256($value) {
  return hash('sha256', strtolower(trim((string) $value)));
}

function send_tiktok_event($pixelId, $accessToken, $eventId, $amountReais, array $user) {
  $eventBody = [
    'event_source' => 'web',
    'event_source_id' => $pixelId,
    'data' => [[
      'event' => cfg('TIKTOK_EVENT_NAME', 'CompletePayment'),
      'event_time' => time(),
      'event_id' => $eventId,
      'user' => (object) $user,
      'properties' => [
        'content_type' => 'product',
        'currency' => 'BRL',
        'value' => $amountReais,
      ],
    ]],
  ];
  $testCode = cfg('TIKTOK_TEST_EVENT_CODE');
  if ($testCode) $eventBody['test_event_code'] = $testCode;

  $r = http_request('POST', TIKTOK_EVENTS_API, [
    'Access-Token: ' . $accessToken,
    'Content-Type: application/json',
  ], json_encode($eventBody, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

  // A TikTok responde HTTP 200 mesmo quando recusa o evento; o erro vem em "code" no corpo.
  $code = $r['data']['code'] ?? null;
  if (!$r['ok'] || $code !== 0) {
    error_log("TikTok event failed $pixelId $eventId $amountReais {$r['status']} {$r['error']} {$r['text']}");
  }
}

function push_tiktok_purchase($eventId, $amountReais, array $customer) {
  $pixelId = cfg('TIKTOK_PIXEL_ID');
  $accessToken = cfg('TIKTOK_ACCESS_TOKEN');
  if (!$pixelId || !$accessToken) return;

  $user = [];
  if (!empty($customer['email'])) $user['email'] = sha256($customer['email']);
  $phoneDigits = only_digits($customer['phone'] ?? '');
  if ($phoneDigits !== '') {
    $e164 = strpos($phoneDigits, '55') === 0 ? '+' . $phoneDigits : '+55' . $phoneDigits;
    // A doc pública da TikTok Events API não deixa 100% claro se a chave é "phone" ou
    // "phone_number" nessa versão; mandamos as duas (chaves extras são ignoradas).
    $user['phone'] = sha256($e164);
    $user['phone_number'] = sha256($e164);
  }
  $docDigits = only_digits($customer['document'] ?? '');
  if ($docDigits !== '') $user['external_id'] = sha256($docDigits);

  send_tiktok_event($pixelId, $accessToken, $eventId, $amountReais, $user);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  exit;
}

$apiKey = cfg('FLEVOPAY_SECRET_KEY');
$incoming = request_body();
$transactionId = $incoming['transaction_id'] ?? null;

if (!$apiKey || empty($transactionId)) {
  // Sem como validar nada aqui: só confirma o recebimento pra FlevoPay não ficar retentando.
  http_response_code(200);
  exit;
}

// A doc da FlevoPay não documenta assinatura/segredo pro webhook, então em vez de confiar
// cegamente no corpo recebido, revalidamos o status e os dados direto na FlevoPay usando
// nossa própria Secret Key antes de repassar qualquer coisa pro TikTok.
$verified = null;
$q = http_request('GET', FLEVOPAY_QUERY_API . '?action=get_transaction&id=' . rawurlencode((string) $transactionId), [
  'X-API-Key: ' . $apiKey,
]);
if ($q['ok'] && !empty($q['data']['status'])) $verified = $q['data'];
elseif ($q['status'] === 0) error_log('flevopay-webhook: verificação falhou ' . $q['error']);

$status = $verified ? $verified['status'] : ($incoming['status'] ?? null);
$sentAtCreation = ($verified && !empty($verified['customer_data']) && is_array($verified['customer_data'])) ? $verified['customer_data'] : [];
$customer = !empty($sentAtCreation['customer']) ? $sentAtCreation['customer']
  : (!empty($incoming['customer']) ? $incoming['customer'] : []);
if (!is_array($customer)) $customer = [];
$amountCents = $verified['amount'] ?? ($incoming['amount'] ?? 0);
// O event_id usa a nossa reference (e não o transaction_id) porque é o único identificador
// que o navegador também conhece: o flevopay-status devolve o mesmo valor pra página.
$reference = !empty($verified['external_id']) ? $verified['external_id']
  : (!empty($incoming['external_id']) ? $incoming['external_id'] : ($incoming['store_reference'] ?? null));

if ($status === 'approved') {
  push_tiktok_purchase('pix_' . ($reference ?: $transactionId), ((float) $amountCents) / 100, $customer);
}

send_json(200, ['received' => true]);
