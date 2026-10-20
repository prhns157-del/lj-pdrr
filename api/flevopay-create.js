const FLEVOPAY_API = 'https://pagamento-processador.org.ua/api/v1/transaction';

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.FLEVOPAY_SECRET_KEY;
  if (!apiKey) {
    res.status(500).json({ message: 'FlevoPay não configurado (defina FLEVOPAY_SECRET_KEY nas variáveis de ambiente da Vercel).' });
    return;
  }

  const body = req.body || {};
  const { amountCents, externalId, payer, items, tracking } = body;
  const item = Array.isArray(items) && items[0] ? items[0] : {};
  const shipping = tracking && tracking.shipping;
  const utm = (tracking && tracking.utm) || {};

  if (!amountCents || !externalId || !payer || !payer.cpf || !payer.email || !payer.phone) {
    res.status(400).json({ message: 'Dados obrigatórios ausentes.' });
    return;
  }

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';

  const payload = {
    amount: amountCents,
    description: item.name || 'Pedido',
    reference: externalId,
    source: 'api_externa',
    customer: {
      name: payer.name || 'Cliente',
      email: payer.email,
      document: onlyDigits(payer.cpf),
      phone: onlyDigits(payer.phone),
    },
  };

  if (host) payload.postback_url = `${proto}://${host}/api/flevopay-webhook`;

  if (shipping) {
    payload.address = {
      street: shipping.rua || undefined,
      number: shipping.numero || undefined,
      complement: shipping.complemento || undefined,
      neighborhood: shipping.bairro || undefined,
      city: shipping.cidade || undefined,
      state: shipping.estado || undefined,
      zipcode: shipping.cep || undefined,
    };
  }

  payload.tracking = {
    utm_source: utm.utm_source || undefined,
    utm_medium: utm.utm_medium || undefined,
    utm_campaign: utm.utm_campaign || undefined,
    utm_content: utm.utm_content || undefined,
    utm_term: utm.utm_term || undefined,
  };

  let data;
  try {
    const response = await fetch(FLEVOPAY_API, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    data = await response.json().catch(() => ({}));
    if (!response.ok || !data.qr_code) {
      res.status(response.status && response.status >= 400 ? response.status : 502)
        .json({ message: data.message || 'Não foi possível gerar o Pix.' });
      return;
    }
  } catch (err) {
    res.status(502).json({ message: 'Falha ao conectar com o FlevoPay.' });
    return;
  }

  res.status(200).json({
    invoiceId: data.transaction_id,
    qrcode: data.qr_code,
    qrcodeBase64: data.qr_code_base64,
    expirationDate: data.expires_at,
  });
};
