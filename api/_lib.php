<?php
// Funções compartilhadas pelos endpoints da API (bloqueado pra acesso direto no .htaccess).

function cfg($key, $default = null) {
  static $config = null;
  if ($config === null) {
    $file = __DIR__ . '/config.php';
    $config = is_file($file) ? (array) require $file : [];
  }
  if (isset($config[$key]) && $config[$key] !== '') return $config[$key];
  $env = getenv($key);
  return ($env !== false && $env !== '') ? $env : $default;
}

function only_digits($value) {
  return preg_replace('/\D/', '', (string) $value);
}

function request_body() {
  $data = json_decode(file_get_contents('php://input'), true);
  if (is_array($data)) return $data;
  return $_POST ?: [];
}

function send_json($status, $data) {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

// Remove campos vazios, como o JSON.stringify fazia com "x || undefined".
function strip_empty(array $a) {
  return array_filter($a, function ($v) { return $v !== null && $v !== '' && $v !== false; });
}

function http_request($method, $url, array $headers, $body = null) {
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => 25,
  ]);
  if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
  $text = curl_exec($ch);
  if ($text === false) {
    $error = curl_error($ch);
    curl_close($ch);
    return ['ok' => false, 'status' => 0, 'error' => $error, 'text' => '', 'data' => []];
  }
  $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
  curl_close($ch);
  $data = json_decode($text, true);
  return [
    'ok' => $status >= 200 && $status < 300,
    'status' => $status,
    'error' => null,
    'text' => $text,
    'data' => is_array($data) ? $data : [],
  ];
}
