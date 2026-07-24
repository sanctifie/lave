import pw from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pw;
import { mkdirSync } from 'node:fs';

const OUT = '/home/user/lave/docs/screenshots/mobile/app';
mkdirSync(OUT, { recursive: true });

// ordre + noms de fichiers lisibles
const SCREENS = [
  ['login','00-auth-login'], ['otp','01-auth-otp'],
  ['home','02-patient-accueil'], ['doctors','03-patient-medecins'],
  ['consult','04-consultation-video'], ['chat','05-messagerie'],
  ['rx','06-ordonnance'], ['payment','07-paiement-sequestre'],
  ['delivery','08-suivi-livraison'], ['success','09-livre-succes'],
  ['transport','10-transport-course'], ['meals','11-repas-therapeutiques'],
  ['profile','12-profil-patient'],
  ['doctor','13-espace-medecin'], ['pharma','14-espace-pharmacie'],
  ['validate','15-validation-ordonnance'], ['courier','16-espace-coursier'],
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport:{width:420,height:820}, deviceScaleFactor:3 });
// Prototype versionné dans le dépôt (source unique, reproductible en CI).
await page.goto('file://' + OUT + '/_prototype.html', { waitUntil:'networkidle' });
// masquer la barre de nav pour les écrans où elle n'a pas de sens (auth) — sinon on la garde
for (const [view, file] of SCREENS) {
  await page.evaluate((v) => {
    document.querySelectorAll('.view.active').forEach(x=>x.classList.remove('active'));
    const el = document.querySelector('.view[data-view="'+v+'"]');
    el.classList.add('active'); el.scrollTop = 0;
    const nav = document.getElementById('nav');
    // nav cachée sur les écrans auth
    nav.style.display = (v==='login'||v==='otp') ? 'none' : 'flex';
  }, view);
  await page.waitForTimeout(350);
  const dev = await page.$('.device');
  await dev.screenshot({ path: `${OUT}/${file}.png` });
  console.log('✓', file);
}
await browser.close();
console.log('OK — ' + SCREENS.length + ' écrans');
