/**
 * Pixel tracking standalone para as páginas estáticas /upsells/1, /upsells/2, /upsells/3.
 * Porta em vanilla JS a mesma lógica de src/store/hooks/usePixelTracking.js:
 * injeta os pixels ativos (lidos do store-config via PixClient), dispara eventos
 * de browser (ttq/fbq/gtag) e, para Facebook, também dispara Meta CAPI server-side
 * com o mesmo event_id (dedup). Requer pix-client.js carregado antes.
 */
(function (global) {
  "use strict";

  function isSafeValue(val) {
    if (!val || typeof val !== "string") return false;
    if (/<|>|script|document\.|window\.|eval\(|function\s*\(|innerHTML|appendChild|createElement/i.test(val)) return false;
    return /^[a-zA-Z0-9\-_]+$/.test(val);
  }

  function getActivePixels() {
    try {
      var data = global.PixClient.getFromStoreConfig("admin_pixels");
      var raw = Array.isArray(data) ? data : [];
      var origin = global.PixClient.getTrafficOrigin();
      return raw.filter(function (p) {
        if (!p.active) return false;
        if (!isSafeValue(p.pixelId)) {
          console.error("[Pixel] ❌ Pixel ID bloqueado (código malicioso): " + String(p.name));
          return false;
        }
        if (p.token && !isSafeValue(p.token)) {
          console.error("[Pixel] ❌ Token bloqueado (código malicioso): " + String(p.name));
          p.token = "";
        }
        // Isolamento: sessão Meta Ads não injeta pixel TikTok e vice-versa.
        if (origin === "meta" && p.platform === "tiktok") return false;
        if (origin === "tiktok" && p.platform === "facebook") return false;
        return true;
      });
    } catch (e) {
      return [];
    }
  }

  // ───────── Script injection ─────────

  function injectTikTokPixel(pixelId) {
    if (document.querySelector('script[data-tt-pixel="' + pixelId + '"]')) return;
    var script = document.createElement("script");
    script.dataset.ttPixel = pixelId;
    script.textContent =
      "!function (w, d, t) {" +
      'w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var i=document.createElement("script");i.type="text/javascript",i.async=!0,i.src=r+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(i,a)};' +
      "ttq.load('" + pixelId + "');" +
      "ttq.page();" +
      "}(window, document, 'ttq');";
    document.head.appendChild(script);
    console.log("[Pixel] ✅ TikTok pixel " + pixelId + " injetado");
  }

  function injectFacebookPixel(pixelId) {
    if (document.querySelector('script[data-fb-pixel="' + pixelId + '"]')) return;
    var script = document.createElement("script");
    script.dataset.fbPixel = pixelId;
    script.textContent =
      "!function(f,b,e,v,n,t,s)" +
      "{if(f.fbq)return;n=f.fbq=function(){n.callMethod?" +
      "n.callMethod.apply(n,arguments):n.queue.push(arguments)};" +
      "if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';" +
      "n.queue=[];t=b.createElement(e);t.async=!0;" +
      "t.src=v;s=b.getElementsByTagName(e)[0];" +
      "s.parentNode.insertBefore(t,s)}(window, document,'script'," +
      "'https://connect.facebook.net/en_US/fbevents.js');" +
      "fbq('init', '" + pixelId + "');";
    document.head.appendChild(script);
    console.log("[Pixel] ✅ Facebook pixel " + pixelId + " injetado (PageView via dispatcher)");
  }

  function injectGooglePixel(pixelId) {
    if (document.querySelector('script[data-gtag="' + pixelId + '"]')) return;
    var gtagScript = document.createElement("script");
    gtagScript.async = true;
    gtagScript.src = "https://www.googletagmanager.com/gtag/js?id=" + pixelId;
    gtagScript.dataset.gtag = pixelId;
    document.head.appendChild(gtagScript);

    var configScript = document.createElement("script");
    configScript.textContent =
      "window.dataLayer = window.dataLayer || [];" +
      "function gtag(){dataLayer.push(arguments);}" +
      "gtag('js', new Date());" +
      "gtag('config', '" + pixelId + "');";
    document.head.appendChild(configScript);
    console.log("[Pixel] ✅ Google Ads pixel " + pixelId + " injetado");
  }

  // ───────── Meta CAPI ─────────

  var FB_EVENT_MAP = {
    ViewContent: "ViewContent",
    AddToCart: "AddToCart",
    InitiateCheckout: "InitiateCheckout",
    PlaceAnOrder: "InitiateCheckout",
    CompletePayment: "Purchase",
    PageView: "PageView",
  };

  function splitName(fullName) {
    var s = String(fullName || "").trim();
    if (!s) return { first_name: undefined, last_name: undefined };
    var parts = s.split(/\s+/);
    if (parts.length === 1) return { first_name: parts[0], last_name: undefined };
    return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
  }

  function getFbCookies() {
    try {
      var cookie = document.cookie || "";
      var fbpMatch = cookie.match(/(?:^|;\s*)_fbp=([^;]+)/);
      var fbcMatch = cookie.match(/(?:^|;\s*)_fbc=([^;]+)/);
      return { fbp: fbpMatch ? fbpMatch[1] : undefined, fbc: fbcMatch ? fbcMatch[1] : undefined };
    } catch (e) {
      return { fbp: undefined, fbc: undefined };
    }
  }

  function buildFbcFromUrl() {
    try {
      var url = window.location.href;
      var search = url.indexOf("?") !== -1 ? url.slice(url.indexOf("?")) : "";
      var params = new URLSearchParams(search);
      var fbclid = params.get("fbclid");
      if (!fbclid) return null;
      return "fb.1." + Date.now() + "." + fbclid;
    } catch (e) {
      return null;
    }
  }

  function genEventId() {
    return "evt_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
  }

  function dispatchFacebookCapi(pixel, fbEvent, params, userData) {
    if (!pixel.token) return; // sem token CAPI = só browser
    try {
      var cookies = getFbCookies();
      var fbcFinal = cookies.fbc || buildFbcFromUrl();

      var content_ids = Array.isArray(params.content_ids)
        ? params.content_ids
        : params.content_id
          ? [String(params.content_id)]
          : undefined;

      var body = {
        event_name: fbEvent,
        event_id: params.event_id || params._eventId,
        event_source_url: window.location.href,
        action_source: "website",
        user_data: Object.assign({}, userData, {
          fbp: cookies.fbp,
          fbc: fbcFinal || undefined,
          client_user_agent: navigator.userAgent,
        }),
        custom_data: {
          value: typeof params.value === "number" ? params.value : params.value ? Number(params.value) : undefined,
          currency: params.currency || (params.value ? "BRL" : undefined),
          content_ids: content_ids,
          content_name: params.content_name,
          content_type: params.content_type || (content_ids ? "product" : undefined),
          num_items: params.quantity || params.num_items,
          order_id: params.order_id || params.event_id,
        },
        test_event_code: pixel.testEventCode || undefined,
      };

      fetch(global.PixClient.SUPABASE_URL + "/functions/v1/meta-capi-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: global.PixClient.SUPABASE_ANON_KEY,
          Authorization: "Bearer " + global.PixClient.SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(body),
        keepalive: true,
      }).catch(function (e) {
        console.warn("[Meta CAPI] erro:", e);
      });
    } catch (err) {
      console.warn("[Meta CAPI] dispatch error:", err);
    }
  }

  // ───────── Event dispatchers ─────────

  var __firedEventKeys = (global.__lvbl_firedEventKeys = global.__lvbl_firedEventKeys || new Set());
  var DEDUP_EVENT_NAMES = new Set(["CompletePayment", "Purchase", "PlaceAnOrder", "Subscribe"]);

  var _pixels = [];
  var _userData = {};

  function fireEvent(pixel, eventName, params) {
    try {
      if (DEDUP_EVENT_NAMES.has(eventName) && params && params.event_id) {
        var dedupKey = pixel.platform + ":" + (pixel.pixelId || "") + ":" + eventName + ":" + params.event_id;
        if (__firedEventKeys.has(dedupKey)) {
          console.log("[Pixel " + pixel.platform + "] ⚠️ " + eventName + " já disparado para event_id=" + params.event_id + ", ignorando duplicata");
          return;
        }
        __firedEventKeys.add(dedupKey);
      }
      switch (pixel.platform) {
        case "tiktok":
          if (global.ttq) {
            var ttParams = params && params.event_id ? Object.assign({}, params, { event_id: params.event_id }) : params;
            if (params && params.event_id) {
              global.ttq.track(eventName, ttParams, { event_id: params.event_id });
            } else {
              global.ttq.track(eventName, ttParams);
            }
            console.log("[Pixel TikTok] ✅ " + eventName + (params && params.event_id ? " (event_id=" + params.event_id + ")" : ""));
          }
          break;
        case "facebook": {
          var fbEvent = FB_EVENT_MAP[eventName] || eventName;
          var eventId = (params && params.event_id) || genEventId();
          var enrichedParams = Object.assign({}, params, { event_id: eventId });
          if (global.fbq) {
            global.fbq("track", fbEvent, params, { eventID: eventId });
            console.log("[Pixel Facebook] ✅ " + fbEvent + " (eventID=" + eventId + ")");
          }
          dispatchFacebookCapi(pixel, fbEvent, enrichedParams, _userData);
          break;
        }
        case "google": {
          var gEventMap = {
            ViewContent: "view_item",
            AddToCart: "add_to_cart",
            InitiateCheckout: "begin_checkout",
            CompletePayment: "purchase",
          };
          if (global.gtag) {
            global.gtag("event", gEventMap[eventName] || eventName, params);
            console.log("[Pixel Google] ✅ " + (gEventMap[eventName] || eventName), params);
          }
          break;
        }
        default:
          console.log("[Pixel " + pixel.platform + "] Evento " + eventName + " não suportado");
      }
    } catch (err) {
      console.error("[Pixel " + pixel.platform + "] ❌ Erro " + eventName + ":", err);
    }
  }

  // ───────── API pública ─────────

  function init() {
    return global.PixClient.fetchStoreConfig().then(function () {
      _pixels = getActivePixels();
      _pixels.forEach(function (p) {
        switch (p.platform) {
          case "tiktok":
            injectTikTokPixel(p.pixelId);
            break;
          case "facebook":
            injectFacebookPixel(p.pixelId);
            setTimeout(function () {
              var eventId = genEventId();
              if (global.fbq) global.fbq("track", "PageView", {}, { eventID: eventId });
              dispatchFacebookCapi(p, "PageView", { event_id: eventId }, _userData);
            }, 250);
            break;
          case "google":
            injectGooglePixel(p.pixelId);
            break;
        }
      });
      return _pixels;
    });
  }

  function trackEvent(eventName, params) {
    params = params || {};
    if (!_pixels.length) return;
    _pixels.forEach(function (p) {
      fireEvent(p, eventName, params);
    });
  }

  function identifyUser(userData) {
    userData = userData || {};
    var next = Object.assign({}, _userData);
    if (userData.email) next.email = userData.email;
    if (userData.phone) next.phone = userData.phone;
    if (userData.cpf) next.cpf = userData.cpf;
    if (userData.first_name) next.first_name = userData.first_name;
    if (userData.last_name) next.last_name = userData.last_name;
    if (userData.name && !userData.first_name) {
      var split = splitName(userData.name);
      if (split.first_name) next.first_name = split.first_name;
      if (split.last_name) next.last_name = split.last_name;
    }
    if (userData.city) next.city = userData.city;
    if (userData.state) next.state = userData.state;
    if (userData.country) next.country = userData.country;
    if (userData.zip) next.zip = userData.zip;
    _userData = next;

    _pixels.forEach(function (p) {
      if (p.platform === "tiktok" && global.ttq) {
        var identifyData = {};
        if (userData.email) identifyData.email = userData.email;
        if (userData.phone) {
          var phone = userData.phone.replace(/\D/g, "");
          if (phone.length >= 10) identifyData.phone_number = "+55" + phone;
        }
        if (userData.cpf) identifyData.external_id = userData.cpf.replace(/\D/g, "");
        if (Object.keys(identifyData).length > 0) {
          global.ttq.identify(identifyData);
          console.log("[Pixel TikTok] 👤 Usuário identificado");
        }
      }
    });
  }

  global.PixelTracking = { init: init, trackEvent: trackEvent, identifyUser: identifyUser };
})(window);
