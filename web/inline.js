// Structured data: Organization (Schema.org)
// Injetado via JS para conformidade com CSP script-src 'self' (sem unsafe-inline).
(function () {
  var ld = document.createElement('script');
  ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "LiveShop SaaS",
    "alternateName": "Livelab",
    "url": "https://app.grupolivelab.com.br",
    "logo": "https://app.grupolivelab.com.br/icons/Icon-512.png",
    "description": "Plataforma multi-tenant para gestão de franquias de estúdios de Live Shop TikTok.",
    "areaServed": "BR"
  });
  document.head.appendChild(ld);
})();

// Flutter Web: força canvaskit do CDN gstatic.
// Reduz bundle servido pelo Firebase em ~6.8MB (canvaskit.wasm não vem do nosso server).
window.flutterConfiguration = {
  canvasKitBaseUrl: "https://www.gstatic.com/flutter-canvaskit/425cfb54d01a9472b3e81d9e76fd63a4a44cfbcb/",
  useLocalCanvasKit: false
};
