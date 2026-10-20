# 🎯 Upsells Teste - Total Fidelidade TikTok Shop App

Versão completamente redesenhada emulando 100% a experiência nativa do app TikTok Shop.

## 🎨 O que foi mudado

### **1. Header Nativo do TikTok** ⭐
```
[← Back]  Pagamento Obrigatório  [?]
```
- Back button que funciona com history.back()
- Título da página no center
- Help icon na direita
- Design exatamente como TikTok App

### **2. Layout Nativo do App**
- **Safe areas** para notch e home indicator (viewport-fit=cover)
- **Overflow hidden** para parecer dentro do app
- **Fixed header** com border-bottom
- **Fixed footer** com padding de safe area
- **Full-height screen** com scrolling nativo

### **3. Bottom Sheet Modal**
- Desliza de **baixo para cima** (como TikTok)
- **Handle bar** no topo (arador visual)
- Animação `slideInUp` com cubic-bezier
- Border-radius arredondado (20px)
- Sem shadow, usa overlay semi-transparente

### **4. Tipografia & Espaçamento**
- **System fonts** (-apple-system, BlinkMacSystemFont) como TikTok
- Tamanhos reduzidos (12-13px para corpo)
- Espaçamento compacto (8-12px)
- Linha-altura otimizada para mobile

### **5. Cores Minimalistas**
- Fundo #ffffff (puro branco)
- Border #efefef (cinza super leve)
- Apenas vermelho (#fe2c55) e tom teal (#00b8a9)
- Sem gradientes desnecessários

### **6. Componentes Nativos**
- Cards com border-bottom (separador cinza)
- Checkboxes em círculos simples
- Chips (badges) compactos
- Timeline com conectores
- Info cards com background leve

### **7. Interações**
- Scale(0.98) ao pressionar botão (tap feedback)
- Opacity reduzida para disabled
- Sem hover (mobile-first)
- Transições rápidas (0.15s)

### **8. Modal Native**
```
═════ (handle visual)
[?] Pague com Pix
Código QR
[Copiar]
Aguardando...
```

## 📱 Estrutura

```
/upsells-teste/
├── 1/index.html          (Taxa Alfandegária)
│   └── Novo header + footer nativo
│
├── 2/index.html          (Taxa Nota Fiscal)
│   └── Timeline interativo
│
├── 3/index.html          (Retry/Erro)
│   └── Info cards teal
│
├── shared/
│   ├── upsell.css        (CSS totalmente novo)
│   ├── pix-client.js
│   └── pixel-tracking.js
│
└── README.md
```

## 🎯 Principais Características

### **Viewport Fit Cover**
```html
<meta name="viewport" content="... viewport-fit=cover" />
```
- Usa todo o espaço da tela (inclui notch)
- env(safe-area-inset-*) para padding seguro

### **Header Fixo**
- 56px de altura
- Flex layout
- Border-bottom separador
- Back button + título + action button

### **Screen Scrollável**
- Overflow-y auto
- -webkit-overflow-scrolling: touch (smooth iOS)
- Padding-bottom: 90px (espaço pro footer)

### **Footer Fixo**
- Position: fixed
- Bottom: 0
- safe-area-inset-bottom incluído
- Botão full-width

### **Modal Bottom Sheet**
- Position: fixed, inset: 0
- Align-items: flex-end
- Border-radius: 20px 20px 0 0
- Animação de entrada suave

## 🎮 Comportamentos

### Scroll
- Scroll nativo do browser
- Webkit smooth scroll ativado
- Padrão iOS/Android

### Gestos
- Back button padrão
- Tap feedback com scale
- Long-press sem feedback (disabled)

### Status
- Header sempre visível
- Footer sempre visível
- Conteúdo scrollável entre os dois

## ✅ Checklist de Fidelidade

- ✅ Header nativo com back button
- ✅ Safe areas implementadas
- ✅ Footer fixo com botão CTA
- ✅ Bottom sheet do zero
- ✅ Animações nativas
- ✅ Tipografia minimalista
- ✅ Cores idênticas ao TikTok
- ✅ Espaçamento compacto
- ✅ Sem gradientes (flat design)
- ✅ Components simples e limpos

## 🧪 Como Testar

1. **No celular (melhor experiência):**
   - Abra em Safari (iOS) ou Chrome (Android)
   - Acesse: `/upsells-teste/1/`, `/2/`, `/3/`
   - Teste o back button
   - Scroll dentro das páginas
   - Clique "Gerar Pix" para ver modal

2. **No desktop:**
   - Abra DevTools (F12)
   - Ative "Toggle device toolbar" (Ctrl+Shift+M)
   - Escolha um iPhone ou Android
   - Interaja normalmente

## 📋 Diferenças do Design Anterior

| Aspecto | Anterior | Novo |
|---------|----------|------|
| Header | Nenhum | Header nativo TikTok |
| Footer | Floating | Fixed com safe area |
| Modal | Rounded 24px | Bottom sheet 20px |
| Animações | Graduais | Rápidas e nativas |
| Tipografia | 16px+ | 12-13px compacta |
| Cores | Coloridas | Minimalistas |
| Espaçamento | Generoso | Compacto (8-12px) |
| Viewport | Normal | Fit cover (notch) |

## 🚀 Pronto para Produção

Quando estiver satisfeito:

```bash
# Substitua os arquivos originais
cp -r /upsells-teste/* /upsells/

# Ou manualmente:
# 1. Copie /upsells-teste/shared/upsell.css → /upsells/shared/
# 2. Copie /upsells-teste/1/index.html → /upsells/1/
# 3. Copie /upsells-teste/2/index.html → /upsells/2/
# 4. Copie /upsells-teste/3/index.html → /upsells/3/
```

## 📱 Compatibilidade

- ✅ iOS 12+ (Safari)
- ✅ Android 8+ (Chrome)
- ✅ Desktop (responsive)
- ✅ Tablet (otimizado)

---

**Status:** Pronto para teste e aprovação! 🎉
