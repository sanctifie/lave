import pw from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pw;
import { readFileSync, mkdirSync } from 'node:fs';

const SRC = '/home/user/lave/docs/screenshots/mobile/app/_prototype.html';
const OUT = '/home/user/lave/docs/screenshots/mobile/app';
mkdirSync(OUT, { recursive: true });

// Réutilise le <style> exact du prototype premium existant.
const proto = readFileSync(SRC, 'utf8');
const style = proto.match(/<style>[\s\S]*?<\/style>/)[0];

// ─── Nouvelles vues (mêmes classes que le prototype) ───────────────────────
const VIEWS = {

  // 1 — Alerte allergies (pharmacien)
  allergy: `
    <div class="greet"><div class="top"><div><div class="hi">Ordonnance · Awa N.</div><div class="nm" style="font-size:22px">Valider & dispenser</div></div></div></div>
    <div style="margin-top:12px;display:flex;gap:11px;background:rgba(220,38,38,.09);border:1.5px solid #DC2626;border-radius:16px;padding:14px">
      <div style="font-size:22px">⚠️</div>
      <div><div style="font-size:12px;font-weight:800;color:#DC2626;letter-spacing:.02em">ALLERGIES DÉCLARÉES</div>
      <div style="font-size:14.5px;font-weight:650;margin-top:3px">Pénicilline · Aspirine</div>
      <div style="font-size:11.5px;color:var(--mut2);margin-top:4px">Vérifiez chaque médicament dispensé au regard de ces allergies.</div></div>
    </div>
    <div class="card" style="margin-top:14px">
      <div class="med"><div><b>Paracétamol 500 mg</b><div class="q">Boîte de 16 · ×2</div></div><div class="pr">1 200 F</div></div>
      <div class="med" style="border-bottom:0"><div><b style="color:#DC2626">Amoxicilline 1 g ⚠️</b><div class="q" style="color:#DC2626">Conflit possible avec « Pénicilline »</div></div><div class="pr">3 500 F</div></div>
    </div>
    <div class="legal"><div class="i">⚖️</div><p><b>Votre responsabilité pharmaceutique.</b> L'alerte ne bloque pas : vous confirmez la dispensation en connaissance de cause, seul dispensateur légal.</p></div>
    <div style="display:flex;gap:12px;margin-top:16px">
      <div class="cta-full" style="flex:1;background:var(--surf2);color:#DC2626;box-shadow:none;border:1px solid rgba(220,38,38,.35)">Annuler</div>
      <div class="cta-full" style="flex:2;background:linear-gradient(145deg,#DC2626,#B91C1C);color:#fff;box-shadow:0 14px 30px -8px rgba(220,38,38,.5)">Confirmer quand même</div>
    </div>`,

  // 2 — Le pharmacien recommande (saisie pharmacien)
  recoPharma: `
    <div class="greet"><div class="top"><div><div class="hi">Après validation</div><div class="nm" style="font-size:22px">Le pharmacien recommande</div></div></div></div>
    <div style="margin-top:6px;font-size:12.5px;color:var(--mut2)">Produits conseil (facultatifs). Le patient reste libre de les ajouter avant paiement.</div>
    <div class="card" style="margin-top:14px;border:1.5px solid var(--gold)">
      <div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:15px"><span>💡</span> Conseil ajouté</div>
      <div style="margin-top:12px;background:var(--surf2);border:1px solid var(--line);border-radius:12px;padding:12px">
        <b style="font-size:14.5px">Vitamine C 1 g</b>
        <div style="font-size:12px;color:var(--mut2);margin-top:3px">2 × 1 500 F · <span style="font-style:italic">à prendre pendant le traitement</span></div>
      </div>
      <div style="margin-top:12px;background:var(--surf2);border:1px solid var(--line);border-radius:12px;padding:12px">
        <b style="font-size:14.5px">Probiotiques</b>
        <div style="font-size:12px;color:var(--mut2);margin-top:3px">1 × 3 200 F · <span style="font-style:italic">protège la flore sous antibiotique</span></div>
      </div>
    </div>
    <div class="cta-full" style="margin-top:16px;background:var(--surf2);color:var(--gold);box-shadow:none;border:1.5px dashed var(--gold)">+ Proposer un produit conseil</div>
    <div class="legal"><div class="i">⚖️</div><p><b>Aucune marge plateforme.</b> Le conseil reste un acte officinal ; vous fixez le prix et le patient garde la main.</p></div>`,

  // 3 — Le pharmacien recommande (choix patient)
  recoPatient: `
    <div class="greet"><div class="top"><div><div class="hi">Commande #A3F92C</div><div class="nm" style="font-size:23px">Avant de payer</div></div></div></div>
    <div class="card" style="margin-top:10px;border:1.5px solid var(--gold)">
      <div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:15.5px"><span>💡</span> Le pharmacien recommande</div>
      <div style="font-size:12px;color:var(--mut2);margin-top:6px">En complément de votre traitement (facultatif). Cochez ce que vous souhaitez ajouter.</div>
      <div style="display:flex;gap:11px;align-items:flex-start;border-top:1px solid var(--line);padding-top:13px;margin-top:13px">
        <div style="width:22px;height:22px;border-radius:6px;background:var(--gold);display:grid;place-items:center;color:#3a2600;font-weight:800;font-size:13px;margin-top:2px">✓</div>
        <div style="flex:1"><b style="font-size:14.5px">Vitamine C 1 g</b><div style="font-size:11.5px;color:var(--mut2);font-style:italic;margin-top:2px">à prendre pendant le traitement</div><div style="font-size:12px;margin-top:3px">2 × 1 500 F = <b>3 000 F</b></div></div>
      </div>
      <div style="display:flex;gap:11px;align-items:flex-start;border-top:1px solid var(--line);padding-top:13px;margin-top:13px">
        <div style="width:22px;height:22px;border-radius:6px;border:1.5px solid var(--line);margin-top:2px"></div>
        <div style="flex:1"><b style="font-size:14.5px">Probiotiques</b><div style="font-size:11.5px;color:var(--mut2);font-style:italic;margin-top:2px">protège la flore sous antibiotique</div><div style="font-size:12px;margin-top:3px">1 × 3 200 F = <b>3 200 F</b></div></div>
      </div>
      <div class="cta-full" style="margin-top:16px;background:linear-gradient(145deg,var(--gold),#c9760a);color:#3a2600;box-shadow:0 12px 26px -8px rgba(232,137,12,.5)">Ajouter à ma commande</div>
    </div>`,

  // 4 — Rappels de prise (patient)
  reminders: `
    <div class="greet"><div class="top"><div><div class="hi">Suivi de traitement</div><div class="nm" style="font-size:23px">Rappels de prise</div></div></div></div>
    <div style="font-size:12px;color:var(--mut2);margin-top:2px">Les rappels restent sur votre téléphone (aucune donnée de santé transmise).</div>
    <div class="card" style="margin-top:12px">
      <b style="font-size:15px">Nouveau rappel</b>
      <div style="margin-top:10px;border:1.5px solid var(--line);border-radius:12px;padding:12px 14px;font-size:14px;color:var(--txt)">Amoxicilline 1 g</div>
      <div style="font-size:12px;color:var(--mut2);margin-top:12px">Moments de prise</div>
      <div style="display:flex;flex-wrap:wrap;gap:9px;margin-top:8px">
        <div style="flex-grow:1;min-width:46%;border:1.5px solid var(--teal);background:rgba(14,147,132,.1);border-radius:12px;padding:10px;text-align:center"><b style="font-size:13px;color:var(--teal)">🌅 Matin</b><div style="font-size:11px;color:var(--teal)">08:00</div></div>
        <div style="flex-grow:1;min-width:46%;border:1.5px solid var(--line);border-radius:12px;padding:10px;text-align:center"><b style="font-size:13px;color:var(--mut)">☀️ Midi</b><div style="font-size:11px;color:var(--mut2)">12:00</div></div>
        <div style="flex-grow:1;min-width:46%;border:1.5px solid var(--teal);background:rgba(14,147,132,.1);border-radius:12px;padding:10px;text-align:center"><b style="font-size:13px;color:var(--teal)">🌆 Soir</b><div style="font-size:11px;color:var(--teal)">19:00</div></div>
        <div style="flex-grow:1;min-width:46%;border:1.5px solid var(--line);border-radius:12px;padding:10px;text-align:center"><b style="font-size:13px;color:var(--mut)">🌙 Coucher</b><div style="font-size:11px;color:var(--mut2)">22:00</div></div>
      </div>
      <div style="font-size:12px;color:var(--mut2);margin-top:12px">Durée du traitement</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
        ${[3,5,7,10,14].map(d=>`<div style="border:1.5px solid ${d===7?'var(--teal)':'var(--line)'};background:${d===7?'rgba(14,147,132,.1)':'transparent'};border-radius:20px;padding:6px 14px;font-size:13px;font-weight:600;color:${d===7?'var(--teal)':'var(--mut)'}">${d} j</div>`).join('')}
      </div>
      <div class="cta-full" style="margin-top:16px">Programmer les rappels</div>
    </div>
    <div class="sectitle"><h4>Rappels actifs</h4></div>
    <div class="doc" style="border-left:4px solid var(--gold)"><div class="ph" style="font-size:22px">💊</div><div class="info"><b>Paracétamol 500 mg</b><div class="sp">08:00 · 19:00 — 6 prises à venir</div><div style="font-size:11px;color:var(--gold);margin-top:2px">Prochain : demain 08:00</div></div><div class="meta"><div style="font-size:12px;color:var(--coral);border:1.5px solid var(--coral);border-radius:20px;padding:5px 12px">Arrêter</div></div></div>`,

  // 5 — Renouvellement (détail ordonnance)
  renew: `
    <div class="greet"><div class="top"><div><div class="hi">Ordonnance · Dr. Mba</div><div class="nm" style="font-size:23px">Suivi de traitement</div></div></div></div>
    <div class="card" style="margin-top:10px;padding:0">
      <div style="display:flex;align-items:center;gap:12px;padding:15px;border-bottom:1px solid var(--line)"><span style="font-size:18px">🏥</span><div style="flex:1"><div style="font-size:12px;color:var(--mut2)">Pharmacie</div><b style="font-size:14.5px">Pharmacie du Centre</b></div></div>
      <div style="display:flex;align-items:center;gap:12px;padding:15px"><span style="font-size:18px">✅</span><div style="flex:1"><div style="font-size:12px;color:var(--mut2)">Statut</div><b style="font-size:14.5px;color:var(--success)">Validée & servie</b></div></div>
    </div>
    <div class="card" style="margin-top:14px;border-left:4px solid var(--gold)">
      <b style="font-size:15px">Traitement chronique ?</b>
      <div style="font-size:12.5px;color:var(--mut2);margin-top:6px">Renouvelez cette ordonnance en un geste ou programmez des rappels de prise.</div>
      <div style="display:flex;gap:10px;margin-top:14px">
        <div class="cta-full" style="flex:1;padding:13px;font-size:14px">🔄 Renouveler</div>
        <div class="cta-full" style="flex:1;padding:13px;font-size:14px;background:var(--surf2);color:var(--gold);box-shadow:none;border:1.5px solid var(--gold)">⏰ Rappels</div>
      </div>
    </div>
    <div class="legal"><div class="i">⚖️</div><p><b>Le pharmacien reste le dispensateur légal.</b> Tout renouvellement lui est transmis et revalidé avant préparation.</p></div>`,

  // 6 — Tiers-payant CNAMGS (récap commande)
  insurance: `
    <div class="greet"><div class="top"><div><div class="hi">Commande #A3F92C · Paiement</div><div class="nm" style="font-size:23px">Tiers-payant CNAMGS</div></div></div></div>
    <div class="card" style="margin-top:10px">
      <div class="med"><div><b>Paracétamol 500 mg</b><div class="q">×2</div></div><div class="pr" style="color:var(--txt)">2 400 F</div></div>
      <div class="med"><div><b>Amoxicilline 1 g</b><div class="q">×1</div></div><div class="pr" style="color:var(--txt)">3 500 F</div></div>
      <div class="med" style="border-bottom:0"><div><b>Sérum physiologique</b><div class="q">×1</div></div><div class="pr" style="color:var(--txt)">1 100 F</div></div>
      <div style="border-top:1px dashed var(--line);margin:10px 0"></div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:7px"><span style="color:var(--mut)">Sous-total médicaments</span><span>7 000 F</span></div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:7px"><span style="color:var(--success);flex:1">Pris en charge CNAMGS (80%)</span><span style="color:var(--success)">− 5 600 F</span></div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:7px"><span style="color:var(--mut)">Votre part (médicaments)</span><span>1 400 F</span></div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:7px"><span style="color:var(--mut)">Frais de service</span><span>500 F</span></div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:7px"><span style="color:var(--mut)">Livraison</span><span>1 000 F</span></div>
      <div style="border-top:1px solid var(--line);margin:8px 0"></div>
      <div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:15px">À votre charge</b><b style="font-size:20px;color:var(--teal)">2 900 F</b></div>
      <div style="font-size:11px;color:var(--mut2);margin-top:8px">💳 5 600 F facturés au tiers-payant CNAMGS — vous ne réglez que votre part.</div>
    </div>
    <div class="cta-full" style="margin-top:16px">Payer 2 900 FCFA</div>`,

  // 7 — Profil : assurance
  profileIns: `
    <div class="greet"><div class="top"><div><div class="hi">Mon profil</div><div class="nm" style="font-size:23px">Assurance</div></div><div class="ava">🧑🏾</div></div></div>
    <div class="card" style="margin-top:12px">
      <b style="font-size:16px">Assurance & tiers-payant</b>
      <div style="font-size:12px;color:var(--mut2);margin-top:6px">Avec le tiers-payant, vous ne réglez que votre part ; votre caisse prend en charge le reste.</div>
      <div style="font-size:12.5px;font-weight:600;margin-top:14px">Organisme</div>
      <div style="display:flex;gap:9px;margin-top:8px">
        <div style="border:1.5px solid var(--line);border-radius:20px;padding:7px 16px;font-size:13px;font-weight:600;color:var(--mut)">Aucune</div>
        <div style="border:1.5px solid var(--teal);background:rgba(14,147,132,.1);border-radius:20px;padding:7px 16px;font-size:13px;font-weight:700;color:var(--teal)">CNAMGS</div>
        <div style="border:1.5px solid var(--line);border-radius:20px;padding:7px 16px;font-size:13px;font-weight:600;color:var(--mut)">CNSS</div>
      </div>
      <div style="font-size:12.5px;font-weight:600;margin-top:16px">Numéro d'assuré</div>
      <div style="margin-top:8px;border:1.5px solid var(--line);border-radius:12px;padding:12px 14px;font-size:14px">24-0582194</div>
      <div style="font-size:12.5px;font-weight:600;margin-top:16px">Taux de prise en charge (%)</div>
      <div style="margin-top:8px;border:1.5px solid var(--line);border-radius:12px;padding:12px 14px;font-size:14px">80</div>
      <div style="font-size:11px;color:var(--mut2);margin-top:6px">Part prise en charge par la caisse sur le prix des médicaments.</div>
    </div>
    <div class="cta-full" style="margin-top:16px">Sauvegarder</div>`,
};

const ORDER = [
  ['allergy',     '17-allergies-validation'],
  ['recoPharma',  '18-conseil-pharmacien'],
  ['recoPatient', '19-conseil-patient'],
  ['reminders',   '20-rappels-prise'],
  ['renew',       '21-renouvellement'],
  ['insurance',   '22-tiers-payant-cnamgs'],
  ['profileIns',  '23-profil-assurance'],
];

const viewsHtml = ORDER.map(([k]) =>
  `<div class="view" data-view="${k}">${VIEWS[k]}</div>`
).join('\n');

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

const tmp = '/tmp/claude-0/-home-user-lave/55bccdcf-0f6b-5e45-abaf-89030cab51fe/scratchpad/proto_v2.html';
const { writeFileSync } = await import('node:fs');
writeFileSync(tmp, html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 820 }, deviceScaleFactor: 3 });
await page.goto('file://' + tmp, { waitUntil: 'networkidle' });
// Coupe les transitions d'opacité pour éviter tout « fantôme » de vue au screenshot.
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
console.log('OK — ' + ORDER.length + ' écrans');
