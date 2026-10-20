<?php
// Chaves do funil. Preencha aqui (substitui as variáveis de ambiente da Vercel).
// Este arquivo é bloqueado pra acesso direto pelo .htaccess da pasta api/.
return [
  'FLEVOPAY_SECRET_KEY' => 'flevopay_sk_7d319196f57c73de97fbf1a188d9bfceb357097ae776852f077e4defd6998416',

  // Conversão no TikTok pelo backend (Events API). Deixe vazio pra desativar.
  'TIKTOK_PIXEL_ID' => 'DAIARBRC77U3EU7G889G',
  'TIKTOK_ACCESS_TOKEN' => '45d8fc23bf221990e63596c8c4bfd434bdcaad1b',

  // Opcionais
  'TIKTOK_EVENT_NAME' => 'CompletePayment',
  'TIKTOK_TEST_EVENT_CODE' => '',
];
