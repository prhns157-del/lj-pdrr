/**
 * Cliente Pix nativo do projeto para as páginas estáticas /upsells/1, /upsells/2, /upsells/3.
 * Usa os mesmos endpoints serverless que o app principal (/api/flevopay-create,
 * /api/flevopay-status) em vez do gateway/Supabase de outro projeto. A conversão
 * é disparada duas vezes com o mesmo event_id: pelo backend (TikTok Events API, via
 * webhook) e pelo pixel do navegador (trackTikTokPurchase), e a TikTok deduplica.
 */

export function getCustomerData() {
  try {
    var raw = window.localStorage.getItem("tiktokshop:order");
    if (!raw) return {};
    var order = JSON.parse(raw);
    var addr = (order && order.address) || {};
    return {
      nome: addr.nome || "",
      cpf: addr.cpf || "",
      email: addr.email || "",
      telefone: addr.telefone || "",
      endereco: addr.endereco || "",
      numero: addr.numero || "",
      complemento: addr.complemento || "",
      bairro: addr.bairro || "",
      cidade: addr.cidade || "",
      estado: addr.estado || "",
      cep: addr.cep || "",
    };
  } catch (e) {
    return {};
  }
}

export function urlWithUtm(path) {
  var search = window.location.search;
  if (!search) return path;
  var sep = path.indexOf("?") !== -1 ? "&" : "?";
  return path + sep + search.substring(1);
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch (e2) {
      return false;
    }
  }
}

export async function criarPix(dados) {
  try {
    var customer = getCustomerData();
    var itens = dados.itens || [];
    var payload = {
      amountCents: Math.round((dados.valor || 0) * 100),
      externalId: dados.externalId,
      payer: {
        name: dados.nome || customer.nome || "Cliente",
        cpf: dados.cpf || customer.cpf || "",
        email: dados.email || customer.email || "",
        phone: dados.telefone || customer.telefone || "",
      },
      items: itens.map(function (it) {
        return {
          name: it.nome,
          unit_price: Math.round((it.preco || 0) * 100),
          quantity: it.quantidade || 1,
        };
      }),
      tracking: {
        shipping: {
          cep: customer.cep,
          estado: customer.estado,
          cidade: customer.cidade,
          bairro: customer.bairro,
          rua: customer.endereco,
          numero: customer.numero,
          complemento: customer.complemento,
        },
        utm: dados.utm || {},
      },
    };

    var res = await fetch("/api/flevopay-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    var data = await res.json().catch(function () {
      return {};
    });

    if (!res.ok || !data.invoiceId) {
      return { success: false, error: data.message || "Erro ao gerar PIX" };
    }

    return {
      success: true,
      pixCode: data.qrcode,
      transactionId: data.invoiceId,
      transaction_id: data.invoiceId,
      expiresAt: data.expirationDate,
    };
  } catch (err) {
    return { success: false, error: (err && err.message) || "Erro ao gerar PIX" };
  }
}

// Dispara a compra pelo pixel do navegador, que leva junto o clique do anúncio (ttclid/_ttp).
// "tiktok" vem do /api/flevopay-status com o mesmo nome de evento e event_id que o webhook
// manda pela Events API, então a TikTok conta os dois como uma venda só.
export function trackTikTokPurchase(tiktok, valor) {
  try {
    if (!tiktok || !tiktok.eventId || !window.ttq) return;
    var customer = getCustomerData();
    var identify = {};
    var email = String(customer.email || "").trim().toLowerCase();
    if (email) identify.email = email;
    var phone = String(customer.telefone || "").replace(/\D/g, "");
    if (phone) identify.phone_number = phone.indexOf("55") === 0 ? "+" + phone : "+55" + phone;
    var cpf = String(customer.cpf || "").replace(/\D/g, "");
    if (cpf) identify.external_id = cpf;
    if (Object.keys(identify).length) window.ttq.identify(identify);
    window.ttq.track(
      tiktok.event || "CompletePayment",
      { content_type: "product", currency: "BRL", value: valor },
      { event_id: tiktok.eventId }
    );
  } catch (e) {}
}

export async function verificarStatusPix(invoiceId) {
  try {
    var res = await fetch("/api/flevopay-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId: invoiceId }),
    });
    var data = await res.json().catch(function () {
      return { status: "pending" };
    });
    return data;
  } catch (err) {
    return { status: "pending" };
  }
}
