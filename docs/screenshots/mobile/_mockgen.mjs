import pw from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pw;
import { writeFileSync } from 'node:fs';

const CSS = `
  * { margin:0; padding:0; box-sizing:border-box; font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; }
  body { background:#ffffff; }
  .phone { width:565px; background:#0f172a; border-radius:56px; padding:14px; }
  .screen { background:#eef2f2; border-radius:44px; overflow:hidden; position:relative; }
  .notch { position:absolute; top:0; left:50%; transform:translateX(-50%); width:190px; height:30px; background:#0f172a; border-bottom-left-radius:20px; border-bottom-right-radius:20px; z-index:5; }
  .statusbar { display:flex; justify-content:space-between; align-items:center; padding:18px 34px 8px; }
  .statusbar .time { font-weight:700; font-size:20px; color:#0f172a; }
  .statusbar .ic { font-size:18px; letter-spacing:2px; }
  .content { padding:6px 26px 30px; }
  .back { color:#0e5f5c; font-size:22px; font-weight:500; margin-bottom:4px; }
  h1 { font-size:34px; line-height:1.1; color:#0f172a; margin-bottom:20px; }
  .label { font-size:15px; font-weight:700; letter-spacing:1px; color:#64748b; text-transform:uppercase; margin:20px 0 10px; }
  .card { background:#fff; border-radius:20px; padding:20px; box-shadow:0 6px 18px rgba(15,23,42,.06); }
  .row { display:flex; align-items:center; gap:14px; }
  .avatar { width:56px; height:56px; border-radius:50%; background:#dbeafe; display:flex; align-items:center; justify-content:center; font-size:26px; flex-shrink:0; }
  .name { font-size:23px; font-weight:800; color:#0f172a; }
  .sub { font-size:17px; color:#64748b; margin-top:2px; }
  .scan { background:#f8fafc; border:2px solid #e2e8f0; border-radius:18px; height:190px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; color:#94a3b8; }
  .scan .doc { font-size:60px; }
  .scan .cap { font-size:16px; }
  .med { display:flex; justify-content:space-between; align-items:center; padding:14px 0; border-bottom:1px solid #eef2f6; }
  .med:last-child { border-bottom:none; }
  .med .mn { font-size:20px; font-weight:700; color:#0f172a; }
  .med .mq { font-size:15px; color:#64748b; margin-top:2px; }
  .med .mp { font-size:20px; font-weight:800; color:#0e5f5c; white-space:nowrap; }
  .total { display:flex; justify-content:space-between; align-items:center; margin-top:6px; padding-top:16px; border-top:2px solid #e2e8f0; }
  .total .tl { font-size:20px; font-weight:700; color:#0f172a; }
  .total .tv { font-size:26px; font-weight:800; color:#0e5f5c; }
  .note { background:#fdf3cf; border-radius:16px; padding:16px 18px; display:flex; gap:12px; margin-top:18px; }
  .note .i { font-size:22px; }
  .note .t { font-size:16px; line-height:1.35; color:#9a6a09; }
  .btn { border-radius:18px; padding:22px; text-align:center; font-size:22px; font-weight:800; margin-top:18px; }
  .btn-primary { background:#0e5f5c; color:#fff; }
  .btn-ghost { background:#fff; color:#dc2626; border:2px solid #fecaca; }
  .btns { display:flex; gap:14px; margin-top:20px; }
  .btns .btn { flex:1; margin-top:0; }
  /* timeline */
  .tl-item { display:flex; gap:16px; }
  .tl-line { display:flex; flex-direction:column; align-items:center; }
  .dot { width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:800; color:#fff; flex-shrink:0; }
  .dot.done { background:#0e9f6e; }
  .dot.active { background:#0e5f5c; box-shadow:0 0 0 6px rgba(14,95,92,.15); }
  .dot.todo { background:#cbd5e1; }
  .bar { width:4px; flex:1; background:#cbd5e1; margin:4px 0; min-height:34px; }
  .bar.done { background:#0e9f6e; }
  .tl-body { padding-bottom:26px; }
  .tl-t { font-size:21px; font-weight:800; color:#0f172a; }
  .tl-t.muted { color:#94a3b8; }
  .tl-s { font-size:16px; color:#64748b; margin-top:2px; }
  .map { background:linear-gradient(135deg,#d5efe9,#e6f6f1); border-radius:20px; height:210px; position:relative; overflow:hidden; margin-bottom:6px; }
  .road { position:absolute; height:6px; background:#b3d9cf; border-radius:3px; }
  .pin { position:absolute; font-size:34px; }
  .eta { background:#0e5f5c; color:#fff; border-radius:16px; padding:16px 20px; display:flex; justify-content:space-between; align-items:center; margin-top:16px; }
  .eta .el { font-size:17px; opacity:.85; }
  .eta .ev { font-size:24px; font-weight:800; }
  .call { background:#0e5f5c; color:#fff; width:54px; height:54px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:24px; }
  .stars { color:#f59e0b; font-size:16px; }
`;

