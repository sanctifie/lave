import pw from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pw;
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

const SRC = '/home/user/lave/docs/screenshots/mobile/app/_prototype.html';
const OUT = '/home/user/lave/docs/screenshots/mobile/app';
mkdirSync(OUT, { recursive: true });

// Réutilise le <style> exact du prototype premium.
const proto = readFileSync(SRC, 'utf8');
const style = proto.match(/<style>[\s\S]*?<\/style>/)[0];

// ─── Options récentes pas encore illustrées (mêmes classes que le prototype) ──
const VIEWS = {

  // 24 — Pharmacies de garde (patient · géolocalisation)
  garde: `
    <div class="greet"><div class="top"><div><div class="hi">Autour de vous</div><div class="nm" style="font-size:22px">Pharmacies de garde</div></div><div class="ava">📍</div></div></div>
    <div class="hero" style="background:linear-gradient(135deg,#0E9384,#0B6B60)"><div class="k">Cette nuit</div><h3>4 officines de garde ouvertes</h3><p>Triées par distance depuis votre position.</p><div class="glyph">🌙</div></div>
    <div class="sectitle"><h4>Les plus proches</h4><a>Temps réel</a></div>
    <div class="list">
      <div class="doc"><div class="ph">🏥</div><div class="info"><b>Pharmacie du Centre</b><div class="sp">Ouvert · ferme à 08:00</div></div><div class="meta"><div class="rate" style="color:var(--teal)">0,8 km</div><div class="free" style="color:#16A34A;font-weight:700">De garde</div></div></div>
      <div class="doc"><div class="ph">🏥</div><div class="info"><b>Pharmacie Okala</b><div class="sp">Ouvert · 24 h/24</div></div><div class="meta"><div class="rate" style="color:var(--teal)">1,9 km</div><div class="free" style="color:#16A34A;font-weight:700">De garde</div></div></div>
      <div class="doc"><div class="ph">🏥</div><div class="info"><b>Pharmacie Glass</b><div class="sp">Ouvert · ferme à 07:30</div></div><div class="meta"><div class="rate" style="color:var(--teal)">2,4 km</div><div class="free" style="color:#16A34A;font-weight:700">De garde</div></div></div>
      <div class="doc"><div class="ph">🏥</div><div class="info"><b>Pharmacie Nzeng-Ayong</b><div class="sp">Ouvert · ferme à 06:00</div></div><div class="meta"><div class="rate" style="color:var(--teal)">3,1 km</div><div class="free" style="color:#16A34A;font-weight:700">De garde</div></div></div>
    </div>
    <div class="cta cta-full">Envoyer mon ordonnance à cette officine</div>`,

  // 25 — Centre de notifications (patient)
  notifs: `
    <div class="greet"><div class="top"><div><div class="hi">Vos alertes</div><div class="nm" style="font-size:22px">Notifications</div></div><div class="ava">🔔</div></div></div>
    <div class="list" style="margin-top:6px">
      <div class="doc"><div class="ph" style="background:rgba(14,147,132,.12)">💊</div><div class="info"><b>Commande prête</b><div class="sp">La Pharmacie du Centre a préparé votre commande · il y a 3 min</div></div><div class="meta"><span class="dot" style="background:#0E9384"></span></div></div>
      <div class="doc"><div class="ph" style="background:rgba(14,130,199,.12)">🚚</div><div class="info"><b>Coursier en route</b><div class="sp">Franck arrive dans ~12 min · suivez en direct · il y a 10 min</div></div><div class="meta"><span class="dot" style="background:#0E9384"></span></div></div>
      <div class="doc"><div class="ph" style="background:rgba(22,163,74,.12)">✅</div><div class="info"><b>Ordonnance validée</b><div class="sp">Le pharmacien a validé votre ordonnance · il y a 1 h</div></div><div class="meta"></div></div>
      <div class="doc"><div class="ph" style="background:rgba(239,138,94,.14)">🩺</div><div class="info"><b>Rappel de RDV</b><div class="sp">Téléconsultation avec le Dr Mba demain à 10:00 · il y a 2 h</div></div><div class="meta"></div></div>
      <div class="doc"><div class="ph" style="background:rgba(199,122,10,.12)">⏰</div><div class="info"><b>Prise de médicament</b><div class="sp">Paracétamol — 20:00 (rappel local) · hier</div></div><div class="meta"></div></div>
    </div>`,

  // 26 — Remboursement du séquestre (patient · commande refusée/annulée)
  refund: `
    <div class="greet"><div class="top"><div><div class="hi">Commande #A3F9K2</div><div class="nm" style="font-size:22px">Remboursement</div></div><div class="ava">💸</div></div></div>
    <div class="hero" style="background:linear-gradient(135deg,#0E82C7,#0B5E92)"><div class="k">En cours</div><h3>10 500 F vous sont remboursés</h3><p>Votre séquestre bloqué revient intégralement sur votre compte Mobile Money.</p><div class="glyph">↩️</div></div>
    <div class="card" style="margin-top:14px">
      <div class="med"><div><b>Motif</b><div class="q">Officine en rupture — commande non honorée</div></div></div>
      <div class="med"><div><b>Montant bloqué</b><div class="q">Part médicaments + frais de service</div></div><div class="pr">10 500 F</div></div>
      <div class="med"><div><b>Vers</b><div class="q">Airtel Money · •••• 42</div></div><div class="pr" style="color:#16A34A">+10 500 F</div></div>
    </div>
    <div class="legal" style="margin-top:14px"><b>Aucune somme retenue.</b> La plateforme n'est jamais le vendeur du médicament : sans dispensation, l'argent revient au patient — jamais à la plateforme ni à l'officine.</div>`,

  // 27 — Espace aidant (comptes accompagnants · care-links)
  aidant: `
    <div class="greet"><div class="top"><div><div class="hi">Vous accompagnez</div><div class="nm" style="font-size:22px">Espace aidant</div></div><div class="ava">🧑‍🤝‍🧑</div></div></div>
    <div class="card" style="margin-top:6px">
      <div class="doc" style="border:0;padding:0"><div class="ph">👵</div><div class="info"><b>Marie E. · 74 ans</b><div class="sp">Lien accepté · vous gérez ses soins</div></div><div class="meta"><div class="free" style="color:#16A34A;font-weight:700">Actif</div></div></div>
    </div>
    <div class="sectitle"><h4>Actions déléguées</h4><a>Révocable</a></div>
    <div class="list">
      <div class="doc"><div class="ph">📄</div><div class="info"><b>Ordonnances de Marie</b><div class="sp">2 en cours · 1 renouvellement disponible</div></div><div class="meta">›</div></div>
      <div class="doc"><div class="ph">📦</div><div class="info"><b>Commander ses médicaments</b><div class="sp">Livraison à son domicile</div></div><div class="meta">›</div></div>
      <div class="doc"><div class="ph">⏰</div><div class="info"><b>Ses rappels de prise</b><div class="sp">Suivi du traitement chronique</div></div><div class="meta">›</div></div>
    </div>
    <div class="legal" style="margin-top:12px">Consentement explicite des deux côtés — Marie peut révoquer votre accès à tout moment.</div>`,
};

