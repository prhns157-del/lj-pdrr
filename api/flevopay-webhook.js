const crypto = require('crypto');

const FLEVOPAY_QUERY_API = 'https://pagamento-processador.org.ua/api/v1/query';
const TIKTOK_EVENTS_API = 'https://business-api.tiktok.com/open_api/v1.3/event/track/';

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex');
}

async function sendTikTokEvent({ pixelId, accessToken, eventId, amountReais, user }) {
  const eventBody = {
    event_source: 'web',
    event_source_id: pixelId,
    data: [{
      event: process.env.TIKTOK_EVENT_NAME || 'CompletePayment',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      user,
      properties: {
        content_type: 'product',
        currency: 'BRL',
        value: amountReais,
      },
    }],
  };
  if (process.env.TIKTOK_TEST_EVENT_CODE) eventBody.test_event_code = process.env.TIKTOK_TEST_EVENT_CODE;

  try {
    const r = await fetch(TIKTOK_EVENTS_API, {
      method: 'POST',
      headers: { 'Access-Token': accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify(eventBody),
    });
    // A TikTok responde HTTP 200 mesmo quando recusa o evento; o erro vem em "code" no corpo.
    const text = await r.text().catch(() => '');
    let code = null;
    try { code = JSON.parse(text).code; } catch (e) {}
    if (!r.ok || code !== 0) console.error('TikTok event failed', pixelId, eventId, amountReais, r.status, text);
    else console.log('TikTok event sent', pixelId, eventId, amountReais);
  } catch (err) {
    console.error('TikTok event error', pixelId, err);
  }
}

async function pushTikTokPurchase({ eventId, amountReais, customer }) {
  const pixelId = process.env.TIKTOK_PIXEL_ID;
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;
  if (!pixelId || !accessToken) return;

  const user = {};
  if (customer.email) user.email = sha256(customer.email);
  const phoneDigits = onlyDigits(customer.phone);
  if (phoneDigits) {
    const e164 = phoneDigits.startsWith('55') ? `+${phoneDigits}` : `+55${phoneDigits}`;
    // A doc pública da TikTok Events API não deixa 100% claro se a chave é "phone" ou
    // "phone_number" nessa versão; mandamos as duas (chaves extras são ignoradas).
    user.phone = sha256(e164);
    user.phone_number = sha256(e164);
  }
  const docDigits = onlyDigits(customer.document);
  if (docDigits) user.external_id = sha256(docDigits);

  await sendTikTokEvent({ pixelId, accessToken, eventId, amountReais, user });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const apiKey = process.env.FLEVOPAY_SECRET_KEY;
  const incoming = req.body || {};
  const transactionId = incoming.transaction_id;

  if (!apiKey || !transactionId) {
    // Sem como validar nada aqui: só confirma o recebimento pra FlevoPay não ficar retentando.
    res.status(200).end();
    return;
  }

  // A doc da FlevoPay não documenta assinatura/segredo pro webhook, então em vez de confiar
  // cegamente no corpo recebido, revalidamos o status e os dados direto na FlevoPay usando
  // nossa própria Secret Key antes de repassar qualquer coisa pro TikTok.
  let verified = null;
  try {
    const q = await fetch(`${FLEVOPAY_QUERY_API}?action=get_transaction&id=${encodeURIComponent(transactionId)}`, {
      headers: { 'X-API-Key': apiKey },
    });
    const qData = await q.json().catch(() => ({}));
    if (q.ok && qData.status) verified = qData;
  } catch (err) {
    console.error('flevopay-webhook: verificação falhou', err);
  }

  const status = verified ? verified.status : incoming.status;
  const sentAtCreation = (verified && verified.customer_data) || {};
  const customer = sentAtCreation.customer || incoming.customer || {};
  const amountCents = (verified && verified.amount) ?? incoming.amount ?? 0;
  // O event_id usa a nossa reference (e não o transaction_id) porque é o único identificador
  // que o navegador também conhece: o flevopay-status.js devolve o mesmo valor pra página.
  const reference = (verified && verified.external_id) || incoming.external_id || incoming.store_reference;

  if (status === 'approved') {
    await pushTikTokPurchase({
      eventId: `pix_${reference || transactionId}`,
      amountReais: amountCents / 100,
      customer,
    });
  }

  res.status(200).json({ received: true });
};
