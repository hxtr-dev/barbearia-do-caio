/* =========================================================
   Google Analytics (GA4) com consentimento — LGPD
   Só carrega se houver um ID em config.js E se o visitante
   clicar em "Aceitar". A escolha fica salva no navegador.
   ========================================================= */
(function () {
  const id = (window.BARBEARIA_CONFIG || {}).googleAnalyticsId;
  if (!id) return;

  const CHAVE = 'barbearia_cookies';
  let escolha = null;
  try { escolha = localStorage.getItem(CHAVE); } catch (e) { /* navegador sem armazenamento */ }

  function carregarAnalytics() {
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(script);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', id);
  }

  if (escolha === 'aceito') return carregarAnalytics();
  if (escolha === 'recusado') return;

  const aviso = document.createElement('div');
  aviso.className = 'aviso-cookies';
  aviso.setAttribute('role', 'dialog');
  aviso.setAttribute('aria-label', 'Aviso de cookies');
  aviso.innerHTML = `
    <p>Usamos cookies do Google Analytics para entender como o site é usado e melhorá-lo. Você aceita?</p>
    <div class="row">
      <button type="button" class="btn small" data-escolha="aceito">Aceitar</button>
      <button type="button" class="btn secondary small" data-escolha="recusado">Recusar</button>
    </div>`;
  aviso.addEventListener('click', e => {
    const valor = e.target.dataset && e.target.dataset.escolha;
    if (!valor) return;
    try { localStorage.setItem(CHAVE, valor); } catch (err) { /* sem problema */ }
    aviso.remove();
    if (valor === 'aceito') carregarAnalytics();
  });
  document.body.appendChild(aviso);
})();
