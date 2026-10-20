<?php
require __DIR__ . '/_lib.php';

const FLEVOPAY_API = 'https://pagamento-processador.org.ua/api/v1/query';

function map_status($raw) {
  switch ($raw) {
    case 'approved':
      return 'paid';
    case 'failed':
    case 'refused':
    case 'refunded':
    case 'chargeback':
      return 'failed';
    default:
      return 'pending';
  }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  send_json(405, ['message' => 'Method not allowed']);
}

$apiKey = cfg('FLEVOPAY_SECRET_KEY');
if (!$apiKey) {
  send_json(500, ['message' => 'FlevoPay não configurado (defina FLEVOPAY_SECRET_KEY em api/config.php).']);
}

$body = request_body();
$invoiceId = $body['invoiceId'] ?? null;
if (empty($invoiceId)) {
  send_json(400, ['message' => 'invoiceId ausente.']);
}

$url = FLEVOPAY_API . '?action=get_transaction&id=' . rawurlencode((string) $invoiceId);
$r = http_request('GET', $url, ['X-API-Key: ' . $apiKey]);

if (!$r['ok']) {
  send_json(200, ['status' => 'pending']);
}

$data = $r['data'];
$status = map_status($data['status'] ?? null);
$out = ['status' => $status];
// Nome e event_id iguais aos que o flevopay-webhook manda pela Events API, pra página
// disparar o mesmo evento pelo pixel do navegador e a TikTok deduplicar os dois.
if ($status === 'paid' && !empty($data['external_id'])) {
  $out['tiktok'] = [
    'event' => cfg('TIKTOK_EVENT_NAME', 'CompletePayment'),
    'eventId' => 'pix_' . $data['external_id'],
  ];
}
send_json(200, $out);