const ORDER = [
  ['garde',  '24-pharmacies-de-garde'],
  ['notifs', '25-centre-notifications'],
  ['refund', '26-remboursement-sequestre'],
  ['aidant', '27-espace-aidant'],
];

const viewsHtml = ORDER.map(([k]) => `<div class="view" data-view="${k}">${VIEWS[k]}</div>`).join('\n');

const html = `<!doctype html><html data-theme="light"><head><meta charset="utf-8">${style}</head>
<body style="padding:0;background:#fff">
  <div class="device">
    <div class="notch"></div>
    <div class="screen">
      <div class="sb"><span>9:41</span><span class="r">5G <svg width="20" height="12" viewBox="0 0 26 13" fill="none"><rect x="1" y="1" width="21" height="11" rx="3" stroke="#0F2C29" stroke-opacity=".45"/><rect x="3" y="3" width="16" height="7" rx="1.5" fill="#16A34A"/><rect x="23" y="4" width="2" height="5" rx="1" fill="#0F2C29" fill-opacity=".45"/></svg></span></div>
      <div class="views" id="views">${viewsHtml}</div>
    </div>
  </div>
</body></html>`;

const tmp = OUT + '/_tmp_extra.html';
writeFileSync(tmp, html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 820 }, deviceScaleFactor: 3 });
await page.goto('file://' + tmp, { waitUntil: 'networkidle' });
await page.addStyleTag({ content: '.view{transition:none !important}' });

for (const [view, file] of ORDER) {
  await page.evaluate((v) => {
    document.querySelectorAll('.view').forEach((x) => x.classList.remove('active'));
    const el = document.querySelector('.view[data-view="' + v + '"]');
    el.classList.add('active');
    el.scrollTop = 0;
  }, view);
  await page.waitForTimeout(300);
  const dev = await page.$('.device');
  await dev.screenshot({ path: `${OUT}/${file}.png` });
  console.log('✓', file);
}
await browser.close();
const { unlinkSync } = await import('node:fs');
unlinkSync(tmp);
console.log('OK — ' + ORDER.length + ' écrans');