const SCREENS = {
  'pharmacie-validation': `
    <div class="content">
      <div class="back">‹ Retour</div>
      <h1>Valider l'ordonnance</h1>

      <div class="label">Patient</div>
      <div class="card row">
        <div class="avatar">🧑🏾</div>
        <div>
          <div class="name">Awa N.</div>
          <div class="sub">34 ans · Reçue il y a 5 min</div>
        </div>
      </div>

      <div class="label">Ordonnance scannée</div>
      <div class="card"><div class="scan"><div class="doc">📄</div><div class="cap">ordonnance-awa-2607.pdf · appuyez pour agrandir</div></div></div>

      <div class="label">Médicaments à dispenser</div>
      <div class="card">
        <div class="med"><div><div class="mn">Paracétamol 500 mg</div><div class="mq">Boîte de 16 · ×2</div></div><div class="mp">1 200 FCFA</div></div>
        <div class="med"><div><div class="mn">Amoxicilline 1 g</div><div class="mq">Boîte de 14 · ×1</div></div><div class="mp">3 500 FCFA</div></div>
        <div class="med"><div><div class="mn">Sérum physiologique</div><div class="mq">5 dosettes · ×1</div></div><div class="mp">800 FCFA</div></div>
        <div class="total"><div class="tl">Total médicaments</div><div class="tv">5 500 FCFA</div></div>
      </div>

      <div class="note"><div class="i">⚖️</div><div class="t"><b>Vous êtes le dispensateur légal.</b> La plateforme ne vend pas le médicament : votre validation engage votre responsabilité pharmaceutique.</div></div>

      <div class="btns">
        <div class="btn btn-ghost">Refuser</div>
        <div class="btn btn-primary">Valider et préparer</div>
      </div>
    </div>
  `,
  'patient-suivi-livraison': `
    <div class="content">
      <div class="back">‹ Retour</div>
      <h1>Suivi de livraison</h1>

      <div class="map">
        <div class="road" style="top:150px;left:30px;width:300px;transform:rotate(-8deg)"></div>
        <div class="road" style="top:90px;left:230px;width:210px;transform:rotate(30deg)"></div>
        <div class="pin" style="top:60px;left:70px">🏥</div>
        <div class="pin" style="top:120px;left:250px">🛵</div>
        <div class="pin" style="top:150px;right:44px">🏠</div>
      </div>
      <div class="eta"><div class="el">Arrivée estimée</div><div class="ev">12 min</div></div>

      <div class="label">Statut de la commande</div>
      <div class="card">
        <div class="tl-item"><div class="tl-line"><div class="dot done">✓</div><div class="bar done"></div></div><div class="tl-body"><div class="tl-t">Ordonnance validée</div><div class="tl-s">Pharmacie du Centre · 12:04</div></div></div>
        <div class="tl-item"><div class="tl-line"><div class="dot done">✓</div><div class="bar done"></div></div><div class="tl-body"><div class="tl-t">Préparée et payée</div><div class="tl-s">Paiement sécurisé confirmé · 12:11</div></div></div>
        <div class="tl-item"><div class="tl-line"><div class="dot active">🛵</div><div class="bar"></div></div><div class="tl-body"><div class="tl-t">Coursier en route</div><div class="tl-s">Jean-Marc récupère votre colis · 12:18</div></div></div>
        <div class="tl-item"><div class="tl-line"><div class="dot todo"></div></div><div class="tl-body"><div class="tl-t muted">Livré</div><div class="tl-s">À votre adresse</div></div></div>
      </div>

      <div class="label">Votre coursier</div>
      <div class="card row" style="justify-content:space-between">
        <div class="row">
          <div class="avatar" style="background:#fde8d8">🧑🏾‍🦱</div>
          <div><div class="name">Jean-Marc B.</div><div class="sub"><span class="stars">★★★★★</span> 4,9 · Moto</div></div>
        </div>
        <div class="call">📞</div>
      </div>
    </div>
  `,
};

const html = (inner) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head>
<body><div class="phone"><div class="screen"><div class="notch"></div>
<div class="statusbar"><div class="time">9:41</div><div class="ic">📶 🔋</div></div>
${inner}</div></div></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
for (const [name, inner] of Object.entries(SCREENS)) {
  await page.setContent(html(inner), { waitUntil: 'networkidle' });
  const el = await page.$('.phone');
  const out = `/home/user/lave/docs/screenshots/mobile/${name}.png`;
  await el.screenshot({ path: out });
  console.log('écrit', out);
}
await browser.close();
