/**
 * Cliente PIX standalone para as páginas estáticas /upsells/1, /upsells/2, /upsells/3.
 * Porta em vanilla JS a mesma lógica de src/store/services/api.js (criarPix,
 * verificarStatusPix, roteamento de gateway por origem de tráfego, coleta de UTMs).
 * Mantém compatibilidade com o restante da loja via localStorage/sessionStorage
 * (mesmas chaves usadas por UTMPersistence.jsx e Checkout.jsx).
 */
(function (global) {
  "use strict";

  var SUPABASE_URL = "https://oiymxvvrtueibnbwgyay.supabase.co";
  var SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9peW14dnZydHVlaWJuYndneWF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NzgzODcsImV4cCI6MjA5NDI1NDM4N30.A41rxjRozgIIVtpjd7-ZfRs9f4g5xKNKPicu9k7gjpA";

  var UTM_URL_KEYS = [
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "utm_id", "ttclid", "sck", "fbclid", "gclid", "gestor",
  ];

  // ───────── UTM persistence (mirrors UTMPersistence.jsx) ─────────

  function persistUtmsFromUrl() {
    try {
      var urlParams = new URLSearchParams(window.location.search);
      UTM_URL_KEYS.forEach(function (key) {
        var value = urlParams.get(key);
        if (value) localStorage.setItem("utm_" + key, value);
      });
    } catch (e) {
      /* noop */
    }
  }

  // ───────── Traffic origin (mirrors utils/trafficOrigin.js) ─────────

  var META_SOURCES = ["facebook", "fb", "meta", "instagram", "ig", "facebook_ads", "meta_ads", "fb_ads"];
  var TIKTOK_SOURCES = ["tiktok", "tt", "tiktok_ads", "tt_ads"];

  function detectTrafficOrigin() {
    try {
      var urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("fbclid")) return "meta";
      if (urlParams.get("ttclid")) return "tiktok";

      var src = (urlParams.get("utm_source") || localStorage.getItem("utm_utm_source") || "")
        .toLowerCase()
        .trim();
      if (!src) return "organic";

      if (META_SOURCES.some(function (s) { return src === s || src.indexOf(s) !== -1; })) return "meta";
      if (TIKTOK_SOURCES.some(function (s) { return src === s || src.indexOf(s) !== -1; })) return "tiktok";
      return "organic";
    } catch (e) {
      return "organic";
    }
  }

  function getTrafficOrigin() {
    try {
      var v = sessionStorage.getItem("traffic_origin");
      if (v === "meta" || v === "tiktok" || v === "organic") return v;
    } catch (e) {
      /* noop */
    }
    return "organic";
  }

  function setTrafficOrigin(origin) {
    if (origin !== "meta" && origin !== "tiktok" && origin !== "organic") return;
    try {
      var current = sessionStorage.getItem("traffic_origin");
      // Origem paga já gravada não é rebaixada para organic (mesma regra do original).
      if ((current === "meta" || current === "tiktok") && origin === "organic") return;
      if (current === origin) return;
      sessionStorage.setItem("traffic_origin", origin);
    } catch (e) {
      /* noop */
    }
  }

  // ───────── store-config cache (mirrors fetchStoreConfig/getFromStoreConfig) ─────────

  var _storeConfigCache = null;
  var _storeConfigInflight = null;

  function fetchStoreConfig() {
    if (_storeConfigCache) return Promise.resolve(_storeConfigCache);
    if (_storeConfigInflight) return _storeConfigInflight;

    _storeConfigInflight = fetch(SUPABASE_URL + "/functions/v1/store-config", {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + SUPABASE_ANON_KEY },
    })
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .catch(function (err) {
        console.warn("store-config edge failed:", err);
        return null;
      })
      .then(function (data) {
        _storeConfigCache = data && typeof data === "object" ? data : {};
        _storeConfigInflight = null;
        return _storeConfigCache;
      });

    return _storeConfigInflight;
  }

  function getFromStoreConfig(key) {
    if (_storeConfigCache && key in _storeConfigCache) return _storeConfigCache[key];
    return null;
  }

  // ───────── Gateway routing (mirrors getActiveGateway) ─────────

  var _gatewayCache = { values: null, ts: 0 };
  var GATEWAY_CACHE_TTL = 10000;

  function fetchAllGatewayKeys() {
    return fetch(SUPABASE_URL + "/functions/v1/gateway-routing", {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + SUPABASE_ANON_KEY },
    }).then(function (res) {
      if (!res.ok) throw new Error("gateway-routing fetch failed: " + res.status);
      return res.json();
    }).then(function (data) {
      return {
        tiktok: data.tiktok || null,
        meta: data.meta || null,
        organic: data.organic || null,
        _legacy: data.legacy || null,
      };
    });
  }

  async function getActiveGateway(origin) {
    var o = origin === "meta" || origin === "tiktok" || origin === "organic" ? origin : getTrafficOrigin();

    if (_gatewayCache.values && Date.now() - _gatewayCache.ts < GATEWAY_CACHE_TTL) {
      var cached = _gatewayCache.values[o] || _gatewayCache.values._legacy;
      if (cached) return cached;
    }

    try {
      var values = await fetchAllGatewayKeys();
      _gatewayCache = { values: values, ts: Date.now() };
      var picked = values[o] || values._legacy;
      if (picked) return picked;
    } catch (e) {
      console.warn("[getActiveGateway] fetch failed:", e);
    }

    if (_gatewayCache.values) {
      var fallback = _gatewayCache.values[o] || _gatewayCache.values._legacy;
      if (fallback) return fallback;
    }

    throw new Error("Nenhum gateway ativo configurado. Configure um gateway no painel admin.");
  }

  // ───────── UTM collection for PIX payload (mirrors collectUtmParams) ─────────

  var PAYLOAD_UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "sck", "ttclid", "fbclid", "gclid", "gestor"];

  function collectUtmParams() {
    var params = {};
    PAYLOAD_UTM_KEYS.forEach(function (key) {
      var saved = localStorage.getItem("utm_" + key);
      if (saved) params[key] = saved;
    });
    try {
      var urlParams = new URLSearchParams(window.location.search);
      PAYLOAD_UTM_KEYS.forEach(function (key) {
        var val = urlParams.get(key);
        if (val && !params[key]) params[key] = val;
      });
    } catch (e) {
      /* noop */
    }

    if (!params.utm_source) {
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf("XTRACKY_LEAD_ID_") === 0) {
            var leadId = localStorage.getItem(k);
            if (leadId && /^[A-Za-z0-9_-]{6,200}$/.test(leadId)) {
              params.utm_source = leadId;
              if (!params.sck) params.sck = leadId;
              break;
            }
          }
        }
      } catch (e) {
        /* noop */
      }
    }
    return params;
  }

  // ───────── PIX creation — unificado (todos os gateways usam o mesmo payload) ─────────

  var GATEWAY_ENDPOINTS = {
    ghostspay: "ghostspay-create-pix",
    paradise: "paradise-create-pix",
    medusapay: "medusapay-create-pix",
    mangofy: "mangofy-create-pix",
    propay: "propay-create-pix",
    invictuspay: "invictuspay-create-pix",
    brutalcash: "brutalcash-create-pix",
    duttyfy: "duttyfy-create-pix",
    nerva: "nerva-create-pix",
  };

  function invokeEdgeFunction(functionName, options) {
    options = options || {};
    var url = SUPABASE_URL + "/functions/v1/" + functionName;
    var headers = Object.assign(
      { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + SUPABASE_ANON_KEY },
      options.headers || {},
    );
    return fetch(url, Object.assign({}, options, { headers: headers }));
  }

  async function criarPix(dados) {
    try {
      var origin = getTrafficOrigin();
      var gateway = await getActiveGateway(origin);
      console.log("[criarPix] Origem: " + origin + " → Gateway: " + gateway);

      var endpoint = GATEWAY_ENDPOINTS[gateway];
      if (!endpoint) {
        console.error("[criarPix] Gateway não implementado:", gateway);
        return { success: false, error: 'Gateway "' + gateway + '" ainda não implementado.' };
      }

      var utms = collectUtmParams();
      var payload = {
        valor: dados.valor,
        nome: dados.nome,
        cpf: dados.cpf || "",
        email: dados.email,
        telefone: dados.telefone,
        itens: dados.itens || [],
        pedido_id: dados.pedido_id,
        utm_source: utms.utm_source || utms.sck || "",
        utm_medium: utms.utm_medium || "",
        utm_campaign: utms.utm_campaign || "",
        utm_term: utms.utm_term || "",
        utm_content: utms.utm_content || "",
        sck: utms.sck || "",
        ttclid: utms.ttclid || "",
        fbclid: utms.fbclid || "",
        gclid: utms.gclid || "",
        gestor: utms.gestor || "",
        traffic_origin: origin,
      };
      if (gateway === "nerva") {
        payload.fbp = utms.fbp || "";
        payload.fbc = utms.fbc || "";
      }

      var res = await invokeEdgeFunction(endpoint, { method: "POST", body: JSON.stringify(payload) });
      var data = await res.json();

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Erro ao gerar PIX" };
      }

      return {
        success: true,
        pixCode: data.pixCode,
        transactionId: data.transactionId,
        transaction_id: data.transactionId,
        expiresAt: data.expiresAt,
        expires_at: data.expiresAt,
        gateway: data.gateway || gateway,
      };
    } catch (err) {
      console.error("[criarPix] Erro:", err);
      return { success: false, error: err.message || "Erro ao gerar PIX" };
    }
  }

  async function verificarStatusPix(transactionId, gateway) {
    if (gateway === "duttyfy") {
      try {
        var res = await invokeEdgeFunction(
          "duttyfy-check-status?transactionId=" + encodeURIComponent(transactionId),
          { method: "GET" },
        );
        var data = await res.json();
        if (data && data.status === "COMPLETED") return { paid: true, status: "COMPLETED", paid_at: data.paidAt };
        return { status: (data && data.status) || "pending" };
      } catch (err) {
        console.error("[verificarStatusPix] DuttyFy check error:", err);
        return { status: "pending" };
      }
    }

    try {
      var res2 = await fetch(
        SUPABASE_URL +
          "/rest/v1/pix_transactions?select=status,paid_at&transaction_id=eq." +
          encodeURIComponent(transactionId) +
          "&gateway=eq." +
          encodeURIComponent(gateway || "ghostspay"),
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: "Bearer " + SUPABASE_ANON_KEY,
            Accept: "application/vnd.pgrst.object+json",
          },
        },
      );
      if (!res2.ok) return { status: "pending" };
      var data2 = await res2.json();
      if (data2 && data2.status === "COMPLETED") return { paid: true, status: "COMPLETED", paid_at: data2.paid_at };
      return { status: (data2 && data2.status) || "pending" };
    } catch (err) {
      console.error("[verificarStatusPix] Error:", err);
      return { status: "pending" };
    }
  }

  // ───────── Helpers diversos ─────────

  function urlWithUtm(path) {
    var search = window.location.search;
    if (!search) return path;
    var sep = path.indexOf("?") !== -1 ? "&" : "?";
    return path + sep + search.substring(1);
  }

  function getCustomerData() {
    try {
      var stored = localStorage.getItem("customerData");
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      // Fallback for TikTok in-app browser and other restricted WebViews
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

  // Roda uma vez por carregamento de página, tal como UTMPersistence.jsx faz por rota.
  persistUtmsFromUrl();
  setTrafficOrigin(detectTrafficOrigin());

  global.PixClient = {
    SUPABASE_URL: SUPABASE_URL,
    SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
    invokeEdgeFunction: invokeEdgeFunction,
    fetchStoreConfig: fetchStoreConfig,
    getFromStoreConfig: getFromStoreConfig,
    getTrafficOrigin: getTrafficOrigin,
    criarPix: criarPix,
    verificarStatusPix: verificarStatusPix,
    urlWithUtm: urlWithUtm,
    getCustomerData: getCustomerData,
    copyToClipboard: copyToClipboard,
  };
})(window);
