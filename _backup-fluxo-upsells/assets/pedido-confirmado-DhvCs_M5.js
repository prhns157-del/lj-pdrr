import{i as e,t}from"./jsx-runtime-DUAcabCT.js";
import{t as n}from"./react-DEX2qfRi.js";
import{t as p}from"./package-41CfLOtP.js";
import{t as c}from"./chevron-right--biEaSZ4.js";
import{t as d}from"./phone-frame-CqbWzOAl.js";
import{n as f}from"./order-store-DlBJYWPC.js";
import{t as h}from"./header-1.webp.asset-Dsofyhh2.js";
import{t as v}from"./delivery-window-BxLE_tRw.js";

var E=e(n()),D=t();
var fmt=e=>e.toLocaleString(`pt-BR`,{minimumFractionDigits:2,maximumFractionDigits:2});
var FALLBACK_TITLE=`[SOARFLY] Kit Ferramentas 4 em 1 48Vf | Íon Lítio Baterias Sem Fio | Furadeira, Chave de Impacto, Serra Alternativa e Serra Circular`;

function CircleCheck({className:e}){
  return (0,D.jsxs)(`svg`,{xmlns:`http://www.w3.org/2000/svg`,width:`24`,height:`24`,viewBox:`0 0 24 24`,fill:`none`,stroke:`currentColor`,strokeWidth:`2`,strokeLinecap:`round`,strokeLinejoin:`round`,className:e,"aria-hidden":true,children:[
    (0,D.jsx)(`circle`,{cx:`12`,cy:`12`,r:`10`}),
    (0,D.jsx)(`path`,{d:`m9 12 2 2 4-4`})
  ]});
}

function A(){
  let O=f();
  let productTitle=O.productTitle||FALLBACK_TITLE;
  let qty=O.qty||1;
  let price=O.productPrice??97.9;
  let total=price*qty;
  let urlOrderId=typeof window<`u`?new URLSearchParams(window.location.search).get(`pedido`):null;
  let orderId=urlOrderId||(O.paidInvoiceId?`TK${String(O.paidInvoiceId).replace(/[^0-9A-Za-z]/g,``)}`:null);
  let meusPedidosHref=orderId?`/meus-pedidos?pedido=${encodeURIComponent(orderId)}`:`/meus-pedidos`;
  let currentSearch=typeof window<`u`?window.location.search:``;
  let continuarHref=`/upsellkitferramentas${currentSearch}`;

  return (0,D.jsx)(d,{children:(0,D.jsxs)(`div`,{className:`min-h-screen bg-[#f5f5f5] pb-24`,children:[
    (0,D.jsxs)(`div`,{className:`bg-white px-4 pb-6 pt-10 text-center`,children:[
      (0,D.jsx)(`div`,{className:`mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#e7f7f5]`,children:(0,D.jsx)(CircleCheck,{className:`h-9 w-9 text-[#00b8a9]`})}),
      (0,D.jsx)(`h1`,{className:`mt-3 text-[20px] font-bold`,children:`Pedido realizado!`}),
      (0,D.jsx)(`p`,{className:`mt-1 text-[13px] text-[#5a5b60]`,children:`Você receberá atualizações sobre o envio por email.`}),
      orderId&&(0,D.jsxs)(`div`,{className:`mt-4 inline-flex items-center rounded-full bg-[#f5f5f5] px-3 py-1 text-[12px] text-[#5a5b60]`,children:[`Nº do pedido: `,(0,D.jsx)(`span`,{className:`ml-1 font-mono font-semibold text-[#161823]`,children:orderId})]})
    ]}),
    (0,D.jsx)(`div`,{className:`mt-2 bg-white px-4 py-3`,children:(0,D.jsxs)(`div`,{className:`flex gap-3`,children:[
      (0,D.jsx)(`img`,{src:h.url,className:`h-16 w-16 rounded-md object-cover`,alt:``}),
      (0,D.jsxs)(`div`,{className:`flex-1`,children:[
        (0,D.jsx)(`div`,{className:`line-clamp-3 text-[13.5px] leading-[1.35]`,children:productTitle}),
        (0,D.jsxs)(`div`,{className:`mt-1 text-[12px] text-[#8a8b91]`,children:[`Qtd: `,qty]})
      ]}),
      (0,D.jsxs)(`div`,{className:`text-[14px] font-bold text-[#fe2c55]`,children:[`R$ `,fmt(total)]})
    ]})}),
    (0,D.jsxs)(`div`,{className:`mt-2 bg-white`,children:[
      (0,D.jsxs)(`button`,{className:`flex w-full items-center gap-3 px-4 py-3.5 border-b border-[#f0f0f0]`,children:[
        (0,D.jsx)(`span`,{children:(0,D.jsx)(p,{className:`h-5 w-5 text-[#161823]`,strokeWidth:1.7})}),
        (0,D.jsxs)(`div`,{className:`flex-1 text-left`,children:[
          (0,D.jsx)(`div`,{className:`text-[14px] font-semibold`,children:`Rastrear pedido`}),
          (0,D.jsxs)(`div`,{className:`mt-0.5 text-[12px] text-[#8a8b91]`,children:[`Previsão de entrega: `,v()]})
        ]}),
        (0,D.jsx)(c,{className:`h-4 w-4 text-[#c8c8cc]`})
      ]}),
      (0,D.jsxs)(`a`,{href:`/checkout`,className:`flex w-full items-center gap-3 px-4 py-3.5`,children:[
        (0,D.jsxs)(`div`,{className:`flex-1 text-left`,children:[
          (0,D.jsx)(`div`,{className:`text-[14px] font-semibold`,children:`Ver detalhes do pedido`}),
          (0,D.jsx)(`div`,{className:`mt-0.5 text-[12px] text-[#8a8b91]`,children:`Total, endereço e pagamento`})
        ]}),
        (0,D.jsx)(c,{className:`h-4 w-4 text-[#c8c8cc]`})
      ]})
    ]}),
    (0,D.jsxs)(`div`,{className:`fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-[440px] gap-2 bg-white px-4 py-3 pb-[max(env(safe-area-inset-bottom),12px)]`,children:[
      (0,D.jsx)(`a`,{href:continuarHref,className:`flex-1 rounded-full border border-[#e5e5e7] py-3 text-center text-[15px] font-semibold text-[#161823]`,children:`Continuar comprando`}),
      (0,D.jsx)(`a`,{href:meusPedidosHref,className:`flex-1 rounded-full bg-[#fe2c55] py-3 text-center text-[15px] font-semibold text-white shadow-[0_6px_18px_rgba(37,227,155,0.35)]`,children:`Meus pedidos`})
    ]})
  ]})});
}

export{A as component};
